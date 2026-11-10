import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  role: "MEMBER",
  workspaceId: "workspace-current",
  membershipId: "membership-current",
  recorded: null,
};
globalThis.__agentTestRunState = state;

const stubs = {
  "@/features/analytics/date-range": `export class InvalidAnalyticsDateRangeError extends Error {}; export const resolveAnalyticsDateRange = () => ({ startAt: new Date(0), endBefore: new Date(1) });`,
  "@/features/agent-tests/server/runs": `export class AgentTestRunConflictError extends Error {}; export class AgentTestSuiteChangedError extends Error {}; export const listAgentTestRuns = async (workspaceId) => { globalThis.__agentTestRunState.listWorkspaceId = workspaceId; return []; }; export const hasAgentTestRuns = async (workspaceId) => { globalThis.__agentTestRunState.hasAnyWorkspaceId = workspaceId; return true; }; export const recordAgentTestRun = async (workspaceId, membershipId, input) => { globalThis.__agentTestRunState.recorded = { workspaceId, membershipId, input }; return { id: input.runId }; };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => ({ db: {}, membership: { id: globalThis.__agentTestRunState.membershipId, role: globalThis.__agentTestRunState.role }, workspace: { id: globalThis.__agentTestRunState.workspaceId, timezone: "UTC" } });`,
  "@/lib/auth/permissions": `export const canManageWorkspace = (role) => role === "OWNER";`,
};

const compiled = await build({
  entryPoints: ["src/app/api/dashboard/agent-test-runs/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "agent-test-run-route-test",
      setup(context) {
        context.onResolve({ filter: /^@\/.*$/ }, (args) =>
          args.path in stubs
            ? { path: args.path, namespace: "agent-test-run-route-test" }
            : undefined,
        );
        context.onLoad({ filter: /.*/, namespace: "agent-test-run-route-test" }, (args) => ({
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

function reset() {
  state.role = "MEMBER";
  state.recorded = null;
  state.listWorkspaceId = null;
  state.hasAnyWorkspaceId = null;
}

const validInput = {
  runId: "00000000-0000-4000-8000-000000000010",
  suiteVersion: "[]",
  results: [{ id: "00000000-0000-4000-8000-000000000011", status: "passed" }],
};

test("members cannot write agent test run history", async () => {
  reset();
  const response = await route.POST(
    new Request("https://cogni.test/api/dashboard/agent-test-runs", {
      method: "POST",
      body: "not-json",
    }),
  );

  assert.equal(response.status, 403);
  assert.equal(state.recorded, null);
});

test("the run history route rejects duplicate test IDs before writing", async () => {
  reset();
  state.role = "OWNER";
  const response = await route.POST(
    new Request("https://cogni.test/api/dashboard/agent-test-runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...validInput,
        results: [validInput.results[0], validInput.results[0]],
      }),
    }),
  );

  assert.equal(response.status, 400);
  assert.equal(state.recorded, null);
});

test("owner run history writes pass the authenticated workspace scope and only result summaries", async () => {
  reset();
  state.role = "OWNER";
  const response = await route.POST(
    new Request("https://cogni.test/api/dashboard/agent-test-runs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...validInput, prompt: "must not be forwarded" }),
    }),
  );

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.deepEqual(state.recorded, {
    workspaceId: "workspace-current",
    membershipId: "membership-current",
    input: validInput,
  });
});

test("run history reads stay scoped to the active workspace", async () => {
  reset();
  const response = await route.GET(
    new Request(
      "https://cogni.test/api/dashboard/agent-test-runs?startDate=2026-10-01&endDate=2026-10-07",
    ),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
  assert.equal(state.listWorkspaceId, "workspace-current");
  assert.equal(state.hasAnyWorkspaceId, "workspace-current");
  assert.deepEqual(await response.json(), { runs: [], hasAnyRuns: true });
});

test("oversized request bodies are rejected before storage with private caching", async () => {
  reset();
  state.role = "OWNER";
  for (const headers of [{ "content-length": "1048577" }, {}]) {
    const response = await route.POST(
      new Request("https://cogni.test/api/dashboard/agent-test-runs", {
        method: "POST",
        headers,
        body: "x".repeat(1048577),
      }),
    );
    assert.equal(response.status, 413);
    assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
    assert.equal(state.recorded, null);
  }
});
