import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import { emitDomainEvent } from "@/lib/events/domain-events";
import { notifyWorkspaceMembers } from "@/lib/notifications/create-notification";
import { logError, logInfo } from "@/lib/logging/logger";

export async function startWorkflowRun({
  db,
  workspaceId,
  name,
  input,
  idempotencyKey,
}: {
  db: PrismaClient;
  workspaceId: string;
  name: string;
  input?: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  if (idempotencyKey) {
    const existing = await db.workflowRun.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
  }

  const run = await db.workflowRun.create({
    data: {
      workspaceId,
      name,
      idempotencyKey,
      input: JSON.stringify(input ?? {}),
    },
  });

  await emitDomainEvent({
    db,
    workspaceId,
    type: "workflow.started",
    entityId: run.id,
    payload: { name },
  });

  return run;
}

export async function completeWorkflowRun({
  db,
  workspaceId,
  runId,
  output,
}: {
  db: PrismaClient;
  workspaceId: string;
  runId: string;
  output?: Record<string, unknown>;
}) {
  const run = await db.workflowRun.update({
    where: { id: runId, workspaceId },
    data: {
      status: "COMPLETED",
      output: JSON.stringify(output ?? {}),
      finishedAt: new Date(),
    },
  });

  await emitDomainEvent({
    db,
    workspaceId,
    type: "workflow.completed",
    entityId: run.id,
  });

  await notifyWorkspaceMembers({
    db,
    workspaceId,
    type: "workflow.completed",
    title: "Workflow completed",
    body: `${run.name} finished successfully.`,
  });

  logInfo("workflow.completed", { workspaceId, workflowRunId: run.id, name: run.name });
  return run;
}

export async function failWorkflowRun({
  db,
  workspaceId,
  runId,
  errorMessage,
}: {
  db: PrismaClient;
  workspaceId: string;
  runId: string;
  errorMessage: string;
}) {
  const current = await db.workflowRun.findFirst({
    where: { id: runId, workspaceId },
  });

  if (!current) return null;

  const attempts = current.attempts + 1;
  const terminal = attempts >= current.maxAttempts;
  const status = terminal ? "DEAD" : "FAILED";

  const run = await db.workflowRun.update({
    where: { id: runId },
    data: {
      attempts,
      status,
      errorMessage,
      finishedAt: terminal ? new Date() : null,
    },
  });

  await emitDomainEvent({
    db,
    workspaceId,
    type: terminal ? "workflow.failed" : "workflow.retry",
    entityId: run.id,
    payload: { errorMessage, attempts },
  });

  if (terminal) {
    await notifyWorkspaceMembers({
      db,
      workspaceId,
      type: "workflow.failed",
      title: "Workflow failed",
      body: `${run.name} failed after ${attempts} attempts.`,
    });
    logError("workflow.dead", { workspaceId, workflowRunId: run.id, errorMessage });
  }

  return run;
}
