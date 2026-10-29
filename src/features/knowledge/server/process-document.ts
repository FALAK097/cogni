import type { Db } from "@/lib/db/client";

import { extractDocumentText, indexDocumentContent } from "@/features/knowledge/server/extract";
import {
  claimKnowledgeSourceProcessingAttempt,
  emitKnowledgeSourceReadyIfCurrent,
  failKnowledgeSourceProcessingAttempt,
} from "@/features/knowledge/server/source-revisions";
import { logError } from "@/lib/logging/logger";
import { completeWorkflowRun, failWorkflowRun, startWorkflowRun } from "@/lib/workflows/runner";

export async function processDocument({
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
  const document = await db.query.document.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, documentId), eq(fields.workspaceId, workspaceId)),
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

  let processingToken: number | null = null;
  let chunkCount = 0;
  let result: Awaited<ReturnType<typeof indexDocumentContent>> | null = null;

  try {
    processingToken = await claimKnowledgeSourceProcessingAttempt(db, {
      workspaceId,
      documentId: document.id,
    });
    if (processingToken === null) {
      await completeWorkflowRun({
        db,
        workspaceId,
        runId: run.id,
        output: { documentId, status: "stale" },
      });
      return;
    }

    const text = await extractDocumentText({
      sourceType: document.sourceType,
      sourceUrl: document.sourceUrl,
      storageKey: document.storageKey,
      mimeType: document.mimeType,
    });

    chunkCount = text.length;
    result = await indexDocumentContent(db, document.id, text, workspaceId, processingToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    if (processingToken !== null) {
      const failed = await failKnowledgeSourceProcessingAttempt(db, {
        workspaceId,
        documentId: document.id,
        processingToken,
        errorMessage: message,
      });
      if (!failed) {
        await completeWorkflowRun({
          db,
          workspaceId,
          runId: run.id,
          output: { documentId, status: "stale" },
        });
        return;
      }
    }

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

  if (!result || result.status === "stale") {
    await completeWorkflowRun({
      workspaceId,
      db,
      runId: run.id,
      output: { documentId, status: "stale" },
    });
    return;
  }

  await completeWorkflowRun({
    db,
    workspaceId,
    runId: run.id,
    output: { documentId, chunkCount },
  });
  await emitKnowledgeSourceReadyIfCurrent(db, {
    workspaceId,
    documentId,
    readyToken: result.readyToken,
  });
}
