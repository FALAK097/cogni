import "server-only";

import { embedText } from "@/lib/ai/embeddings";
import { queryVectorize } from "@/lib/cloudflare/vectorize";
import { getDb } from "@/lib/db/client";
import { searchCloudflareIndex } from "@/lib/search/cloudflare-search";

type RetrievedChunk = {
  documentId: string;
  title: string;
  content: string;
};

type DocumentFilter = {
  workspaceId: string;
  status: "READY";
  id?: { in: string[] };
};

function toRetrievedChunks(
  chunks: {
    content: string;
    document: { id: string; title: string };
  }[],
): RetrievedChunk[] {
  return chunks.map((chunk) => ({
    documentId: chunk.document.id,
    title: chunk.document.title,
    content: chunk.content,
  }));
}

function queryTerms(query: string) {
  return [
    ...new Set(
      query
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length > 2),
    ),
  ].slice(0, 10);
}

function scoreChunk(content: string, terms: string[]) {
  const normalized = content.toLowerCase();
  return terms.reduce((score, term) => (normalized.includes(term) ? score + 1 : score), 0);
}

async function retrieveByQueryTerms(documentFilter: DocumentFilter, query: string, limit: number) {
  const terms = queryTerms(query);
  if (terms.length === 0) {
    return [];
  }

  const chunks = await getDb().documentChunk.findMany({
    where: {
      document: documentFilter,
      OR: terms.map((term) => ({
        content: { contains: term },
      })),
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    take: Math.max(limit * 8, 32),
    orderBy: { createdAt: "desc" },
  });

  if (chunks.length === 0) {
    return [];
  }

  return toRetrievedChunks(
    [...chunks]
      .sort((left, right) => scoreChunk(right.content, terms) - scoreChunk(left.content, terms))
      .slice(0, limit),
  );
}

export async function retrieveKnowledgeContext(
  workspaceId: string,
  query: string,
  limit = 4,
  documentIds?: string[] | null,
) {
  const normalized = query.trim();
  if (!normalized) return [];

  const documentFilter: DocumentFilter =
    documentIds && documentIds.length > 0
      ? { workspaceId, status: "READY", id: { in: documentIds } }
      : { workspaceId, status: "READY" };

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
        return toRetrievedChunks(chunks);
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
      return toRetrievedChunks(chunks);
    }
  }

  const keywordMatches = await retrieveByQueryTerms(documentFilter, normalized, limit);
  if (keywordMatches.length > 0) {
    return keywordMatches;
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

  return toRetrievedChunks(fallback);
}
