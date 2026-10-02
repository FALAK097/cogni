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
  throw new Error("Inbox saved-view integration tests require a local DATABASE_URL.");
}

const outputDirectory = join(process.cwd(), "node_modules", ".cache", "cogni-saved-view-test");
const outputFile = join(outputDirectory, "saved-views.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export {
        createInboxSavedView,
        deleteInboxSavedView,
        InboxSavedViewAssigneeError,
        InboxSavedViewNameConflictError,
        listInboxSavedViews,
      } from "@/features/conversations/server/saved-views";
      export { getDb } from "@/lib/db/client";
    `,
    resolveDir: process.cwd(),
    sourcefile: "saved-view-test-entry.ts",
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
  createInboxSavedView,
  deleteInboxSavedView,
  getDb,
  InboxSavedViewAssigneeError,
  InboxSavedViewNameConflictError,
  listInboxSavedViews,
} = await import(`${pathToFileURL(outputFile).href}?run=${randomUUID()}`);
const raw = postgres(databaseUrl, { max: 1 });
const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const userIds = [randomUUID(), randomUUID(), randomUUID()];
const memberIds = [randomUUID(), randomUUID(), randomUUID()];
const now = new Date().toISOString();

before(async () => {
  await raw`
    INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES
      (${workspaceId}, 'Saved view test', ${`test-${workspaceId}`}, ${now}),
      (${otherWorkspaceId}, 'Other saved view test', ${`test-${otherWorkspaceId}`}, ${now})
  `;
  for (const [index, userId] of userIds.entries()) {
    await raw`
      INSERT INTO "user" ("id", "name", "email", "updatedAt")
      VALUES (${userId}, ${`Saved view user ${index}`}, ${`${userId}@example.test`}, ${now})
    `;
  }
  await raw`
    INSERT INTO "workspace_member" ("id", "userId", "workspaceId", "role", "updatedAt") VALUES
      (${memberIds[0]}, ${userIds[0]}, ${workspaceId}, 'MEMBER', ${now}),
      (${memberIds[1]}, ${userIds[1]}, ${workspaceId}, 'OWNER', ${now}),
      (${memberIds[2]}, ${userIds[2]}, ${otherWorkspaceId}, 'MEMBER', ${now})
  `;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" IN (${workspaceId}, ${otherWorkspaceId})`;
  await raw`DELETE FROM "user" WHERE "id" IN (${userIds[0]}, ${userIds[1]}, ${userIds[2]})`;
  await getDb().$client.end({ timeout: 5 });
  await raw.end({ timeout: 5 });
});

test("saved inbox views are workspace scoped and names are unique without case sensitivity", async () => {
  const input = {
    name: "Billing questions",
    filter: "open",
    channel: "SLACK",
    assigneeFilter: "all",
  };
  const first = await createInboxSavedView(workspaceId, memberIds[0], input);
  const otherWorkspaceView = await createInboxSavedView(otherWorkspaceId, memberIds[2], input);

  assert.equal(first.name, input.name);
  assert.equal((await listInboxSavedViews(workspaceId)).length, 1);
  assert.equal((await listInboxSavedViews(otherWorkspaceId)).length, 1);
  await assert.rejects(
    createInboxSavedView(workspaceId, memberIds[1], { ...input, name: "billing QUESTIONS" }),
    InboxSavedViewNameConflictError,
  );
  assert.notEqual(first.id, otherWorkspaceView.id);
});

test("saved views cannot bind to a teammate from another workspace", async () => {
  await assert.rejects(
    createInboxSavedView(workspaceId, memberIds[0], {
      name: "Foreign teammate",
      filter: "all",
      channel: null,
      assigneeFilter: memberIds[2],
    }),
    InboxSavedViewAssigneeError,
  );
});

test("members delete only their own views, and owners can delete shared views", async () => {
  const owned = await createInboxSavedView(workspaceId, memberIds[0], {
    name: "My view",
    filter: "mine",
    channel: null,
    assigneeFilter: "all",
  });
  assert.equal(await deleteInboxSavedView(workspaceId, owned.id, memberIds[1], false), false);
  assert.equal(await deleteInboxSavedView(otherWorkspaceId, owned.id, memberIds[2], true), false);
  assert.equal(await deleteInboxSavedView(workspaceId, owned.id, memberIds[0], false), true);

  const shared = await createInboxSavedView(workspaceId, memberIds[0], {
    name: "Owner cleanup",
    filter: "unassigned",
    channel: "WIDGET",
    assigneeFilter: "unassigned",
  });
  assert.equal(await deleteInboxSavedView(workspaceId, shared.id, memberIds[1], true), true);
});
