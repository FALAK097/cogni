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

function assertCrawlableUrl(sourceUrl: string) {
  const url = new URL(sourceUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isIpv6 = hostname.includes(":");
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("169.254.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    (isIpv6 &&
      (hostname === "::1" ||
        hostname.startsWith("fc") ||
        hostname.startsWith("fd") ||
        hostname.startsWith("fe80:")))
  ) {
    throw new Error("Private or local URLs are not supported.");
  }

  url.hash = "";
  return url;
}

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
  const response = await fetch(url, { signal: AbortSignal.timeout(fetchTimeoutMs) });
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!acceptedTypes.some((acceptedType) => contentType.includes(acceptedType))) {
    return null;
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > maxPageBytes) {
    return null;
  }

  return readLimitedResponse(response);
}

async function readLimitedResponse(response: Response) {
  if (!response.body) {
    const text = await response.text();
    return text.length > maxPageBytes ? null : text;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxPageBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bytes);
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
  const root = assertCrawlableUrl(sourceUrl);
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
  const root = assertCrawlableUrl(sitemapUrl);
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
