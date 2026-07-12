import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

import type { Db } from "@/lib/db/client";
import { processDocument } from "@/features/knowledge/server/process-document";

export const ingestionJobSchema = z.object({
  type: z.literal("document.process"),
  workspaceId: z.string().min(1),
  documentId: z.string().min(1),
  idempotencyKey: z.string().min(1).max(256),
});

export type IngestionJob = z.infer<typeof ingestionJobSchema>;

type IngestionEnv = {
  INGESTION_QUEUE?: Queue<IngestionJob>;
};

function getIngestionQueue() {
  try {
    const environment = getCloudflareContext().env as IngestionEnv;
    return environment.INGESTION_QUEUE ?? null;
  } catch {
    return null;
  }
}

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
  const queue = getIngestionQueue();

  if (queue) {
    await queue.send(job, { contentType: "json" });
    return { mode: "queued" as const };
  }

  await processDocument({ db, ...job });
  return { mode: "synchronous" as const };
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
