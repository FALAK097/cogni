import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { build } from "esbuild";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Agent test improvement integration tests require a local DATABASE_URL.");
}
process.env.SKIP_ENV_VALIDATION ??= "true";
const outputFile = join(tmpdir(), `cogni-agent-test-improvements-${process.pid}.mjs`);
await mkdir(resolve(outputFile, ".."), { recursive: true });
await build({
  stdin: {
    contents: `export { getDb } from "@/lib/db/client";
      export { agentTestEvaluationContextSchema } from "@/features/agent-tests/input";
      export { createAgentTestImprovement, listAgentTestImprovements, reviewAgentTestImprovement, AgentTestImprovementSourceUnavailableError, AgentTestImprovementConflictError } from "@/features/agent-tests/server/improvements";`,
    resolveDir: process.cwd(),
    sourcefile: "agent-test-improvements-db-entry.ts",
  },
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "server-only-test-stub",
      setup(context) {
        context.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "stub",
        }));
        context.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
  ],
});
const {
  getDb,
  agentTestEvaluationContextSchema,
  createAgentTestImprovement,
  listAgentTestImprovements,
  reviewAgentTestImprovement,
  AgentTestImprovementSourceUnavailableError,
  AgentTestImprovementConflictError,
} = await import(pathToFileURL(outputFile).href);

test("improvement items require same-workspace failed run context and preserve immutable references", async () => {
  const raw = postgres(databaseUrl, { max: 1, prepare: false });
  const workspaceId = randomUUID();
  const otherWorkspaceId = randomUUID();
  const userId = randomUUID();
  const membershipId = randomUUID();
  const otherMembershipId = randomUUID();
  const now = new Date().toISOString();
  const mismatchCaseId = randomUUID();
  const passedCaseId = randomUUID();
  const errorCaseId = randomUUID();
  const notRunCaseId = randomUUID();
  const foreignCaseId = randomUUID();
  const runId = randomUUID();
  const legacyRunId = randomUUID();
  const foreignRunId = randomUUID();
  const missingSnapshotRunId = randomUUID();
  const deletedRunId = randomUUID();
  const sourceId = randomUUID();
  const revisionId = randomUUID();
  const context = {
    version: 1,
    configFingerprint: "a".repeat(64),
    configBasis: "widget-draft-revision-v1",
    modelProvider: "GOOGLE",
    modelName: "gemini-2.0-flash",
    cases: [
      {
        id: mismatchCaseId,
        status: "mismatch",
        caseUpdatedAt: now,
        sources: [{ documentId: sourceId, revisionId, revisionNumber: 3 }],
      },
      { id: passedCaseId, status: "passed", caseUpdatedAt: now, sources: [] },
      { id: errorCaseId, status: "error", caseUpdatedAt: now, sources: [] },
      { id: notRunCaseId, status: "not_run", caseUpdatedAt: now, sources: [] },
    ],
  };
  try {
    await raw`INSERT INTO workspace (id, name, slug, "updatedAt") VALUES (${workspaceId}, 'Review workspace', ${workspaceId}, ${now}), (${otherWorkspaceId}, 'Foreign workspace', ${otherWorkspaceId}, ${now})`;
    await raw`INSERT INTO "user" (id, name, email, "updatedAt") VALUES (${userId}, 'Review owner', ${`${userId}@example.test`}, ${now})`;
    await raw`INSERT INTO workspace_member (id, role, "updatedAt", "userId", "workspaceId") VALUES (${membershipId}, 'OWNER', ${now}, ${userId}, ${workspaceId}), (${otherMembershipId}, 'OWNER', ${now}, ${userId}, ${otherWorkspaceId})`;
    await raw`INSERT INTO agent_test_case (id, title, prompt, "expectedOutcome", "expectedSourceIds", "updatedAt", "workspaceId") VALUES (${mismatchCaseId}, 'Billing mismatch', 'How does billing work?', 'grounded_answer', ${[sourceId]}, ${now}, ${workspaceId}), (${passedCaseId}, 'Passed', 'Passed prompt', 'no_evidence', ${[]}, ${now}, ${workspaceId}), (${errorCaseId}, 'Error', 'Error prompt', 'human_handoff', ${[]}, ${now}, ${workspaceId}), (${notRunCaseId}, 'Not run', 'Not run prompt', 'grounded_answer', ${[]}, ${now}, ${workspaceId}), (${foreignCaseId}, 'Foreign mismatch', 'Foreign prompt', 'grounded_answer', ${[]}, ${now}, ${otherWorkspaceId})`;
    await raw`INSERT INTO agent_test_run (id, "workspaceId", "resultDigest", "suiteDigest", "evaluationContext", "caseCount", "passedCount", "mismatchCount", "errorCount", "notRunCount") VALUES (${runId}, ${workspaceId}, ${"b".repeat(64)}, ${"c".repeat(64)}, ${raw.json(context)}, 4, 1, 1, 1, 1), (${legacyRunId}, ${workspaceId}, ${"d".repeat(64)}, NULL, NULL, 1, 0, 1, 0, 0), (${foreignRunId}, ${otherWorkspaceId}, ${"e".repeat(64)}, ${"f".repeat(64)}, ${raw.json({ ...context, cases: [{ ...context.cases[0], id: foreignCaseId }] })}, 1, 0, 1, 0, 0)`;

    const [storedRun] =
      await raw`SELECT "evaluationContext" FROM agent_test_run WHERE id = ${runId} AND "workspaceId" = ${workspaceId}`;
    assert.deepEqual(storedRun.evaluationContext, context);
    const persistedCases = await getDb().query.agentTestCase.findMany({
      where: (testCase, { eq }) => eq(testCase.workspaceId, workspaceId),
      columns: { id: true, updatedAt: true },
    });
    for (const testCase of context.cases) {
      const savedCase = persistedCases.find((candidate) => candidate.id === testCase.id);
      assert.ok(savedCase);
      testCase.caseUpdatedAt = new Date(savedCase.updatedAt).toISOString();
    }
    await raw`UPDATE agent_test_run SET "evaluationContext" = ${raw.json(context)} WHERE id = ${runId} AND "workspaceId" = ${workspaceId}`;
    const validated = agentTestEvaluationContextSchema.safeParse(context);
    assert.equal(validated.success, true, JSON.stringify(validated.error?.issues));

    const created = await createAgentTestImprovement(workspaceId, membershipId, {
      runId,
      caseId: mismatchCaseId,
      rationale: "Review whether the source coverage is enough for this billing question.",
    });
    assert.equal(created?.status, "OPEN");
    assert.equal(created?.createdByMembershipId, membershipId);
    assert.deepEqual(created?.caseSnapshot, {
      title: "Billing mismatch",
      prompt: "How does billing work?",
      expectedOutcome: "grounded_answer",
      expectedSourceIds: [sourceId],
    });
    assert.deepEqual(created?.evaluationReferences, {
      configBasis: "widget-draft-revision-v1",
      configFingerprint: "a".repeat(64),
      modelProvider: "GOOGLE",
      modelName: "gemini-2.0-flash",
      sources: [{ documentId: sourceId, revisionId, revisionNumber: 3 }],
    });
    assert.equal(JSON.stringify(created).includes("How does billing work?"), true);

    const listed = await listAgentTestImprovements(workspaceId);
    assert.equal(listed.length, 1);
    assert.equal((await listAgentTestImprovements(otherWorkspaceId)).length, 0);
    await assert.rejects(
      createAgentTestImprovement(workspaceId, membershipId, {
        runId: foreignRunId,
        caseId: foreignCaseId,
        rationale: "Cross-workspace attempt.",
      }),
      AgentTestImprovementSourceUnavailableError,
    );
    for (const caseId of [passedCaseId, errorCaseId, notRunCaseId]) {
      await assert.rejects(
        createAgentTestImprovement(workspaceId, membershipId, {
          runId,
          caseId,
          rationale: "Must be a mismatch.",
        }),
        AgentTestImprovementSourceUnavailableError,
      );
    }
    const missingSnapshotContext = {
      ...context,
      cases: [{ id: mismatchCaseId, status: "mismatch", sources: [] }],
    };
    const deletedRunContext = {
      ...context,
      cases: [
        {
          id: errorCaseId,
          status: "mismatch",
          caseUpdatedAt: context.cases.find((testCase) => testCase.id === errorCaseId)
            .caseUpdatedAt,
          sources: [],
        },
      ],
    };
    await raw`INSERT INTO agent_test_run (id, "workspaceId", "resultDigest", "suiteDigest", "evaluationContext", "caseCount", "passedCount", "mismatchCount", "errorCount", "notRunCount") VALUES (${missingSnapshotRunId}, ${workspaceId}, ${"6".repeat(64)}, ${"7".repeat(64)}, ${raw.json(missingSnapshotContext)}, 1, 0, 1, 0, 0), (${deletedRunId}, ${workspaceId}, ${"8".repeat(64)}, ${"9".repeat(64)}, ${raw.json(deletedRunContext)}, 1, 0, 1, 0, 0)`;
    await raw`DELETE FROM agent_test_case WHERE id = ${errorCaseId} AND "workspaceId" = ${workspaceId}`;
    await assert.rejects(
      createAgentTestImprovement(workspaceId, membershipId, {
        runId: missingSnapshotRunId,
        caseId: mismatchCaseId,
        rationale: "Run context has no snapshot revision.",
      }),
      AgentTestImprovementSourceUnavailableError,
    );
    await assert.rejects(
      createAgentTestImprovement(workspaceId, membershipId, {
        runId: deletedRunId,
        caseId: errorCaseId,
        rationale: "Deleted test cannot use a newer or missing snapshot.",
      }),
      AgentTestImprovementSourceUnavailableError,
    );
    await assert.rejects(
      createAgentTestImprovement(workspaceId, membershipId, {
        runId: legacyRunId,
        caseId: mismatchCaseId,
        rationale: "Legacy run has no context.",
      }),
      AgentTestImprovementSourceUnavailableError,
    );
    await assert.rejects(
      createAgentTestImprovement(workspaceId, membershipId, {
        runId,
        caseId: mismatchCaseId,
        rationale: "Duplicate submission.",
      }),
      AgentTestImprovementConflictError,
    );

    const reviewed = await reviewAgentTestImprovement(
      workspaceId,
      membershipId,
      created.id,
      "RESOLVED",
      "Review closed; this does not certify a fix.",
    );
    assert.equal(reviewed?.status, "RESOLVED");
    assert.equal(reviewed?.reviewedByMembershipId, membershipId);
    assert.ok(reviewed?.reviewedAt);
    assert.equal(reviewed?.reviewNote, "Review closed; this does not certify a fix.");
    await assert.rejects(
      reviewAgentTestImprovement(workspaceId, membershipId, created.id, "DISMISSED", null),
      AgentTestImprovementConflictError,
    );

    await raw`UPDATE agent_test_case SET "updatedAt" = "updatedAt" + interval '1 second' WHERE id = ${passedCaseId} AND "workspaceId" = ${workspaceId}`;
    const changedContext = {
      ...context,
      cases: context.cases.map((item) =>
        item.id === passedCaseId ? { ...item, status: "mismatch" } : item,
      ),
    };
    const changedRunId = randomUUID();
    await raw`INSERT INTO agent_test_run (id, "workspaceId", "resultDigest", "suiteDigest", "evaluationContext", "caseCount", "passedCount", "mismatchCount", "errorCount", "notRunCount") VALUES (${changedRunId}, ${workspaceId}, ${"0".repeat(64)}, ${"1".repeat(64)}, ${raw.json(changedContext)}, 4, 0, 2, 1, 1)`;
    await assert.rejects(
      createAgentTestImprovement(workspaceId, membershipId, {
        runId: changedRunId,
        caseId: passedCaseId,
        rationale: "Edited case must not be snapshotted from newer state.",
      }),
      AgentTestImprovementSourceUnavailableError,
    );
  } finally {
    await raw`DELETE FROM workspace WHERE id IN (${workspaceId}, ${otherWorkspaceId})`;
    await raw.end();
    await getDb().$client.end({ timeout: 5 });
  }
});
