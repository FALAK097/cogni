import {
  isProductionReviewPassing,
  runProductionReview,
} from "../src/lib/production/review-checks-core.ts";

const report = runProductionReview();

for (const check of report.checks) {
  const marker = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
  console.log(`[${marker}] ${check.category}:${check.id} — ${check.label}`);
  console.log(`       ${check.detail}`);
}

console.log("");
console.log(
  `Review summary: ${report.summary.pass} passed, ${report.summary.warn} warnings, ${report.summary.fail} failed`,
);

if (!isProductionReviewPassing(report)) {
  process.exit(1);
}
