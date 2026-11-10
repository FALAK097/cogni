import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = { queries: [], rows: [] };
globalThis.__conversationEventsRouteTest = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (body, init = {}) => new Response(JSON.stringify(body), init) };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => globalThis.__conversationEventsRouteTest.context;`,
  "@/lib/db/schema": `export const conversationEvent = { workspaceId: "event.workspaceId", cursor: "event.cursor", conversationId: "event.conversationId" };`,
  "drizzle-orm": `export const and = (...conditions) => ({ type: "and", conditions }); export const asc = (field) => ({ type: "asc", field }); export const desc = (field) => ({ type: "desc", field }); export const eq = (field, value) => ({ type: "eq", field, value }); export const gt = (field, value) => ({ type: "gt", field, value });`,
};

const compiled = await build({
  entryPoints: ["src/app/api/dashboard/conversations/events/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "conversation-events-route-test",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^(next\/server|drizzle-orm|@\/.*)$/ }, (args) =>
          args.path in stubs
            ? { path: args.path, namespace: "conversation-events-route-test" }
            : undefined,
        );
        buildContext.onLoad(
          { filter: /.*/, namespace: "conversation-events-route-test" },
          (args) => ({
            contents: stubs[args.path],
            loader: "js",
          }),
        );
      },
    },
  ],
});
const route = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function reset() {
  state.queries = [];
  state.rows = [
    [{ cursor: BigInt(8) }],
    [{ cursor: BigInt(2) }],
    [{ cursor: BigInt(8), conversationId: "conversation-abc" }],
  ];
  state.context = {
    workspace: { id: "workspace-current" },
    db: {
      select: (fields) => {
        const query = { fields };
        return {
          from(table) {
            query.table = table;
            return this;
          },
          where(condition) {
            query.condition = condition;
            return this;
          },
          orderBy(order) {
            query.order = order;
            return this;
          },
          limit(limit) {
            query.limit = limit;
            state.queries.push(query);
            return Promise.resolve(state.rows.shift() ?? []);
          },
        };
      },
    },
  };
}

function scopedToWorkspace(condition) {
  const conditions = condition.type === "and" ? condition.conditions : [condition];
  return conditions.some(
    (entry) =>
      entry.type === "eq" &&
      entry.field === "event.workspaceId" &&
      entry.value === "workspace-current",
  );
}

test("event catch-up queries are scoped to the authenticated workspace and return opaque fields", async () => {
  reset();
  const response = await route.GET(
    new Request("https://cogni.test/api/dashboard/conversations/events?after=6"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(state.queries.every((query) => scopedToWorkspace(query.condition)));
  assert.deepEqual(body, {
    events: [{ cursor: "8", conversationId: "conversation-abc" }],
    cursor: "8",
    reset: false,
  });
  assert.deepEqual(Object.keys(body.events[0]).sort(), ["conversationId", "cursor"]);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});

test("an initial cursor returns a baseline that clients can reconcile against", async () => {
  reset();
  const response = await route.GET(
    new Request("https://cogni.test/api/dashboard/conversations/events"),
  );
  assert.deepEqual(await response.json(), { events: [], cursor: "8", reset: true });
  assert.equal(state.queries.length, 2);
});

test("malformed and duplicate cursors are rejected", async () => {
  for (const url of [
    "https://cogni.test/api/dashboard/conversations/events?after=01",
    "https://cogni.test/api/dashboard/conversations/events?after=1&after=2",
    "https://cogni.test/api/dashboard/conversations/events?after=9223372036854775808",
  ]) {
    reset();
    const response = await route.GET(new Request(url));
    assert.equal(response.status, 400);
    assert.equal(state.queries.length, 0);
  }
});
