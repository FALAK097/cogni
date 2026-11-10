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
  throw new Error("Inbox macro integration tests require a local DATABASE_URL.");
}

const outputDirectory = join(process.cwd(), "node_modules", ".cache", "cogni-inbox-macro-test");
const outputFile = join(outputDirectory, "macros.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export {
        createInboxMacro,
        deleteInboxMacro,
        InboxMacroNameConflictError,
        listInboxMacros,
        updateInboxMacro,
      } from "@/features/conversations/server/macros";
      export { inboxMacroInputSchema } from "@/features/conversations/macro-input";
      export { getDb } from "@/lib/db/client";
    `,
    resolveDir: process.cwd(),
    sourcefile: "inbox-macro-test-entry.ts",
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
  createInboxMacro,
  deleteInboxMacro,
  getDb,
  InboxMacroNameConflictError,
  inboxMacroInputSchema,
  listInboxMacros,
  updateInboxMacro,
} = await import(`${pathToFileURL(outputFile).href}?run=${randomUUID()}`);
const raw = postgres(databaseUrl, { max: 1 });
const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const userIds = [randomUUID(), randomUUID(), randomUUID()];
const memberIds = [randomUUID(), randomUUID(), randomUUID()];
const now = new Date().toISOString();

test("saved reply input is bounded, non-empty and rejects unsafe control characters", () => {
  assert.equal(
    inboxMacroInputSchema.safeParse({ name: "Refund", content: "We’re checking this." }).success,
    true,
  );
  assert.equal(inboxMacroInputSchema.safeParse({ name: " ", content: "Reply" }).success, false);
  assert.equal(
    inboxMacroInputSchema.safeParse({ name: "Valid", content: "\u0000bad" }).success,
    false,
  );
  assert.equal(
    inboxMacroInputSchema.safeParse({ name: "x".repeat(41), content: "Reply" }).success,
    false,
  );
  assert.equal(
    inboxMacroInputSchema.safeParse({ name: "Valid", content: "x".repeat(4_001) }).success,
    false,
  );
});

before(async () => {
  await raw`
    INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES
      (${workspaceId}, 'Inbox macro test', ${`test-${workspaceId}`}, ${now}),
      (${otherWorkspaceId}, 'Other inbox macro test', ${`test-${otherWorkspaceId}`}, ${now})
  `;
  for (const [index, userId] of userIds.entries()) {
    await raw`
      INSERT INTO "user" ("id", "name", "email", "updatedAt")
      VALUES (${userId}, ${`Inbox macro user ${index}`}, ${`${userId}@example.test`}, ${now})
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

test("saved replies are normalized and listed only within their workspace", async () => {
  const macro = await createInboxMacro(workspaceId, memberIds[0], {
    name: "  Refund update  ",
    content: "  We’re checking this for you.\n\nWe’ll follow up soon.  ",
  });

  assert.equal(macro.name, "Refund update");
  assert.equal(macro.content, "We’re checking this for you.\n\nWe’ll follow up soon.");
  assert.equal((await listInboxMacros(workspaceId)).length, 1);
  assert.equal((await listInboxMacros(otherWorkspaceId)).length, 0);
  await assert.rejects(
    createInboxMacro(workspaceId, memberIds[1], {
      name: "refund UPDATE",
      content: "Another reply",
    }),
    InboxMacroNameConflictError,
  );
});

test("members manage only their own saved replies while owners can manage any workspace reply", async () => {
  const owned = await createInboxMacro(workspaceId, memberIds[0], {
    name: "Shipping delay",
    content: "We’re looking into the delay.",
  });

  assert.equal(
    await updateInboxMacro(workspaceId, owned.id, memberIds[1], false, {
      name: "Changed",
      content: "Changed reply",
    }),
    null,
  );
  assert.equal(await deleteInboxMacro(workspaceId, owned.id, memberIds[1], false), false);
  assert.equal(
    await updateInboxMacro(otherWorkspaceId, owned.id, memberIds[2], true, {
      name: "Foreign workspace",
      content: "Not allowed",
    }),
    null,
  );
  assert.equal(await deleteInboxMacro(otherWorkspaceId, owned.id, memberIds[2], true), false);

  const updated = await updateInboxMacro(workspaceId, owned.id, memberIds[1], true, {
    name: "Shipping follow-up",
    content: "We’ll send an update shortly.",
  });
  assert.equal(updated?.name, "Shipping follow-up");
  assert.equal(await deleteInboxMacro(workspaceId, owned.id, memberIds[1], true), true);
  assert.equal(await deleteInboxMacro(workspaceId, owned.id, memberIds[0], false), false);
});
