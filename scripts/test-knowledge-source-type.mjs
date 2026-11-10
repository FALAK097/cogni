import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/app/api/dashboard/knowledge-base/sources/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": new URL("../src", import.meta.url).pathname },
  plugins: [
    {
      name: "knowledge-source-route-test",
      setup(buildContext) {
        const stubs = {
          "@/features/knowledge/queries": `export const listDocuments = async (workspaceId) => { globalThis.__knowledgeSourceTypeTest.workspaceId = workspaceId; return globalThis.__knowledgeSourceTypeTest.documents; };`,
          "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => ({ workspace: { id: "workspace-1", createdAt: new Date("2026-10-01T00:00:00.000Z"), updatedAt: new Date("2026-10-01T00:00:00.000Z") } });`,
          "next/server": `export const NextResponse = { json: (value, init) => Response.json(value, init) };`,
        };
        buildContext.onResolve(
          {
            filter:
              /^(next\/server|@\/features\/knowledge\/queries|@\/lib\/auth\/dashboard-context)$/,
          },
          (args) => ({ path: args.path, namespace: "knowledge-source-route-test" }),
        );
        buildContext.onLoad({ filter: /.*/, namespace: "knowledge-source-route-test" }, (args) => ({
          contents: stubs[args.path],
          loader: "js",
        }));
      },
    },
  ],
});
const { GET } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

globalThis.__knowledgeSourceTypeTest = {
  workspaceId: null,
  documents: ["URL", "SITEMAP", "TXT", "PDF", "DOCX", "LEGACY"].map((sourceType, index) => ({
    id: `source-${index}`,
    title: `Source ${index}`,
    sourceType,
    sourceUrl: sourceType === "URL" || sourceType === "SITEMAP" ? "https://example.com" : null,
    storageKey: null,
    mimeType: null,
    status: "READY",
    errorMessage: null,
    updatedAt: new Date("2026-10-02T00:00:00.000Z"),
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    _count: { chunks: 1 },
  })),
};

test("source API returns accurate source badges and scopes its query to the active workspace", async () => {
  const response = await GET(
    new Request("https://cogni.test/api/dashboard/knowledge-base/sources"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(globalThis.__knowledgeSourceTypeTest.workspaceId, "workspace-1");
  assert.deepEqual(
    body.sources.map((source) => source.sourceType),
    ["website", "sitemap", "txt", "file", "file", "unknown"],
  );
});
