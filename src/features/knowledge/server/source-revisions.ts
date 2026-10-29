import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";

import {
  document as documentTable,
  documentRevision,
  searchItemCleanup,
  widget,
} from "@/lib/db/schema";
import { runDbWriteOperation, type Db } from "@/lib/db/client";
import {
  deleteCloudflareSearchItem,
  deleteCloudflareSearchItemsByKey,
  isCloudflareSearchConfigured,
} from "@/lib/search/cloudflare-search";
import { logError } from "@/lib/logging/logger";
import {
  getSearchItemCleanupClaimLimit,
  getSearchItemCleanupRequestLimit,
  getSearchItemCleanupRetryDelayMs,
  searchItemCleanupClaimLeaseMs,
} from "@/features/knowledge/server/search-item-cleanup-policy";

const supportedSourceTypes = new Set(["URL", "TXT", "TEXT", "PDF", "DOCX"]);

export function isSupportedKnowledgeSourceType(sourceType: string) {
  return supportedSourceTypes.has(sourceType);
}

export type SourceRevisionWriteResult =
  | {
      status: "created";
      revisionId: string;
      revisionNumber: number;
      contentSha256: string;
    }
  | {
      status: "unchanged";
      revisionId: string;
      revisionNumber: number;
      contentSha256: string;
    }
  | { status: "unsupported-source"; sourceType: string };

export type SourceRevisionResolution =
  | {
      status: "versioned";
      revisionId: string;
      revisionNumber: number;
      contentSha256: string;
      sourceType: string;
    }
  | {
      status: "deleted";
      revisionId: string;
      revisionNumber: number;
      contentSha256: string;
      sourceType: string;
    }
  | { status: "legacy-unversioned" }
  | { status: "unsupported-source"; sourceType: string }
  | { status: "not-ready"; sourceStatus: string }
  | { status: "revision-unavailable" }
  | { status: "not-found" };

export class SourceRevisionDocumentNotFoundError extends Error {
  constructor() {
    super("Knowledge source was not found in this workspace.");
    this.name = "SourceRevisionDocumentNotFoundError";
  }
}

/** Hashes extracted UTF-8 text only; raw source content and provider responses are never retained. */
export function hashSourceContent(content: string) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/** Serialize changes to the workspace's source basis before taking any document row locks. */
export async function lockWorkspaceSourceBasisInTransaction(transaction: Db, workspaceId: string) {
  const [saved] = await transaction
    .select({ id: widget.id })
    .from(widget)
    .where(eq(widget.workspaceId, workspaceId))
    .limit(1)
    .for("update");
  if (!saved) throw new Error("Agent configuration was not found.");
}

export async function updateKnowledgeSourceStatus(
  db: Db,
  input: {
    workspaceId: string;
    documentId: string;
    status: "PROCESSING" | "FAILED";
    errorMessage: string | null;
  },
) {
  return runDbWriteOperation(db, async (transaction) => {
    await lockWorkspaceSourceBasisInTransaction(transaction, input.workspaceId);
    const [source] = await transaction
      .select({ id: documentTable.id, updatedAt: documentTable.updatedAt })
      .from(documentTable)
      .where(
        and(
          eq(documentTable.id, input.documentId),
          eq(documentTable.workspaceId, input.workspaceId),
        ),
      )
      .for("update");
    if (!source) return false;

    const updatedAt = new Date(nextKnowledgeSourceToken(source.updatedAt)).toISOString();

    await transaction
      .update(documentTable)
      .set({
        status: input.status,
        errorMessage: input.errorMessage,
        updatedAt,
      })
      .where(
        and(
          eq(documentTable.id, input.documentId),
          eq(documentTable.workspaceId, input.workspaceId),
        ),
      );
    return true;
  });
}

/** Use the source timestamp as a monotonically increasing processing-attempt token. */
function nextKnowledgeSourceToken(updatedAt: string) {
  const previousUpdatedAt = new Date(updatedAt).getTime();
  const now = Date.now();
  return Math.max(now, Number.isFinite(previousUpdatedAt) ? previousUpdatedAt + 1 : now);
}

export async function claimKnowledgeSourceProcessingAttempt(
  db: Db,
  input: { workspaceId: string; documentId: string },
) {
  return runDbWriteOperation(db, async (transaction) => {
    await lockWorkspaceSourceBasisInTransaction(transaction, input.workspaceId);
    const [source] = await transaction
      .select({ id: documentTable.id, updatedAt: documentTable.updatedAt })
      .from(documentTable)
      .where(
        and(
          eq(documentTable.id, input.documentId),
          eq(documentTable.workspaceId, input.workspaceId),
        ),
      )
      .for("update");
    if (!source) return null;

    const processingToken = nextKnowledgeSourceToken(source.updatedAt);
    const updated = await transaction
      .update(documentTable)
      .set({
        status: "PROCESSING",
        errorMessage: null,
        updatedAt: new Date(processingToken).toISOString(),
      })
      .where(
        and(
          eq(documentTable.id, input.documentId),
          eq(documentTable.workspaceId, input.workspaceId),
        ),
      )
      .returning({ id: documentTable.id });
    return updated.length === 1 ? processingToken : null;
  });
}

/** Only the attempt that still owns PROCESSING may transition a source to FAILED. */
export async function failKnowledgeSourceProcessingAttempt(
  db: Db,
  input: {
    workspaceId: string;
    documentId: string;
    processingToken: number;
    errorMessage: string;
  },
) {
  return runDbWriteOperation(db, async (transaction) => {
    await lockWorkspaceSourceBasisInTransaction(transaction, input.workspaceId);
    const [source] = await transaction
      .select({
        id: documentTable.id,
        status: documentTable.status,
        updatedAt: documentTable.updatedAt,
      })
      .from(documentTable)
      .where(
        and(
          eq(documentTable.id, input.documentId),
          eq(documentTable.workspaceId, input.workspaceId),
        ),
      )
      .for("update");
    if (
      !source ||
      source.status !== "PROCESSING" ||
      new Date(source.updatedAt).getTime() !== input.processingToken
    ) {
      return false;
    }

    await transaction
      .update(documentTable)
      .set({
        status: "FAILED",
        errorMessage: input.errorMessage,
        updatedAt: new Date(nextKnowledgeSourceToken(source.updatedAt)).toISOString(),
      })
      .where(
        and(
          eq(documentTable.id, input.documentId),
          eq(documentTable.workspaceId, input.workspaceId),
          eq(documentTable.status, "PROCESSING"),
        ),
      );
    return true;
  });
}

/**
 * Call inside the same transaction that makes the newly extracted content READY. The source row
 * lock serializes revision numbers and the partial unique index enforces a single CURRENT row.
 */
export async function recordDocumentRevisionInTransaction(
  transaction: Db,
  {
    workspaceId,
    documentId,
    content,
    revisionId: requestedRevisionId,
  }: { workspaceId: string; documentId: string; content: string; revisionId?: string },
): Promise<SourceRevisionWriteResult> {
  await lockWorkspaceSourceBasisInTransaction(transaction, workspaceId);
  const [source] = await transaction
    .select({ id: documentTable.id, sourceType: documentTable.sourceType })
    .from(documentTable)
    .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspaceId)))
    .for("update");

  if (!source) throw new SourceRevisionDocumentNotFoundError();
  if (!isSupportedKnowledgeSourceType(source.sourceType)) {
    return { status: "unsupported-source", sourceType: source.sourceType };
  }

  const contentSha256 = hashSourceContent(content);
  const [current] = await transaction
    .select({
      id: documentRevision.id,
      revisionNumber: documentRevision.revisionNumber,
      contentSha256: documentRevision.contentSha256,
    })
    .from(documentRevision)
    .where(
      and(
        eq(documentRevision.workspaceId, workspaceId),
        eq(documentRevision.documentId, documentId),
        eq(documentRevision.status, "CURRENT"),
      ),
    )
    .orderBy(desc(documentRevision.revisionNumber))
    .limit(1);

  if (current?.contentSha256 === contentSha256) {
    return {
      status: "unchanged",
      revisionId: current.id,
      revisionNumber: current.revisionNumber,
      contentSha256,
    };
  }

  const [latest] = await transaction
    .select({ revisionNumber: documentRevision.revisionNumber })
    .from(documentRevision)
    .where(
      and(
        eq(documentRevision.workspaceId, workspaceId),
        eq(documentRevision.documentId, documentId),
      ),
    )
    .orderBy(desc(documentRevision.revisionNumber))
    .limit(1);

  const now = new Date().toISOString();
  if (current) {
    await transaction
      .update(documentRevision)
      .set({ status: "SUPERSEDED", retiredAt: now })
      .where(
        and(
          eq(documentRevision.id, current.id),
          eq(documentRevision.workspaceId, workspaceId),
          eq(documentRevision.documentId, documentId),
          eq(documentRevision.status, "CURRENT"),
        ),
      );
  }

  const revisionNumber = (latest?.revisionNumber ?? 0) + 1;
  const revisionId = requestedRevisionId ?? randomUUID();
  await transaction.insert(documentRevision).values({
    id: revisionId,
    workspaceId,
    documentId,
    revisionNumber,
    contentSha256,
    sourceType: source.sourceType,
    status: "CURRENT",
    createdAt: now,
  });

  return { status: "created", revisionId, revisionNumber, contentSha256 };
}

export async function recordDocumentRevision(
  db: Db,
  input: { workspaceId: string; documentId: string; content: string },
) {
  return runDbWriteOperation(db, (transaction) =>
    recordDocumentRevisionInTransaction(transaction, input),
  );
}

/** A legacy READY source without a revision remains explicitly unversioned; never synthesize one. */
export async function resolveDocumentRevision(
  db: Db,
  workspaceId: string,
  documentId: string,
): Promise<SourceRevisionResolution> {
  const [source] = await db
    .select({
      id: documentTable.id,
      sourceType: documentTable.sourceType,
      status: documentTable.status,
    })
    .from(documentTable)
    .where(and(eq(documentTable.id, documentId), eq(documentTable.workspaceId, workspaceId)))
    .limit(1);

  if (!source) {
    const [deleted] = await db
      .select({
        id: documentRevision.id,
        revisionNumber: documentRevision.revisionNumber,
        contentSha256: documentRevision.contentSha256,
        sourceType: documentRevision.sourceType,
        status: documentRevision.status,
      })
      .from(documentRevision)
      .where(
        and(
          eq(documentRevision.workspaceId, workspaceId),
          eq(documentRevision.documentId, documentId),
        ),
      )
      .orderBy(desc(documentRevision.revisionNumber))
      .limit(1);

    if (deleted?.status === "DELETED") {
      return {
        status: "deleted",
        revisionId: deleted.id,
        revisionNumber: deleted.revisionNumber,
        contentSha256: deleted.contentSha256,
        sourceType: deleted.sourceType,
      };
    }
    return { status: "not-found" };
  }
  if (!isSupportedKnowledgeSourceType(source.sourceType)) {
    return { status: "unsupported-source", sourceType: source.sourceType };
  }
  if (source.status !== "READY") {
    return { status: "not-ready", sourceStatus: source.status };
  }

  const [latest] = await db
    .select({
      id: documentRevision.id,
      revisionNumber: documentRevision.revisionNumber,
      contentSha256: documentRevision.contentSha256,
      sourceType: documentRevision.sourceType,
      status: documentRevision.status,
    })
    .from(documentRevision)
    .where(
      and(
        eq(documentRevision.workspaceId, workspaceId),
        eq(documentRevision.documentId, documentId),
      ),
    )
    .orderBy(desc(documentRevision.revisionNumber))
    .limit(1);

  if (!latest) return { status: "legacy-unversioned" };
  if (latest.status !== "CURRENT") return { status: "revision-unavailable" };

  return {
    status: "versioned",
    revisionId: latest.id,
    revisionNumber: latest.revisionNumber,
    contentSha256: latest.contentSha256,
    sourceType: latest.sourceType,
  };
}

/** Retain identity-only tombstones while source text, chunks, and file objects are deleted. */
export async function markDocumentRevisionsDeleted(
  transaction: Db,
  workspaceId: string,
  documentId: string,
) {
  await lockWorkspaceSourceBasisInTransaction(transaction, workspaceId);
  await transaction
    .select({ id: documentTable.id })
    .from(documentTable)
    .where(and(eq(documentTable.workspaceId, workspaceId), eq(documentTable.id, documentId)))
    .for("update");

  const revisions = await transaction
    .select({
      providerItemId: documentRevision.providerItemId,
      providerItemKey: documentRevision.providerItemKey,
    })
    .from(documentRevision)
    .where(
      and(
        eq(documentRevision.workspaceId, workspaceId),
        eq(documentRevision.documentId, documentId),
      ),
    );

  if (revisions.length === 0) {
    await enqueueSearchItemCleanupInTransaction(transaction, {
      workspaceId,
      documentId,
      itemKey: `${documentId}.txt`,
    });
  } else {
    for (const revision of revisions) {
      await enqueueSearchItemCleanupInTransaction(transaction, {
        workspaceId,
        documentId,
        itemId: revision.providerItemId ?? undefined,
        itemKey: revision.providerItemKey ?? `${documentId}.txt`,
      });
    }
  }

  await transaction
    .update(documentRevision)
    .set({ status: "DELETED", retiredAt: new Date().toISOString() })
    .where(
      and(
        eq(documentRevision.workspaceId, workspaceId),
        eq(documentRevision.documentId, documentId),
      ),
    );
}

export async function enqueueSearchItemCleanupInTransaction(
  transaction: Db,
  {
    workspaceId,
    documentId,
    itemId,
    itemKey,
  }: { workspaceId: string; documentId: string; itemId?: string; itemKey: string },
) {
  await transaction.insert(searchItemCleanup).values({
    id: randomUUID(),
    workspaceId,
    documentId,
    itemId: itemId ?? null,
    itemKey,
    attempts: 0,
    nextAttemptAt: new Date().toISOString(),
    claimedUntil: null,
    updatedAt: new Date().toISOString(),
  });
}

export async function enqueueSearchItemCleanup(
  db: Db,
  input: { workspaceId: string; documentId: string; itemId?: string; itemKey: string },
) {
  await runDbWriteOperation(db, (transaction) =>
    enqueueSearchItemCleanupInTransaction(transaction, input),
  );
}

/**
 * Persist a cleanup intent before uploading a new provider item. If the process dies after the
 * remote upload but before the revision transaction commits, the normal cleanup drain will find
 * this row after its reservation lease expires and remove the unreferenced provider item by key.
 */
export async function reserveSearchItemCleanup(
  db: Db,
  input: { workspaceId: string; documentId: string; itemKey: string },
) {
  const id = randomUUID();
  const now = new Date();
  await runDbWriteOperation(db, async (transaction) => {
    await transaction.insert(searchItemCleanup).values({
      id,
      workspaceId: input.workspaceId,
      documentId: input.documentId,
      itemId: null,
      itemKey: input.itemKey,
      attempts: 0,
      nextAttemptAt: now.toISOString(),
      claimedUntil: new Date(now.getTime() + searchItemCleanupClaimLeaseMs).toISOString(),
      updatedAt: now.toISOString(),
    });
  });
  return id;
}

/** Renew a pre-upload reservation while holding the source row lock in the indexing transaction. */
export async function renewSearchItemCleanupReservationInTransaction(
  transaction: Db,
  input: { workspaceId: string; documentId: string; reservationId: string },
) {
  const now = new Date();
  const renewed = await transaction
    .update(searchItemCleanup)
    .set({
      claimedUntil: new Date(now.getTime() + searchItemCleanupClaimLeaseMs).toISOString(),
      updatedAt: now.toISOString(),
    })
    .where(
      and(
        eq(searchItemCleanup.id, input.reservationId),
        eq(searchItemCleanup.workspaceId, input.workspaceId),
        eq(searchItemCleanup.documentId, input.documentId),
      ),
    )
    .returning({ id: searchItemCleanup.id });
  return renewed.length === 1;
}

export async function releaseSearchItemCleanupReservation(
  db: Db,
  input: { workspaceId: string; reservationId: string },
) {
  await runDbWriteOperation(db, (transaction) =>
    transaction
      .delete(searchItemCleanup)
      .where(
        and(
          eq(searchItemCleanup.id, input.reservationId),
          eq(searchItemCleanup.workspaceId, input.workspaceId),
        ),
      ),
  );
}

type SearchItemCleanupDelete = (itemId: string) => Promise<boolean>;
type SearchItemCleanupDeleteByKey = (itemKey: string) => Promise<boolean>;

export async function drainSearchItemCleanupWith(
  db: Db,
  {
    deleteItem,
    deleteItemsByKey,
    limit = 20,
    workspaceId,
  }: {
    deleteItem: SearchItemCleanupDelete;
    deleteItemsByKey: SearchItemCleanupDeleteByKey;
    limit?: number;
    workspaceId?: string;
  },
) {
  const requestLimit = getSearchItemCleanupRequestLimit(limit);
  const workspaceCondition = workspaceId
    ? eq(searchItemCleanup.workspaceId, workspaceId)
    : undefined;
  let deleted = 0;
  let failed = 0;
  let cleanupCandidates = 0;
  while (cleanupCandidates < requestLimit) {
    const now = new Date();
    const currentTime = now.toISOString();
    const pending = await runDbWriteOperation(db, async (transaction) => {
      const due = await transaction
        .select({
          id: searchItemCleanup.id,
          workspaceId: searchItemCleanup.workspaceId,
          documentId: searchItemCleanup.documentId,
          itemId: searchItemCleanup.itemId,
          itemKey: searchItemCleanup.itemKey,
          attempts: searchItemCleanup.attempts,
        })
        .from(searchItemCleanup)
        .where(
          and(
            lte(searchItemCleanup.nextAttemptAt, currentTime),
            or(
              isNull(searchItemCleanup.claimedUntil),
              lte(searchItemCleanup.claimedUntil, currentTime),
            ),
            workspaceCondition,
          ),
        )
        .orderBy(asc(searchItemCleanup.nextAttemptAt), asc(searchItemCleanup.createdAt))
        .limit(getSearchItemCleanupClaimLimit(requestLimit - cleanupCandidates))
        .for("update", { skipLocked: true });

      if (due.length === 0) return [];
      const claimUntil = new Date(now.getTime() + searchItemCleanupClaimLeaseMs).toISOString();
      return transaction
        .update(searchItemCleanup)
        .set({ claimedUntil: claimUntil, updatedAt: currentTime })
        .where(
          inArray(
            searchItemCleanup.id,
            due.map((item) => item.id),
          ),
        )
        .returning({
          id: searchItemCleanup.id,
          workspaceId: searchItemCleanup.workspaceId,
          documentId: searchItemCleanup.documentId,
          itemId: searchItemCleanup.itemId,
          itemKey: searchItemCleanup.itemKey,
          attempts: searchItemCleanup.attempts,
        });
    });

    if (pending.length === 0) break;
    cleanupCandidates += pending.length;
    for (const cleanup of pending) {
      try {
        await runDbWriteOperation(db, async (transaction) => {
          // Serialize cleanup with indexing and source deletion. A retry may reuse a key that an
          // older cleanup row is about to remove; the current revision wins over that stale intent.
          await transaction
            .select({ id: documentTable.id })
            .from(documentTable)
            .where(
              and(
                eq(documentTable.id, cleanup.documentId),
                eq(documentTable.workspaceId, cleanup.workspaceId),
              ),
            )
            .for("update");

          const activeIdentity = await transaction
            .select({ id: documentRevision.id })
            .from(documentRevision)
            .where(
              and(
                eq(documentRevision.workspaceId, cleanup.workspaceId),
                eq(documentRevision.documentId, cleanup.documentId),
                eq(documentRevision.status, "CURRENT"),
                or(
                  and(
                    eq(documentRevision.providerItemKey, cleanup.itemKey),
                    isNotNull(documentRevision.providerItemId),
                  ),
                  cleanup.itemId ? eq(documentRevision.providerItemId, cleanup.itemId) : undefined,
                ),
              ),
            )
            .limit(1);

          if (activeIdentity.length === 0) {
            const removed = cleanup.itemId
              ? await deleteItem(cleanup.itemId)
              : await deleteItemsByKey(cleanup.itemKey);
            if (!removed) throw new Error("Provider cleanup did not complete.");
          }

          await transaction
            .delete(searchItemCleanup)
            .where(
              and(
                eq(searchItemCleanup.id, cleanup.id),
                eq(searchItemCleanup.workspaceId, cleanup.workspaceId),
              ),
            );
        });
        deleted += 1;
      } catch {
        const updatedAt = new Date().toISOString();
        await db
          .update(searchItemCleanup)
          .set({
            attempts: cleanup.attempts + 1,
            nextAttemptAt: new Date(
              Date.now() + getSearchItemCleanupRetryDelayMs(cleanup.attempts + 1),
            ).toISOString(),
            claimedUntil: null,
            updatedAt,
          })
          .where(
            and(
              eq(searchItemCleanup.id, cleanup.id),
              eq(searchItemCleanup.workspaceId, cleanup.workspaceId),
            ),
          );
        failed += 1;
        logError("knowledge.search_item_cleanup.failed", {
          workspaceId: cleanup.workspaceId,
          documentId: cleanup.documentId,
          cleanupId: cleanup.id,
        });
      }
    }
  }

  return { cleanupCandidates, cleanupDeleted: deleted, cleanupFailed: failed };
}

export async function drainSearchItemCleanup(db: Db, limit = 20, workspaceId?: string) {
  if (!isCloudflareSearchConfigured()) {
    return { cleanupCandidates: 0, cleanupDeleted: 0, cleanupFailed: 0 };
  }
  return drainSearchItemCleanupWith(db, {
    deleteItem: deleteCloudflareSearchItem,
    deleteItemsByKey: deleteCloudflareSearchItemsByKey,
    limit,
    workspaceId,
  });
}
