import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const outputFile = join(tmpdir(), `cogni-search-item-cleanup-policy-${process.pid}.mjs`);

await build({
  entryPoints: ["src/features/knowledge/server/search-item-cleanup-policy.ts"],
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
});

const {
  getSearchItemCleanupClaimLimit,
  getSearchItemCleanupRetryDelayMs,
  searchItemCleanupClaimLeaseMs,
  searchItemCleanupMaxOperationPerRowMs,
  searchItemCleanupMaxClaimBatchSize,
  shouldPersistSearchItemIdentity,
} = await import(pathToFileURL(outputFile).href);

test("an unchanged revision persists a newly returned provider item id", () => {
  assert.equal(
    shouldPersistSearchItemIdentity({
      revisionStatus: "unchanged",
      currentItemId: null,
      currentItemKey: "document.revision.txt",
      nextItemId: "provider-item-1",
    }),
    true,
  );
  assert.equal(
    shouldPersistSearchItemIdentity({
      revisionStatus: "unchanged",
      currentItemId: "provider-item-1",
      currentItemKey: "document.revision.txt",
      nextItemId: "provider-item-1",
    }),
    false,
  );
});

test("cleanup retries back off exponentially with a bounded maximum", () => {
  assert.equal(getSearchItemCleanupRetryDelayMs(1), 30_000);
  assert.equal(getSearchItemCleanupRetryDelayMs(2), 60_000);
  assert.equal(getSearchItemCleanupRetryDelayMs(3), 120_000);
  assert.equal(getSearchItemCleanupRetryDelayMs(100), 6 * 60 * 60 * 1_000);
  assert.equal(getSearchItemCleanupRetryDelayMs(Number.NaN), 30_000);
});

test("cleanup claim batches stay within the lease budget", () => {
  assert.equal(getSearchItemCleanupClaimLimit(1), 1);
  assert.equal(getSearchItemCleanupClaimLimit(50), searchItemCleanupMaxClaimBatchSize);
  assert.ok(
    searchItemCleanupMaxClaimBatchSize * searchItemCleanupMaxOperationPerRowMs <
      searchItemCleanupClaimLeaseMs,
  );
});

test.after(async () => {
  await unlink(outputFile).catch(() => undefined);
});
