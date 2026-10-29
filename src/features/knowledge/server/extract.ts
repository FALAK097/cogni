import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { and, eq } from "drizzle-orm";
import {
  document as documentTable,
  documentChunk as documentChunkTable,
  documentRevision,
  searchItemCleanup,
} from "@/lib/db/schema";
import { runDbWriteOperation } from "@/lib/db/client";
import { readObject } from "@/lib/storage/index";
import { chunkText, stripHtml } from "@/features/knowledge/server/chunk";
import { extractPdfText } from "@/features/knowledge/server/extract-pdf";
import { crawlSitemapText } from "@/features/knowledge/server/crawl";
import {
  deleteCloudflareSearchItem,
  isCloudflareSearchConfigured,
  uploadCloudflareSearchDocument,
} from "@/lib/search/cloudflare-search";
import {
  searchItemCleanupClaimLeaseMs,
  shouldPersistSearchItemIdentity,
} from "@/features/knowledge/server/search-item-cleanup-policy";
import { fetchPublicText } from "@/features/knowledge/server/safe-fetch";
import {
  drainSearchItemCleanup,
  enqueueSearchItemCleanup,
  enqueueSearchItemCleanupInTransaction,
  hashSourceContent,
  lockWorkspaceSourceBasisInTransaction,
  recordDocumentRevisionInTransaction,
  releaseSearchItemCleanupReservation,
  renewSearchItemCleanupReservationInTransaction,
  reserveSearchItemCleanup,
} from "@/features/knowledge/server/source-revisions";
import { logError } from "@/lib/logging/logger";

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
  if (sourceType === "SITEMAP" && sourceUrl) {
    return crawlSitemapText(sourceUrl, stripHtml);
  }

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
  processingToken: number,
): Promise<{ status: "indexed"; readyToken: number } | { status: "stale" }> {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error("No extractable text found.");
  }

  let uploadAttempted = false;
  let uploadedItemId: string | null = null;
  let attemptedItemKey = `${documentId}.txt`;
  let reservationId: string | null = null;
  let requestedRevisionId: string | undefined;
  const searchConfigured = isCloudflareSearchConfigured();

  try {
    const contentSha256 = searchConfigured ? hashSourceContent(text) : null;
    const intent = await runDbWriteOperation(db, async (transaction) => {
      await lockWorkspaceSourceBasisInTransaction(transaction, workspaceId);
      const [source] = await transaction
        .select({
          id: documentTable.id,
          title: documentTable.title,
          status: documentTable.status,
          updatedAt: documentTable.updatedAt,
        })
        .from(documentTable)
        .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspaceId)))
        .for("update");
      if (!source) throw new Error("Knowledge source was not found in this workspace.");
      if (
        source.status !== "PROCESSING" ||
        new Date(source.updatedAt).getTime() !== processingToken
      ) {
        return { status: "stale" as const };
      }

      let shouldUpload = false;
      if (searchConfigured) {
        const [current] = await transaction
          .select({
            contentSha256: documentRevision.contentSha256,
            providerItemId: documentRevision.providerItemId,
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
        shouldUpload = !(current?.contentSha256 === contentSha256 && current.providerItemId);
      }

      // Always reserve a fresh revision/key. If another extraction wins during upload, the fresh
      // key allows its unneeded provider item to be cleaned without touching the winner's item.
      const revisionId = randomUUID();
      return {
        status: "current" as const,
        title: source.title,
        shouldUpload,
        revisionId,
        itemKey: `${documentId}.${revisionId}.txt`,
      };
    });

    if (intent.status === "stale") return intent;

    if (searchConfigured && intent.shouldUpload) {
      // The cleanup intent is committed separately from the transaction that uploads and records
      // the provider item. Its lease prevents cleanup from racing a normal upload attempt.
      const activeReservationId = await reserveSearchItemCleanup(db, {
        workspaceId,
        documentId,
        itemKey: intent.itemKey,
      });
      reservationId = activeReservationId;
      requestedRevisionId = intent.revisionId;
      attemptedItemKey = intent.itemKey;

      const renewed = await runDbWriteOperation(db, (transaction) =>
        renewSearchItemCleanupReservationInTransaction(transaction, {
          workspaceId,
          documentId,
          reservationId: activeReservationId,
        }),
      );
      if (!renewed) throw new Error("Search item upload reservation expired before upload.");

      let renewalFailed = false;
      let renewalWork = Promise.resolve();
      const renewalTimer = setInterval(
        () => {
          renewalWork = renewalWork
            .then(async () => {
              const stillReserved = await runDbWriteOperation(db, (transaction) =>
                renewSearchItemCleanupReservationInTransaction(transaction, {
                  workspaceId,
                  documentId,
                  reservationId: activeReservationId,
                }),
              );
              if (!stillReserved) renewalFailed = true;
            })
            .catch(() => {
              renewalFailed = true;
            });
        },
        Math.max(1_000, Math.floor(searchItemCleanupClaimLeaseMs / 3)),
      );

      try {
        uploadAttempted = true;
        uploadedItemId = await uploadCloudflareSearchDocument({
          documentId,
          workspaceId,
          title: intent.title,
          text,
          itemKey: attemptedItemKey,
        });
        await renewalWork;
        if (renewalFailed) {
          throw new Error("Search item upload reservation expired during upload.");
        }
      } finally {
        clearInterval(renewalTimer);
        await renewalWork;
      }
    }

    const result = await runDbWriteOperation(db, async (transaction) => {
      await lockWorkspaceSourceBasisInTransaction(transaction, workspaceId);
      const [source] = await transaction
        .select({
          id: documentTable.id,
          status: documentTable.status,
          updatedAt: documentTable.updatedAt,
        })
        .from(documentTable)
        .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspaceId)))
        .for("update");
      if (!source) throw new Error("Knowledge source was not found in this workspace.");

      if (
        source.status !== "PROCESSING" ||
        new Date(source.updatedAt).getTime() !== processingToken
      ) {
        if (reservationId) {
          if (uploadedItemId) {
            await enqueueSearchItemCleanupInTransaction(transaction, {
              workspaceId,
              documentId,
              itemId: uploadedItemId,
              itemKey: attemptedItemKey,
            });
          }
          await transaction
            .delete(searchItemCleanup)
            .where(
              and(
                eq(searchItemCleanup.id, reservationId),
                eq(searchItemCleanup.workspaceId, workspaceId),
              ),
            );
        }
        return { status: "stale" as const };
      }

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
        revisionId: requestedRevisionId,
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

      const itemKey = reservationId
        ? attemptedItemKey
        : (storedRevision?.providerItemKey ?? `${documentId}.${revision.revisionId}.txt`);
      attemptedItemKey = itemKey;
      let providerItemId = storedRevision?.providerItemId ?? null;

      if (searchConfigured && uploadedItemId && !providerItemId) {
        providerItemId = uploadedItemId;
      }

      if (
        uploadedItemId &&
        storedRevision?.providerItemId &&
        storedRevision.providerItemId !== uploadedItemId
      ) {
        await enqueueSearchItemCleanupInTransaction(transaction, {
          workspaceId,
          documentId,
          itemId: uploadedItemId,
          itemKey,
        });
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
        (revision.status === "created" ||
          (!previous.providerItemKey && providerItemId) ||
          (!previous.providerItemId && providerItemId && previous.providerItemKey !== itemKey))
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

      if (reservationId) {
        await transaction
          .delete(searchItemCleanup)
          .where(
            and(
              eq(searchItemCleanup.id, reservationId),
              eq(searchItemCleanup.workspaceId, workspaceId),
            ),
          );
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
      const readyToken = Math.max(Date.now(), processingToken + 1);
      await transaction
        .update(documentTable)
        .set({
          status: "READY",
          errorMessage: null,
          updatedAt: new Date(readyToken).toISOString(),
        })
        .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspaceId)));

      return { status: "indexed" as const, readyToken };
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
          if (reservationId && uploadedItemId) {
            const activeReservationId = reservationId;
            const updatedAt = new Date().toISOString();
            const reservation = await runDbWriteOperation(db, (transaction) =>
              transaction
                .update(searchItemCleanup)
                .set({ itemId: uploadedItemId, updatedAt })
                .where(
                  and(
                    eq(searchItemCleanup.id, activeReservationId),
                    eq(searchItemCleanup.workspaceId, workspaceId),
                  ),
                )
                .returning({ id: searchItemCleanup.id }),
            );
            if (reservation.length === 0) {
              await enqueueSearchItemCleanup(db, {
                workspaceId,
                documentId,
                itemId: uploadedItemId,
                itemKey: attemptedItemKey,
              });
            }
          } else if (reservationId) {
            const [reservation] = await db
              .select({ id: searchItemCleanup.id })
              .from(searchItemCleanup)
              .where(
                and(
                  eq(searchItemCleanup.id, reservationId),
                  eq(searchItemCleanup.workspaceId, workspaceId),
                ),
              )
              .limit(1);
            if (!reservation) {
              await reserveSearchItemCleanup(db, {
                workspaceId,
                documentId,
                itemKey: attemptedItemKey,
              });
            }
          } else {
            await enqueueSearchItemCleanup(db, {
              workspaceId,
              documentId,
              itemId: uploadedItemId ?? undefined,
              itemKey: attemptedItemKey,
            });
          }
        } catch {
          logError("knowledge.search_item_cleanup.enqueue_failed", { workspaceId, documentId });
        }
      } else if (reservationId) {
        try {
          await releaseSearchItemCleanupReservation(db, { workspaceId, reservationId });
        } catch {
          logError("knowledge.search_item_cleanup.reservation_release_failed", {
            workspaceId,
            documentId,
          });
        }
      }
    } else if (reservationId) {
      // No remote write began, so releasing the reservation is safe. If this release itself
      // fails, the ordinary cleanup worker will remove nothing and clear it after the lease.
      try {
        await releaseSearchItemCleanupReservation(db, { workspaceId, reservationId });
      } catch {
        logError("knowledge.search_item_cleanup.reservation_release_failed", {
          workspaceId,
          documentId,
        });
      }
    }
    throw error;
  }
}
