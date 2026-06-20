import assert from "node:assert/strict";
import test from "node:test";

import {
  isProductionReviewPassing,
  runProductionReview,
} from "../src/lib/production/review-checks-core.ts";

test("production review includes security, performance, and readiness checks", () => {
  const report = runProductionReview();
  const categories = new Set(report.checks.map((check) => check.category));

  assert.equal(categories.has("security"), true);
  assert.equal(categories.has("performance"), true);
  assert.equal(categories.has("readiness"), true);
  assert.ok(report.checks.length >= 20);
});

test("production review passes with no blocking failures in repository baseline", () => {
  const report = runProductionReview();
  assert.equal(isProductionReviewPassing(report), true);
  assert.equal(report.summary.fail, 0);
});
