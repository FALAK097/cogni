import "server-only";

import { after } from "next/server";
import { and, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";

import { processDocument } from "@/features/knowledge/server/process-document";
import type { Db } from "@/lib/db/client";
import { document as documentTable, workflowRun } from "@/lib/db/schema";
import { logError } from "@/lib/logging/logger";
import { failWorkflowRun } from "@/lib/workflows/runner";

export const ingestionJobSchema = z.object({
  type: z.literal("document.process"),
  workspaceId: z.string().min(1),
  documentId: z.string().min(1),
  idempotencyKey: z.string().min(1).max(256),
});

export type IngestionJob = z.infer<typeof ingestionJobSchema>;

const staleJobAgeMs = 10 * 60 * 1_000;

export async function enqueueDocumentProcessing({
  db,
  workspaceId,
  documentId,
  idempotencyKey,
}: {
  db: Db;
  workspaceId: string;
  documentId: string;
  idempotencyKey: string;
}) {
  const job = ingestionJobSchema.parse({
    type: "document.process",
    workspaceId,
    documentId,
    idempotencyKey,
  });
  let created: { id: string } | undefined;
  try {
    [created] = await db
      .insert(workflowRun)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        name: job.type,
        status: "QUEUED",
        idempotencyKey,
        input: JSON.stringify(job),
        attempts: 0,
        maxAttempts: 3,
        startedAt: new Date().toISOString(),
      })
      .onConflictDoNothing()
      .returning({ id: workflowRun.id });
  } catch (error) {
    await db
      .update(documentTable)
      .set({
        status: "FAILED",
        errorMessage: "Could not queue document processing.",
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspaceId)));
    throw error;
  }

  scheduleIngestionDrain(db);
  return { mode: "queued" as const, created: Boolean(created), workflowRunId: created?.id ?? null };
}

function scheduleIngestionDrain(db: Db) {
  try {
    after(async () => {
      await drainIngestionQueue(db, 3);
    });
  } catch {
    // A cron drain is the durable fallback when no Next.js request context is available.
  }
}

export async function drainIngestionQueue(db: Db, limit = 5) {
  const staleBefore = new Date(Date.now() - staleJobAgeMs).toISOString();
  const candidates = await db.query.workflowRun.findMany({
    where: (fields, { and, eq, inArray, lt, or }) =>
      and(
        eq(fields.name, "document.process"),
        or(
          inArray(fields.status, ["QUEUED", "FAILED"]),
          and(eq(fields.status, "RUNNING"), lt(fields.startedAt, staleBefore)),
        ),
      ),
    orderBy: (fields, { asc }) => [asc(fields.startedAt)],
    limit: Math.max(1, Math.min(limit, 20)),
  });

  let processed = 0;
  for (const candidate of candidates) {
    if (candidate.attempts >= candidate.maxAttempts) continue;
    const claimableStatuses = candidate.status === "RUNNING" ? ["RUNNING"] : ["QUEUED", "FAILED"];
    const [claimed] = await db
      .update(workflowRun)
      .set({
        status: "RUNNING",
        errorMessage: null,
        finishedAt: null,
        startedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(workflowRun.id, candidate.id),
          eq(workflowRun.workspaceId, candidate.workspaceId),
          inArray(workflowRun.status, claimableStatuses),
          candidate.status === "RUNNING" ? lt(workflowRun.startedAt, staleBefore) : undefined,
        ),
      )
      .returning({ id: workflowRun.id });
    if (!claimed) continue;

    try {
      await processIngestionJob(db, JSON.parse(candidate.input) as unknown);
    } catch (error) {
      const current = await db.query.workflowRun.findFirst({
        where: (fields, { and, eq }) =>
          and(eq(fields.id, candidate.id), eq(fields.workspaceId, candidate.workspaceId)),
        columns: { status: true },
      });
      if (current?.status === "RUNNING") {
        await failWorkflowRun({
          db,
          workspaceId: candidate.workspaceId,
          runId: candidate.id,
          errorMessage: error instanceof Error ? error.message : "Unknown ingestion failure.",
        });
      }
      logError("knowledge.ingestion.job_failed", {
        workflowRunId: candidate.id,
        workspaceId: candidate.workspaceId,
        error: error instanceof Error ? error.message : "Unknown ingestion failure.",
      });
    }
    processed += 1;
  }

  return { candidates: candidates.length, processed };
}

export async function processIngestionJob(db: Db, input: unknown) {
  const job = ingestionJobSchema.parse(input);
  await processDocument({
    db,
    workspaceId: job.workspaceId,
    documentId: job.documentId,
    idempotencyKey: job.idempotencyKey,
  });
}
