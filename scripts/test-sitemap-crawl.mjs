import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const requests = [];
const sitemap = `<?xml version="1.0"?><urlset>
  <url><loc>https://docs.example.test/first</loc></url>
  <url><loc>https://docs.example.test/second</loc></url>
  <url><loc>https://elsewhere.example.test/ignored</loc></url>
</urlset>`;
const pageContent = new Map([
  ["https://docs.example.test/first", "<html><body>First help page</body></html>"],
  ["https://docs.example.test/second", "<html><body>Second help page</body></html>"],
]);

const compiled = await build({
  entryPoints: ["src/features/knowledge/server/crawl.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "sitemap-crawl-test",
      setup(context) {
        context.onResolve({ filter: /^@\/features\/knowledge\/server\/safe-fetch$/ }, () => ({
          path: "safe-fetch",
          namespace: "sitemap-crawl-test",
        }));
        context.onLoad({ filter: /.*/, namespace: "sitemap-crawl-test" }, () => ({
          contents: `
            export function assertPublicHttpUrl(value) { return new URL(value); }
            export async function fetchPublicText(url) {
              globalThis.__sitemapCrawlRequests.push(url);
              if (url === "https://docs.example.test/sitemap.xml") return ${JSON.stringify(sitemap)};
              return globalThis.__sitemapCrawlPages.get(url) ?? null;
            }
          `,
          loader: "js",
        }));
      },
    },
  ],
});

globalThis.__sitemapCrawlRequests = requests;
globalThis.__sitemapCrawlPages = pageContent;
const { crawlSitemapText } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("sitemap crawl indexes bounded same-host page content", async () => {
  const content = await crawlSitemapText("https://docs.example.test/sitemap.xml", (html) =>
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  assert.match(content, /Source URL: https:\/\/docs\.example\.test\/first/);
  assert.match(content, /First help page/);
  assert.match(content, /Second help page/);
  assert.equal(requests.includes("https://elsewhere.example.test/ignored"), false);
  assert.deepEqual(requests, [
    "https://docs.example.test/sitemap.xml",
    "https://docs.example.test/first",
    "https://docs.example.test/second",
  ]);
});

test("sitemap source extraction is wired to the safe crawler and gets revision coverage", async () => {
  const [extract, revisions] = await Promise.all([
    readFile("src/features/knowledge/server/extract.ts", "utf8"),
    readFile("src/features/knowledge/server/source-revisions.ts", "utf8"),
  ]);

  assert.match(
    extract,
    /sourceType === "SITEMAP" && sourceUrl[\s\S]*?crawlSitemapText\(sourceUrl, stripHtml\)/,
  );
  assert.match(revisions, /new Set\(\["URL", "SITEMAP", "TXT", "TEXT", "PDF", "DOCX"\]\)/);
});
