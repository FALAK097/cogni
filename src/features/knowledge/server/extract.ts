import "server-only";

import { readObject } from "@/lib/storage/index";
import { chunkText } from "@/features/knowledge/server/chunk";
import { embedText } from "@/lib/ai/embeddings";
import { upsertVectorizeVectors } from "@/lib/cloudflare/vectorize";
import { parseFile, scrapeUrl } from "@/lib/firecrawl/client";

export async function extractDocumentText({
  sourceType,
  sourceUrl,
  storageKey,
  mimeType,
  title,
}: {
  sourceType: string;
  sourceUrl?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  title?: string | null;
}) {
  if ((sourceType === "URL" || sourceType === "SCRAPE") && sourceUrl) {
    const scraped = await scrapeUrl(sourceUrl);
    return scraped.markdown;
  }

  if (!storageKey) {
    throw new Error("Missing uploaded file.");
  }

  const bytes = await readObject(storageKey);

  const parsed = await parseFile({
    bytes,
    filename: title?.trim() || storageKey.split("/").at(-1) || "knowledge-source",
    mimeType: mimeType || "application/octet-stream",
  });
  return parsed.markdown;
}

export async function indexDocumentContent(
  db: import("@/generated/prisma/client").PrismaClient,
  documentId: string,
  text: string,
  workspaceId: string,
) {
  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error("No extractable text found.");
  }

  const document = await db.document.findUnique({
    where: { id: documentId },
    select: { title: true },
  });

  await db.documentChunk.deleteMany({ where: { documentId } });
  await db.documentChunk.createMany({
    data: chunks.map((content, position) => ({
      documentId,
      content,
      position,
    })),
  });

  const created = await db.documentChunk.findMany({
    where: { documentId },
    orderBy: { position: "asc" },
  });

  const vectors = [];
  for (const chunk of created) {
    const embedding = await embedText(chunk.content);
    if (!embedding) continue;

    vectors.push({
      id: chunk.id,
      values: embedding,
      metadata: {
        workspaceId,
        documentId,
        title: document?.title ?? "Document",
      },
    });
  }

  if (vectors.length > 0) {
    await upsertVectorizeVectors(vectors);
  }
}
