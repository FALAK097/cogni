import { assertPublicHttpUrl, fetchPublicText } from "@/features/knowledge/server/safe-fetch";

const maxCrawlPages = 25;
const maxPageBytes = 1_000_000;
const maxTotalCharacters = 2_500_000;
const fetchTimeoutMs = 15_000;

const ignoredExtensions = new Set([
  ".7z",
  ".avi",
  ".css",
  ".csv",
  ".doc",
  ".docx",
  ".gif",
  ".gz",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".mp3",
  ".mp4",
  ".mpeg",
  ".pdf",
  ".png",
  ".ppt",
  ".pptx",
  ".rar",
  ".svg",
  ".webm",
  ".webp",
  ".xls",
  ".xlsx",
  ".zip",
]);

function normalizeUrl(url: URL) {
  url.hash = "";
  if (
    (url.protocol === "https:" && url.port === "443") ||
    (url.protocol === "http:" && url.port === "80")
  ) {
    url.port = "";
  }
  return url.href;
}

function isSameHost(candidate: URL, root: URL) {
  return candidate.protocol === root.protocol && candidate.hostname === root.hostname;
}

function shouldVisitUrl(url: URL) {
  const pathname = url.pathname.toLowerCase();
  const extension = pathname.match(/\.[a-z0-9]+$/)?.[0];
  return !extension || !ignoredExtensions.has(extension);
}

async function fetchText(url: string, acceptedTypes: string[]) {
  return fetchPublicText(url, acceptedTypes, maxPageBytes, fetchTimeoutMs);
}

function extractSitemapUrls(xml: string, root: URL) {
  const urls: string[] = [];
  const pattern = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(xml))) {
    const value = match[1]?.trim();
    if (!value) continue;

    let candidate: URL;
    try {
      candidate = new URL(value);
    } catch {
      continue;
    }

    if (!isSameHost(candidate, root) || !shouldVisitUrl(candidate)) continue;
    urls.push(normalizeUrl(candidate));
  }

  return urls;
}

export async function crawlSitemapText(sitemapUrl: string, stripHtml: (html: string) => string) {
  const root = assertPublicHttpUrl(sitemapUrl);
  const xml = await fetchText(root.href, ["application/xml", "text/xml", "application/rss+xml"]);
  if (!xml) {
    throw new Error("Could not fetch the sitemap.");
  }

  const urls = extractSitemapUrls(xml, root);
  if (urls.length === 0) {
    throw new Error("Sitemap did not contain any URLs.");
  }

  const limit = Math.min(urls.length, maxCrawlPages);
  const candidates = await Promise.all(
    urls.slice(0, limit).map(async (pageUrl) => {
      const html = await fetchText(pageUrl, ["text/html", "text/plain", "application/xhtml+xml"]);
      if (!html) return null;
      const text = stripHtml(html);
      if (!text) return null;
      return `Source URL: ${pageUrl}\n\n${text}`;
    }),
  );

  const pages: string[] = [];
  let totalCharacters = 0;
  for (const page of candidates) {
    if (!page) continue;
    if (totalCharacters >= maxTotalCharacters) break;
    pages.push(page);
    totalCharacters += page.length;
  }

  if (pages.length === 0) {
    throw new Error("No crawlable page text found.");
  }

  return pages.join("\n\n---\n\n").slice(0, maxTotalCharacters);
}
