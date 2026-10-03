import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/unanswered-questions.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const analyticsModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { collectUnansweredQuestions } = analyticsModule;
const now = Date.parse("2026-10-03T12:00:00.000Z");

function message(id, authorType, createdAt, properties = {}) {
  return { id, body: `body-${id}`, authorType, createdAt, ...properties };
}

test("includes unanswered closed visitor turns and ignores turns with public replies", () => {
  const items = collectUnansweredQuestions(
    "closed-1",
    "CLOSED",
    [
      message("old", "VISITOR", "2026-10-03T10:00:00.000Z"),
      message("ai", "AI", "2026-10-03T10:00:01.000Z"),
      message("unanswered", "VISITOR", "2026-10-03T11:00:00.000Z"),
    ],
    now,
  );
  assert.deepEqual(items, [
    {
      conversationId: "closed-1",
      question: "body-unanswered",
      askedAt: "2026-10-03T11:00:00.000Z",
    },
  ]);
});

test("does not flag recent open turns, but flags open turns after 24 hours", () => {
  const items = collectUnansweredQuestions(
    "open-1",
    "OPEN",
    [
      message("recent", "VISITOR", "2026-10-03T11:00:00.000Z"),
      message("stale", "VISITOR", "2026-10-02T11:59:59.000Z"),
    ],
    now,
  );
  assert.deepEqual(
    items.map((item) => item.question),
    ["body-stale"],
  );
});

test("internal notes do not count as replies; public teammate replies do", () => {
  const items = collectUnansweredQuestions(
    "open-2",
    "OPEN",
    [
      message("q1", "VISITOR", "2026-10-01T10:00:00.000Z"),
      message("note", "TEAM", "2026-10-01T10:01:00.000Z", { visibility: "INTERNAL" }),
      message("q2", "VISITOR", "2026-10-01T10:02:00.000Z"),
      message("reply", "TEAM", "2026-10-01T10:03:00.000Z", { visibility: "PUBLIC" }),
    ],
    now,
  );
  assert.deepEqual(
    items.map((item) => item.question),
    ["body-q1"],
  );
});

test("ignores blank visitor messages and trims and bounds question text", () => {
  const items = collectUnansweredQuestions(
    "closed-2",
    "CLOSED",
    [
      message("blank", "VISITOR", "invalid-date", { body: "   " }),
      message("question", "VISITOR", "2026-10-03T09:00:00.000Z", { body: ` ${"x".repeat(600)} ` }),
    ],
    now,
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].question.length, 500);
});
