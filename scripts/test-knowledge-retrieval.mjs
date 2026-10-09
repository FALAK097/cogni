import assert from "node:assert/strict";
import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import postgres from "postgres";

process.env.SKIP_ENV_VALIDATION ??= "true";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Knowledge retrieval integration tests require a local DATABASE_URL.");
}

const outputDirectory = join(process.cwd(), "node_modules", ".cache", "cogni-knowledge-test");
const outputFile = join(outputDirectory, "retrieval.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export { retrieveKnowledgeContextWith } from "@/features/knowledge/server/retrieval";
      import { drizzle } from "drizzle-orm/postgres-js";
      import * as schema from "@/lib/db/schema";
      import * as relations from "@/lib/db/relations";
      export const createTestDb = (client) => drizzle(client, { schema: { ...schema, ...relations } });
    `,
    resolveDir: process.cwd(),
    sourcefile: "knowledge-test-entry.ts",
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

const { retrieveKnowledgeContextWith, createTestDb } = await import(
  `${pathToFileURL(outputFile).href}?build=${randomUUID()}`
);
const raw = postgres(databaseUrl, { max: 2 });
const appClient = postgres(databaseUrl, { max: 1 });
const db = createTestDb(appClient);
const workspaceId = randomUUID();
const foreignWorkspaceId = randomUUID();
const readyDocumentId = randomUUID();
const unrelatedDocumentId = randomUUID();
const processingDocumentId = randomUUID();
const foreignDocumentId = randomUUID();
const now = new Date();

before(async () => {
  await raw`INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES (${workspaceId}, 'Retrieval test', ${`test-${workspaceId}`}, ${now}), (${foreignWorkspaceId}, 'Foreign retrieval test', ${`test-${foreignWorkspaceId}`}, ${now})`;
  await raw`INSERT INTO "document" ("id", "title", "sourceType", "status", "updatedAt", "workspaceId") VALUES (${readyDocumentId}, 'Refund policy', 'TEXT', 'READY', ${now}, ${workspaceId}), (${unrelatedDocumentId}, 'Recent unrelated note', 'TEXT', 'READY', ${now}, ${workspaceId}), (${processingDocumentId}, 'Processing draft', 'TEXT', 'PROCESSING', ${now}, ${workspaceId}), (${foreignDocumentId}, 'Foreign refund policy', 'TEXT', 'READY', ${now}, ${foreignWorkspaceId})`;
  await raw`INSERT INTO "document_chunk" ("id", "content", "position", "documentId") VALUES (${randomUUID()}, 'Our refund policy allows refunds within 14 days.', 0, ${readyDocumentId}), (${randomUUID()}, 'This unrelated recent note does not answer the question.', 0, ${unrelatedDocumentId}), (${randomUUID()}, 'Refund policy draft text should not be used.', 0, ${processingDocumentId}), (${randomUUID()}, 'Foreign refund policy says 90 days.', 0, ${foreignDocumentId})`;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" IN (${workspaceId}, ${foreignWorkspaceId})`;
  await appClient.end({ timeout: 5 });
  await raw.end({ timeout: 5 });
});

test("irrelevant queries return no evidence instead of the newest workspace chunk", async () => {
  const contexts = await retrieveKnowledgeContextWith({
    db,
    search: async () => [],
    workspaceId,
    query: "What are your business hours?",
  });

  assert.deepEqual(contexts, []);
});

test("exact-phrase fallback respects ready status, workspace and selected-source scope", async () => {
  const contexts = await retrieveKnowledgeContextWith({
    db,
    search: async () => [],
    workspaceId,
    query: "refund policy",
    documentIds: [readyDocumentId, foreignDocumentId, readyDocumentId],
  });

  assert.deepEqual(contexts, [
    {
      documentId: readyDocumentId,
      title: "Refund policy",
      content: "Our refund policy allows refunds within 14 days.",
    },
  ]);
});

test("search metadata cannot expose another workspace's source content", async () => {
  let filters;
  const contexts = await retrieveKnowledgeContextWith({
    db,
    search: async (request) => {
      filters = request.filters;
      return [
        {
          id: "foreign-chunk",
          score: 0.99,
          text: "Foreign refund policy says 90 days.",
          item: { metadata: { documentId: foreignDocumentId } },
        },
      ];
    },
    workspaceId,
    query: "unique unrelated policy question",
  });

  assert.deepEqual(filters, { workspaceid: workspaceId });
  assert.deepEqual(contexts, []);
});

test("an explicit empty source selection never broadens to the workspace", async () => {
  let searchCalled = false;
  const contexts = await retrieveKnowledgeContextWith({
    db,
    search: async () => {
      searchCalled = true;
      return [];
    },
    workspaceId,
    query: "refund policy",
    documentIds: [],
  });

  assert.deepEqual(contexts, []);
  assert.equal(searchCalled, false);
});

test("invalid result limits fall back to a bounded default", async () => {
  let requestedLimit;
  await retrieveKnowledgeContextWith({
    db,
    search: async (request) => {
      requestedLimit = request.limit;
      return [];
    },
    workspaceId,
    query: "no matching passage",
    limit: Number.NaN,
  });

  assert.equal(requestedLimit, 4);
});
