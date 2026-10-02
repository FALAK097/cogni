import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/date-range.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const analyticsDates = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { resolveAnalyticsDateRange, InvalidAnalyticsDateRangeError } = analyticsDates;

test("workspace calendar days map to the correct UTC bounds", () => {
  const range = resolveAnalyticsDateRange("2026-01-10", "2026-01-10", "Asia/Kolkata");

  assert.equal(range.startAt.toISOString(), "2026-01-09T18:30:00.000Z");
  assert.equal(range.endBefore.toISOString(), "2026-01-10T18:30:00.000Z");
  assert.equal(range.previousStartAt.toISOString(), "2026-01-08T18:30:00.000Z");
  assert.equal(range.previousEndBefore.toISOString(), "2026-01-09T18:30:00.000Z");
});

test("day bounds account for daylight-saving transitions", () => {
  const springForward = resolveAnalyticsDateRange(
    "2026-03-08",
    "2026-03-08",
    "America/Los_Angeles",
  );
  const fallBack = resolveAnalyticsDateRange("2026-11-01", "2026-11-01", "America/Los_Angeles");

  assert.equal(springForward.startAt.toISOString(), "2026-03-08T08:00:00.000Z");
  assert.equal(springForward.endBefore.toISOString(), "2026-03-09T07:00:00.000Z");
  assert.equal(fallBack.startAt.toISOString(), "2026-11-01T07:00:00.000Z");
  assert.equal(fallBack.endBefore.toISOString(), "2026-11-02T08:00:00.000Z");
});

test("default range follows the workspace date even when the server date differs", () => {
  const now = new Date("2026-10-02T01:00:00.000Z");

  const kolkata = resolveAnalyticsDateRange(null, null, "Asia/Kolkata", now);
  const losAngeles = resolveAnalyticsDateRange(undefined, undefined, "America/Los_Angeles", now);

  assert.equal(kolkata.startDate, "2026-09-26");
  assert.equal(kolkata.endDate, "2026-10-02");
  assert.equal(losAngeles.startDate, "2026-09-25");
  assert.equal(losAngeles.endDate, "2026-10-01");
});

test("incomplete, malformed, and reversed date ranges are rejected", () => {
  assert.throws(
    () => resolveAnalyticsDateRange("2026-10-01", null, "UTC"),
    InvalidAnalyticsDateRangeError,
  );
  assert.throws(
    () => resolveAnalyticsDateRange("2026-02-30", "2026-03-01", "UTC"),
    InvalidAnalyticsDateRangeError,
  );
  assert.throws(
    () => resolveAnalyticsDateRange("2026-10-02", "2026-10-01", "UTC"),
    InvalidAnalyticsDateRangeError,
  );
});
