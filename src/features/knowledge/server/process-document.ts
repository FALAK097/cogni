import type { Db } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import { document as documentTable } from "@/lib/db/schema";

import { extractDocumentText, indexDocumentContent } from "@/features/knowledge/server/extract";
import { logError } from "@/lib/logging/logger";
import { emitDomainEvent } from "@/lib/events/domain-events";
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

  try {
    await db
      .update(documentTable)
      .set({
        status: "PROCESSING",
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(documentTable.id, document.id), eq(documentTable.workspaceId, workspaceId)));
    const text = await extractDocumentText({
      sourceType: document.sourceType,
      sourceUrl: document.sourceUrl,
      storageKey: document.storageKey,
      mimeType: document.mimeType,
    });

    await indexDocumentContent(db, document.id, text, workspaceId);

    await db
      .update(documentTable)
      .set({
        status: "READY",
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(documentTable.id, document.id), eq(documentTable.workspaceId, workspaceId)));

    await completeWorkflowRun({
      db,
      workspaceId,
      runId: run.id,
      output: { documentId, chunkCount: text.length },
    });
    await emitDomainEvent({
      db,
      workspaceId,
      type: "document.ready",
      entityId: documentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    await db
      .update(documentTable)
      .set({
        status: "FAILED",
        errorMessage: message,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(documentTable.id, document.id), eq(documentTable.workspaceId, workspaceId)));
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
