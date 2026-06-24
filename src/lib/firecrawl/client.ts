import "server-only";

import { env } from "@/lib/env/server";

const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";
const crawlPollIntervalMs = 2_000;
const maxCrawlPolls = 30;

type FirecrawlScrapeData = {
  markdown: string;
  metadata?: Record<string, unknown>;
};

type FirecrawlCrawlPage = FirecrawlScrapeData;

type FirecrawlCrawlStatus = {
  status: "scraping" | "completed" | "failed" | "cancelled";
  data?: FirecrawlCrawlPage[];
  next?: string | null;
  total?: number;
  completed?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseScrapeData(payload: unknown): FirecrawlScrapeData | null {
  if (!isRecord(payload)) return null;

  const data = payload.data;
  if (!isRecord(data)) return null;

  const markdown = data.markdown;
  if (typeof markdown !== "string" || markdown.trim().length === 0) return null;

  const metadata = isRecord(data.metadata) ? data.metadata : undefined;
  return { markdown: markdown.trim(), metadata };
}

function parseCrawlStatus(payload: unknown): FirecrawlCrawlStatus {
  if (!isRecord(payload)) {
    throw new Error("Firecrawl returned an invalid crawl status.");
  }

  const status = payload.status;
  if (
    status !== "scraping" &&
    status !== "completed" &&
    status !== "failed" &&
    status !== "cancelled"
  ) {
    throw new Error("Firecrawl returned an unknown crawl status.");
  }

  const data = Array.isArray(payload.data)
    ? payload.data
        .map((item) => parseScrapeData({ data: item }))
        .filter((item): item is FirecrawlCrawlPage => Boolean(item))
    : undefined;

  return {
    status,
    data,
    next: typeof payload.next === "string" ? payload.next : null,
    total: typeof payload.total === "number" ? payload.total : undefined,
    completed: typeof payload.completed === "number" ? payload.completed : undefined,
  };
}

function getFirecrawlError(payload: unknown) {
  if (!isRecord(payload)) return "Firecrawl could not scrape the URL.";

  const error = payload.error;
  if (typeof error === "string" && error.trim()) return error;

  const message = payload.message;
  if (typeof message === "string" && message.trim()) return message;

  return "Firecrawl could not scrape the URL.";
}

export async function scrapeUrlMarkdown(sourceUrl: string) {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: sourceUrl,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getFirecrawlError(payload));
  }

  const data = parseScrapeData(payload);
  if (!data) {
    throw new Error("Firecrawl returned no extractable markdown.");
  }

  return data.markdown;
}

export async function scrapeUrl(sourceUrl: string) {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: sourceUrl,
      formats: ["markdown"],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      parsers: ["pdf"],
      timeout: 60_000,
    }),
    signal: AbortSignal.timeout(75_000),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getFirecrawlError(payload));
  }

  const data = parseScrapeData(payload);
  if (!data) {
    throw new Error("Firecrawl returned no extractable markdown.");
  }

  return data;
}

export async function parseFile({
  bytes,
  filename,
  mimeType,
}: {
  bytes: Buffer;
  filename: string;
  mimeType: string;
}) {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(bytes)], { type: mimeType }), filename);
  formData.append(
    "options",
    JSON.stringify({
      formats: ["markdown"],
      onlyMainContent: true,
      removeBase64Images: true,
      blockAds: true,
      parsers: ["pdf"],
      timeout: 60_000,
    }),
  );

  const response = await fetch(`${FIRECRAWL_BASE_URL}/parse`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
    },
    body: formData,
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getFirecrawlError(payload));
  }

  const data = parseScrapeData(payload);
  if (!data) {
    throw new Error("Firecrawl returned no extractable markdown.");
  }

  return data;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function firecrawlStatusUrl(crawlIdOrUrl: string) {
  if (!crawlIdOrUrl.startsWith("http")) {
    return `${FIRECRAWL_BASE_URL}/crawl/${crawlIdOrUrl}`;
  }

  const url = new URL(crawlIdOrUrl);
  if (url.origin !== new URL(FIRECRAWL_BASE_URL).origin) {
    throw new Error("Firecrawl returned an invalid crawl pagination URL.");
  }

  return url.toString();
}

async function getCrawlStatus(crawlIdOrUrl: string) {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  const response = await fetch(firecrawlStatusUrl(crawlIdOrUrl), {
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
    },
    signal: AbortSignal.timeout(60_000),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(getFirecrawlError(payload));
  }

  return parseCrawlStatus(payload);
}

export async function crawlUrl({
  sourceUrl,
  includePaths,
  excludePaths,
  maxPages,
  maxDepth,
}: {
  sourceUrl: string;
  includePaths?: string[];
  excludePaths?: string[];
  maxPages: number;
  maxDepth: number;
}) {
  if (!env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  const response = await fetch(`${FIRECRAWL_BASE_URL}/crawl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: sourceUrl,
      includePaths,
      excludePaths,
      maxDiscoveryDepth: maxDepth,
      limit: maxPages,
      ignoreQueryParameters: true,
      allowExternalLinks: false,
      allowSubdomains: false,
      ignoreRobotsTxt: false,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
        removeBase64Images: true,
        blockAds: true,
        parsers: ["pdf"],
        timeout: 60_000,
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok || !isRecord(payload) || typeof payload.id !== "string") {
    throw new Error(getFirecrawlError(payload));
  }

  for (let attempt = 0; attempt < maxCrawlPolls; attempt += 1) {
    const status = await getCrawlStatus(payload.id);
    if (status.status === "completed") {
      const pages = [...(status.data ?? [])];
      let next = status.next;
      while (next) {
        const nextStatus = await getCrawlStatus(next);
        pages.push(...(nextStatus.data ?? []));
        next = nextStatus.next ?? null;
      }
      return pages.slice(0, maxPages);
    }

    if (status.status === "failed" || status.status === "cancelled") {
      throw new Error("Firecrawl crawl failed.");
    }

    await sleep(crawlPollIntervalMs);
  }

  throw new Error("Firecrawl crawl did not finish in time. Try a smaller crawl limit.");
}
