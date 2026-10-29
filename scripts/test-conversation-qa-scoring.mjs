import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const compiled = await build({
  entryPoints: ["src/features/conversation-qa/scoring.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
});
const scoring = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("public-message parser excludes internal notes and retains bounded public citations only", () => {
  const messages = scoring.parsePublicQaMessages(
    JSON.stringify([
      {
        body: "Can you help?",
        authorType: "VISITOR",
        visibility: "PUBLIC",
        createdAt: "2026-10-28T09:00:00.000Z",
        citations: [
          { title: "Policy", excerpt: "Approved returns are accepted within thirty days." },
        ],
      },
      {
        body: "Private teammate note",
        authorType: "TEAM",
        visibility: "INTERNAL",
        createdAt: "2026-10-28T09:01:00.000Z",
      },
      {
        body: "Here is the answer.",
        authorType: "AI",
        createdAt: "2026-10-28T09:02:00.000Z",
        attachments: ["private-file"],
      },
    ]),
  );

  assert.deepEqual(messages, [
    {
      body: "Can you help?",
      authorType: "VISITOR",
      createdAt: "2026-10-28T09:00:00.000Z",
      citations: [
        { title: "Policy", excerpt: "Approved returns are accepted within thirty days." },
      ],
    },
    { body: "Here is the answer.", authorType: "AI", createdAt: "2026-10-28T09:02:00.000Z" },
  ]);
  const transcript = scoring.buildQaTranscript(messages);
  assert.match(transcript, /Approved returns are accepted within thirty days/);
  assert.doesNotMatch(transcript, /Private teammate note|private-file/);
});

test("transcript bounds retain the most recent public context", () => {
  const messages = [
    { body: "old".repeat(15_000), authorType: "VISITOR", createdAt: "2026-10-28T09:00:00.000Z" },
    { body: "latest reply", authorType: "TEAM", createdAt: "2026-10-29T09:00:00.000Z" },
  ];
  const transcript = scoring.buildQaTranscript(messages);
  assert.equal(transcript.length, 40_000);
  assert.match(transcript, /latest reply$/);
  assert.doesNotMatch(transcript, /2026-10-28T09:00:00\.000Z/);
});

test("parser rejects invalid transcript shapes instead of guessing message visibility", () => {
  assert.throws(() => scoring.parsePublicQaMessages("{}"));
  assert.throws(() =>
    scoring.parsePublicQaMessages(
      JSON.stringify([
        {
          body: "text",
          authorType: "TEAM",
          visibility: "PRIVATE",
          createdAt: "2026-10-28T09:01:00.000Z",
        },
      ]),
    ),
  );
  assert.deepEqual(
    scoring.parsePublicQaMessages(
      JSON.stringify([{ visibility: "INTERNAL", body: 8, authorType: "INVALID" }]),
    ),
    [],
  );
});

test("closed conversations are immediately eligible; other active states wait 24h from public activity", () => {
  const now = Date.parse("2026-10-29T09:00:00.000Z");
  const prior = "2026-10-28T09:00:00.000Z";
  assert.equal(
    scoring.isConversationQaEligible({
      status: "CLOSED",
      latestPublicAt: "2026-10-29T08:59:00.000Z",
      now,
    }),
    true,
  );
  assert.equal(
    scoring.isConversationQaEligible({ status: "ASSIGNED", latestPublicAt: prior, now }),
    true,
  );
  assert.equal(
    scoring.isConversationQaEligible({ status: "ESCALATED", latestPublicAt: prior, now }),
    true,
  );
  assert.equal(
    scoring.isConversationQaEligible({
      status: "OPEN",
      latestPublicAt: "2026-10-28T09:01:00.000Z",
      now,
    }),
    false,
  );
  assert.equal(
    scoring.isConversationQaEligible({ status: "RESOLVED", latestPublicAt: prior, now }),
    false,
  );
});

test("latest public teammate replies move the inactivity boundary forward", () => {
  const publicMessages = scoring.parsePublicQaMessages(
    JSON.stringify([
      { body: "Customer", authorType: "VISITOR", createdAt: "2026-10-28T08:00:00.000Z" },
      {
        body: "Internal",
        authorType: "TEAM",
        visibility: "INTERNAL",
        createdAt: "2026-10-28T08:30:00.000Z",
      },
      {
        body: "Public reply",
        authorType: "TEAM",
        visibility: "PUBLIC",
        createdAt: "2026-10-29T08:30:00.000Z",
      },
    ]),
  );
  assert.equal(scoring.latestPublicMessageAt(publicMessages), "2026-10-29T08:30:00.000Z");
  assert.equal(
    scoring.isConversationQaEligible({
      status: "OPEN",
      latestPublicAt: scoring.latestPublicMessageAt(publicMessages),
      now: Date.parse("2026-10-29T09:00:00.000Z"),
    }),
    false,
  );
});

test("a close after newer public activity starts a new evaluation version", () => {
  assert.equal(
    scoring.nextConversationQaVersion({
      currentVersion: 2,
      latestVersion: 2,
      latestPublicAt: "2026-10-28T09:00:00.000Z",
      currentPublicAt: "2026-10-29T09:00:00.000Z",
    }),
    3,
  );
  assert.equal(
    scoring.nextConversationQaVersion({
      currentVersion: 3,
      latestVersion: 2,
      latestPublicAt: "2026-10-28T09:00:00.000Z",
      currentPublicAt: "2026-10-29T09:00:00.000Z",
    }),
    3,
  );
  assert.equal(
    scoring.nextConversationQaVersion({
      currentVersion: 2,
      latestVersion: 2,
      latestPublicAt: "2026-10-29T11:00:00.000+02:00",
      currentPublicAt: "2026-10-29T09:00:00.000Z",
    }),
    2,
  );
});

test("low-score rule uses only the approved grounding, escalation, and mean thresholds", () => {
  assert.equal(
    scoring.isConversationQaLowScore({ helpfulness: 5, grounding: 2, escalationOutcome: "NONE" }),
    true,
  );
  assert.equal(
    scoring.isConversationQaLowScore({ helpfulness: 5, grounding: 5, escalationOutcome: "MISSED" }),
    true,
  );
  assert.equal(
    scoring.isConversationQaLowScore({ helpfulness: 2, grounding: 3, escalationOutcome: "NONE" }),
    true,
  );
  assert.equal(
    scoring.isConversationQaLowScore({ helpfulness: 3, grounding: 3, escalationOutcome: "NONE" }),
    false,
  );
});

test("structured result rejects free-form explanation and bounds labels", () => {
  const base = {
    helpfulness: 4,
    grounding: 3,
    sentiment: "neutral",
    topics: ["billing"],
    escalationOutcome: "NONE",
    reasonCodes: ["GOOD_RESOLUTION"],
  };
  assert.equal(scoring.conversationQaResultSchema.safeParse(base).success, true);
  assert.equal(
    scoring.conversationQaResultSchema.safeParse({ ...base, explanation: "transcript quote" })
      .success,
    false,
  );
  assert.equal(
    scoring.conversationQaResultSchema.safeParse({
      ...base,
      topics: ["other", "other", "other", "other"],
    }).success,
    false,
  );
});

test("workflow payload is content-free and idempotent by conversation evaluation version", () => {
  const payload = scoring.buildQaWorkflowInput("00000000-0000-4000-8000-000000000001", 3);
  assert.deepEqual(payload, {
    schemaVersion: 1,
    evaluationId: "00000000-0000-4000-8000-000000000001",
    version: 3,
  });
  assert.equal(scoring.buildQaWorkflowIdempotencyKey("conversation-id", 3), "conversation-id:qa:3");
  assert.equal(scoring.buildQaWorkflowIdempotencyKey("conversation-id", 4), "conversation-id:qa:4");
});

test("retries are bounded and exhaust safely", () => {
  assert.equal(scoring.getQaFailureStatus(1, 3), "FAILED");
  assert.equal(scoring.getQaFailureStatus(2, 3), "FAILED");
  assert.equal(scoring.getQaFailureStatus(3, 3), "DEAD");
  assert.equal(scoring.getQaFailureStatus(3, 9), "DEAD");
});

test("close/reopen triggers and workflow mutations keep workspace scoping", async () => {
  const conversationService = await readFile(
    "src/features/conversations/server/conversation-service.ts",
    "utf8",
  );
  const queue = await readFile("src/features/conversation-qa/server/queue.ts", "utf8");
  const scorer = await readFile("src/features/conversation-qa/server/scorer.ts", "utf8");
  const insightsRoute = await readFile(
    "src/app/api/dashboard/analytics/conversation-qa/route.ts",
    "utf8",
  );
  const insightsComponent = await readFile(
    "src/features/conversation-qa/components/conversation-qa-insights.tsx",
    "utf8",
  );
  assert.match(conversationService, /enqueueClosedConversationQa\(/);
  assert.match(conversationService, /startConversationQaVersionAfterReopen\(/);
  assert.match(queue, /eq\(conversation\.workspaceId, workspaceId\)/);
  assert.match(queue, /inArray\(conversation\.workspaceId, workspaceScope\)/);
  assert.match(queue, /inArray\(workflowRun\.workspaceId, workspaceScope\)/);
  assert.match(queue, /eq\(workflowRun\.workspaceId, candidate\.workspaceId\)/);
  assert.match(queue, /eq\(conversationQaEvaluation\.workspaceId, workspaceId\)/);
  assert.match(queue, /lastObservedMessageAt/);
  assert.match(queue, /nextEligibleAt/);
  assert.match(queue, /version:\s*sql`\$\{conversationQaState\.version\} \+ 1`/);
  assert.match(scorer, /eq\(conversation\.workspaceId, run\.workspaceId\)/);
  assert.match(scorer, /eq\(conversationQaEvaluation\.workspaceId, run\.workspaceId\)/);
  assert.match(scorer, /eq\(workflowRun\.workspaceId, run\.workspaceId\)/);
  assert.match(scorer, /\.for\("update"\)/);
  assert.match(insightsRoute, /requireDashboardContext\(\)/);
  assert.match(insightsRoute, /eq\(conversationQaEvaluation\.workspaceId, workspace\.id\)/);
  assert.doesNotMatch(insightsRoute, /conversation\.messages|answerText|transcript/i);
  assert.match(insightsComponent, /APP_ROUTES\.inbox\}\?conversationId=/);
  assert.doesNotMatch(queue, /transcript|answerText|internalNote/i);
});
