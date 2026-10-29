import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  role: "OWNER",
  source: { id: "source-1", sourceType: "URL", status: "READY" },
  claimed: [{ id: "source-1" }],
  queryConditions: [],
  updateConditions: [],
  updateValues: null,
  lookupCount: 0,
  enqueueCalls: [],
};
globalThis.__knowledgeSourceSyncTest = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (value, init) => Response.json(value, init) };`,
  "drizzle-orm": `export const and = (...args) => args; export const eq = (field, value) => ({ field, value }); export const inArray = (...args) => args; export const like = (...args) => args;`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => {
    const s = globalThis.__knowledgeSourceSyncTest;
    const db = {
      query: {
        document: {
          findFirst: async ({ where }) => {
            s.lookupCount += 1;
            s.queryConditions = where(
              { id: "id", workspaceId: "workspaceId" },
              { and: (...args) => args, eq: (field, value) => ({ field, value }) },
            );
            return s.source;
          },
        },
      },
      select: () => ({
        from: () => ({
          where: () => ({
            for: async () =>
              s.source ? [{ id: s.source.id, status: s.source.status }] : [],
          }),
        }),
      }),
      update: () => ({
        set: (values) => {
          s.updateValues = values;
          return {
            where: (conditions) => {
              s.updateConditions = conditions;
              return { returning: async () => s.claimed };
            },
          };
        },
      }),
    };
    return { db, workspace: { id: "workspace-1" }, membership: { role: s.role } };
  };`,
  "@/lib/auth/permissions": `export const canManageWorkspace = (role) => role === "OWNER";`,
  "@/lib/db/schema": `export const document = { id: "id", workspaceId: "workspaceId", status: "status" }; export const workflowRun = { workspaceId: "workspaceId", name: "name", idempotencyKey: "idempotencyKey", status: "status" };`,
  "@/lib/jobs/ingestion": `export const enqueueDocumentProcessing = async (input) => { globalThis.__knowledgeSourceSyncTest.enqueueCalls.push(input); };`,
  "@/lib/db/client": `export const runDbWriteOperation = async (_db, operation) => operation(_db);`,
  "@/features/knowledge/server/source-revisions": `export const drainSearchItemCleanup = async () => {}; export const markDocumentRevisionsDeleted = async () => {}; export const isSupportedKnowledgeSourceType = (sourceType) => ["URL", "TXT", "TEXT", "PDF", "DOCX"].includes(sourceType); export async function lockWorkspaceSourceBasisInTransaction() {}`,
  "@/lib/storage": `export const deleteObject = async () => {};`,
};

const compiled = await build({
  entryPoints: ["src/app/api/dashboard/knowledge-base/sources/[source_id]/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "server-only-test-stub",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "server-only-test-stub",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "server-only-test-stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
    {
      name: "knowledge-source-sync-test",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^(next\/server|drizzle-orm|@\/.*)$/ }, (args) =>
          args.path in stubs
            ? { path: args.path, namespace: "knowledge-source-sync-test" }
            : undefined,
        );
        buildContext.onLoad({ filter: /.*/, namespace: "knowledge-source-sync-test" }, (args) => ({
          contents: stubs[args.path],
          loader: "js",
        }));
      },
    },
  ],
});
const { PATCH } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const knowledgeManager = await readFile(
  "src/components/workspace/widget-knowledge-manager.tsx",
  "utf8",
);

function reset(overrides = {}) {
  Object.assign(state, {
    role: "OWNER",
    source: { id: "source-1", sourceType: "URL", status: "READY" },
    claimed: [{ id: "source-1" }],
    queryConditions: [],
    updateConditions: [],
    updateValues: null,
    lookupCount: 0,
    enqueueCalls: [],
    ...overrides,
  });
}

function makeRequest(body) {
  return new Request("https://cogni.test/api/dashboard/knowledge-base/sources/source-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const context = { params: Promise.resolve({ source_id: "source-1" }) };

test("owners can sync a ready website through the durable ingestion queue", async () => {
  reset({ source: { id: "source-1", sourceType: "URL", status: "READY" } });
  const response = await PATCH(makeRequest({ action: "sync" }), context);
  const body = await response.json();

  assert.equal(response.status, 202);
  assert.deepEqual(body, { ok: true, status: "processing" });
  assert.equal(state.updateValues.status, "PROCESSING");
  assert.ok(
    state.queryConditions.some(
      (condition) => condition.field === "workspaceId" && condition.value === "workspace-1",
    ),
  );
  assert.ok(
    state.updateConditions.some(
      (condition) => condition.field === "status" && condition.value === "READY",
    ),
  );
  assert.equal(state.enqueueCalls.length, 1);
  assert.equal(state.enqueueCalls[0].workspaceId, "workspace-1");
  assert.equal(state.enqueueCalls[0].documentId, "source-1");
  assert.match(state.enqueueCalls[0].idempotencyKey, /^document:sync:source-1:/);
});

test("owners can reindex a ready file in place without changing its source ID", async () => {
  reset({
    source: { id: "source-file", sourceType: "PDF", status: "READY" },
    claimed: [{ id: "source-file" }],
  });
  const response = await PATCH(makeRequest({ action: "sync" }), {
    params: Promise.resolve({ source_id: "source-file" }),
  });

  assert.equal(response.status, 202);
  assert.equal(state.enqueueCalls.length, 1);
  assert.equal(state.enqueueCalls[0].documentId, "source-file");
  assert.match(state.enqueueCalls[0].idempotencyKey, /^document:sync:source-file:/);
});

test("members cannot sync sources or cause lookup/queue side effects", async () => {
  reset({ role: "MEMBER" });
  const response = await PATCH(makeRequest({ action: "sync" }), context);

  assert.equal(response.status, 403);
  assert.equal(state.lookupCount, 0);
  assert.equal(state.enqueueCalls.length, 0);
});

test("sync rejects unsupported types, unknown fields, and non-ready sources", async () => {
  reset({ source: { id: "source-1", sourceType: "UNKNOWN", status: "READY" } });
  let response = await PATCH(makeRequest({ action: "sync" }), context);
  assert.equal(response.status, 400);
  assert.equal(state.enqueueCalls.length, 0);

  reset();
  response = await PATCH(
    makeRequest({ action: "sync", workspaceId: "foreign-workspace" }),
    context,
  );
  assert.equal(response.status, 400);
  assert.equal(state.lookupCount, 0);

  reset({ source: { id: "source-1", sourceType: "URL", status: "PROCESSING" }, claimed: [] });
  response = await PATCH(makeRequest({ action: "sync" }), context);
  assert.equal(response.status, 409);
  assert.equal(state.enqueueCalls.length, 0);
});

test("sitemap sources cannot be synced or retried, and have no UI sync action", async () => {
  reset({ source: { id: "source-sitemap", sourceType: "SITEMAP", status: "READY" } });
  let response = await PATCH(makeRequest({ action: "sync" }), {
    params: Promise.resolve({ source_id: "source-sitemap" }),
  });
  assert.equal(response.status, 400);
  assert.equal(state.enqueueCalls.length, 0);

  reset({ source: { id: "source-sitemap", sourceType: "SITEMAP", status: "FAILED" } });
  response = await PATCH(makeRequest({ action: "retry" }), {
    params: Promise.resolve({ source_id: "source-sitemap" }),
  });
  assert.equal(response.status, 400);
  assert.equal(state.enqueueCalls.length, 0);

  assert.match(
    knowledgeManager,
    /const canSync = source\.status === "ready" && sourceType === "website"/,
  );
  assert.match(
    knowledgeManager,
    /const canRetry =\s*source\.status === "failed" && \["website", "file", "text", "txt"\]\.includes\(sourceType\)/,
  );
});

test("retry remains limited to failed sources", async () => {
  reset({ source: { id: "source-1", sourceType: "PDF", status: "FAILED" } });
  const response = await PATCH(makeRequest({ action: "retry" }), context);

  assert.equal(response.status, 202);
  assert.ok(
    state.updateConditions.some(
      (condition) => condition.field === "status" && condition.value === "FAILED",
    ),
  );
  assert.match(state.enqueueCalls[0].idempotencyKey, /^document:retry:source-1:/);
});
