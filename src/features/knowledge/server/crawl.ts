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

function extractLinks(html: string, pageUrl: string, root: URL) {
  const links: string[] = [];
  const pattern = /<a\s+[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    const href = match[1] ?? match[2] ?? match[3];
    if (!href || href.startsWith("#")) continue;

    let candidate: URL;
    try {
      candidate = new URL(href, pageUrl);
    } catch {
      continue;
    }

    if (!isSameHost(candidate, root) || !shouldVisitUrl(candidate)) continue;
    links.push(normalizeUrl(candidate));
  }

  return links;
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

async function discoverSitemapUrls(root: URL) {
  const urls: string[] = [];
  const robotsUrl = new URL("/robots.txt", root);
  const robotsText = await fetchText(robotsUrl.href, ["text/plain"]);

  if (robotsText) {
    for (const line of robotsText.split("\n")) {
      const match = line.match(/^sitemap:\s*(\S+)/i);
      if (match?.[1]) urls.push(match[1]);
    }
  }

  urls.push(new URL("/sitemap.xml", root).href);

  const pages: string[] = [];
  const sitemaps = await Promise.all(
    [...new Set(urls)].map(async (sitemapUrl) => {
      const xml = await fetchText(sitemapUrl, [
        "application/xml",
        "text/xml",
        "application/rss+xml",
      ]);
      return xml ? extractSitemapUrls(xml, root) : [];
    }),
  );
  for (const entries of sitemaps) {
    pages.push(...entries);
  }

  return pages;
}

export async function crawlWebsiteText(sourceUrl: string, stripHtml: (html: string) => string) {
  const root = assertPublicHttpUrl(sourceUrl);
  const queue = [normalizeUrl(root), ...(await discoverSitemapUrls(root))];
  const seen = new Set<string>();
  const pages: string[] = [];
  let totalCharacters = 0;

  while (queue.length > 0 && pages.length < maxCrawlPages && totalCharacters < maxTotalCharacters) {
    const nextUrl = queue.shift();
    if (!nextUrl || seen.has(nextUrl)) continue;
    seen.add(nextUrl);

    let pageUrl: URL;
    try {
      pageUrl = new URL(nextUrl);
    } catch {
      continue;
    }
    if (!isSameHost(pageUrl, root) || !shouldVisitUrl(pageUrl)) continue;

    const html = await fetchText(nextUrl, ["text/html", "text/plain", "application/xhtml+xml"]);
    if (!html) continue;

    for (const link of extractLinks(html, nextUrl, root)) {
      if (!seen.has(link) && queue.length < maxCrawlPages * 4) {
        queue.push(link);
      }
    }

    const text = stripHtml(html);
    if (!text) continue;

    const pageText = `Source URL: ${nextUrl}\n\n${text}`;
    pages.push(pageText);
    totalCharacters += pageText.length;
  }

  if (pages.length === 0) {
    throw new Error("No crawlable page text found.");
  }

  return pages.join("\n\n---\n\n").slice(0, maxTotalCharacters);
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
