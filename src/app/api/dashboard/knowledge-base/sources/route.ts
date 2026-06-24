import { NextResponse } from "next/server";

import { listDocuments } from "@/features/knowledge/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const DEFAULT_KB_ID = "default";

function mapDocumentToSource(document: Awaited<ReturnType<typeof listDocuments>>[number]) {
  const sourceType =
    document.sourceType === "CRAWL"
      ? "crawl"
      : document.sourceType === "SCRAPE" || document.sourceType === "URL"
        ? "scrape"
        : "file";
  return {
    id: document.id,
    knowledgeBaseId: DEFAULT_KB_ID,
    sourceType,
    displayName: document.title,
    canonicalUrl: document.sourceUrl,
    previewUrl: document.sourceUrl,
    status: document.status === "READY" ? "ready" : document.status.toLowerCase(),
    lastError: document.errorMessage,
    lastFetchedAt: document.updatedAt.toISOString(),
    chunkCount: document._count.chunks,
    metadata: {
      mimeType: document.mimeType,
      storageKey: document.storageKey,
      firecrawlMode: sourceType,
    },
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const { workspace } = await requireDashboardContext();
  const { searchParams } = new URL(request.url);
  const knowledgeBaseId = searchParams.get("knowledgeBaseId") ?? DEFAULT_KB_ID;

  if (knowledgeBaseId !== DEFAULT_KB_ID) {
    return NextResponse.json({ error: "Knowledge base not found." }, { status: 404 });
  }

  const documents = await listDocuments(workspace.id);

  return NextResponse.json({
    knowledgeBase: {
      id: DEFAULT_KB_ID,
      workspaceId: workspace.id,
      name: "Workspace Knowledge",
      status: "ready",
      sourceCount: documents.length,
      createdAt: documents[0]?.createdAt.toISOString() ?? new Date().toISOString(),
      updatedAt: documents[0]?.updatedAt.toISOString() ?? new Date().toISOString(),
    },
    sources: documents.map(mapDocumentToSource),
    count: documents.length,
  });
}
