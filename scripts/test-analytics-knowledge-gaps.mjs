import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/knowledge-gaps.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const analyticsModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { aggregateKnowledgeGaps } = analyticsModule;

test("groups repeats despite capitalization, punctuation, and whitespace", () => {
  const result = aggregateKnowledgeGaps([
    {
      conversationId: "first",
      question: "How do I reset my password?",
      askedAt: "2026-10-01T10:00:00.000Z",
    },
    {
      conversationId: "latest",
      question: "HOW do I reset my password!",
      askedAt: "2026-10-03T10:00:00.000Z",
    },
  ]);

  assert.deepEqual(result, [
    {
      conversationId: "latest",
      question: "HOW do I reset my password!",
      askedAt: "2026-10-03T10:00:00.000Z",
      count: 2,
    },
  ]);
});

test("orders recurring gaps before newer one-off questions", () => {
  const result = aggregateKnowledgeGaps([
    {
      conversationId: "one-off",
      question: "Where can I find my invoice?",
      askedAt: "2026-10-03T11:00:00.000Z",
    },
    {
      conversationId: "repeat-1",
      question: "Can I change my plan?",
      askedAt: "2026-10-01T11:00:00.000Z",
    },
    {
      conversationId: "repeat-2",
      question: "Can I change my plan?",
      askedAt: "2026-10-02T11:00:00.000Z",
    },
  ]);

  assert.deepEqual(
    result.map(({ question, count }) => [question, count]),
    [
      ["Can I change my plan?", 2],
      ["Where can I find my invoice?", 1],
    ],
  );
  assert.equal(result[0].conversationId, "repeat-2");
});

test("keeps distinct questions separate and skips empty normalized questions", () => {
  const result = aggregateKnowledgeGaps([
    { conversationId: "a", question: "Refund?", askedAt: "2026-10-01T10:00:00.000Z" },
    { conversationId: "b", question: "Refund status?", askedAt: "2026-10-02T10:00:00.000Z" },
    { conversationId: "c", question: "?!", askedAt: "2026-10-03T10:00:00.000Z" },
  ]);

  assert.equal(result.length, 2);
});
