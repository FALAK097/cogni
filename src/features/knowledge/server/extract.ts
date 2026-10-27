import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import {
  document as documentTable,
  documentChunk as documentChunkTable,
  documentRevision,
} from "@/lib/db/schema";
import { runDbWriteOperation } from "@/lib/db/client";
import { readObject } from "@/lib/storage/index";
import { chunkText, stripHtml } from "@/features/knowledge/server/chunk";
import { extractPdfText } from "@/features/knowledge/server/extract-pdf";
import {
  deleteCloudflareSearchItem,
  isCloudflareSearchConfigured,
  uploadCloudflareSearchDocument,
} from "@/lib/search/cloudflare-search";
import { fetchPublicText } from "@/features/knowledge/server/safe-fetch";
import {
  drainSearchItemCleanup,
  enqueueSearchItemCleanup,
  enqueueSearchItemCleanupInTransaction,
  recordDocumentRevisionInTransaction,
  type SourceRevisionWriteResult,
} from "@/features/knowledge/server/source-revisions";
import { logError } from "@/lib/logging/logger";
import { shouldPersistSearchItemIdentity } from "@/features/knowledge/server/search-item-cleanup-policy";

export async function extractDocumentText({
  sourceType,
  sourceUrl,
  storageKey,
  mimeType,
}: {
  sourceType: string;
  sourceUrl?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
}) {
  if (sourceType === "URL" && sourceUrl) {
    const html = await fetchPublicText(
      sourceUrl,
      ["text/html", "text/plain", "application/xhtml+xml"],
      1_000_000,
      15_000,
    );
    if (html === null) {
      throw new Error("Could not fetch the URL.");
    }
    return stripHtml(html);
  }

  if (!storageKey) {
    throw new Error("Missing uploaded file.");
  }

  const bytes = await readObject(storageKey);
  const text = bytes.toString("utf8");

  if (sourceType === "TXT" || mimeType === "text/plain") {
    return text;
  }

  if (sourceType === "PDF") {
    return extractPdfText(bytes);
  }

  if (sourceType === "DOCX") {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer: bytes });
    return parsed.value.trim();
  }

  throw new Error("Unsupported document type.");
}

export async function indexDocumentContent(
  db: Db,
  documentId: string,
  text: string,
  workspaceId: string,
): Promise<SourceRevisionWriteResult> {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error("No extractable text found.");
  }

  let uploadAttempted = false;
  let uploadedItemId: string | null = null;
  let attemptedItemKey = `${documentId}.txt`;

  try {
    const result = await runDbWriteOperation(db, async (transaction) => {
      const [source] = await transaction
        .select({ id: documentTable.id, title: documentTable.title })
        .from(documentTable)
        .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspaceId)))
        .for("update");
      if (!source) throw new Error("Knowledge source was not found in this workspace.");

      const [previous] = await transaction
        .select({
          id: documentRevision.id,
          providerItemId: documentRevision.providerItemId,
          providerItemKey: documentRevision.providerItemKey,
        })
        .from(documentRevision)
        .where(
          and(
            eq(documentRevision.workspaceId, workspaceId),
            eq(documentRevision.documentId, documentId),
            eq(documentRevision.status, "CURRENT"),
          ),
        )
        .limit(1);

      const revision = await recordDocumentRevisionInTransaction(transaction, {
        workspaceId,
        documentId,
        content: text,
      });
      if (revision.status === "unsupported-source") {
        throw new Error(`Knowledge source type ${revision.sourceType} cannot be versioned.`);
      }

      const [storedRevision] = await transaction
        .select({
          providerItemId: documentRevision.providerItemId,
          providerItemKey: documentRevision.providerItemKey,
        })
        .from(documentRevision)
        .where(
          and(
            eq(documentRevision.id, revision.revisionId),
            eq(documentRevision.workspaceId, workspaceId),
            eq(documentRevision.documentId, documentId),
          ),
        )
        .limit(1);

      const itemKey = storedRevision?.providerItemKey ?? `${documentId}.${revision.revisionId}.txt`;
      attemptedItemKey = itemKey;
      let providerItemId = storedRevision?.providerItemId ?? null;

      if (isCloudflareSearchConfigured() && !providerItemId) {
        uploadAttempted = true;
        providerItemId = await uploadCloudflareSearchDocument({
          documentId,
          workspaceId,
          title: source.title,
          text,
          itemKey,
        });
        uploadedItemId = providerItemId;
      }

      if (
        shouldPersistSearchItemIdentity({
          revisionStatus: revision.status,
          currentItemId: storedRevision?.providerItemId,
          currentItemKey: storedRevision?.providerItemKey,
          nextItemId: providerItemId,
        })
      ) {
        await transaction
          .update(documentRevision)
          .set({ providerItemId, providerItemKey: itemKey })
          .where(
            and(
              eq(documentRevision.id, revision.revisionId),
              eq(documentRevision.workspaceId, workspaceId),
              eq(documentRevision.documentId, documentId),
            ),
          );
      }

      if (
        previous &&
        (revision.status === "created" || (!previous.providerItemKey && providerItemId))
      ) {
        await enqueueSearchItemCleanupInTransaction(transaction, {
          workspaceId,
          documentId,
          itemId: previous.providerItemId ?? undefined,
          itemKey: previous.providerItemKey ?? `${documentId}.txt`,
        });
      } else if (!previous && revision.status === "created") {
        await enqueueSearchItemCleanupInTransaction(transaction, {
          workspaceId,
          documentId,
          itemKey: `${documentId}.txt`,
        });
      }

      await transaction
        .delete(documentChunkTable)
        .where(eq(documentChunkTable.documentId, documentId));

      const chunkValues = chunks.map((content, position) => ({
        id: randomUUID(),
        documentId,
        content,
        position,
      }));
      await transaction.insert(documentChunkTable).values(chunkValues);
      await transaction
        .update(documentTable)
        .set({ status: "READY", errorMessage: null, updatedAt: new Date().toISOString() })
        .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspaceId)));

      return revision;
    });

    try {
      await drainSearchItemCleanup(db, 10, workspaceId);
    } catch {
      logError("knowledge.search_item_cleanup.drain_failed", { workspaceId, documentId });
    }
    return result;
  } catch (error) {
    if (uploadAttempted) {
      let compensated = false;
      if (uploadedItemId) {
        try {
          compensated = await deleteCloudflareSearchItem(uploadedItemId);
        } catch {
          compensated = false;
        }
      }
      if (!compensated) {
        try {
          await enqueueSearchItemCleanup(db, {
            workspaceId,
            documentId,
            itemId: uploadedItemId ?? undefined,
            itemKey: attemptedItemKey,
          });
        } catch {
          logError("knowledge.search_item_cleanup.enqueue_failed", { workspaceId, documentId });
        }
      }
    }
    throw error;
  }
}
