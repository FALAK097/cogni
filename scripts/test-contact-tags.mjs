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
  throw new Error("Contact tag integration tests require a local DATABASE_URL.");
}

const outputDirectory = join(process.cwd(), "node_modules", ".cache", "cogni-contact-tag-test");
const outputFile = join(outputDirectory, "contact-tags.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export { changeContactTag, parseContactTags } from "@/features/contacts/server/contact-tags";
      import { drizzle } from "drizzle-orm/postgres-js";
      import * as schema from "@/lib/db/schema";
      import * as relations from "@/lib/db/relations";
      export const createTestDb = (client) => drizzle(client, { schema: { ...schema, ...relations } });
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

const { changeContactTag, createTestDb, parseContactTags } = await import(
  `${pathToFileURL(outputFile).href}?run=${randomUUID()}`
);
const raw = postgres(databaseUrl, { max: 2 });
const appClients = Array.from({ length: 3 }, () => postgres(databaseUrl, { max: 1 }));
const appDatabases = appClients.map((client) => createTestDb(client));
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
  await Promise.all(appClients.map((client) => client.end({ timeout: 5 })));
  await raw.end({ timeout: 5 });
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
    ).tags,
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
