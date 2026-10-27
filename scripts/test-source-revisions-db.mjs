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
    contents: `export { getDb } from "@/lib/db/client";
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
  getDb,
  recordDocumentRevision,
  resolveDocumentRevision,
  markDocumentRevisionsDeleted,
  hashSourceContent,
  enqueueSearchItemCleanup,
  drainSearchItemCleanupWith,
} = await import(pathToFileURL(outputFile).href);

const timestamp = new Date().toISOString();

test("source revisions are stable, tenant-scoped, and leave identity-only deletion records", async () => {
  const raw = postgres(databaseUrl, { max: 1, prepare: false });
  const db = getDb();
  const workspaceId = randomUUID();
  const foreignWorkspaceId = randomUUID();
  const sourceId = randomUUID();
  const legacySourceId = randomUUID();
  const unsupportedSourceId = randomUUID();
  const foreignSourceId = randomUUID();

  try {
    await raw`INSERT INTO workspace (id, name, slug, "updatedAt") VALUES
      (${workspaceId}, 'Revision test', ${workspaceId}, ${timestamp}),
      (${foreignWorkspaceId}, 'Foreign revision test', ${foreignWorkspaceId}, ${timestamp})`;
    await raw`INSERT INTO document (id, title, "sourceType", status, "updatedAt", "workspaceId") VALUES
      (${sourceId}, 'Policy', 'TXT', 'READY', ${timestamp}, ${workspaceId}),
      (${legacySourceId}, 'Legacy policy', 'TXT', 'READY', ${timestamp}, ${workspaceId}),
      (${unsupportedSourceId}, 'Sitemap', 'SITEMAP', 'READY', ${timestamp}, ${workspaceId}),
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
    await claimed;
    const competingDrain = await drainSearchItemCleanupWith(db, {
      workspaceId,
      deleteItem: async () => true,
      deleteItemsByKey: async () => true,
    });
    releaseClaim();
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
    await raw`DELETE FROM workspace WHERE id IN (${workspaceId}, ${foreignWorkspaceId})`;
    await raw.end();
    await unlink(outputFile).catch(() => undefined);
  }
});
