import "server-only";

import { and, asc, eq, ilike, inArray } from "drizzle-orm";

import type { Db } from "@/lib/db/client";
import { getDb } from "@/lib/db/client";
import { document as documentTable, documentChunk as documentChunkTable } from "@/lib/db/schema";
import {
  type CloudflareSearchChunk,
  type CloudflareSearchFilters,
  searchCloudflareIndex,
} from "@/lib/search/cloudflare-search";

type KnowledgeContext = { documentId: string; title: string; content: string };
type SearchKnowledge = typeof searchCloudflareIndex;

function readSearchMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key] ?? metadata?.[key.toLowerCase()];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function retrieveKnowledgeContextWith({
  db,
  search,
  workspaceId,
  query,
  limit = 4,
  documentIds,
}: {
  db: Db;
  search: SearchKnowledge;
  workspaceId: string;
  query: string;
  limit?: number;
  documentIds?: string[] | null;
}): Promise<KnowledgeContext[]> {
  const normalized = query.trim();
  if (!normalized || (documentIds && documentIds.length === 0)) return [];

  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 10)) : 4;
  const requestedDocumentIds = documentIds ? [...new Set(documentIds)] : null;
  const searchFilters: CloudflareSearchFilters = requestedDocumentIds
    ? { workspaceid: workspaceId, documentid: { $in: requestedDocumentIds } }
    : { workspaceid: workspaceId };
  const searchMatches = await search({
    query: normalized,
    limit: safeLimit,
    filters: searchFilters,
  });

  const searchDocumentIds = [
    ...new Set(
      searchMatches
        .map((match) => readSearchMetadataString(match.item?.metadata, "documentId"))
        .filter((documentId): documentId is string => Boolean(documentId)),
    ),
  ];

  if (searchDocumentIds.length > 0) {
    const documentConditions = [
      eq(documentTable.workspaceId, workspaceId),
      eq(documentTable.status, "READY"),
      inArray(documentTable.id, searchDocumentIds),
    ];
    if (requestedDocumentIds) {
      documentConditions.push(inArray(documentTable.id, requestedDocumentIds));
    }

    const documents = await db
      .select({ id: documentTable.id, title: documentTable.title })
      .from(documentTable)
      .where(and(...documentConditions));
    const titlesByDocumentId = new Map(
      documents.map((document) => [document.id, document.title] as const),
    );

    const contexts = searchMatches.flatMap((match: CloudflareSearchChunk) => {
      const documentId = readSearchMetadataString(match.item?.metadata, "documentId");
      const title = documentId ? titlesByDocumentId.get(documentId) : null;
      if (!documentId || !title || !match.text.trim()) return [];
      return [{ documentId, title, content: match.text }];
    });
    if (contexts.length > 0) return contexts.slice(0, safeLimit);
  }

  const lexicalConditions = [
    eq(documentTable.workspaceId, workspaceId),
    eq(documentTable.status, "READY"),
    ilike(documentChunkTable.content, `%${escapeLikePattern(normalized.slice(0, 120))}%`),
  ];
  if (requestedDocumentIds) {
    lexicalConditions.push(inArray(documentTable.id, requestedDocumentIds));
  }

  const exactMatches = await db
    .select({
      documentId: documentTable.id,
      title: documentTable.title,
      content: documentChunkTable.content,
    })
    .from(documentChunkTable)
    .innerJoin(documentTable, eq(documentChunkTable.documentId, documentTable.id))
    .where(and(...lexicalConditions))
    .orderBy(asc(documentChunkTable.position))
    .limit(safeLimit);

  return exactMatches.map((match) => ({
    documentId: match.documentId,
    title: match.title,
    content: match.content,
  }));
}

export async function retrieveKnowledgeContext(
  workspaceId: string,
  query: string,
  limit = 4,
  documentIds?: string[] | null,
): Promise<KnowledgeContext[]> {
  return retrieveKnowledgeContextWith({
    db: getDb(),
    search: searchCloudflareIndex,
    workspaceId,
    query,
    limit,
    documentIds,
  });
}
