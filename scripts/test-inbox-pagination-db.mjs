import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import "dotenv/config";
import { build } from "esbuild";
import postgres from "postgres";

process.env.SKIP_ENV_VALIDATION ??= "true";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Inbox pagination integration tests require a local DATABASE_URL.");
}

const outputDirectory = join(process.cwd(), "node_modules", ".cache", "cogni-inbox-test");
const outputFile = join(outputDirectory, "queries.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export { getInboxPage, mapConversationToListItem } from "@/features/conversations/server/queries";
      export { decodeInboxCursor } from "@/features/conversations/inbox-pagination";
      export { getDb } from "@/lib/db/client";
    `,
    resolveDir: process.cwd(),
    sourcefile: "inbox-pagination-test-entry.ts",
  },
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "server-only-test-stub",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "server-only-test-stub",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "server-only-test-stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
  ],
});

const { decodeInboxCursor, getDb, getInboxPage, mapConversationToListItem } = await import(
  `${pathToFileURL(outputFile).href}?build=${randomUUID()}`
);
const raw = postgres(databaseUrl, { max: 1 });
const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const userId = randomUUID();
const memberId = randomUUID();
const now = new Date("2026-09-30T08:15:00.000Z").toISOString();
const conversationIds = [1, 2, 3].map(
  (number) => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`,
);
const visitorMessageIds = conversationIds.map(() => randomUUID());

before(async () => {
  await raw`
    INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES
      (${workspaceId}, 'Inbox cursor test', ${`test-${workspaceId}`}, ${now}),
      (${otherWorkspaceId}, 'Other workspace', ${`test-${otherWorkspaceId}`}, ${now})
  `;
  await raw`
    INSERT INTO "user" ("id", "name", "email", "updatedAt")
    VALUES (${userId}, 'Inbox test member', ${`${userId}@example.test`}, ${now})
  `;
  await raw`
    INSERT INTO "workspace_member" ("id", "userId", "workspaceId", "updatedAt")
    VALUES (${memberId}, ${userId}, ${workspaceId}, ${now})
  `;

  for (const [index, conversationId] of conversationIds.entries()) {
    const contactId = randomUUID();
    const status = index === 0 ? "CLOSED" : index === 2 ? "ASSIGNED" : "OPEN";
    const assignee = index === 2 ? memberId : null;
    const messages = JSON.stringify([
      {
        id: visitorMessageIds[index],
        body: `cursor sample ${index + 1}`,
        authorType: "VISITOR",
        visibility: "PUBLIC",
        ...(index === 1 ? { readAt: now } : {}),
        createdAt: now,
      },
    ]);

    await raw`
      INSERT INTO "contact" ("id", "name", "updatedAt", "workspaceId")
      VALUES (${contactId}, ${`Visitor ${index + 1}`}, ${now}, ${workspaceId})
    `;
    await raw`
      INSERT INTO "conversation" (
        "id", "subject", "status", "updatedAt", "lastMessageAt", "messages", "workspaceId", "contactId", "assignedMemberId"
      ) VALUES (
        ${conversationId}, ${`Cursor sample ${index + 1}`}, ${status}, ${now}, ${now}, ${messages}, ${workspaceId}, ${contactId}, ${assignee}
      )
    `;
  }

  const otherContactId = randomUUID();
  await raw`
    INSERT INTO "contact" ("id", "name", "updatedAt", "workspaceId")
    VALUES (${otherContactId}, 'Other visitor', ${now}, ${otherWorkspaceId})
  `;
  await raw`
    INSERT INTO "conversation" (
      "id", "subject", "updatedAt", "lastMessageAt", "messages", "workspaceId", "contactId"
    ) VALUES (
      ${"ffffffff-ffff-4fff-8fff-ffffffffffff"}, 'Other workspace conversation', ${now}, ${now}, ${JSON.stringify([{ id: randomUUID(), body: "private", authorType: "VISITOR", createdAt: now }])}, ${otherWorkspaceId}, ${otherContactId}
    )
  `;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" IN (${workspaceId}, ${otherWorkspaceId})`;
  await raw`DELETE FROM "user" WHERE "id" = ${userId}`;
  await getDb().$client.end({ timeout: 5 });
  await raw.end({ timeout: 5 });
});

test("inbox cursors return complete, stable pages and correct unread view counts", async () => {
  const firstPage = await getInboxPage(workspaceId, {
    membershipId: memberId,
    limit: 2,
    cursor: null,
  });
  const firstItems = firstPage.conversations.map(mapConversationToListItem);

  assert.deepEqual(
    firstPage.conversations.map((conversation) => conversation.id),
    [conversationIds[2], conversationIds[1]],
  );
  assert.equal(firstPage.pagination.hasMore, true);
  assert.ok(firstPage.pagination.nextCursor);
  assert.deepEqual(firstPage.counts, { all: 2, unassigned: 0, mine: 1, open: 1, closed: 1 });
  assert.deepEqual(
    firstItems.map((item) => item.unreadCount),
    [1, 0],
  );
  assert.deepEqual(
    firstItems.map((item) => item.lastUnreadVisitorMessageId),
    [visitorMessageIds[2], null],
  );

  const secondPage = await getInboxPage(workspaceId, {
    membershipId: memberId,
    limit: 2,
    cursor: decodeInboxCursor(firstPage.pagination.nextCursor),
  });

  assert.deepEqual(
    secondPage.conversations.map((conversation) => conversation.id),
    [conversationIds[0]],
  );
  assert.equal(secondPage.pagination.hasMore, false);
  assert.equal(secondPage.pagination.nextCursor, null);
});

test("unassigned view excludes closed conversations", async () => {
  const result = await getInboxPage(workspaceId, {
    membershipId: memberId,
    filter: "unassigned",
    limit: 20,
    cursor: null,
  });

  assert.equal(result.conversations.length, 1);
  assert.ok(result.conversations.every((conversation) => conversation.status !== "CLOSED"));
});

test("open view includes assigned conversations and mine excludes closed conversations", async () => {
  const [open, mine] = await Promise.all([
    getInboxPage(workspaceId, {
      membershipId: memberId,
      filter: "open",
      limit: 20,
      cursor: null,
    }),
    getInboxPage(workspaceId, {
      membershipId: memberId,
      filter: "mine",
      limit: 20,
      cursor: null,
    }),
  ]);

  assert.equal(open.conversations.length, 2);
  assert.ok(open.conversations.every((conversation) => conversation.status !== "CLOSED"));
  assert.ok(open.conversations.some((conversation) => conversation.status === "ASSIGNED"));
  assert.deepEqual(
    mine.conversations.map((conversation) => conversation.id),
    [conversationIds[2]],
  );
});

test("unread view only includes conversations with an unread visitor message", async () => {
  const result = await getInboxPage(workspaceId, {
    membershipId: memberId,
    filter: "unread",
    limit: 20,
    cursor: null,
  });

  assert.deepEqual(
    result.conversations.map((conversation) => conversation.id),
    [conversationIds[2], conversationIds[0]],
  );
  assert.ok(
    result.conversations.every((conversation) =>
      conversation.messages.some((message) => message.authorType === "VISITOR" && !message.readAt),
    ),
  );
});
