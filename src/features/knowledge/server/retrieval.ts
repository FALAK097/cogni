import "server-only";

import { getDb } from "@/lib/db/client";
import { eq, and, like, inArray, desc } from "drizzle-orm";
import { document as documentTable, documentChunk as documentChunkTable } from "@/lib/db/schema";
import {
  type CloudflareSearchFilters,
  searchCloudflareIndex,
} from "@/lib/search/cloudflare-search";

function readSearchMetadataString(metadata: Record<string, unknown> | undefined, key: string) {
  const value = metadata?.[key] ?? metadata?.[key.toLowerCase()];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function retrieveKnowledgeContext(
  workspaceId: string,
  query: string,
  limit = 4,
  documentIds?: string[] | null,
): Promise<{ documentId: string; title: string; content: string }[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const searchFilters: CloudflareSearchFilters =
    documentIds && documentIds.length > 0
      ? { workspaceid: workspaceId, documentid: { $in: documentIds } }
      : { workspaceid: workspaceId };
  const searchMatches = await searchCloudflareIndex({
    query: normalized,
    limit,
    filters: searchFilters,
  });

  const db = getDb();

  if (searchMatches.length > 0) {
    const searchDocumentIds = [
      ...new Set(
        searchMatches
          .map((match) => readSearchMetadataString(match.item?.metadata, "documentId"))
          .filter((documentId): documentId is string => Boolean(documentId)),
      ),
    ];
    const validatedDocumentIds =
      documentIds && documentIds.length > 0
        ? searchDocumentIds.filter((documentId) => documentIds.includes(documentId))
        : searchDocumentIds;

    if (validatedDocumentIds.length > 0) {
      const documents = await db.query.document.findMany({
        where: (fields, { eq, and, inArray }) => {
          const conds = [
            eq(fields.workspaceId, workspaceId),
            eq(fields.status, "READY"),
            inArray(fields.id, validatedDocumentIds),
          ];
          if (documentIds && documentIds.length > 0) {
            conds.push(inArray(fields.id, documentIds));
          }
          return and(...conds);
        },
        columns: { id: true, title: true },
      });
      const titlesByDocumentId = new Map(
        documents.map((document) => [document.id, document.title] as const),
      );

      const contexts = searchMatches.flatMap((match) => {
        const documentId = readSearchMetadataString(match.item?.metadata, "documentId");
        if (!documentId) {
          return [];
        }

        const title = titlesByDocumentId.get(documentId);
        if (!title) {
          return [];
        }

        return {
          documentId,
          title,
          content: match.text,
        };
      });

      if (contexts.length > 0) {
        return contexts.slice(0, limit);
      }
    }
  }

  const chunksWhereConds = [
    eq(documentTable.workspaceId, workspaceId),
    eq(documentTable.status, "READY"),
    like(documentChunkTable.content, `%${normalized.slice(0, 120)}%`),
  ];
  if (documentIds && documentIds.length > 0) {
    chunksWhereConds.push(inArray(documentTable.id, documentIds));
  }

  const chunks = await (db as any)
    .select({
      chunk: documentChunkTable,
      document: {
        id: documentTable.id,
        title: documentTable.title,
      },
    })
    .from(documentChunkTable)
    .innerJoin(documentTable, eq(documentChunkTable.documentId, documentTable.id))
    .where(and(...chunksWhereConds))
    .orderBy(desc(documentChunkTable.createdAt))
    .limit(limit);

  if (chunks.length > 0) {
    return chunks.map((item: any) => ({
      documentId: item.document.id,
      title: item.document.title,
      content: item.chunk.content,
    }));
  }

  const fallbackWhereConds = [
    eq(documentTable.workspaceId, workspaceId),
    eq(documentTable.status, "READY"),
  ];
  if (documentIds && documentIds.length > 0) {
    fallbackWhereConds.push(inArray(documentTable.id, documentIds));
  }

  const fallback = await (db as any)
    .select({
      chunk: documentChunkTable,
      document: {
        id: documentTable.id,
        title: documentTable.title,
      },
    })
    .from(documentChunkTable)
    .innerJoin(documentTable, eq(documentChunkTable.documentId, documentTable.id))
    .where(and(...fallbackWhereConds))
    .orderBy(desc(documentChunkTable.createdAt))
    .limit(limit);

  return fallback.map((item: any) => ({
    documentId: item.document.id,
    title: item.document.title,
    content: item.chunk.content,
  }));
}
