import "server-only";

import { z } from "zod";

import { processDocument } from "@/features/knowledge/server/process-document";
import type { Db } from "@/lib/db/client";

export const ingestionJobSchema = z.object({
  type: z.literal("document.process"),
  workspaceId: z.string().min(1),
  documentId: z.string().min(1),
  idempotencyKey: z.string().min(1).max(256),
});

export type IngestionJob = z.infer<typeof ingestionJobSchema>;

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
  await processIngestionJob(db, job);
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
