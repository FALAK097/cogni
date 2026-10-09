import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/no-source-answers.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const analytics = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("collects only a no-match answer linked to its exact visitor question", () => {
  const result = analytics.collectNoSourceMatchQuestions("conversation-1", [
    {
      id: "visitor-1",
      body: "Can I return an item?",
      authorType: "VISITOR",
      createdAt: "2026-10-01T09:00:00.000Z",
    },
    {
      id: "answer-1",
      body: "I could not find that in the available help articles.",
      authorType: "AI",
      visibility: "PUBLIC",
      replyToMessageId: "visitor-1",
      retrievalOutcome: "NO_MATCH",
      createdAt: "2026-10-01T09:00:02.000Z",
    },
  ]);

  assert.deepEqual(result, [
    {
      conversationId: "conversation-1",
      question: "Can I return an item?",
      askedAt: "2026-10-01T09:00:02.000Z",
      signal: "NO_SOURCE_MATCH",
    },
  ]);
});

test("excludes source matches, legacy answers, handoffs, internal notes, and orphan replies", () => {
  const result = analytics.collectNoSourceMatchQuestions("conversation-1", [
    {
      id: "visitor-1",
      body: "Question one",
      authorType: "VISITOR",
      createdAt: "2026-10-01T09:00:00.000Z",
    },
    {
      id: "visitor-2",
      body: "Question two",
      authorType: "VISITOR",
      createdAt: "2026-10-01T09:01:00.000Z",
    },
    {
      id: "source-hit",
      body: "Here is the answer.",
      authorType: "AI",
      replyToMessageId: "visitor-1",
      retrievalOutcome: "SOURCES_FOUND",
      createdAt: "2026-10-01T09:00:02.000Z",
    },
    {
      id: "legacy-answer",
      body: "Here is an old answer.",
      authorType: "AI",
      replyToMessageId: "visitor-1",
      createdAt: "2026-10-01T09:00:03.000Z",
    },
    {
      id: "human-handoff",
      body: "A teammate will help.",
      authorType: "AI",
      replyToMessageId: "visitor-2",
      createdAt: "2026-10-01T09:01:02.000Z",
    },
    {
      id: "internal",
      body: "Internal note",
      authorType: "AI",
      visibility: "INTERNAL",
      replyToMessageId: "visitor-2",
      retrievalOutcome: "NO_MATCH",
      createdAt: "2026-10-01T09:01:03.000Z",
    },
    {
      id: "orphan",
      body: "No linked visitor question.",
      authorType: "AI",
      replyToMessageId: "missing-visitor",
      retrievalOutcome: "NO_MATCH",
      createdAt: "2026-10-01T09:01:04.000Z",
    },
  ]);

  assert.deepEqual(result, []);
});
