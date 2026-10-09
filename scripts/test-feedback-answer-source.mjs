import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/knowledge/feedback-answer.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { buildVerifiedAnswerSource, buildVerifiedAnswerTitle } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("verified answer source contains the question and only the owner-written answer", () => {
  const source = buildVerifiedAnswerSource(
    "  How do I change my plan?  ",
    "  Open Billing, choose a plan, and save.  ",
  );

  assert.equal(source.title, "Answer: How do I change my plan?");
  assert.equal(
    source.content,
    "Question: How do I change my plan?\n\nAnswer: Open Billing, choose a plan, and save.",
  );
});

test("titles stay within the source-title limit", () => {
  assert.equal(buildVerifiedAnswerTitle("Q".repeat(500)).length, 120);
});

test("empty or oversized answers cannot become knowledge sources", () => {
  assert.throws(() => buildVerifiedAnswerSource("Question", "  "), /Write a verified answer/);
  assert.throws(
    () => buildVerifiedAnswerSource("Question", "A".repeat(50_001)),
    /under 50,000 characters/,
  );
});

test("oversized source questions fail instead of being silently truncated", () => {
  assert.throws(
    () => buildVerifiedAnswerSource("Q".repeat(5_001), "Verified answer"),
    /question is too long/,
  );
});
