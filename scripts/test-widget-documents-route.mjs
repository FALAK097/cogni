import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  access: {
    widget: { id: "widget-1", workspaceId: "workspace-1" },
    origin: "https://support.example.test",
    allowedDomains: ["https://support.example.test"],
    settings: { enableBrochure: true },
  },
  authorized: true,
  authCalls: 0,
  corsCalls: 0,
  budgets: [],
  rateLimitResults: [],
  documentCalls: 0,
  query: null,
  documents: [
    {
      id: "doc-1",
      title: "Getting started",
      sourceUrl: "https://docs.example.test/start",
      mimeType: "text/html",
    },
  ],
};
globalThis.__widgetDocumentsRouteTest = state;

const readBoundedJsonSource = readFileSync(resolve("src/lib/http/read-bounded-json.ts"), "utf8");
const stubs = {
  "@/features/widget/server/widget-public": `
    export const assertPublicWidgetAccess = async () => globalThis.__widgetDocumentsRouteTest.access;
    export const requireAuthorizedVisitorSession = async (_db, _key, request) => {
      const state = globalThis.__widgetDocumentsRouteTest;
      state.authCalls += 1;
      if (!state.authorized || request.headers.get("authorization") !== "Bearer visitor-token") {
        return { error: Response.json({ error: "Widget session is required." }, { status: 401 }) };
      }
      return { session: { token: "visitor-token" } };
    };
  `,
  "@/features/widget/server/widget-utils": `
    export const widgetPreflightResponse = () => new Response(null, { status: 204 });
    export const withWidgetCors = (response) => {
      globalThis.__widgetDocumentsRouteTest.corsCalls += 1;
      return response;
    };
  `,
  "@/features/widget/server/widget-service": `export const validateEmbedOrigin = () => true;`,
  "@/lib/db/client": `
    export const getDb = () => ({ query: { document: { findMany: async (query) => {
      const state = globalThis.__widgetDocumentsRouteTest;
      state.documentCalls += 1;
      state.query = query;
      const eq = (field, value) => ({ operator: "eq", field, value });
      const and = (...conditions) => ({ operator: "and", conditions });
      const or = (...conditions) => ({ operator: "or", conditions });
      const like = (field, value) => ({ operator: "like", field, value });
      state.whereCondition = query.where({ workspaceId: "workspaceId", status: "status", title: "title", sourceUrl: "sourceUrl" }, { eq, and, or, like });
      return state.documents;
    } } } });
  `,
  "@/lib/rate-limit/shared": `
    export const getTrustedClientIp = () => "203.0.113.10";
    export const checkRateLimits = async (budgets) => {
      const state = globalThis.__widgetDocumentsRouteTest;
      state.budgets.push(budgets);
      return state.rateLimitResults.shift() ?? { allowed: true, remaining: 10 };
    };
  `,
  "@/lib/http/read-bounded-json": readBoundedJsonSource,
};

const compiled = await build({
  entryPoints: ["src/app/api/widget/[publicKey]/documents/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "widget-documents-route-test",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^@\// }, (args) => ({
          path: args.path,
          namespace: "widget-documents-route-test",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "widget-documents-route-test" }, (args) => ({
          contents: stubs[args.path],
          loader: "ts",
        }));
      },
    },
  ],
});

const route = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function resetState() {
  Object.assign(state, {
    access: {
      widget: { id: "widget-1", workspaceId: "workspace-1" },
      origin: "https://support.example.test",
      allowedDomains: ["https://support.example.test"],
      settings: { enableBrochure: true },
    },
    authorized: true,
    authCalls: 0,
    corsCalls: 0,
    budgets: [],
    rateLimitResults: [],
    documentCalls: 0,
    query: null,
    whereCondition: null,
    documents: [
      {
        id: "doc-1",
        title: "Getting started",
        sourceUrl: "https://docs.example.test/start",
        mimeType: "text/html",
      },
    ],
  });
}

function documentsRequest(body = { searchQuery: "getting started" }, token = true) {
  return new Request("https://cogni.test/api/widget/public-key/documents", {
    method: "POST",
    headers: token
      ? { authorization: "Bearer visitor-token", "content-type": "application/json" }
      : {},
    body: JSON.stringify(body),
  });
}

test("document search requires a valid visitor session before querying workspace documents", async () => {
  resetState();
  const response = await route.POST(documentsRequest({}, false), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });

  assert.equal(response.status, 401);
  assert.equal(state.corsCalls, 1);
  assert.equal(state.documentCalls, 0);
  assert.deepEqual(
    state.budgets[0].map(({ key }) => key),
    ["widget-public:ip:203.0.113.10", "widget-public:workspace:workspace-1"],
  );
});

test("a valid search is workspace scoped, limited, no-store, and uses the published brochure switch", async () => {
  resetState();
  const response = await route.POST(documentsRequest(), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.deepEqual(body.documents, [
    {
      id: "doc-1",
      title: "Getting started",
      url: "https://docs.example.test/start",
      mimeType: "text/html",
    },
  ]);
  assert.equal(state.documentCalls, 1);
  assert.equal(state.query.limit, 10);
  assert.deepEqual(state.query.columns, { id: true, title: true, sourceUrl: true, mimeType: true });
  assert.deepEqual(state.whereCondition.conditions, [
    { operator: "eq", field: "workspaceId", value: "workspace-1" },
    { operator: "eq", field: "status", value: "READY" },
    {
      operator: "or",
      conditions: [
        { operator: "like", field: "title", value: "%getting started%" },
        { operator: "like", field: "sourceUrl", value: "%getting started%" },
      ],
    },
  ]);
  assert.deepEqual(state.budgets[1], [
    { key: "widget-documents:visitor:visitor-token", limit: 30, windowMs: 60_000 },
  ]);
});

test("disabled brochure search returns no documents and skips document queries", async () => {
  resetState();
  state.access.settings.enableBrochure = false;
  const response = await route.POST(documentsRequest(), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { documents: [] });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(state.documentCalls, 0);
});

test("invalid, extra, and oversized search payloads are rejected before database access", async () => {
  resetState();
  const invalid = await route.POST(documentsRequest({ searchQuery: 42 }), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  assert.equal(invalid.status, 400);

  const extra = await route.POST(documentsRequest({ searchQuery: "docs", private: true }), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  assert.equal(extra.status, 400);

  const oversized = await route.POST(documentsRequest({ searchQuery: "x".repeat(5_000) }), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  assert.equal(oversized.status, 413);
  assert.equal(state.documentCalls, 0);
});

test("IP/workspace and visitor rate limits fail closed before document lookup", async () => {
  resetState();
  state.rateLimitResults = [{ allowed: false, remaining: 0, retryAfterMs: 2_500 }];
  const ipLimited = await route.POST(documentsRequest(), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  assert.equal(ipLimited.status, 429);
  assert.equal(ipLimited.headers.get("retry-after"), "3");
  assert.equal(state.authCalls, 0);
  assert.equal(state.documentCalls, 0);

  resetState();
  state.rateLimitResults = [
    { allowed: true, remaining: 2 },
    { allowed: false, remaining: 0, retryAfterMs: 1_000 },
  ];
  const visitorLimited = await route.POST(documentsRequest(), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  assert.equal(visitorLimited.status, 429);
  assert.equal(state.documentCalls, 0);

  resetState();
  state.rateLimitResults = [{ allowed: false, remaining: 0, unavailable: true }];
  const unavailable = await route.POST(documentsRequest(), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  assert.equal(unavailable.status, 503);
  assert.equal(state.authCalls, 0);
  assert.equal(state.documentCalls, 0);
});
