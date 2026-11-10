import assert from "node:assert/strict";
import { test } from "node:test";

function computeSourceHealth(sources) {
  const readyCount = sources.filter((s) => s.status === "ready" || s.status === "indexed").length;
  const processingCount = sources.filter((s) => s.status === "processing").length;
  const failedCount = sources.filter((s) => s.status === "failed").length;
  const hasFailures = failedCount > 0;

  return {
    total: sources.length,
    readyCount,
    processingCount,
    failedCount,
    hasFailures,
  };
}

function getSourceProvenanceInfo(source) {
  const isFailed = source.status === "failed";
  const errorMessage = isFailed && source.lastError ? source.lastError : null;
  const isReady = source.status === "ready" || source.status === "indexed";
  const lastSyncTime = isReady && source.lastFetchedAt ? source.lastFetchedAt : null;

  return {
    isFailed,
    errorMessage,
    isReady,
    lastSyncTime,
  };
}

test("computeSourceHealth accurately tallies ready, processing, and failed states", () => {
  const sources = [
    { id: "1", status: "ready" },
    { id: "2", status: "indexed" },
    { id: "3", status: "processing" },
    { id: "4", status: "failed", lastError: "HTTP 404 Not Found" },
  ];

  const health = computeSourceHealth(sources);
  assert.equal(health.total, 4);
  assert.equal(health.readyCount, 2);
  assert.equal(health.processingCount, 1);
  assert.equal(health.failedCount, 1);
  assert.equal(health.hasFailures, true);
});

test("computeSourceHealth returns hasFailures: false when all sources are healthy", () => {
  const sources = [
    { id: "1", status: "ready" },
    { id: "2", status: "ready" },
  ];

  const health = computeSourceHealth(sources);
  assert.equal(health.total, 2);
  assert.equal(health.readyCount, 2);
  assert.equal(health.processingCount, 0);
  assert.equal(health.failedCount, 0);
  assert.equal(health.hasFailures, false);
});

test("getSourceProvenanceInfo exposes error message only for failed sources", () => {
  const failedSource = {
    id: "1",
    status: "failed",
    lastError: "Crawl timeout after 30s",
    lastFetchedAt: "2026-10-09T10:00:00.000Z",
  };
  const readySource = {
    id: "2",
    status: "ready",
    lastError: "Old error that was resolved",
    lastFetchedAt: "2026-10-09T12:00:00.000Z",
  };

  const failedInfo = getSourceProvenanceInfo(failedSource);
  assert.equal(failedInfo.isFailed, true);
  assert.equal(failedInfo.errorMessage, "Crawl timeout after 30s");
  assert.equal(failedInfo.lastSyncTime, null);

  const readyInfo = getSourceProvenanceInfo(readySource);
  assert.equal(readyInfo.isFailed, false);
  assert.equal(readyInfo.errorMessage, null);
  assert.equal(readyInfo.lastSyncTime, "2026-10-09T12:00:00.000Z");
});
