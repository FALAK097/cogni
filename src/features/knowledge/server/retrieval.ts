import "server-only";

import { embedText } from "@/lib/ai/embeddings";
import { queryVectorize } from "@/lib/cloudflare/vectorize";
import { getDb } from "@/lib/db/client";
import { searchCloudflareIndex } from "@/lib/search/cloudflare-search";

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

  const embedding = await embedText(normalized);
  if (embedding) {
    const matches = await queryVectorize({
      vector: embedding,
      topK: limit,
      filter: { workspaceId },
    });

    if (matches.length > 0) {
      const chunkIds = matches.map((match) => match.id);
      const chunks = await getDb().documentChunk.findMany({
        where: {
          id: { in: chunkIds },
          document: documentFilter,
        },
        include: {
          document: {
            select: { id: true, title: true },
          },
        },
      });

      if (chunks.length > 0) {
        return chunks.map((chunk) => ({
          documentId: chunk.document.id,
          title: chunk.document.title,
          content: chunk.content,
        }));
      }
    }
  }

  const searchMatches = await searchCloudflareIndex({ query: normalized, limit });
  if (searchMatches.length > 0) {
    const chunkIds = searchMatches.map((match) => match.id);
    const chunks = await getDb().documentChunk.findMany({
      where: {
        id: { in: chunkIds },
        document: documentFilter,
      },
      include: {
        document: {
          select: { id: true, title: true },
        },
      },
    });

    if (chunks.length > 0) {
      return chunks.map((chunk) => ({
        documentId: chunk.document.id,
        title: chunk.document.title,
        content: chunk.content,
      }));
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
