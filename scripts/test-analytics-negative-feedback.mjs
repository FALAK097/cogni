import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/negative-feedback.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const analyticsModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { collectNegativeFeedbackItems } = analyticsModule;

function message(id, authorType, createdAt, properties = {}) {
  return { id, body: `body-${id}`, authorType, createdAt, ...properties };
}

test("collects only public AI answers with negative feedback and links their visitor question", () => {
  const feedback = collectNegativeFeedbackItems("conversation-1", [
    message("question-1", "VISITOR", "2026-09-01T10:00:00.000Z"),
    message("answer-1", "AI", "2026-09-01T10:00:01.000Z", {
      replyToMessageId: "question-1",
      feedback: "negative",
      feedbackReason: "That is out of date",
      feedbackAt: "2026-09-01T10:00:03.000Z",
    }),
    message("answer-2", "AI", "2026-09-01T10:01:00.000Z", {
      feedback: "positive",
    }),
    message("internal-answer", "AI", "2026-09-01T10:02:00.000Z", {
      visibility: "INTERNAL",
      feedback: "negative",
    }),
    message("teammate", "TEAM", "2026-09-01T10:03:00.000Z", {
      feedback: "negative",
    }),
  ]);

  assert.deepEqual(feedback, [
    {
      conversationId: "conversation-1",
      question: "body-question-1",
      response: "body-answer-1",
      reason: "That is out of date",
      feedbackAt: "2026-09-01T10:00:03.000Z",
    },
  ]);
});

test("uses the preceding visitor message when no reply link exists and bounds response text", () => {
  const longBody = "x".repeat(1_000);
  const [item] = collectNegativeFeedbackItems("conversation-2", [
    message("question", "VISITOR", "2026-09-01T10:00:00.000Z"),
    message("answer", "AI", "2026-09-01T10:00:01.000Z", {
      body: longBody,
      feedback: "negative",
    }),
  ]);

  assert.equal(item?.question, "body-question");
  assert.equal(item?.response.length, 500);
  assert.equal(item?.reason, null);
  assert.equal(item?.feedbackAt, "2026-09-01T10:00:01.000Z");
});
