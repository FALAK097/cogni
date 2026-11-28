import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import { build } from "esbuild";
import { createTempSqliteEnvironment } from "./sqlite-test-utils.mjs";

process.env.SKIP_ENV_VALIDATION ??= "true";
const { databaseUrl, raw, cleanup } = createTempSqliteEnvironment("cogni-contact-tag-");

const outputDirectory = join(process.cwd(), "node_modules", ".cache", "cogni-contact-tag-test");
const outputFile = join(outputDirectory, "contact-tags.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export { changeContactTag, parseContactTags } from "@/features/contacts/server/contact-tags";
      export { createDbForUrl } from "@/lib/db/client";
    `,
    resolveDir: process.cwd(),
    sourcefile: "contact-tag-test-entry.ts",
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

const { changeContactTag, createDbForUrl, parseContactTags } = await import(
  `${pathToFileURL(outputFile).href}?run=${randomUUID()}`
);
const appDatabases = Array.from({ length: 3 }, () => createDbForUrl(databaseUrl));
const workspaceId = randomUUID();
const otherWorkspaceId = randomUUID();
const contactId = randomUUID();
const otherContactId = randomUUID();
const now = new Date().toISOString();

before(async () => {
  await raw`
    INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES
      (${workspaceId}, 'Contact tag test', ${`test-${workspaceId}`}, ${now}),
      (${otherWorkspaceId}, 'Other contact tag test', ${`test-${otherWorkspaceId}`}, ${now})
  `;
  await raw`
    INSERT INTO "contact" ("id", "name", "tags", "updatedAt", "workspaceId") VALUES
      (${contactId}, 'Tagged visitor', '[]', ${now}, ${workspaceId}),
      (${otherContactId}, 'Other visitor', '[]', ${now}, ${otherWorkspaceId})
  `;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" IN (${workspaceId}, ${otherWorkspaceId})`;
  for (const db of appDatabases) db.$client.close?.();
  await cleanup();
  await rm(outputDirectory, { recursive: true, force: true });
});

test("tag parsing tolerates malformed storage, normalizes and caps values", () => {
  assert.deepEqual(parseContactTags("not-json"), []);
  assert.deepEqual(parseContactTags(JSON.stringify([" Billing ", "billing", 4, "VIP"])), [
    "billing",
    "vip",
  ]);
  assert.equal(
    parseContactTags(JSON.stringify(Array.from({ length: 55 }, (_, index) => `tag-${index}`)))
      .length,
    50,
  );
});

test("concurrent tag updates preserve all tags and normalize duplicates", async () => {
  const additions = ["billing", "VIP", "follow up", "Billing"];
  await Promise.all(
    additions.map((tag, index) =>
      changeContactTag({
        db: appDatabases[index % appDatabases.length],
        workspaceId,
        contactId,
        action: "add",
        tag,
      }),
    ),
  );
  const [row] = await raw`SELECT "tags" FROM "contact" WHERE "id" = ${contactId}`;
  assert.deepEqual(JSON.parse(row.tags).sort(), ["billing", "follow up", "vip"]);
  assert.deepEqual(
    (
      await changeContactTag({
        db: appDatabases[0],
        workspaceId,
        contactId,
        action: "remove",
        tag: "VIP",
      })
    ).tags.sort(),
    ["billing", "follow up"],
  );
});

test("tag writes are workspace scoped and enforce the contact limit", async () => {
  assert.deepEqual(
    await changeContactTag({
      db: appDatabases[0],
      workspaceId,
      contactId: otherContactId,
      action: "add",
      tag: "blocked",
    }),
    { kind: "not-found" },
  );
  await raw`UPDATE "contact" SET "tags" = ${JSON.stringify(Array.from({ length: 50 }, (_, index) => `tag-${index}`))} WHERE "id" = ${contactId}`;
  assert.deepEqual(
    await changeContactTag({
      db: appDatabases[1],
      workspaceId,
      contactId,
      action: "add",
      tag: "extra",
    }),
    { kind: "limit" },
  );
  await assert.rejects(
    changeContactTag({
      db: appDatabases[1],
      workspaceId,
      contactId,
      action: "add",
      tag: "bad\nlabel",
    }),
    /Contact tags must/,
  );
});
