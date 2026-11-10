import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db/client";
import { agentTestCase, agentTestImprovement, agentTestRun } from "@/lib/db/schema";
import { agentTestEvaluationContextSchema, type AgentTestImprovementStatus } from "../input";

export class AgentTestImprovementSourceUnavailableError extends Error {
  constructor() {
    super("This failed check does not have verified evaluation context yet. Run it again first.");
    this.name = "AgentTestImprovementSourceUnavailableError";
  }
}

export class AgentTestImprovementConflictError extends Error {
  constructor(message = "An improvement item already exists for this failed check.") {
    super(message);
    this.name = "AgentTestImprovementConflictError";
  }
}

export async function listAgentTestImprovements(workspaceId: string, db: Db = getDb()) {
  return db
    .select({
      id: agentTestImprovement.id,
      runId: agentTestImprovement.runId,
      caseId: agentTestImprovement.caseId,
      caseSnapshot: agentTestImprovement.caseSnapshot,
      evaluationReferences: agentTestImprovement.evaluationReferences,
      failureSourceIds: agentTestImprovement.failureSourceIds,
      rationale: agentTestImprovement.rationale,
      status: agentTestImprovement.status,
      createdAt: agentTestImprovement.createdAt,
      reviewedAt: agentTestImprovement.reviewedAt,
      reviewNote: agentTestImprovement.reviewNote,
    })
    .from(agentTestImprovement)
    .where(eq(agentTestImprovement.workspaceId, workspaceId))
    .orderBy(desc(agentTestImprovement.createdAt), desc(agentTestImprovement.id))
    .limit(100);
}

export async function createAgentTestImprovement(
  workspaceId: string,
  membershipId: string,
  input: { runId: string; caseId: string; rationale: string },
  db: Db = getDb(),
) {
  const run = await db.query.agentTestRun.findFirst({
    where: and(eq(agentTestRun.id, input.runId), eq(agentTestRun.workspaceId, workspaceId)),
    columns: { id: true, evaluationContext: true },
  });
  const context = agentTestEvaluationContextSchema.safeParse(run?.evaluationContext);
  const failedRunCase = context.success
    ? context.data.cases.find(
        (testCase) => testCase.id === input.caseId && testCase.status === "mismatch",
      )
    : undefined;
  if (!run || !context.success || !failedRunCase) {
    throw new AgentTestImprovementSourceUnavailableError();
  }
  const savedCase = await db.query.agentTestCase.findFirst({
    where: and(eq(agentTestCase.id, input.caseId), eq(agentTestCase.workspaceId, workspaceId)),
    columns: {
      id: true,
      updatedAt: true,
      title: true,
      prompt: true,
      expectedOutcome: true,
      expectedSourceIds: true,
    },
  });
  if (!savedCase || new Date(savedCase.updatedAt).toISOString() !== failedRunCase.caseUpdatedAt) {
    throw new AgentTestImprovementSourceUnavailableError();
  }

  const [created] = await db
    .insert(agentTestImprovement)
    .values({
      id: randomUUID(),
      workspaceId,
      runId: run.id,
      caseId: savedCase.id,
      caseSnapshot: {
        title: savedCase.title,
        prompt: savedCase.prompt,
        expectedOutcome: savedCase.expectedOutcome,
        expectedSourceIds: savedCase.expectedSourceIds,
      },
      evaluationReferences: {
        configBasis: context.data.configBasis,
        configFingerprint: context.data.configFingerprint,
        modelProvider: context.data.modelProvider,
        modelName: context.data.modelName,
        sources: failedRunCase.sources,
      },
      failureSourceIds: [...new Set(failedRunCase.sources.map((source) => source.documentId))],
      rationale: input.rationale,
      status: "OPEN",
      createdByMembershipId: membershipId,
    })
    .onConflictDoNothing()
    .returning({ id: agentTestImprovement.id });
  if (!created) throw new AgentTestImprovementConflictError();

  return db.query.agentTestImprovement.findFirst({
    where: and(
      eq(agentTestImprovement.id, created.id),
      eq(agentTestImprovement.workspaceId, workspaceId),
    ),
  });
}

export async function reviewAgentTestImprovement(
  workspaceId: string,
  membershipId: string,
  improvementId: string,
  status: Exclude<AgentTestImprovementStatus, "OPEN">,
  reviewNote: string | null,
  db: Db = getDb(),
) {
  const [updated] = await db
    .update(agentTestImprovement)
    .set({
      status,
      reviewNote,
      reviewedByMembershipId: membershipId,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(agentTestImprovement.id, improvementId),
        eq(agentTestImprovement.workspaceId, workspaceId),
        eq(agentTestImprovement.status, "OPEN"),
      ),
    )
    .returning({ id: agentTestImprovement.id });
  if (!updated) {
    const existing = await db.query.agentTestImprovement.findFirst({
      where: and(
        eq(agentTestImprovement.id, improvementId),
        eq(agentTestImprovement.workspaceId, workspaceId),
      ),
      columns: { id: true },
    });
    if (!existing) return null;
    throw new AgentTestImprovementConflictError("This improvement item has already been reviewed.");
  }
  return db.query.agentTestImprovement.findFirst({
    where: and(
      eq(agentTestImprovement.id, improvementId),
      eq(agentTestImprovement.workspaceId, workspaceId),
    ),
  });
}
