import "server-only";

import { readObject } from "@/lib/storage/index";
import { chunkText, stripHtml } from "@/features/knowledge/server/chunk";
import { uploadCloudflareSearchDocument } from "@/lib/search/cloudflare-search";

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
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) {
      throw new Error("Could not fetch the URL.");
    }
    const html = await response.text();
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
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text.trim();
  }

  if (sourceType === "DOCX") {
    const mammoth = await import("mammoth");
    const parsed = await mammoth.extractRawText({ buffer: bytes });
    return parsed.value.trim();
  }

  throw new Error("Unsupported document type.");
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

  await uploadCloudflareSearchDocument({
    documentId,
    workspaceId,
    title: document?.title ?? "Document",
    text,
  });
}
