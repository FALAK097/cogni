import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, gte, lt } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db/client";
import { agentTestCase, agentTestRun } from "@/lib/db/schema";
import { getAgentTestSuiteVersion, summarizeAgentTestRun, type AgentTestRunInput } from "../input";

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
    columns: { id: true, updatedAt: true },
  });
  const savedIds = savedCases.map((testCase) => testCase.id).sort();
  if (
    getAgentTestSuiteVersion(savedCases) !== input.suiteVersion ||
    requestedIds.length !== savedIds.length ||
    requestedIds.some((id, index) => id !== savedIds[index])
  ) {
    throw new AgentTestSuiteChangedError();
  }

  const counts = summarizeAgentTestRun(input.results);
  const resultDigest = createHash("sha256")
    .update(
      JSON.stringify({
        suiteVersion: input.suiteVersion,
        results: [...input.results].sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest("hex");
  const [created] = await db
    .insert(agentTestRun)
    .values({
      id: input.runId,
      workspaceId,
      createdByMembershipId: membershipId,
      resultDigest,
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
