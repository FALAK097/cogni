import { NextResponse } from "next/server";

import {
  clampCrawlDepth,
  clampCrawlLimit,
  ingestCrawlSource,
  ingestScrapeSource,
  parsePathList,
} from "@/features/knowledge/server/firecrawl-ingestion";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export async function POST(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const body = (await request.json()) as {
    mode?: string;
    url?: string | string[];
    includePaths?: string;
    excludePaths?: string;
    maxPages?: number;
    maxDepth?: number;
  };

  const urls = Array.isArray(body.url) ? body.url : body.url ? [body.url] : [];
  if (urls.length === 0) {
    return NextResponse.json({ error: "At least one URL is required." }, { status: 400 });
  }

  const mode = body.mode === "crawl" ? "crawl" : "scrape";
  const created: string[] = [];
  const failedSources: string[] = [];

  for (const sourceUrl of urls) {
    try {
      if (mode === "crawl") {
        const documents = await ingestCrawlSource({
          db,
          workspaceId: workspace.id,
          url: sourceUrl,
          includePaths: parsePathList(body.includePaths),
          excludePaths: parsePathList(body.excludePaths),
          maxPages: clampCrawlLimit(body.maxPages),
          maxDepth: clampCrawlDepth(body.maxDepth),
        });
        for (const document of documents) {
          await emitDomainEvent({
            db,
            workspaceId: workspace.id,
            type: "document.ready",
            entityId: document.id,
          });
          created.push(document.id);
        }
        continue;
      }

      const document = await ingestScrapeSource({
        db,
        workspaceId: workspace.id,
        url: sourceUrl,
      });
      await emitDomainEvent({
        db,
        workspaceId: workspace.id,
        type: "document.ready",
        entityId: document.id,
      });
      created.push(document.id);
    } catch (error) {
      failedSources.push(
        error instanceof Error
          ? `${sourceUrl}: ${error.message}`
          : `${sourceUrl}: ingestion failed`,
      );
    }
  }

  if (created.length === 0 && failedSources.length > 0) {
    return NextResponse.json(
      { error: "Firecrawl ingestion failed.", failedSources },
      { status: 502 },
    );
  }

  return NextResponse.json({ addedSources: created.length, sourceIds: created });
}
