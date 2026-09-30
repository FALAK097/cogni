import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { build } from "esbuild";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

process.env.SKIP_ENV_VALIDATION ??= "true";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Conversation append integration tests require a local DATABASE_URL.");
}

const outputDirectory = join(process.cwd(), "node_modules", ".cache", "cogni-conversation-test");
const outputFile = join(outputDirectory, "conversation.mjs");
await mkdir(outputDirectory, { recursive: true });

await build({
  stdin: {
    contents: `
      export { appendConversationMessage } from "@/features/conversations/server/conversation-service";
    `,
    resolveDir: process.cwd(),
    sourcefile: "conversation-test-entry.ts",
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

const { appendConversationMessage } = await import(
  `${pathToFileURL(outputFile).href}?build=${randomUUID()}`
);
const raw = postgres(databaseUrl, { max: 2 });
const appClients = Array.from({ length: 3 }, () => postgres(databaseUrl, { max: 1 }));
const appDatabases = appClients.map((client) => drizzle(client));
const workspaceId = randomUUID();
const contactId = randomUUID();
const conversationId = randomUUID();
const now = new Date().toISOString();

before(async () => {
  await raw`INSERT INTO "workspace" ("id", "name", "slug", "updatedAt") VALUES (${workspaceId}, 'Rate test', ${`test-${workspaceId}`}, ${now})`;
  await raw`INSERT INTO "contact" ("id", "name", "updatedAt", "workspaceId") VALUES (${contactId}, 'Test visitor', ${now}, ${workspaceId})`;
  await raw`INSERT INTO "conversation" ("id", "subject", "updatedAt", "workspaceId", "contactId") VALUES (${conversationId}, 'Concurrent append test', ${now}, ${workspaceId}, ${contactId})`;
});

after(async () => {
  await raw`DELETE FROM "workspace" WHERE "id" = ${workspaceId}`;
  await Promise.all(appClients.map((client) => client.end({ timeout: 5 })));
  await raw.end({ timeout: 5 });
});

test("concurrent transcript appends preserve every message", async () => {
  const messages = Array.from({ length: 40 }, (_, index) => ({
    id: randomUUID(),
    body: `message-${index}`,
    authorType: "TEAM",
    visibility: "INTERNAL",
    createdAt: new Date().toISOString(),
  }));

  const results = await Promise.all(
    messages.map((message, index) =>
      appendConversationMessage({
        db: appDatabases[index % appDatabases.length],
        workspaceId,
        conversationId,
        message,
      }),
    ),
  );
  assert.equal(results.filter((result) => result?.inserted).length, messages.length);

  const [row] = await raw`SELECT "messages" FROM "conversation" WHERE "id" = ${conversationId}`;
  const storedMessages = JSON.parse(row.messages);
  assert.equal(storedMessages.length, messages.length);
  assert.deepEqual(
    new Set(storedMessages.map((message) => message.id)),
    new Set(messages.map((message) => message.id)),
  );
});

test("duplicate webhook deliveries append only once", async () => {
  const clientId = randomUUID();
  const deliveries = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      appendConversationMessage({
        db: appDatabases[index % appDatabases.length],
        workspaceId,
        conversationId,
        message: {
          id: randomUUID(),
          body: `retry-${index}`,
          authorType: "VISITOR",
          visibility: "PUBLIC",
          clientId,
          createdAt: new Date().toISOString(),
        },
      }),
    ),
  );
  const [row] = await raw`SELECT "messages" FROM "conversation" WHERE "id" = ${conversationId}`;
  const storedMessages = JSON.parse(row.messages);
  const matching = storedMessages.filter((message) => message.clientId === clientId);

  assert.equal(matching.length, 1);
  assert.equal(deliveries.filter((delivery) => delivery?.inserted).length, 1);
  assert.ok(deliveries.every((delivery) => delivery?.message.id === matching[0].id));
});

test("AI appends are denied after takeover and all appends stay workspace scoped", async () => {
  await raw`UPDATE "conversation" SET "aiPaused" = true WHERE "id" = ${conversationId}`;
  const paused = await appendConversationMessage({
    db: appDatabases[0],
    workspaceId,
    conversationId,
    message: {
      id: randomUUID(),
      body: "must be suppressed",
      authorType: "AI",
      visibility: "PUBLIC",
      createdAt: new Date().toISOString(),
    },
    requireAiActive: true,
  });
  assert.equal(paused, null);

  const foreignWorkspace = await appendConversationMessage({
    db: appDatabases[1],
    workspaceId: randomUUID(),
    conversationId,
    message: {
      id: randomUUID(),
      body: "must not cross workspace boundary",
      authorType: "TEAM",
      visibility: "INTERNAL",
      createdAt: new Date().toISOString(),
    },
  });
  assert.equal(foreignWorkspace, null);
});
