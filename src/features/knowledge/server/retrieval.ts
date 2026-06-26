import "server-only";

import { getDb } from "@/lib/db/client";
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
) {
  const normalized = query.trim();
  if (!normalized) return [];

  const documentFilter =
    documentIds && documentIds.length > 0
      ? { workspaceId, status: "READY" as const, id: { in: documentIds } }
      : { workspaceId, status: "READY" as const };

  const searchFilters: CloudflareSearchFilters =
    documentIds && documentIds.length > 0
      ? { workspaceid: workspaceId, documentid: { $in: documentIds } }
      : { workspaceid: workspaceId };
  const searchMatches = await searchCloudflareIndex({
    query: normalized,
    limit,
    filters: searchFilters,
  });

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

    const documents = await getDb().document.findMany({
      where: {
        ...documentFilter,
        id: { in: validatedDocumentIds },
      },
      select: { id: true, title: true },
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

  const chunks = await getDb().documentChunk.findMany({
    where: {
      document: documentFilter,
      content: {
        contains: normalized.slice(0, 120),
      },
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  if (chunks.length > 0) {
    return chunks.map((chunk) => ({
      documentId: chunk.document.id,
      title: chunk.document.title,
      content: chunk.content,
    }));
  }

  const fallback = await getDb().documentChunk.findMany({
    where: {
      document: documentFilter,
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return fallback.map((chunk) => ({
    documentId: chunk.document.id,
    title: chunk.document.title,
    content: chunk.content,
  }));
}
