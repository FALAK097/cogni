import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";

import {
  chunkArray,
  getDb,
  isUniqueConstraintError,
  runDbWriteOperation,
  type Db,
} from "@/lib/db/client";
import { agentTestCase, document } from "@/lib/db/schema";
import type { AgentTestCaseInput } from "../input";

export class AgentTestCaseTitleConflictError extends Error {
  constructor() {
    super("A test with that name already exists in this workspace.");
    this.name = "AgentTestCaseTitleConflictError";
  }
}

export class AgentTestSourceUnavailableError extends Error {
  constructor() {
    super("Choose ready knowledge sources from this workspace, or remove unavailable sources.");
    this.name = "AgentTestSourceUnavailableError";
  }
}

async function validateExpectedSources(workspaceId: string, ids: string[], db: Db) {
  if (ids.length === 0) return;
  const sources = (
    await Promise.all(
      chunkArray(ids, 80).map((idBatch) =>
        db
          .select({ id: document.id })
          .from(document)
          .where(
            and(
              eq(document.workspaceId, workspaceId),
              eq(document.status, "READY"),
              inArray(document.id, idBatch),
            ),
          ),
      ),
    )
  ).flat();
  if (sources.length !== ids.length) throw new AgentTestSourceUnavailableError();
}

export async function listAgentTestCases(workspaceId: string, db: Db = getDb()) {
  return db.query.agentTestCase.findMany({
    where: eq(agentTestCase.workspaceId, workspaceId),
    columns: {
      id: true,
      title: true,
      prompt: true,
      expectedOutcome: true,
      expectedSourceIds: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [asc(agentTestCase.createdAt), asc(agentTestCase.title)],
  });
}

export async function createAgentTestCase(
  workspaceId: string,
  membershipId: string,
  input: AgentTestCaseInput,
  db: Db = getDb(),
) {
  return runDbWriteOperation(db, async (tx) => {
    await validateExpectedSources(workspaceId, input.expectedSourceIds ?? [], tx);
    try {
      const [testCase] = await tx
        .insert(agentTestCase)
        .values({
          id: randomUUID(),
          title: input.title,
          prompt: input.prompt,
          expectedOutcome: input.expectedOutcome,
          expectedSourceIds: input.expectedSourceIds ?? [],
          workspaceId,
          createdByMembershipId: membershipId,
          updatedAt: new Date().toISOString(),
        })
        .returning({
          id: agentTestCase.id,
          title: agentTestCase.title,
          prompt: agentTestCase.prompt,
          expectedOutcome: agentTestCase.expectedOutcome,
          expectedSourceIds: agentTestCase.expectedSourceIds,
          createdAt: agentTestCase.createdAt,
          updatedAt: agentTestCase.updatedAt,
        });
      return testCase;
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AgentTestCaseTitleConflictError();
      throw error;
    }
  });
}

export async function updateAgentTestCase(
  workspaceId: string,
  caseId: string,
  input: AgentTestCaseInput,
  db: Db = getDb(),
) {
  return runDbWriteOperation(db, async (tx) => {
    const [existing] = await tx
      .select({ id: agentTestCase.id, updatedAt: agentTestCase.updatedAt })
      .from(agentTestCase)
      .where(and(eq(agentTestCase.id, caseId), eq(agentTestCase.workspaceId, workspaceId)))
      .limit(1);
    if (!existing) return null;
    await validateExpectedSources(workspaceId, input.expectedSourceIds ?? [], tx);
    const previousUpdatedMs = Date.parse(existing.updatedAt);
    const nextUpdatedAt = new Date(
      Math.max(Date.now(), Number.isFinite(previousUpdatedMs) ? previousUpdatedMs + 1 : 0),
    ).toISOString();
    try {
      const [testCase] = await tx
        .update(agentTestCase)
        .set({
          ...input,
          expectedSourceIds: input.expectedSourceIds ?? [],
          updatedAt: nextUpdatedAt,
        })
        .where(and(eq(agentTestCase.id, caseId), eq(agentTestCase.workspaceId, workspaceId)))
        .returning({
          id: agentTestCase.id,
          title: agentTestCase.title,
          prompt: agentTestCase.prompt,
          expectedOutcome: agentTestCase.expectedOutcome,
          expectedSourceIds: agentTestCase.expectedSourceIds,
          createdAt: agentTestCase.createdAt,
          updatedAt: agentTestCase.updatedAt,
        });
      return testCase ?? null;
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AgentTestCaseTitleConflictError();
      throw error;
    }
  });
}

export async function deleteAgentTestCase(workspaceId: string, caseId: string, db: Db = getDb()) {
  return runDbWriteOperation(db, async (tx) => {
    const [existing] = await tx
      .select({ id: agentTestCase.id })
      .from(agentTestCase)
      .where(and(eq(agentTestCase.id, caseId), eq(agentTestCase.workspaceId, workspaceId)))
      .limit(1);
    if (!existing) return false;
    const deleted = await tx
      .delete(agentTestCase)
      .where(and(eq(agentTestCase.id, caseId), eq(agentTestCase.workspaceId, workspaceId)))
      .returning({ id: agentTestCase.id });
    return deleted.length > 0;
  });
}
