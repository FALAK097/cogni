import "server-only";

import net from "node:net";
import type { Document, PrismaClient } from "@/generated/prisma/client";

import { indexDocumentContent } from "@/features/knowledge/server/extract";
import { crawlUrl, scrapeUrl } from "@/lib/firecrawl/client";

const blockedHostnames = new Set(["localhost", "0.0.0.0"]);
const blockedTlds = [".local", ".internal", ".localhost"];

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [a, b] = parts;
  if (a === undefined || b === undefined) return false;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd");
}

export function normalizeKnowledgeUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    blockedHostnames.has(hostname) ||
    blockedTlds.some((suffix) => hostname.endsWith(suffix)) ||
    hostname.endsWith(".test")
  ) {
    throw new Error("Private or local URLs are not allowed.");
  }

  const ipVersion = net.isIP(hostname);
  if (
    (ipVersion === 4 && isPrivateIpv4(hostname)) ||
    (ipVersion === 6 && isPrivateIpv6(hostname))
  ) {
    throw new Error("Private network URLs are not allowed.");
  }

  url.hash = "";
  return url.toString();
}

export function parsePathList(value: unknown) {
  if (typeof value !== "string") return [];

  return value
    .split("\n")
    .flatMap((line) => line.split(","))
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function clampCrawlLimit(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 10;
  return Math.min(Math.max(Math.trunc(numeric), 1), 50);
}

export function clampCrawlDepth(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(Math.max(Math.trunc(numeric), 0), 3);
}

function sourceTitle({
  fallback,
  metadata,
}: {
  fallback: string;
  metadata?: Record<string, unknown>;
}) {
  const title = metadata?.title;
  return typeof title === "string" && title.trim() ? title.trim().slice(0, 180) : fallback;
}

function sourceUrl(metadata: Record<string, unknown> | undefined, fallback: string) {
  const value = metadata?.sourceURL ?? metadata?.url;
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function ingestScrapeSource({
  db,
  workspaceId,
  url,
}: {
  db: PrismaClient;
  workspaceId: string;
  url: string;
}) {
  const normalizedUrl = normalizeKnowledgeUrl(url);
  const document = await db.document.create({
    data: {
      workspaceId,
      title: normalizedUrl,
      sourceType: "SCRAPE",
      sourceUrl: normalizedUrl,
      status: "PROCESSING",
    },
  });

  try {
    const scraped = await scrapeUrl(normalizedUrl);
    await indexDocumentContent(db, document.id, scraped.markdown, workspaceId);
    const canonicalUrl = sourceUrl(scraped.metadata, normalizedUrl);
    const title = sourceTitle({ fallback: canonicalUrl, metadata: scraped.metadata });
    return db.document.update({
      where: { id: document.id },
      data: {
        title,
        sourceUrl: canonicalUrl,
        status: "READY",
        errorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scrape failed.";
    await db.document.update({
      where: { id: document.id },
      data: { status: "FAILED", errorMessage: message },
    });
    throw error;
  }
}

export async function ingestCrawlSource({
  db,
  workspaceId,
  url,
  includePaths,
  excludePaths,
  maxPages,
  maxDepth,
}: {
  db: PrismaClient;
  workspaceId: string;
  url: string;
  includePaths?: string[];
  excludePaths?: string[];
  maxPages: number;
  maxDepth: number;
}) {
  const normalizedUrl = normalizeKnowledgeUrl(url);
  const pages = await crawlUrl({
    sourceUrl: normalizedUrl,
    includePaths,
    excludePaths,
    maxPages,
    maxDepth,
  });

  const created: Document[] = [];
  for (const page of pages) {
    const canonicalUrl = sourceUrl(page.metadata, normalizedUrl);
    const document = await db.document.create({
      data: {
        workspaceId,
        title: sourceTitle({ fallback: canonicalUrl, metadata: page.metadata }),
        sourceType: "CRAWL",
        sourceUrl: canonicalUrl,
        status: "PROCESSING",
      },
    });

    try {
      await indexDocumentContent(db, document.id, page.markdown, workspaceId);
      created.push(
        await db.document.update({
          where: { id: document.id },
          data: { status: "READY", errorMessage: null },
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Crawl page indexing failed.";
      await db.document.update({
        where: { id: document.id },
        data: { status: "FAILED", errorMessage: message },
      });
    }
  }

  if (created.length === 0) {
    throw new Error("Firecrawl did not return any crawl pages with extractable content.");
  }

  return created;
}
