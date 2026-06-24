import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";

import { extractDocumentText, indexDocumentContent } from "@/features/knowledge/server/extract";
import { logError } from "@/lib/logging/logger";
import { completeWorkflowRun, failWorkflowRun, startWorkflowRun } from "@/lib/workflows/runner";

export async function processDocument({
  db,
  workspaceId,
  documentId,
  idempotencyKey,
}: {
  db: PrismaClient;
  workspaceId: string;
  documentId: string;
  idempotencyKey: string;
}) {
  const document = await db.document.findFirst({
    where: { id: documentId, workspaceId },
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  const run = await startWorkflowRun({
    db,
    workspaceId,
    name: "document.process",
    idempotencyKey,
    input: { documentId },
  });

  try {
    const text = await extractDocumentText({
      sourceType: document.sourceType,
      sourceUrl: document.sourceUrl,
      storageKey: document.storageKey,
      mimeType: document.mimeType,
      title: document.title,
    });

    await indexDocumentContent(db, document.id, text, workspaceId);

    await db.document.update({
      where: { id: document.id },
      data: { status: "READY", errorMessage: null },
    });

    await completeWorkflowRun({
      db,
      workspaceId,
      runId: run.id,
      output: { documentId, chunkCount: text.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    await db.document.update({
      where: { id: document.id },
      data: { status: "FAILED", errorMessage: message },
    });
    await failWorkflowRun({
      db,
      workspaceId,
      runId: run.id,
      errorMessage: message,
    });
    logError("knowledge.document.processing_failed", {
      workspaceId,
      documentId,
      workflowRunId: run.id,
      error: message,
    });
    throw error;
  }
}
