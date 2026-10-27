import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const connectionString = process.env.INGESTION_LEASE_TEST_DATABASE_URL;
if (!connectionString) {
  throw new Error("Set INGESTION_LEASE_TEST_DATABASE_URL to a disposable local '*test*' database.");
}

const url = new URL(connectionString);
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const databaseName = decodeURIComponent(url.pathname.slice(1));
if (!localHosts.has(url.hostname) || !databaseName.includes("test")) {
  throw new Error(
    "INGESTION_LEASE_TEST_DATABASE_URL must target a local database whose name includes 'test'.",
  );
}

async function buildIngestionModule() {
  const result = await build({
    stdin: {
      contents: `
        export { processIngestionWorkflowRun } from "./src/lib/jobs/ingestion.ts";
        export { acquireDocumentLock } from "./src/lib/db/document-lock.ts";
        export { resolveDocumentLockDatabaseUrl } from "./src/lib/db/document-lock-config.ts";
        export { workflowRun, document } from "./src/lib/db/schema.ts";
      `,
      resolveDir: process.cwd(),
      sourcefile: "ingestion-lease-db-test.ts",
      loader: "ts",
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    alias: { "@": `${process.cwd()}/src` },
    plugins: [
      {
        name: "ingestion-lease-db-test",
        setup(buildContext) {
          buildContext.onResolve(
            {
              filter:
                /^(server-only|next\/server|@\/features\/knowledge\/server\/extract|@\/lib\/env\/server|@\/lib\/logging\/logger|@\/lib\/events\/domain-events|@\/lib\/notifications\/create-notification)$/,
            },
            (args) => ({ path: args.path, namespace: "ingestion-lease-db-test" }),
          );
          buildContext.onLoad({ filter: /.*/, namespace: "ingestion-lease-db-test" }, (args) => {
            const stubs = {
              "server-only": "",
              "next/server": "export const after = async (callback) => callback();",
              "@/features/knowledge/server/extract": `
                export const extractDocumentText = async ({ storageKey }) => storageKey || "indexed text";
                export const indexDocumentContent = async (_db, documentId) =>
                  globalThis.__ingestionLeaseDbTest.indexDocument(documentId);
              `,
              "@/lib/env/server":
                "export const env = { DATABASE_URL: globalThis.__ingestionLeaseDbTestUrl };",
              "@/lib/logging/logger":
                "export const logError = () => {}; export const logInfo = () => {};",
              "@/lib/events/domain-events": "export const emitDomainEvent = async () => {};",
              "@/lib/notifications/create-notification":
                "export const notifyWorkspaceMembers = async () => {};",
            };
            return { contents: stubs[args.path], loader: "js" };
          });
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
  );
}

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

test("PostgreSQL migration, heartbeat, takeover, document fencing, and serialized indexing", async () => {
  globalThis.__ingestionLeaseDbTestUrl = connectionString;
  const {
    processIngestionWorkflowRun,
    acquireDocumentLock,
    resolveDocumentLockDatabaseUrl,
    workflowRun,
    document,
  } = await buildIngestionModule();
  const migrationName = (await readdir(resolve("drizzle"))).find((name) =>
    name.endsWith("_ingestion_worker_leases.sql"),
  );
  assert.ok(migrationName, "the ingestion lease migration exists in the Drizzle history");
  const migration = await readFile(resolve("drizzle", migrationName), "utf8");
  const schemaName = `lease_it_${randomUUID().replaceAll("-", "")}`;
  const clientOptions = {
    max: 1,
    prepare: false,
    connection: { search_path: `${schemaName},public` },
  };
  const admin = postgres(connectionString, { max: 1, prepare: false });
  const heartbeatClient = postgres(connectionString, clientOptions);
  const liveContenderClient = postgres(connectionString, clientOptions);
  const staleWorkerClient = postgres(connectionString, clientOptions);
  const replacementClient = postgres(connectionString, clientOptions);
  const sharedAppClient = postgres(connectionString, clientOptions);
  const heartbeatDb = drizzle(heartbeatClient, { schema: { workflowRun, document } });
  const liveContenderDb = drizzle(liveContenderClient, { schema: { workflowRun, document } });
  const staleWorkerDb = drizzle(staleWorkerClient, { schema: { workflowRun, document } });
  const replacementDb = drizzle(replacementClient, { schema: { workflowRun, document } });
  const sharedAppDb = drizzle(sharedAppClient, { schema: { workflowRun, document } });
  const workspaceId = "lease-test-workspace";
  const heartbeatRunId = randomUUID();
  const heartbeatDocumentId = randomUUID();
  const staleRunId = randomUUID();
  const staleDocumentId = randomUUID();
  const sharedRunOneId = randomUUID();
  const sharedRunTwoId = randomUUID();
  const sharedDocumentId = randomUUID();
  const startedWorkers = [];
  const heartbeatIndexStarted = deferred();
  const releaseHeartbeatIndex = deferred();
  const staleIndexStarted = deferred();
  const releaseStaleIndex = deferred();
  const sharedIndexStarted = deferred();
  const releaseSharedIndex = deferred();
  const counts = new Map();
  let activeIndexes = 0;
  let maxActiveIndexes = 0;

  globalThis.__ingestionLeaseDbTest = {
    indexDocument: async (documentId) => {
      const calls = (counts.get(documentId) ?? 0) + 1;
      counts.set(documentId, calls);
      activeIndexes += 1;
      maxActiveIndexes = Math.max(maxActiveIndexes, activeIndexes);
      try {
        if (documentId === heartbeatDocumentId && calls === 1) {
          heartbeatIndexStarted.resolve();
          await releaseHeartbeatIndex.promise;
        }
        if (documentId === staleDocumentId && calls === 1) {
          staleIndexStarted.resolve();
          await releaseStaleIndex.promise;
        }
        if (documentId === sharedDocumentId && calls === 1) {
          sharedIndexStarted.resolve();
          await releaseSharedIndex.promise;
        }
      } finally {
        activeIndexes -= 1;
      }
    },
  };

  async function insertRun(runId, documentId, idempotencyKey) {
    await admin.unsafe(
      `INSERT INTO workflow_run ("id", "name", "status", "idempotencyKey", "input", "workspaceId") VALUES ($1, 'document.process', 'QUEUED', $2, $3, $4)`,
      [
        runId,
        idempotencyKey,
        JSON.stringify({ type: "document.process", workspaceId, documentId, idempotencyKey }),
        workspaceId,
      ],
    );
    await admin.unsafe(
      `INSERT INTO document ("id", "title", "sourceType", "storageKey", "status", "updatedAt", "workspaceId") VALUES ($1, $2, 'TXT', 'indexed text', 'PROCESSING', now(), $3) ON CONFLICT ("id") DO NOTHING`,
      [documentId, `Lease test ${idempotencyKey}`, workspaceId],
    );
  }

  try {
    assert.equal(
      resolveDocumentLockDatabaseUrl(
        "postgres://app:secret@ep-example-pooler.us-east-1.aws.neon.tech/app",
        "postgres://app:secret@ep-example.us-east-1.aws.neon.tech/app",
      ),
      "postgres://app:secret@ep-example.us-east-1.aws.neon.tech/app",
    );
    assert.throws(
      () =>
        resolveDocumentLockDatabaseUrl(
          "postgres://app:secret@ep-example-pooler.us-east-1.aws.neon.tech/app",
          undefined,
        ),
      /DATABASE_URL_UNPOOLED is required.*Neon pooling/,
    );
    assert.equal(
      resolveDocumentLockDatabaseUrl("postgres://app:secret@localhost/app", undefined),
      "postgres://app:secret@localhost/app",
    );
    await admin.unsafe(`CREATE SCHEMA "${schemaName}"`);
    for (const client of [
      admin,
      heartbeatClient,
      liveContenderClient,
      staleWorkerClient,
      replacementClient,
      sharedAppClient,
    ]) {
      await client.unsafe(`SET search_path TO "${schemaName}", public`);
    }
    await admin.unsafe(`CREATE TABLE workflow_run (
      "id" text PRIMARY KEY NOT NULL,
      "name" text NOT NULL,
      "status" text DEFAULT 'RUNNING' NOT NULL,
      "idempotencyKey" text,
      "input" text DEFAULT '{}' NOT NULL,
      "output" text,
      "errorMessage" text,
      "attempts" integer DEFAULT 0 NOT NULL,
      "maxAttempts" integer DEFAULT 3 NOT NULL,
      "startedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "finishedAt" timestamptz,
      "conversationId" text,
      "workspaceId" text NOT NULL,
      UNIQUE ("workspaceId", "idempotencyKey")
    )`);
    await admin.unsafe(migration);
    await admin.unsafe(`CREATE TABLE document (
      "id" text PRIMARY KEY NOT NULL,
      "title" text NOT NULL,
      "sourceType" text NOT NULL,
      "sourceUrl" text,
      "storageKey" text,
      "mimeType" text,
      "status" text DEFAULT 'PROCESSING' NOT NULL,
      "errorMessage" text,
      "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
      "updatedAt" timestamptz NOT NULL,
      "workspaceId" text NOT NULL
    )`);

    await assert.rejects(
      acquireDocumentLock("failed-acquisition", async () => {
        throw new Error("simulated lease assertion failure");
      }),
      /simulated lease assertion failure/,
    );
    let queuedLeaseChecks = 0;
    const firstBoundedLock = await acquireDocumentLock("bounded-lock-one", async () => {});
    const secondBoundedLock = await acquireDocumentLock("bounded-lock-two", async () => {});
    const queuedBoundedLock = acquireDocumentLock("bounded-lock-three", async () => {
      queuedLeaseChecks += 1;
    });
    await new Promise((resolve) => setTimeout(resolve, 250));
    await sharedAppClient`SELECT 1 AS app_query_while_lock_pool_full`;
    assert.ok(queuedLeaseChecks >= 2, "jobs waiting on the bounded pool continue checking leases");
    await firstBoundedLock();
    const thirdLockRelease = await queuedBoundedLock;
    await secondBoundedLock();
    await thirdLockRelease();

    await insertRun(heartbeatRunId, heartbeatDocumentId, "heartbeat-test-job");
    const heartbeatWork = processIngestionWorkflowRun({
      db: heartbeatDb,
      workspaceId,
      workflowRunId: heartbeatRunId,
      allowStaleRunning: true,
      leaseTiming: { durationMs: 1_200, heartbeatMs: 60 },
    });
    startedWorkers.push(heartbeatWork);
    await heartbeatIndexStarted.promise;
    await new Promise((resolve) => setTimeout(resolve, 240));
    const renewed = await admin.unsafe(
      `SELECT "leaseExpiresAt" FROM workflow_run WHERE "id" = $1`,
      [heartbeatRunId],
    );
    assert.ok(
      new Date(renewed[0].leaseExpiresAt).getTime() > Date.now() + 700,
      "the worker heartbeat renews the migrated lease row",
    );
    const refusedLiveClaim = await processIngestionWorkflowRun({
      db: liveContenderDb,
      workspaceId,
      workflowRunId: heartbeatRunId,
      allowStaleRunning: true,
      leaseTiming: { durationMs: 1_200, heartbeatMs: 60 },
    });
    assert.equal(
      refusedLiveClaim.claimed,
      false,
      "a second worker cannot claim a live heartbeat lease",
    );
    releaseHeartbeatIndex.resolve();
    assert.equal((await heartbeatWork).claimed, true);

    await insertRun(staleRunId, staleDocumentId, "stale-test-job");
    const staleWork = processIngestionWorkflowRun({
      db: staleWorkerDb,
      workspaceId,
      workflowRunId: staleRunId,
      allowStaleRunning: true,
      leaseTiming: { durationMs: 1_200, heartbeatMs: 60, enabled: false },
    });
    startedWorkers.push(staleWork);
    await staleIndexStarted.promise;
    await admin.unsafe(
      `UPDATE workflow_run SET "leaseExpiresAt" = now() - interval '1 second' WHERE "id" = $1`,
      [staleRunId],
    );
    const replacementWork = processIngestionWorkflowRun({
      db: replacementDb,
      workspaceId,
      workflowRunId: staleRunId,
      allowStaleRunning: true,
      leaseTiming: { durationMs: 1_200, heartbeatMs: 60, enabled: false },
    });
    startedWorkers.push(replacementWork);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(
      counts.get(staleDocumentId),
      1,
      "replacement indexing waits for the document lock",
    );
    assert.equal(maxActiveIndexes, 1, "provider index mutations never overlap for this document");

    releaseStaleIndex.resolve();
    await assert.rejects(staleWork, /lease was lost/i);
    assert.equal((await replacementWork).claimed, true);
    assert.equal(
      counts.get(staleDocumentId),
      2,
      "replacement reindexes after the old owner releases its lock",
    );
    assert.equal(maxActiveIndexes, 1);

    const [finalRun] = await admin.unsafe(
      `SELECT "status", "leaseToken" FROM workflow_run WHERE "id" = $1`,
      [staleRunId],
    );
    const [finalDocument] = await admin.unsafe(`SELECT "status" FROM document WHERE "id" = $1`, [
      staleDocumentId,
    ]);
    assert.equal(finalRun.status, "COMPLETED");
    assert.equal(finalRun.leaseToken, null);
    assert.equal(finalDocument.status, "READY");

    await insertRun(sharedRunOneId, sharedDocumentId, "shared-session-job-one");
    await insertRun(sharedRunTwoId, sharedDocumentId, "shared-session-job-two");
    const sharedWorkOne = processIngestionWorkflowRun({
      db: sharedAppDb,
      workspaceId,
      workflowRunId: sharedRunOneId,
      allowStaleRunning: true,
      leaseTiming: { durationMs: 1_200, heartbeatMs: 60, enabled: false },
    });
    startedWorkers.push(sharedWorkOne);
    await sharedIndexStarted.promise;
    const sharedWorkTwo = processIngestionWorkflowRun({
      db: sharedAppDb,
      workspaceId,
      workflowRunId: sharedRunTwoId,
      allowStaleRunning: true,
      leaseTiming: { durationMs: 1_200, heartbeatMs: 60, enabled: false },
    });
    startedWorkers.push(sharedWorkTwo);
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(
      counts.get(sharedDocumentId),
      1,
      "jobs sharing one app Db client use distinct dedicated PostgreSQL lock sessions",
    );
    assert.equal(maxActiveIndexes, 1);
    releaseSharedIndex.resolve();
    assert.equal((await sharedWorkOne).claimed, true);
    assert.equal((await sharedWorkTwo).claimed, true);
    assert.equal(counts.get(sharedDocumentId), 2);
    assert.equal(maxActiveIndexes, 1);
  } finally {
    releaseHeartbeatIndex.resolve();
    releaseStaleIndex.resolve();
    releaseSharedIndex.resolve();
    await Promise.allSettled(startedWorkers);
    await admin.unsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await Promise.all([
      heartbeatClient.end(),
      liveContenderClient.end(),
      staleWorkerClient.end(),
      replacementClient.end(),
      sharedAppClient.end(),
      admin.end(),
    ]);
    delete globalThis.__ingestionLeaseDbTest;
    delete globalThis.__ingestionLeaseDbTestUrl;
  }
});
