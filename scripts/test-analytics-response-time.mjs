import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/response-time.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const analytics = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { averageAiResponseTimeMs, collectAiResponseTimeSamplesMs } = analytics;

function message(authorType, second, visibility = "PUBLIC") {
  return {
    id: `${authorType}-${second}`,
    body: "Test message",
    authorType,
    visibility,
    createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, second)).toISOString(),
  };
}

test("measures a public AI reply from the first visitor message in the turn", () => {
  assert.deepEqual(
    collectAiResponseTimeSamplesMs([message("VISITOR", 0), message("AI", 2)]),
    [2_000],
  );
});

test("counts a burst of visitor messages once and starts a new sample after the reply", () => {
  assert.deepEqual(
    collectAiResponseTimeSamplesMs([
      message("VISITOR", 0),
      message("VISITOR", 10),
      message("AI", 20),
      message("VISITOR", 30),
      message("AI", 50),
    ]),
    [20_000, 20_000],
  );
});

test("ignores internal notes and human-only replies", () => {
  assert.deepEqual(
    collectAiResponseTimeSamplesMs([
      message("VISITOR", 0),
      message("TEAM", 2, "INTERNAL"),
      message("TEAM", 5),
      message("AI", 8),
    ]),
    [],
  );
});

test("returns no sample for unanswered turns or invalid timestamps", () => {
  assert.deepEqual(collectAiResponseTimeSamplesMs([message("VISITOR", 0)]), []);
  assert.deepEqual(
    collectAiResponseTimeSamplesMs([
      { ...message("VISITOR", 0), createdAt: "not-a-date" },
      message("AI", 2),
    ]),
    [],
  );
});

test("period averages weight each response turn equally across conversations", () => {
  const shortConversation = collectAiResponseTimeSamplesMs([
    message("VISITOR", 0),
    message("AI", 1),
  ]);
  const longerConversation = collectAiResponseTimeSamplesMs([
    message("VISITOR", 0),
    message("AI", 3),
    message("VISITOR", 10),
    message("AI", 13),
    message("VISITOR", 20),
    message("AI", 23),
  ]);

  assert.equal(averageAiResponseTimeMs([...shortConversation, ...longerConversation]), 2_500);
});
