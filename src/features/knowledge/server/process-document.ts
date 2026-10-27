import type { Db } from "@/lib/db/client";
import { and, eq, gt } from "drizzle-orm";
import { document as documentTable, workflowRun } from "@/lib/db/schema";
import { acquireDocumentLock } from "@/lib/db/document-lock";

import { extractDocumentText, indexDocumentContent } from "@/features/knowledge/server/extract";
import { logError } from "@/lib/logging/logger";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { completeWorkflowRun, failWorkflowRun, startWorkflowRun } from "@/lib/workflows/runner";

export async function processDocument({
  db,
  workspaceId,
  documentId,
  idempotencyKey,
  leaseToken,
  assertLease = async () => {},
}: {
  db: Db;
  workspaceId: string;
  documentId: string;
  idempotencyKey: string;
  leaseToken?: string;
  assertLease?: () => Promise<void>;
}) {
  const document = await db.query.document.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, documentId), eq(fields.workspaceId, workspaceId)),
  });

  if (!document) {
    throw new Error("Document not found.");
  }
  const sourceDocument = document;

  const run = await startWorkflowRun({
    db,
    workspaceId,
    name: "document.process",
    idempotencyKey,
    input: { documentId },
  });

  const documentLockKey = `${workspaceId}:${sourceDocument.id}`;
  let releaseDocumentLock: (() => Promise<void>) | undefined;
  if (leaseToken) {
    releaseDocumentLock = await acquireDocumentLock(documentLockKey, assertLease);
  }

  async function updateDocumentState(
    status: "PROCESSING" | "READY" | "FAILED",
    errorMessage: string | null,
  ) {
    const values = { status, errorMessage, updatedAt: new Date().toISOString() };
    if (!leaseToken) {
      await db
        .update(documentTable)
        .set(values)
        .where(
          and(eq(documentTable.id, sourceDocument.id), eq(documentTable.workspaceId, workspaceId)),
        );
      return;
    }

    // Lock and validate the lease row in the same transaction as the document write. A competing
    // reclaim either commits first (and this update is rejected) or waits until this write commits.
    await db.transaction(async (transaction) => {
      const [ownedRun] = await transaction
        .select({ id: workflowRun.id })
        .from(workflowRun)
        .where(
          and(
            eq(workflowRun.id, run.id),
            eq(workflowRun.workspaceId, workspaceId),
            eq(workflowRun.status, "RUNNING"),
            eq(workflowRun.leaseToken, leaseToken),
            gt(workflowRun.leaseExpiresAt, new Date().toISOString()),
          ),
        )
        .for("update")
        .limit(1);

      if (!ownedRun) throw new Error("Ingestion lease was lost before document update.");
      await transaction
        .update(documentTable)
        .set(values)
        .where(
          and(eq(documentTable.id, sourceDocument.id), eq(documentTable.workspaceId, workspaceId)),
        );
    });
  }

  try {
    await assertLease();
    await updateDocumentState("PROCESSING", null);
    const text = await extractDocumentText({
      sourceType: sourceDocument.sourceType,
      sourceUrl: sourceDocument.sourceUrl,
      storageKey: sourceDocument.storageKey,
      mimeType: sourceDocument.mimeType,
    });

    await assertLease();
    await indexDocumentContent(db, sourceDocument.id, text, workspaceId);

    await assertLease();
    await updateDocumentState("READY", null);

    await completeWorkflowRun({
      db,
      workspaceId,
      runId: run.id,
      output: { documentId: sourceDocument.id, chunkCount: text.length },
      leaseToken,
    });
    await emitDomainEvent({
      db,
      workspaceId,
      type: "document.ready",
      entityId: sourceDocument.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed.";
    await assertLease();
    await updateDocumentState("FAILED", message);
    await failWorkflowRun({
      db,
      workspaceId,
      runId: run.id,
      errorMessage: message,
      leaseToken,
    });
    logError("knowledge.document.processing_failed", {
      workspaceId,
      documentId,
      workflowRunId: run.id,
      error: message,
    });
    throw error;
  } finally {
    await releaseDocumentLock?.();
  }
}
