import type { Db } from "@/lib/db/client";
import { workflowRun } from "@/lib/db/schema";
import { workflowStep } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

import { emitDomainEvent } from "@/lib/events/domain-events";
import { notifyWorkspaceMembers } from "@/lib/notifications/create-notification";
import { logError, logInfo } from "@/lib/logging/logger";

export async function startWorkflowRun({
  db,
  workspaceId,
  name,
  input,
  idempotencyKey,
  conversationId,
}: {
  db: Db;
  workspaceId: string;
  name: string;
  input?: Record<string, unknown>;
  idempotencyKey?: string;
  conversationId?: string;
}) {
  if (idempotencyKey) {
    const existing = await db.query.workflowRun.findFirst({
      where: (run, { eq, and }) =>
        and(eq(run.workspaceId, workspaceId), eq(run.idempotencyKey, idempotencyKey)),
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
      conversationId,
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

const workflowStepInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["ACTION", "APPROVAL", "MESSAGE", "WAIT"]),
  input: z.record(z.string(), z.unknown()).default({}),
});

export type WorkflowStepInput = z.infer<typeof workflowStepInputSchema>;

export async function createWorkflowWithSteps({
  db,
  workspaceId,
  conversationId,
  name,
  idempotencyKey,
  input,
  steps,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  name: string;
  idempotencyKey: string;
  input: Record<string, unknown>;
  steps: WorkflowStepInput[];
}) {
  const parsedSteps = z.array(workflowStepInputSchema).min(1).max(20).parse(steps);
  const run = await startWorkflowRun({
    db,
    workspaceId,
    conversationId,
    name,
    idempotencyKey,
    input,
  });
  const existingSteps = await db.query.workflowStep.findMany({
    where: (fields, { eq, and }) =>
      and(eq(fields.workflowRunId, run.id), eq(fields.workspaceId, workspaceId)),
  });
  if (existingSteps.length > 0) return { run, steps: existingSteps };

  const createdSteps = await db
    .insert(workflowStep)
    .values(
      parsedSteps.map((step, position) => ({
        id: crypto.randomUUID(),
        workspaceId,
        workflowRunId: run.id,
        position,
        name: step.name,
        kind: step.kind,
        input: JSON.stringify(step.input),
      })),
    )
    .returning();
  return { run, steps: createdSteps };
}

export async function updateWorkflowStep({
  db,
  workspaceId,
  runId,
  stepId,
  status,
  output,
  errorMessage,
}: {
  db: Db;
  workspaceId: string;
  runId: string;
  stepId: string;
  status: "RUNNING" | "WAITING_APPROVAL" | "COMPLETED" | "FAILED" | "CANCELLED";
  output?: Record<string, unknown>;
  errorMessage?: string;
}) {
  const now = new Date().toISOString();
  const [step] = await db
    .update(workflowStep)
    .set({
      status,
      output: output ? JSON.stringify(output) : null,
      errorMessage: errorMessage ?? null,
      startedAt: status === "RUNNING" ? now : undefined,
      finishedAt: ["COMPLETED", "FAILED", "CANCELLED"].includes(status) ? now : null,
    })
    .where(
      and(
        eq(workflowStep.id, stepId),
        eq(workflowStep.workflowRunId, runId),
        eq(workflowStep.workspaceId, workspaceId),
      ),
    )
    .returning();
  if (!step) throw new Error("Workflow step not found.");
  return step;
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
    .where(and(eq(workflowRun.id, runId), eq(workflowRun.workspaceId, workspaceId)))
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
