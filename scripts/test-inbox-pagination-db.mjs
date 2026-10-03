import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
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

const outputDirectory = await mkdtemp(join(tmpdir(), "cogni-inbox-test-"));
const outputFile = join(outputDirectory, "queries.mjs");
await symlink(join(process.cwd(), "node_modules"), join(outputDirectory, "node_modules"), "dir");

await build({
  stdin: {
    contents: `
      export { getInboxPage, mapConversationToListItem } from "@/features/conversations/server/queries";
      export { appendConversationMessage } from "@/features/conversations/server/conversation-service";
      export { decodeInboxCursor } from "@/features/conversations/inbox-pagination";
      export { changeConversationLabel, parseConversationLabels } from "@/features/conversations/server/labels";
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

const {
  appendConversationMessage,
  changeConversationLabel,
  decodeInboxCursor,
  getDb,
  getInboxPage,
  mapConversationToListItem,
  parseConversationLabels,
} = await import(`${pathToFileURL(outputFile).href}?build=${randomUUID()}`);
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
    const channel = ["WIDGET", "SLACK", "WHATSAPP"][index];
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
        "id", "subject", "status", "channel", "updatedAt", "lastMessageAt", "messages", "workspaceId", "contactId", "assignedMemberId"
      ) VALUES (
        ${conversationId}, ${`Cursor sample ${index + 1}`}, ${status}, ${channel}, ${now}, ${now}, ${messages}, ${workspaceId}, ${contactId}, ${assignee}
      )
    `;
  }

  const otherContactId = randomUUID();
  await raw`
    INSERT INTO "contact" ("id", "name", "updatedAt", "workspaceId")
    VALUES (${otherContactId}, 'Other visitor', ${now}, ${otherWorkspaceId})
  `;
  const otherConversationId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  await raw`
    INSERT INTO "conversation" (
      "id", "subject", "updatedAt", "lastMessageAt", "messages", "workspaceId", "contactId", "snoozedUntil"
    ) VALUES (
      ${otherConversationId}, 'Other workspace conversation', ${now}, ${now}, ${JSON.stringify([{ id: randomUUID(), body: "private", authorType: "VISITOR", createdAt: now }])}, ${otherWorkspaceId}, ${otherContactId}, ${new Date(Date.now() + 60 * 60 * 1000).toISOString()}
    )
  `;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" IN (${workspaceId}, ${otherWorkspaceId})`;
  await raw`DELETE FROM "user" WHERE "id" = ${userId}`;
  await getDb().$client.end({ timeout: 5 });
  await raw.end({ timeout: 5 });
  await rm(outputDirectory, { recursive: true, force: true });
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
  assert.deepEqual(firstPage.counts, {
    total: 3,
    all: 2,
    unassigned: 0,
    mine: 1,
    open: 1,
    closed: 1,
    snoozed: 0,
  });
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

test("total inbox count stays nonzero when every visitor message is read", async () => {
  await raw`
    UPDATE "conversation"
    SET "messages" = (
      SELECT COALESCE(
        jsonb_agg(item.value || jsonb_build_object('readAt', ${now}::text)),
        '[]'::jsonb
      )::text
      FROM jsonb_array_elements("conversation"."messages"::jsonb) AS item(value)
    )
    WHERE "workspaceId" = ${workspaceId}
  `;

  const result = await getInboxPage(workspaceId, {
    membershipId: memberId,
    limit: 20,
    cursor: null,
  });

  assert.equal(result.counts.all, 0);
  assert.equal(result.counts.total, 3);
  assert.equal(result.conversations.length, 3);
});

test("conversation labels normalize concurrent updates and remain workspace scoped", async () => {
  const labels = ["billing", "VIP", "follow up", "Billing"];
  await Promise.all(
    labels.map((label) =>
      changeConversationLabel({
        db: getDb(),
        workspaceId,
        conversationId: conversationIds[1],
        action: "add",
        label,
      }),
    ),
  );
  const [row] = await raw`SELECT "labels" FROM "conversation" WHERE "id" = ${conversationIds[1]}`;
  assert.deepEqual(JSON.parse(row.labels).sort(), ["billing", "follow up", "vip"]);
  assert.deepEqual(
    await changeConversationLabel({
      db: getDb(),
      workspaceId,
      conversationId: conversationIds[1],
      action: "remove",
      label: "VIP",
    }),
    { kind: "updated", labels: ["billing", "follow up"] },
  );
  assert.deepEqual(parseConversationLabels("not-json"), []);
  assert.deepEqual(
    await changeConversationLabel({
      db: getDb(),
      workspaceId,
      conversationId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      action: "add",
      label: "private",
    }),
    { kind: "not-found" },
  );
});

test("label filters are exact and scoped to the selected workspace", async () => {
  const foreignConversationId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  await changeConversationLabel({
    db: getDb(),
    workspaceId,
    conversationId: conversationIds[0],
    action: "add",
    label: "billing",
  });
  await raw`UPDATE "conversation" SET "labels" = '["billing"]' WHERE "id" = ${foreignConversationId}`;

  const result = await getInboxPage(workspaceId, {
    membershipId: memberId,
    filter: "closed",
    channel: "WIDGET",
    label: "billing",
    limit: 20,
    cursor: null,
  });

  assert.deepEqual(
    result.conversations.map((conversation) => conversation.id),
    [conversationIds[0]],
  );
  assert.deepEqual(mapConversationToListItem(result.conversations[0]).labels, ["billing"]);
});

test("conversation label limits reject invalid additions", async () => {
  await raw`UPDATE "conversation" SET "labels" = ${JSON.stringify(Array.from({ length: 50 }, (_, index) => `label-${index}`))} WHERE "id" = ${conversationIds[2]}`;
  assert.deepEqual(
    await changeConversationLabel({
      db: getDb(),
      workspaceId,
      conversationId: conversationIds[2],
      action: "add",
      label: "extra",
    }),
    { kind: "limit" },
  );
  await assert.rejects(
    changeConversationLabel({
      db: getDb(),
      workspaceId,
      conversationId: conversationIds[2],
      action: "add",
      label: "bad\nlabel",
    }),
    /valid conversation label/,
  );
});

test("channel and assignee facets are combined and remain workspace scoped", async () => {
  const [slack, assigned, unassigned] = await Promise.all([
    getInboxPage(workspaceId, {
      membershipId: memberId,
      channel: "SLACK",
      limit: 20,
      cursor: null,
    }),
    getInboxPage(workspaceId, {
      membershipId: memberId,
      assignee: memberId,
      limit: 20,
      cursor: null,
    }),
    getInboxPage(workspaceId, {
      membershipId: memberId,
      assignee: "unassigned",
      limit: 20,
      cursor: null,
    }),
  ]);

  assert.deepEqual(
    slack.conversations.map((conversation) => conversation.id),
    [conversationIds[1]],
  );
  assert.deepEqual(
    assigned.conversations.map((conversation) => conversation.id),
    [conversationIds[2]],
  );
  assert.deepEqual(
    unassigned.conversations.map((conversation) => conversation.id),
    [conversationIds[1], conversationIds[0]],
  );
  const combined = await getInboxPage(workspaceId, {
    membershipId: memberId,
    channel: "SLACK",
    assignee: "unassigned",
    limit: 20,
    cursor: null,
  });
  assert.deepEqual(
    combined.conversations.map((conversation) => conversation.id),
    [conversationIds[1]],
  );
});

test("snoozed conversations stay hidden until due and a visitor reply returns them", async () => {
  const [foreignSnoozed, foreignAll, localSnoozed] = await Promise.all([
    getInboxPage(otherWorkspaceId, {
      membershipId: memberId,
      filter: "snoozed",
      limit: 20,
      cursor: null,
    }),
    getInboxPage(otherWorkspaceId, { membershipId: memberId, limit: 20, cursor: null }),
    getInboxPage(workspaceId, {
      membershipId: memberId,
      filter: "snoozed",
      limit: 20,
      cursor: null,
    }),
  ]);

  assert.equal(foreignSnoozed.conversations.length, 1);
  assert.equal(foreignSnoozed.counts.snoozed, 1);
  assert.equal(foreignAll.conversations.length, 0);
  assert.equal(localSnoozed.conversations.length, 0);

  const snoozedConversation = foreignSnoozed.conversations[0];
  assert.ok(snoozedConversation);
  const visitorReplyAt = new Date().toISOString();
  await appendConversationMessage({
    db: getDb(),
    workspaceId: otherWorkspaceId,
    conversationId: snoozedConversation.id,
    message: {
      id: randomUUID(),
      body: "A new visitor reply should bring this conversation back.",
      authorType: "VISITOR",
      createdAt: visitorReplyAt,
    },
  });

  const [returnedToSnoozed, returnedToAll] = await Promise.all([
    getInboxPage(otherWorkspaceId, {
      membershipId: memberId,
      filter: "snoozed",
      limit: 20,
      cursor: null,
    }),
    getInboxPage(otherWorkspaceId, { membershipId: memberId, limit: 20, cursor: null }),
  ]);
  assert.equal(returnedToSnoozed.conversations.length, 0);
  assert.equal(returnedToAll.conversations.length, 1);
});
