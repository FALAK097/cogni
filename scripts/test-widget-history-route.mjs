import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  session: { id: "current-session", token: "current-token", visitorId: "visitor-1" },
  target: {
    id: "older-session",
    token: "older-token",
    visitorId: "visitor-1",
    widgetId: "widget-1",
    browserSessionId: "browser-older",
  },
};
globalThis.__widgetHistoryRouteTest = state;

const stubs = {
  "@/features/conversations/server/conversation-service": `export const getVisitorConversationMessages = async () => [{ id: "message-1", body: "Hello", visibility: "PUBLIC" }];`,
  "@/features/widget/server/widget-data-filters": `export const getHasWidgetConversationCond = () => ({ op: "has-conversation" });`,
  "@/features/widget/server/widget-public": `export const assertPublicWidgetAccess = async () => ({ widget: { id: "widget-1" }, allowedDomains: ["https://example.test"] });
     export const requireAuthorizedVisitorSession = async () => ({ session: globalThis.__widgetHistoryRouteTest.session });`,
  "@/features/widget/server/widget-utils": `export const getRequestOrigin = () => null;
     export const toWidgetHistoryMessages = (messages) => messages;
     export const widgetPreflightResponse = () => new Response(null, { status: 204 });
     export const withWidgetCors = (response) => response;`,
  "@/features/widget/server/widget-service": `export const validateEmbedOrigin = () => true;`,
  "@/lib/db/client": `export const getDb = () => ({ query: { visitorSession: { findFirst: async ({ where }) => {
      const eq = (field, value) => ({ op: "eq", field, value });
      const gt = (field, value) => ({ op: "gt", field, value });
      const and = (...conditions) => ({ op: "and", conditions });
      const condition = where({ id: "id", widgetId: "widgetId", visitorId: "visitorId", token: "token", expiresAt: "expiresAt", messageCount: "messageCount" }, { eq, gt, and });
      const equalities = condition.conditions.filter((entry) => entry.op === "eq");
      const target = globalThis.__widgetHistoryRouteTest.target;
      return equalities.every(({ field, value }) => {
        if (field === "id") return target.id === value;
        if (field === "widgetId") return target.widgetId === value;
        if (field === "visitorId") return target.visitorId === value;
        return true;
      }) ? target : null;
    } } } });`,
};

const compiled = await build({
  entryPoints: ["src/app/api/widget/[publicKey]/history/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "widget-history-route-test",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^@\// }, (args) => ({
          path: args.path,
          namespace: "widget-history-route-test",
        }));
        buildContext.onLoad({ filter: /.*/, namespace: "widget-history-route-test" }, (args) => ({
          contents: stubs[args.path],
          loader: "js",
        }));
      },
    },
  ],
});

const route = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function historyRequest(sessionId = "older-session") {
  return new Request(
    `https://cogni.test/api/widget/public-key/history?sessionId=${encodeURIComponent(sessionId)}`,
    { headers: { authorization: "Bearer current-token" } },
  );
}

test("a visitor can resume their own prior session without caching its bearer token", async () => {
  state.session = { id: "current-session", token: "current-token", visitorId: "visitor-1" };
  state.target = {
    id: "older-session",
    token: "older-token",
    visitorId: "visitor-1",
    widgetId: "widget-1",
    browserSessionId: "browser-older",
  };

  const response = await route.GET(historyRequest(), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(body.sessionId, "older-session");
  assert.equal(body.token, "older-token");
  assert.equal(body.messages[0].body, "Hello");
});

test("a visitor token cannot resume a session owned by another visitor", async () => {
  state.session = { id: "current-session", token: "current-token", visitorId: "visitor-1" };
  state.target = {
    id: "older-session",
    token: "foreign-token",
    visitorId: "visitor-2",
    widgetId: "widget-1",
    browserSessionId: "browser-foreign",
  };

  const response = await route.GET(historyRequest(), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal("token" in body, false);
});

test("session history rejects missing session identifiers before querying for a target", async () => {
  const response = await route.GET(historyRequest(""), {
    params: Promise.resolve({ publicKey: "public-key" }),
  });

  assert.equal(response.status, 400);
});
