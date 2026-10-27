import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const postgres = require("postgres");
const { sql } = require("drizzle-orm");
require("dotenv").config();

process.env.SKIP_ENV_VALIDATION ??= "true";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Source revision integration tests require a local DATABASE_URL.");
}

const outputFile = join(tmpdir(), `cogni-source-revisions-${process.pid}.mjs`);
await build({
  stdin: {
    contents: `import postgres from "postgres";
      import { drizzle } from "drizzle-orm/postgres-js";
      import * as schema from "@/lib/db/schema";
      import * as relations from "@/lib/db/relations";
      export function createTestDb(databaseUrl) {
        const client = postgres(databaseUrl, { max: 1, prepare: false });
        return {
          db: drizzle(client, { schema: { ...schema, ...relations } }),
          close: () => client.end(),
        };
      }
      export * from "@/features/knowledge/server/source-revisions";`,
    resolveDir: process.cwd(),
    sourcefile: "source-revisions-db-entry.ts",
  },
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "bundle",
  nodePaths: [process.env.COGNI_TEST_NODE_MODULES ?? resolve("node_modules")],
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "server-only-test-stub",
      setup(context) {
        context.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "stub",
        }));
        context.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
  ],
});

const {
  createTestDb,
  recordDocumentRevision,
  resolveDocumentRevision,
  markDocumentRevisionsDeleted,
  hashSourceContent,
  enqueueSearchItemCleanup,
  reserveSearchItemCleanup,
  renewSearchItemCleanupReservationInTransaction,
  drainSearchItemCleanupWith,
} = await import(pathToFileURL(outputFile).href);

async function waitForEvent(promise, eventName, timeoutMs = 5000) {
  let timeout;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error(`Timed out waiting for ${eventName}.`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForCleanupClaim(raw, cleanupId, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const [row] = await raw`
      SELECT "claimedUntil"
      FROM search_item_cleanup
      WHERE id = ${cleanupId}`;
    if (row && new Date(row.claimedUntil).getTime() > Date.now()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Cleanup worker did not claim the expired upload reservation.");
}

const timestamp = new Date().toISOString();

test("source revisions are stable, tenant-scoped, and leave identity-only deletion records", async () => {
  const raw = postgres(databaseUrl, { max: 1, prepare: false });
  const primaryClient = createTestDb(databaseUrl);
  const db = primaryClient.db;
  const competingClient = createTestDb(databaseUrl);
  const workspaceId = randomUUID();
  const foreignWorkspaceId = randomUUID();
  const sourceId = randomUUID();
  const legacySourceId = randomUUID();
  const unsupportedSourceId = randomUUID();
  const foreignSourceId = randomUUID();
  const activeSourceId = randomUUID();
  const raceSourceId = randomUUID();

  try {
    await raw`INSERT INTO workspace (id, name, slug, "updatedAt") VALUES
      (${workspaceId}, 'Revision test', ${workspaceId}, ${timestamp}),
      (${foreignWorkspaceId}, 'Foreign revision test', ${foreignWorkspaceId}, ${timestamp})`;
    await raw`INSERT INTO document (id, title, "sourceType", status, "updatedAt", "workspaceId") VALUES
      (${sourceId}, 'Policy', 'TXT', 'READY', ${timestamp}, ${workspaceId}),
      (${legacySourceId}, 'Legacy policy', 'TXT', 'READY', ${timestamp}, ${workspaceId}),
      (${unsupportedSourceId}, 'Sitemap', 'SITEMAP', 'READY', ${timestamp}, ${workspaceId}),
      (${activeSourceId}, 'Active policy', 'TXT', 'READY', ${timestamp}, ${workspaceId}),
      (${raceSourceId}, 'Upload race policy', 'TXT', 'READY', ${timestamp}, ${workspaceId}),
      (${foreignSourceId}, 'Foreign policy', 'TXT', 'READY', ${timestamp}, ${foreignWorkspaceId})`;

    const originalContent = "Support is available Monday through Friday.";
    const first = await recordDocumentRevision(db, {
      workspaceId,
      documentId: sourceId,
      content: originalContent,
    });
    assert.equal(first.status, "created");
    assert.equal(first.revisionNumber, 1);
    assert.equal(first.contentSha256, hashSourceContent(originalContent));

    const unchanged = await recordDocumentRevision(db, {
      workspaceId,
      documentId: sourceId,
      content: originalContent,
    });
    assert.equal(unchanged.status, "unchanged");
    assert.equal(unchanged.revisionId, first.revisionId);
    assert.equal(unchanged.revisionNumber, 1);

    const revised = await recordDocumentRevision(db, {
      workspaceId,
      documentId: sourceId,
      content: "Support is available Monday through Saturday.",
    });
    assert.equal(revised.status, "created");
    assert.equal(revised.revisionNumber, 2);
    assert.notEqual(revised.revisionId, first.revisionId);

    const current = await resolveDocumentRevision(db, workspaceId, sourceId);
    assert.equal(current.status, "versioned");
    assert.equal(current.revisionId, revised.revisionId);
    assert.equal(current.revisionNumber, 2);
    assert.equal(current.contentSha256, revised.contentSha256);

    const history = await raw`
      SELECT id, "revisionNumber", "contentSha256", "sourceType", status
      FROM document_revision
      WHERE "workspaceId" = ${workspaceId} AND "documentId" = ${sourceId}
      ORDER BY "revisionNumber"`;
    assert.deepEqual(
      history.map((row) => [row.revisionNumber, row.status]),
      [
        [1, "SUPERSEDED"],
        [2, "CURRENT"],
      ],
    );
    assert.equal(history[0].contentSha256, hashSourceContent(originalContent));
    assert.equal("content" in history[0], false);

    assert.deepEqual(await resolveDocumentRevision(db, workspaceId, legacySourceId), {
      status: "legacy-unversioned",
    });
    assert.deepEqual(await resolveDocumentRevision(db, workspaceId, unsupportedSourceId), {
      status: "unsupported-source",
      sourceType: "SITEMAP",
    });
    assert.deepEqual(
      await recordDocumentRevision(db, {
        workspaceId,
        documentId: unsupportedSourceId,
        content: "Must not create an identity.",
      }),
      { status: "unsupported-source", sourceType: "SITEMAP" },
    );

    await assert.rejects(
      recordDocumentRevision(db, {
        workspaceId,
        documentId: foreignSourceId,
        content: "Cross-workspace access must fail.",
      }),
      /not found in this workspace/,
    );
    assert.deepEqual(await resolveDocumentRevision(db, workspaceId, foreignSourceId), {
      status: "not-found",
    });
    assert.equal(
      (await raw`SELECT id FROM document_revision WHERE "documentId" = ${foreignSourceId}`).length,
      0,
    );

    await db.transaction(async (transaction) => {
      await markDocumentRevisionsDeleted(transaction, workspaceId, sourceId);
      await transaction.execute(
        sql`DELETE FROM document WHERE id = ${sourceId} AND "workspaceId" = ${workspaceId}`,
      );
    });
    const tombstones = await raw`
      SELECT id, "workspaceId", "documentId", "revisionNumber", "contentSha256", "sourceType", status
      FROM document_revision
      WHERE "workspaceId" = ${workspaceId} AND "documentId" = ${sourceId}
      ORDER BY "revisionNumber"`;
    assert.deepEqual(
      tombstones.map((row) => row.status),
      ["DELETED", "DELETED"],
    );
    assert.equal("content" in tombstones[0], false);
    const cleanupItems = await raw`
      SELECT "workspaceId", "documentId", "itemId", "itemKey"
      FROM search_item_cleanup
      WHERE "workspaceId" = ${workspaceId} AND "documentId" = ${sourceId}`;
    assert.equal(cleanupItems.length, 2);
    assert.ok(cleanupItems.every((item) => item.itemId === null));
    assert.ok(cleanupItems.every((item) => item.itemKey === `${sourceId}.txt`));
    assert.ok(cleanupItems.every((item) => item.workspaceId === workspaceId));
    assert.equal("content" in cleanupItems[0], false);

    // Move unrelated tombstone rows onto retry backoff so the orphan assertions below observe
    // only their own reservation instead of depending on every eligible workspace cleanup row.
    const failedCleanup = await drainSearchItemCleanupWith(db, {
      workspaceId,
      deleteItem: async () => true,
      deleteItemsByKey: async () => {
        throw new Error("Provider unavailable");
      },
    });
    assert.equal(failedCleanup.cleanupFailed, 2);
    const scheduledRetries = await raw`
      SELECT attempts, "nextAttemptAt", "claimedUntil"
      FROM search_item_cleanup
      WHERE "workspaceId" = ${workspaceId} AND "documentId" = ${sourceId}`;
    assert.ok(scheduledRetries.every((item) => item.attempts === 1));
    assert.ok(scheduledRetries.every((item) => new Date(item.nextAttemptAt) > new Date()));
    assert.ok(scheduledRetries.every((item) => item.claimedUntil === null));
    const immediateRetry = await drainSearchItemCleanupWith(db, {
      workspaceId,
      deleteItem: async () => true,
      deleteItemsByKey: async () => true,
    });
    assert.equal(immediateRetry.cleanupCandidates, 0);

    const orphanKey = `${sourceId}.orphan-after-crash.txt`;
    await reserveSearchItemCleanup(db, {
      workspaceId,
      documentId: sourceId,
      itemKey: orphanKey,
    });
    const providerItems = new Set([orphanKey]);
    const duringUpload = await drainSearchItemCleanupWith(db, {
      workspaceId,
      deleteItem: async () => true,
      deleteItemsByKey: async (itemKey) => {
        providerItems.delete(itemKey);
        return true;
      },
    });
    assert.equal(duringUpload.cleanupCandidates, 0);
    assert.equal(providerItems.has(orphanKey), true);
    await raw`
      UPDATE search_item_cleanup
      SET "claimedUntil" = ${new Date(Date.now() - 1).toISOString()}
      WHERE "workspaceId" = ${workspaceId} AND "documentId" = ${sourceId}
        AND "itemKey" = ${orphanKey}`;
    const afterCrash = await drainSearchItemCleanupWith(db, {
      workspaceId,
      deleteItem: async () => true,
      deleteItemsByKey: async (itemKey) => {
        providerItems.delete(itemKey);
        return true;
      },
    });
    assert.equal(afterCrash.cleanupDeleted, 1);
    assert.equal(providerItems.has(orphanKey), false);

    const raceKey = `${raceSourceId}.upload-race.txt`;
    const raceReservationId = await reserveSearchItemCleanup(db, {
      workspaceId,
      documentId: raceSourceId,
      itemKey: raceKey,
    });
    await raw`
      UPDATE search_item_cleanup
      SET "claimedUntil" = ${new Date(Date.now() - 1).toISOString()}
      WHERE id = ${raceReservationId}`;

    let releaseUploadStart;
    let releaseSimulatedCrash;
    let signalSourceLocked;
    let signalUploadAccepted;
    const sourceLocked = new Promise((resolve) => {
      signalSourceLocked = resolve;
    });
    const uploadAccepted = new Promise((resolve) => {
      signalUploadAccepted = resolve;
    });
    const waitToStartUpload = new Promise((resolve) => {
      releaseUploadStart = resolve;
    });
    const waitToSimulateCrash = new Promise((resolve) => {
      releaseSimulatedCrash = resolve;
    });
    const providerItemsAfterCrash = new Set();
    const crashedUploadTransaction = db.transaction(async (transaction) => {
      const sourceRows = await transaction.execute(
        sql`SELECT id FROM document WHERE id = ${raceSourceId} AND "workspaceId" = ${workspaceId} FOR UPDATE`,
      );
      assert.equal(sourceRows.length, 1);
      signalSourceLocked();
      await waitToStartUpload;
      assert.equal(
        await renewSearchItemCleanupReservationInTransaction(transaction, {
          workspaceId,
          documentId: raceSourceId,
          reservationId: raceReservationId,
        }),
        true,
      );
      providerItemsAfterCrash.add(raceKey);
      signalUploadAccepted();
      await waitToSimulateCrash;
      throw new Error("Simulated process crash after provider upload.");
    });
    let cleanupDeleteStarted = false;
    let cleanupWaitingForUpload;

    try {
      await waitForEvent(sourceLocked, "source lock");
      cleanupWaitingForUpload = drainSearchItemCleanupWith(competingClient.db, {
        workspaceId,
        deleteItem: async () => true,
        deleteItemsByKey: async (itemKey) => {
          cleanupDeleteStarted = true;
          providerItemsAfterCrash.delete(itemKey);
          return true;
        },
      });
      await waitForCleanupClaim(raw, raceReservationId);
      assert.equal(cleanupDeleteStarted, false);
      const [reservationWhileClaimed] = await raw`
        SELECT id FROM search_item_cleanup WHERE id = ${raceReservationId}`;
      assert.ok(reservationWhileClaimed);

      releaseUploadStart();
      await waitForEvent(uploadAccepted, "simulated provider upload");
      assert.equal(providerItemsAfterCrash.has(raceKey), true);
      assert.equal(cleanupDeleteStarted, false);

      releaseSimulatedCrash();
      await assert.rejects(
        crashedUploadTransaction,
        /Simulated process crash after provider upload/,
      );
      const recoveredOrphan = await waitForEvent(cleanupWaitingForUpload, "orphan cleanup");
      assert.equal(recoveredOrphan.cleanupDeleted, 1);
      assert.equal(cleanupDeleteStarted, true);
      assert.equal(providerItemsAfterCrash.has(raceKey), false);
    } finally {
      releaseUploadStart();
      releaseSimulatedCrash();
      await Promise.allSettled([crashedUploadTransaction, cleanupWaitingForUpload].filter(Boolean));
    }

    const activeRevision = await recordDocumentRevision(db, {
      workspaceId,
      documentId: activeSourceId,
      content: "This is still the current indexed policy.",
    });
    assert.equal(activeRevision.status, "created");
    const activeKey = `${activeSourceId}.${activeRevision.revisionId}.txt`;
    await raw`
      UPDATE document_revision
      SET "providerItemId" = 'active-provider-item', "providerItemKey" = ${activeKey}
      WHERE id = ${activeRevision.revisionId} AND "workspaceId" = ${workspaceId}`;
    await reserveSearchItemCleanup(db, {
      workspaceId,
      documentId: activeSourceId,
      itemKey: activeKey,
    });
    await raw`
      UPDATE search_item_cleanup
      SET "claimedUntil" = ${new Date(Date.now() - 1).toISOString()}
      WHERE "workspaceId" = ${workspaceId} AND "documentId" = ${activeSourceId}
        AND "itemKey" = ${activeKey}`;
    let activeProviderDeleteCalled = false;
    const protectedCurrentItem = await drainSearchItemCleanupWith(db, {
      workspaceId,
      deleteItem: async () => {
        activeProviderDeleteCalled = true;
        return true;
      },
      deleteItemsByKey: async () => {
        activeProviderDeleteCalled = true;
        return true;
      },
    });
    assert.equal(protectedCurrentItem.cleanupDeleted, 1);
    assert.equal(activeProviderDeleteCalled, false);

    await raw`
      UPDATE document_revision
      SET "providerItemId" = NULL
      WHERE id = ${activeRevision.revisionId} AND "workspaceId" = ${workspaceId}`;
    await reserveSearchItemCleanup(db, {
      workspaceId,
      documentId: activeSourceId,
      itemKey: activeKey,
    });
    await raw`
      UPDATE search_item_cleanup
      SET "claimedUntil" = ${new Date(Date.now() - 1).toISOString()}
      WHERE "workspaceId" = ${workspaceId} AND "documentId" = ${activeSourceId}
        AND "itemKey" = ${activeKey}`;
    let orphanedCurrentItemDeleted = false;
    const orphanedCurrentItem = await drainSearchItemCleanupWith(db, {
      workspaceId,
      deleteItem: async () => true,
      deleteItemsByKey: async (itemKey) => {
        orphanedCurrentItemDeleted = itemKey === activeKey;
        return true;
      },
    });
    assert.equal(orphanedCurrentItem.cleanupDeleted, 1);
    assert.equal(orphanedCurrentItemDeleted, true);

    await enqueueSearchItemCleanup(db, {
      workspaceId,
      documentId: sourceId,
      itemKey: `${sourceId}.claim-test.txt`,
    });
    let releaseClaim;
    let signalClaimed;
    const claimed = new Promise((resolve) => {
      signalClaimed = resolve;
    });
    const holdProviderRequest = new Promise((resolve) => {
      releaseClaim = resolve;
    });
    const firstDrain = drainSearchItemCleanupWith(db, {
      workspaceId,
      deleteItem: async () => true,
      deleteItemsByKey: async () => {
        signalClaimed();
        await holdProviderRequest;
        return true;
      },
    });
    let claimTimeout;
    let competingDrain;
    try {
      await Promise.race([
        claimed,
        new Promise((_, reject) => {
          claimTimeout = setTimeout(
            () => reject(new Error("Cleanup claim was not acquired.")),
            5000,
          );
        }),
      ]);
      competingDrain = await drainSearchItemCleanupWith(competingClient.db, {
        workspaceId,
        deleteItem: async () => true,
        deleteItemsByKey: async () => true,
      });
    } finally {
      clearTimeout(claimTimeout);
      releaseClaim();
      await firstDrain.catch(() => undefined);
    }
    const firstDrainResult = await firstDrain;
    assert.equal(competingDrain.cleanupCandidates, 0);
    assert.equal(firstDrainResult.cleanupDeleted, 1);
    assert.deepEqual(await resolveDocumentRevision(db, workspaceId, sourceId), {
      status: "deleted",
      revisionId: revised.revisionId,
      revisionNumber: 2,
      contentSha256: revised.contentSha256,
      sourceType: "TXT",
    });
  } finally {
    try {
      await raw`DELETE FROM workspace WHERE id IN (${workspaceId}, ${foreignWorkspaceId})`;
    } finally {
      try {
        await Promise.all([primaryClient.close(), competingClient.close(), raw.end()]);
      } finally {
        await unlink(outputFile).catch(() => undefined);
      }
    }
  }
});
