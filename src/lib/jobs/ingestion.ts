import "server-only";

import { after } from "next/server";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";

import { processDocument } from "@/features/knowledge/server/process-document";
import type { Db } from "@/lib/db/client";
import { document as documentTable, workflowRun } from "@/lib/db/schema";
import { logError } from "@/lib/logging/logger";
import { env } from "@/lib/env/server";
import { failWorkflowRun } from "@/lib/workflows/runner";

export const ingestionJobSchema = z.object({
  type: z.literal("document.process"),
  workspaceId: z.string().min(1),
  documentId: z.string().min(1),
  idempotencyKey: z.string().min(1).max(256),
});

export type IngestionJob = z.infer<typeof ingestionJobSchema>;

const staleJobAgeMs = 10 * 60 * 1_000;
const ingestionLeaseDurationMs = 2 * 60 * 1_000;
const ingestionLeaseHeartbeatMs = 30 * 1_000;

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

  if (created) {
    const published = await publishCloudflareIngestionJob(created.id, workspaceId);
    if (!published) scheduleIngestionDrain(db);
  }
  return { mode: "queued" as const, created: Boolean(created), workflowRunId: created?.id ?? null };
}

async function publishCloudflareIngestionJob(workflowRunId: string, workspaceId: string) {
  if (!env.CLOUDFLARE_INGESTION_QUEUE_URL || !env.INGESTION_SHARED_SECRET) return false;
  const callbackUrl = new URL("/api/internal/ingestion", env.BETTER_AUTH_URL);
  if (callbackUrl.protocol !== "https:") return false;

  try {
    const response = await fetch(env.CLOUDFLARE_INGESTION_QUEUE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.INGESTION_SHARED_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflowRunId,
        workspaceId,
        callbackUrl: callbackUrl.toString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Cloudflare queue returned ${response.status}.`);
    return true;
  } catch (error) {
    logError("knowledge.ingestion.publish_failed", {
      workflowRunId,
      workspaceId,
      error: error instanceof Error ? error.message : "Unknown queue publishing failure.",
    });
    return false;
  }
}

function scheduleIngestionDrain(db: Db) {
  try {
    after(async () => {
      await drainIngestionQueue(db, 3, {
        allowStaleRunning: env.INGESTION_RECLAIM_STALE !== "false",
      });
    });
  } catch {
    // A cron drain is the durable fallback when no Next.js request context is available.
  }
}

export async function drainIngestionQueue(
  db: Db,
  limit = 5,
  { allowStaleRunning = true }: { allowStaleRunning?: boolean } = {},
) {
  const staleBefore = new Date(Date.now() - staleJobAgeMs).toISOString();
  const leaseExpiredAt = new Date().toISOString();
  const candidates = await db.query.workflowRun.findMany({
    where: (fields, { and, eq, inArray, lt, or }) => {
      const eligibleStatus = allowStaleRunning
        ? or(
            inArray(fields.status, ["QUEUED", "FAILED"]),
            and(
              eq(fields.status, "RUNNING"),
              or(
                and(isNull(fields.leaseExpiresAt), lt(fields.startedAt, staleBefore)),
                lt(fields.leaseExpiresAt, leaseExpiredAt),
              ),
            ),
          )
        : inArray(fields.status, ["QUEUED", "FAILED"]);

      return and(eq(fields.name, "document.process"), eligibleStatus);
    },
    orderBy: (fields, { asc }) => [asc(fields.startedAt)],
    limit: Math.max(1, Math.min(limit, 20)),
  });

  let processed = 0;
  for (const candidate of candidates) {
    if (candidate.attempts >= candidate.maxAttempts) continue;
    try {
      const result = await processIngestionWorkflowRun({
        db,
        workspaceId: candidate.workspaceId,
        workflowRunId: candidate.id,
        allowStaleRunning,
      });
      if (!result.claimed) continue;
    } catch (error) {
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

export async function processIngestionWorkflowRun({
  db,
  workspaceId,
  workflowRunId,
  allowStaleRunning = false,
  leaseTiming,
}: {
  db: Db;
  workspaceId: string;
  workflowRunId: string;
  allowStaleRunning?: boolean;
  leaseTiming?: {
    durationMs?: number;
    heartbeatMs?: number;
    enabled?: boolean;
    now?: () => Date;
  };
}) {
  const nowDate = () => leaseTiming?.now?.() ?? new Date();
  const leaseDurationMs = leaseTiming?.durationMs ?? ingestionLeaseDurationMs;
  const heartbeatMs = leaseTiming?.heartbeatMs ?? ingestionLeaseHeartbeatMs;
  const now = nowDate().toISOString();
  const staleBefore = new Date(nowDate().getTime() - staleJobAgeMs).toISOString();
  const leaseToken = crypto.randomUUID();
  const [claimed] = await db
    .update(workflowRun)
    .set({
      status: "RUNNING",
      errorMessage: null,
      finishedAt: null,
      startedAt: now,
      leaseToken,
      leaseExpiresAt: new Date(nowDate().getTime() + leaseDurationMs).toISOString(),
    })
    .where(
      and(
        eq(workflowRun.id, workflowRunId),
        eq(workflowRun.workspaceId, workspaceId),
        eq(workflowRun.name, "document.process"),
        allowStaleRunning
          ? or(
              inArray(workflowRun.status, ["QUEUED", "FAILED"]),
              and(
                eq(workflowRun.status, "RUNNING"),
                or(
                  and(isNull(workflowRun.leaseExpiresAt), lt(workflowRun.startedAt, staleBefore)),
                  lt(workflowRun.leaseExpiresAt, now),
                ),
              ),
            )
          : inArray(workflowRun.status, ["QUEUED", "FAILED"]),
      ),
    )
    .returning({ input: workflowRun.input });

  if (!claimed) {
    const existing = await db.query.workflowRun.findFirst({
      where: (fields, { and, eq }) =>
        and(eq(fields.id, workflowRunId), eq(fields.workspaceId, workspaceId)),
      columns: { status: true },
    });
    return { claimed: false, status: existing?.status ?? "NOT_FOUND" };
  }

  let leaseOwned = true;
  const heartbeat =
    leaseTiming?.enabled === false
      ? undefined
      : setInterval(() => {
          const renewedAt = nowDate();
          void db
            .update(workflowRun)
            .set({
              leaseExpiresAt: new Date(renewedAt.getTime() + leaseDurationMs).toISOString(),
            })
            .where(
              and(
                eq(workflowRun.id, workflowRunId),
                eq(workflowRun.workspaceId, workspaceId),
                eq(workflowRun.status, "RUNNING"),
                eq(workflowRun.leaseToken, leaseToken),
              ),
            )
            .returning({ id: workflowRun.id })
            .then((rows) => {
              if (rows.length === 0) leaseOwned = false;
            })
            .catch(() => {
              leaseOwned = false;
            });
        }, heartbeatMs);
  heartbeat?.unref?.();

  try {
    await processIngestionJob(db, JSON.parse(claimed.input) as unknown, leaseToken, async () => {
      if (!leaseOwned) throw new Error("Ingestion lease was lost; refusing further processing.");
      try {
        const current = await db.query.workflowRun.findFirst({
          where: (fields, { and, eq, gt }) =>
            and(
              eq(fields.id, workflowRunId),
              eq(fields.workspaceId, workspaceId),
              eq(fields.status, "RUNNING"),
              eq(fields.leaseToken, leaseToken),
              gt(fields.leaseExpiresAt, nowDate().toISOString()),
            ),
          columns: { id: true },
        });
        if (current) return;
      } catch (error) {
        leaseOwned = false;
        throw error;
      }
      leaseOwned = false;
      throw new Error("Ingestion lease was lost; refusing further processing.");
    });
    if (!leaseOwned) throw new Error("Ingestion lease was lost before completion.");
  } catch (error) {
    await failWorkflowRun({
      db,
      workspaceId,
      runId: workflowRunId,
      errorMessage: error instanceof Error ? error.message : "Unknown ingestion failure.",
      leaseToken,
    });
    throw error;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
  }
  return { claimed: true, status: "COMPLETED" as const };
}

export async function processIngestionJob(
  db: Db,
  input: unknown,
  leaseToken: string,
  assertLease: () => Promise<void> = async () => {},
) {
  const job = ingestionJobSchema.parse(input);
  await assertLease();
  await processDocument({
    db,
    workspaceId: job.workspaceId,
    documentId: job.documentId,
    idempotencyKey: job.idempotencyKey,
    leaseToken,
    assertLease,
  });
}
