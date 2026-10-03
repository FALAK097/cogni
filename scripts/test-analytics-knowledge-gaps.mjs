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
      signals: ["UNANSWERED"],
    },
  ]);
});

test("combines separate question signals without duplicating a knowledge gap", () => {
  const result = aggregateKnowledgeGaps([
    {
      conversationId: "unanswered",
      question: "Where is my invoice?",
      askedAt: "2026-10-01T10:00:00.000Z",
      signal: "UNANSWERED",
    },
    {
      conversationId: "no-source",
      question: "WHERE is my invoice!",
      askedAt: "2026-10-03T10:00:00.000Z",
      signal: "NO_SOURCE_MATCH",
    },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].count, 2);
  assert.deepEqual(result[0].signals, ["UNANSWERED", "NO_SOURCE_MATCH"]);
  assert.equal(result[0].conversationId, "no-source");
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

test("hashes normalized question text consistently", () => {
  const first = analyticsModule.hashKnowledgeGapQuestion("How do I reset my password?");
  const repeated = analyticsModule.hashKnowledgeGapQuestion(" HOW do I reset my password! ");
  assert.equal(first, repeated);
  assert.match(first, /^[a-f0-9]{64}$/u);
});

test("keeps ignored gaps out of open work and reopens resolved gaps only for newer asks", () => {
  const items = [
    {
      conversationId: "resolved",
      question: "Where is my invoice?",
      askedAt: "2026-10-02T10:00:00.000Z",
      count: 2,
    },
    {
      conversationId: "ignored",
      question: "Can I change my email?",
      askedAt: "2026-10-03T10:00:00.000Z",
      count: 4,
    },
  ];
  const reviews = [
    {
      questionHash: analyticsModule.hashKnowledgeGapQuestion("Where is my invoice?"),
      status: "RESOLVED",
      updatedAt: "2026-10-02T12:00:00.000Z",
    },
    {
      questionHash: analyticsModule.hashKnowledgeGapQuestion("Can I change my email?"),
      status: "IGNORED",
      updatedAt: "2026-10-01T12:00:00.000Z",
    },
  ];
  const summary = analyticsModule.buildKnowledgeGapSummary(items, reviews);
  assert.deepEqual(summary.counts, { open: 0, resolved: 1, ignored: 1 });
  assert.equal(summary.resolved[0].status, "RESOLVED");
  assert.equal(summary.ignored[0].status, "IGNORED");

  const reopened = analyticsModule.buildKnowledgeGapSummary(
    [{ ...items[0], askedAt: "2026-10-03T12:00:00.000Z" }],
    reviews.slice(0, 1),
  );
  assert.deepEqual(reopened.counts, { open: 1, resolved: 0, ignored: 0 });
});

test("counts all gaps while limiting each review list", () => {
  const items = Array.from({ length: 5 }, (_, index) => ({
    conversationId: `conversation-${index}`,
    question: `Question ${index}?`,
    askedAt: `2026-10-0${index + 1}T10:00:00.000Z`,
    count: 1,
  }));
  const summary = analyticsModule.buildKnowledgeGapSummary(items, [], 2);
  assert.equal(summary.counts.open, 5);
  assert.equal(summary.open.length, 2);
});
