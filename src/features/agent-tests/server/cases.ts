import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, eq } from "drizzle-orm";

import { getDb, type Db } from "@/lib/db/client";
import { agentTestCase } from "@/lib/db/schema";
import type { AgentTestCaseInput } from "../input";

export class AgentTestCaseTitleConflictError extends Error {
  constructor() {
    super("A test with that name already exists in this workspace.");
    this.name = "AgentTestCaseTitleConflictError";
  }
}

function hasErrorCode(error: unknown, code: string, depth = 0): boolean {
  if (depth > 3 || typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === code) return true;
  return "cause" in error && hasErrorCode(error.cause, code, depth + 1);
}

export async function listAgentTestCases(workspaceId: string, db: Db = getDb()) {
  return db.query.agentTestCase.findMany({
    where: eq(agentTestCase.workspaceId, workspaceId),
    columns: {
      id: true,
      title: true,
      prompt: true,
      expectedOutcome: true,
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
  try {
    const [testCase] = await db
      .insert(agentTestCase)
      .values({
        id: randomUUID(),
        title: input.title,
        prompt: input.prompt,
        expectedOutcome: input.expectedOutcome,
        workspaceId,
        createdByMembershipId: membershipId,
        updatedAt: new Date().toISOString(),
      })
      .returning({
        id: agentTestCase.id,
        title: agentTestCase.title,
        prompt: agentTestCase.prompt,
        expectedOutcome: agentTestCase.expectedOutcome,
        createdAt: agentTestCase.createdAt,
        updatedAt: agentTestCase.updatedAt,
      });
    return testCase;
  } catch (error) {
    if (hasErrorCode(error, "23505")) throw new AgentTestCaseTitleConflictError();
    throw error;
  }
}

export async function updateAgentTestCase(
  workspaceId: string,
  caseId: string,
  input: AgentTestCaseInput,
  db: Db = getDb(),
) {
  try {
    const [testCase] = await db
      .update(agentTestCase)
      .set({ ...input, updatedAt: new Date().toISOString() })
      .where(and(eq(agentTestCase.id, caseId), eq(agentTestCase.workspaceId, workspaceId)))
      .returning({
        id: agentTestCase.id,
        title: agentTestCase.title,
        prompt: agentTestCase.prompt,
        expectedOutcome: agentTestCase.expectedOutcome,
        createdAt: agentTestCase.createdAt,
        updatedAt: agentTestCase.updatedAt,
      });
    return testCase ?? null;
  } catch (error) {
    if (hasErrorCode(error, "23505")) throw new AgentTestCaseTitleConflictError();
    throw error;
  }
}

export async function deleteAgentTestCase(workspaceId: string, caseId: string, db: Db = getDb()) {
  const deleted = await db
    .delete(agentTestCase)
    .where(and(eq(agentTestCase.id, caseId), eq(agentTestCase.workspaceId, workspaceId)))
    .returning({ id: agentTestCase.id });
  return deleted.length > 0;
}
