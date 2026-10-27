import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db/client";
import { env } from "@/lib/env/server";
import { agentTestCase, agentTestRun, documentRevision } from "@/lib/db/schema";
import { AGENT_TEST_EVALUATION_CONTEXT_BASIS } from "../evaluation-context";
import { verifyAgentTestPreviewEvidence } from "../signed-preview-evidence";
import {
  getAgentTestSuiteVersion,
  matchesAgentTestOutcome,
  summarizeAgentTestRun,
  type AgentTestEvaluationContext,
  type AgentTestRunInput,
} from "../input";

export class AgentTestSuiteChangedError extends Error {
  constructor() {
    super("Saved tests changed while this run was in progress. Run the suite again to record it.");
    this.name = "AgentTestSuiteChangedError";
  }
}

export class AgentTestRunConflictError extends Error {
  constructor() {
    super("This test run could not be recorded. Run the suite again to save a new result.");
    this.name = "AgentTestRunConflictError";
  }
}

export async function recordAgentTestRun(
  workspaceId: string,
  membershipId: string,
  input: AgentTestRunInput,
  db: Db = getDb(),
) {
  const requestedIds = input.results.map((result) => result.id).sort();
  const savedCases = await db.query.agentTestCase.findMany({
    where: eq(agentTestCase.workspaceId, workspaceId),
    columns: {
      id: true,
      updatedAt: true,
      title: true,
      prompt: true,
      expectedOutcome: true,
      expectedSourceIds: true,
    },
  });
  const savedIds = savedCases.map((testCase) => testCase.id).sort();
  if (
    getAgentTestSuiteVersion(savedCases) !== input.suiteVersion ||
    requestedIds.length !== savedIds.length ||
    requestedIds.some((id, index) => id !== savedIds[index])
  ) {
    throw new AgentTestSuiteChangedError();
  }

  const suiteDigest = createHash("sha256").update(input.suiteVersion).digest("hex");
  const signedEvidence = input.results.map((result) =>
    result.signedEvidence
      ? verifyAgentTestPreviewEvidence(result.signedEvidence, env.BETTER_AUTH_SECRET)
      : null,
  );
  const savedCaseById = new Map(savedCases.map((testCase) => [testCase.id, testCase]));
  const canonicalStatuses: ("passed" | "mismatch" | "error")[] = input.results.map(
    (result, index) => {
      const savedCase = savedCaseById.get(result.id);
      const evidence = signedEvidence[index];
      if (
        !savedCase ||
        !evidence ||
        evidence.runId !== input.runId ||
        evidence.caseId !== result.id ||
        evidence.workspaceId !== workspaceId ||
        evidence.prompt !== savedCase.prompt
      ) {
        return "error";
      }
      return matchesAgentTestOutcome(
        savedCase.expectedOutcome,
        evidence,
        savedCase.expectedSourceIds ?? [],
      )
        ? "passed"
        : "mismatch";
    },
  );
  const contextMetadata = signedEvidence[0];
  const contextIsConsistent =
    contextMetadata !== null &&
    signedEvidence.every((evidence, index) => {
      const result = input.results[index];
      return (
        evidence !== null &&
        result !== undefined &&
        canonicalStatuses[index] !== "error" &&
        evidence.workspaceId === workspaceId &&
        evidence.prompt === savedCaseById.get(result.id)?.prompt &&
        evidence.modelProvider === contextMetadata.modelProvider &&
        evidence.modelName === contextMetadata.modelName &&
        evidence.configFingerprint === contextMetadata.configFingerprint
      );
    });
  let evaluationContext: AgentTestEvaluationContext | null = null;
  if (contextIsConsistent && contextMetadata) {
    const requestedRevisions = signedEvidence.flatMap((evidence) =>
      (evidence?.sources ?? []).flatMap((source) =>
        source.revisionId ? [{ ...source, revisionId: source.revisionId }] : [],
      ),
    );
    const revisionIds = [...new Set(requestedRevisions.map((source) => source.revisionId))];
    const storedRevisions = revisionIds.length
      ? await db.query.documentRevision.findMany({
          where: and(
            eq(documentRevision.workspaceId, workspaceId),
            inArray(documentRevision.id, revisionIds),
          ),
          columns: { id: true, documentId: true, revisionNumber: true },
        })
      : [];
    const revisionById = new Map(storedRevisions.map((revision) => [revision.id, revision]));
    const sourcesAreValid = requestedRevisions.every((source) => {
      const revision = revisionById.get(source.revisionId);
      return (
        revision?.documentId === source.documentId &&
        revision.revisionNumber === source.revisionNumber
      );
    });
    if (sourcesAreValid) {
      evaluationContext = {
        version: 1,
        configFingerprint: contextMetadata.configFingerprint,
        configBasis: AGENT_TEST_EVALUATION_CONTEXT_BASIS,
        modelProvider: contextMetadata.modelProvider,
        modelName: contextMetadata.modelName,
        cases: input.results
          .map((result, index) => {
            const savedCase = savedCaseById.get(result.id);
            if (!savedCase) throw new AgentTestSuiteChangedError();
            const status = canonicalStatuses[index];
            if (!status || status === "error") throw new AgentTestSuiteChangedError();
            return {
              id: result.id,
              status,
              caseUpdatedAt: new Date(savedCase.updatedAt).toISOString(),
              sources: (signedEvidence[index]?.sources ?? []).map((source) => ({
                documentId: source.documentId,
                revisionId: source.revisionId,
                revisionNumber: source.revisionNumber,
              })),
            };
          })
          .sort((left, right) => left.id.localeCompare(right.id)),
      };
    }
  }
  const canonicalResults = input.results
    .map(({ id }, index) => ({ id, status: canonicalStatuses[index] ?? "error" }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const counts = summarizeAgentTestRun(canonicalResults);
  const digestPayload = {
    suiteVersion: input.suiteVersion,
    results: canonicalResults,
    ...(evaluationContext ? { evaluationContext } : {}),
  };
  const resultDigest = createHash("sha256").update(JSON.stringify(digestPayload)).digest("hex");
  const [created] = await db
    .insert(agentTestRun)
    .values({
      id: input.runId,
      workspaceId,
      createdByMembershipId: membershipId,
      resultDigest,
      suiteDigest,
      evaluationContext,
      ...counts,
    })
    .onConflictDoNothing()
    .returning({ id: agentTestRun.id });

  if (created) return { id: created.id, ...counts };

  const existing = await db.query.agentTestRun.findFirst({
    where: and(eq(agentTestRun.id, input.runId), eq(agentTestRun.workspaceId, workspaceId)),
    columns: {
      id: true,
      resultDigest: true,
      caseCount: true,
      passedCount: true,
      mismatchCount: true,
      errorCount: true,
      notRunCount: true,
    },
  });
  if (!existing || existing.resultDigest !== resultDigest) throw new AgentTestRunConflictError();
  return {
    id: existing.id,
    caseCount: existing.caseCount,
    passedCount: existing.passedCount,
    mismatchCount: existing.mismatchCount,
    errorCount: existing.errorCount,
    notRunCount: existing.notRunCount,
  };
}

export async function listAgentTestRuns(
  workspaceId: string,
  startAt: Date,
  endBefore: Date,
  db: Db = getDb(),
) {
  const runs = await db
    .select({
      id: agentTestRun.id,
      createdAt: agentTestRun.createdAt,
      suiteDigest: agentTestRun.suiteDigest,
      evaluationContext: agentTestRun.evaluationContext,
      caseCount: agentTestRun.caseCount,
      passedCount: agentTestRun.passedCount,
      mismatchCount: agentTestRun.mismatchCount,
      errorCount: agentTestRun.errorCount,
      notRunCount: agentTestRun.notRunCount,
    })
    .from(agentTestRun)
    .where(
      and(
        eq(agentTestRun.workspaceId, workspaceId),
        gte(agentTestRun.createdAt, startAt.toISOString()),
        lt(agentTestRun.createdAt, endBefore.toISOString()),
      ),
    )
    .orderBy(desc(agentTestRun.createdAt), desc(agentTestRun.id))
    .limit(50);
  return runs.reverse().map((run) => ({
    ...run,
    createdAt: new Date(run.createdAt).toISOString(),
  }));
}

export async function hasAgentTestRuns(workspaceId: string, db: Db = getDb()) {
  const run = await db.query.agentTestRun.findFirst({
    where: eq(agentTestRun.workspaceId, workspaceId),
    columns: { id: true },
  });
  return Boolean(run);
}
