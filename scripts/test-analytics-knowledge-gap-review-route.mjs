import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  role: "MEMBER",
  inserted: null,
  updated: null,
  values: null,
};
globalThis.__gapReviewState = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => ({ db: globalThis.__gapReviewState.db, membership: { role: globalThis.__gapReviewState.role }, session: { user: { id: "user-1" } }, workspace: { id: "workspace-1" } });`,
  "@/lib/auth/permissions": `export const canManageWorkspace = (role) => role === "OWNER";`,
  "@/lib/db/schema": `export const knowledgeGapReview = { workspaceId: "workspaceId", questionHash: "questionHash" };`,
  "drizzle-orm": ``,
};
state.db = {
  insert(table) {
    state.inserted = table;
    return {
      values(value) {
        state.values = value;
        return {
          onConflictDoUpdate(value) {
            state.updated = value;
            return Promise.resolve();
          },
        };
      },
    };
  },
};

const compiled = await build({
  entryPoints: ["src/app/api/dashboard/analytics/knowledge-gaps/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "knowledge-gap-review-route-test",
      setup(context) {
        context.onResolve({ filter: /^(next\/server|drizzle-orm|@\/.*)$/ }, (args) =>
          args.path in stubs
            ? { path: args.path, namespace: "knowledge-gap-review-route-test" }
            : undefined,
        );
        context.onLoad({ filter: /.*/, namespace: "knowledge-gap-review-route-test" }, (args) => ({
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
const makeRequest = (body) =>
  new Request("https://cogni.test/api/dashboard/analytics/knowledge-gaps", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

function reset() {
  state.inserted = null;
  state.updated = null;
  state.values = null;
}

test("members are denied before parsing or database writes", async () => {
  reset();
  state.role = "MEMBER";
  const response = await route.PATCH(makeRequest({ question: "Question?", status: "IGNORED" }));
  assert.equal(response.status, 403);
  assert.equal(state.inserted, null);
});

test("owners can review a gap only in their active workspace", async () => {
  reset();
  state.role = "OWNER";
  const response = await route.PATCH(
    makeRequest({ question: " Password reset? ", status: "RESOLVED" }),
  );
  assert.equal(response.status, 200);
  assert.equal(state.values.workspaceId, "workspace-1");
  assert.match(state.values.questionHash, /^[a-f0-9]{64}$/u);
  assert.equal(state.values.status, "RESOLVED");
  assert.equal(state.values.reviewedByUserId, "user-1");
  assert.equal(typeof state.values.updatedAt, "string");
  assert.equal(state.updated.target[0], "workspaceId");
  assert.equal(state.updated.target[1], "questionHash");
});

test("invalid review payloads never reach the database", async () => {
  reset();
  state.role = "OWNER";
  const response = await route.PATCH(makeRequest({ question: "", status: "DELETE" }));
  assert.equal(response.status, 400);
  assert.equal(state.inserted, null);
});
