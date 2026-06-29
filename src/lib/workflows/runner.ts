import type { Db } from "@/lib/db/client";
import { workflowRun } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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
  db: Db;
  workspaceId: string;
  name: string;
  input?: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  if (idempotencyKey) {
    const existing = await db.query.workflowRun.findFirst({
      where: (run, { eq }) => eq(run.idempotencyKey, idempotencyKey),
    });
    if (existing) return existing;
  }

  const results = await db
    .insert(workflowRun)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      name,
      idempotencyKey,
      input: JSON.stringify(input ?? {}),
    })
    .returning();

  const run = results[0];

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
  db: Db;
  workspaceId: string;
  runId: string;
  output?: Record<string, unknown>;
}) {
  const results = await db
    .update(workflowRun)
    .set({
      status: "COMPLETED",
      output: JSON.stringify(output ?? {}),
      finishedAt: new Date().toISOString(),
    })
    .where(and(eq(workflowRun.id, runId), eq(workflowRun.workspaceId, workspaceId)))
    .returning();

  const run = results[0];

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
  db: Db;
  workspaceId: string;
  runId: string;
  errorMessage: string;
}) {
  const current = await db.query.workflowRun.findFirst({
    where: (run, { eq, and }) => and(eq(run.id, runId), eq(run.workspaceId, workspaceId)),
  });

  if (!current) return null;

  const attempts = current.attempts + 1;
  const terminal = attempts >= current.maxAttempts;
  const status = terminal ? "DEAD" : "FAILED";

  const results = await db
    .update(workflowRun)
    .set({
      attempts,
      status,
      errorMessage,
      finishedAt: terminal ? new Date().toISOString() : null,
    })
    .where(eq(workflowRun.id, runId))
    .returning();

  const run = results[0];

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
