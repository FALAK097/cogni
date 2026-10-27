import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const [service, chatRoute, queue, schema, route] = await Promise.all([
  readFile("src/features/agent-tests/server/comparisons.ts", "utf8"),
  readFile("src/app/api/widget/[publicKey]/chat/route.ts", "utf8"),
  readFile("src/features/agent-tests/components/agent-test-improvement-queue.tsx", "utf8"),
  readFile("src/lib/db/schema.ts", "utf8"),
  readFile("src/app/api/dashboard/agent-test-comparisons/route.ts", "utf8"),
]);

test("replay accepts a saved case ID and idempotency key, never a caller prompt or outcome", () => {
  assert.match(service, /agentTestImprovement\.findFirst/);
  assert.match(service, /message:\s*improvement\.caseSnapshot\.prompt/);
  assert.match(service, /expectedOutcome,\s*evidence/);
  assert.doesNotMatch(service, /input\.(?:prompt|expectedOutcome|signedEvidence)/);
});

test("replay forwards cookies only to the configured auth origin and rejects redirects", () => {
  assert.match(service, /new URL\(env\.BETTER_AUTH_URL\)\.origin/);
  assert.match(service, /new URL\(input\.origin\)\.origin !== configuredOrigin/);
  assert.match(service, /redirect:\s*"error"/);
  assert.match(service, /\.\.\.\(input\.cookie \? \{ cookie: input\.cookie \} : \{\}\)/);
});

test("standard streamed answers bind signed preview evidence to the replay case", () => {
  const streamPath = chatRoute.slice(chatRoute.indexOf("interruptWidgetTextStream"));
  assert.match(streamPath, /isPreview \? body\.previewRunId : undefined/);
  assert.match(streamPath, /isPreview \? body\.previewCaseId : undefined/);
});

test("persisted replay failures return their terminal state and allow a fresh retry key", () => {
  assert.match(service, /status: "ERROR"[\s\S]*?\.returning\(\)[\s\S]*?failedComparison/);
  assert.match(queue, /delete next\[item\.id\]/);
});

test("comparison history omits generated answer text and replays cannot trigger external actions", () => {
  assert.match(service, /replayReferences:/);
  assert.match(service, /replayOutcome:/);
  assert.doesNotMatch(
    schema.slice(
      schema.indexOf("export const agentTestComparison"),
      schema.indexOf("export const knowledgeGapReviewStatus"),
    ),
    /answerText/,
  );
  assert.doesNotMatch(
    route.slice(
      route.indexOf("export async function GET"),
      route.indexOf("export async function POST"),
    ),
    /answerText/,
  );
  assert.match(chatRoute, /allowActions:\s*!isPreview/);
  assert.match(queue, /answer text is shown temporarily[\s\S]*never saved/);
});

test("baseline availability is explicit and the UI calls the result a current-draft replay", () => {
  assert.match(service, /baselineIsAvailable/);
  assert.match(queue, /Baseline unavailable/);
  assert.match(queue, /Recorded historical outcome:[\s\S]*Current-draft replay:/);
});
