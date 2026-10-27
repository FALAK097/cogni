import assert from "node:assert/strict";
import { build } from "esbuild";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const state = {
  role: "OWNER",
  workspaceId: "workspace-1",
  membershipId: "membership-1",
  createdInput: null,
  reviewedInput: null,
  items: [{ id: "item-1", status: "OPEN" }],
};
globalThis.__agentImprovementRouteState = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = async () => ({ db: {}, membership: { id: globalThis.__agentImprovementRouteState.membershipId, role: globalThis.__agentImprovementRouteState.role }, session: { user: { id: "user-1" } }, workspace: { id: globalThis.__agentImprovementRouteState.workspaceId } });`,
  "@/lib/auth/permissions": `export const canManageWorkspace = (role) => role === "OWNER";`,
  "@/lib/http/read-bounded-json": `export async function readBoundedJson(request) { try { return { ok: true, value: await request.json() }; } catch { return { ok: false, reason: "invalid" }; } }`,
  "@/features/agent-tests/server/improvements": `
    export class AgentTestImprovementSourceUnavailableError extends Error { constructor(){ super("Verified failed context is unavailable."); } }
    export class AgentTestImprovementConflictError extends Error { constructor(){ super("Already reviewed or exists."); } }
    export async function listAgentTestImprovements(workspaceId) { globalThis.__agentImprovementRouteState.listedWorkspaceId = workspaceId; return globalThis.__agentImprovementRouteState.items; }
    export async function createAgentTestImprovement(workspaceId, membershipId, input) { globalThis.__agentImprovementRouteState.createdInput = { workspaceId, membershipId, input }; return { id: "item-1", status: "OPEN" }; }
    export async function reviewAgentTestImprovement(workspaceId, membershipId, id, status, reviewNote) { globalThis.__agentImprovementRouteState.reviewedInput = { workspaceId, membershipId, id, status, reviewNote }; return { id, status, reviewNote }; }
  `,
};

const compileRoute = (entryPoint) =>
  build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    alias: { "@": resolve("src") },
    plugins: [
      {
        name: "agent-improvement-route-test",
        setup(context) {
          context.onResolve({ filter: /^(next\/server|@\/.*)$/ }, (args) =>
            args.path in stubs
              ? { path: args.path, namespace: "agent-improvement-route-test" }
              : undefined,
          );
          context.onLoad({ filter: /.*/, namespace: "agent-improvement-route-test" }, (args) => ({
            contents: stubs[args.path],
            loader: "js",
          }));
        },
      },
    ],
  });
const [collectionBundleResult, itemBundleResult] = await Promise.all([
  compileRoute("src/app/api/dashboard/agent-test-improvements/route.ts"),
  compileRoute("src/app/api/dashboard/agent-test-improvements/[improvement_id]/route.ts"),
]);
const [collectionBundle] = collectionBundleResult.outputFiles;
const [itemBundle] = itemBundleResult.outputFiles;
const importBundle = (source) =>
  import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const collection = await importBundle(collectionBundle.text);
const itemRoute = await importBundle(itemBundle.text);
const request = (body, method = "POST") =>
  new Request("https://cogni.test/api/dashboard/agent-test-improvements", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test("queue list is authenticated and scoped to the active workspace", async () => {
  state.workspaceId = "workspace-7";
  const response = await collection.GET();
  assert.equal(response.status, 200);
  assert.equal(state.listedWorkspaceId, "workspace-7");
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});

test("only owners can submit a validated improvement request", async () => {
  state.role = "MEMBER";
  const denied = await collection.POST(
    request({ runId: randomUUID(), caseId: randomUUID(), rationale: "Review this." }),
  );
  assert.equal(denied.status, 403);
  assert.equal(state.createdInput, null);

  state.role = "OWNER";
  const invalid = await collection.POST(request({ runId: "not-a-uuid", rationale: "" }));
  assert.equal(invalid.status, 400);
  assert.equal(state.createdInput, null);

  const runId = randomUUID();
  const caseId = randomUUID();
  const created = await collection.POST(
    request({ runId, caseId, rationale: "Compare expected and retrieved grounding." }),
  );
  assert.equal(created.status, 201);
  assert.deepEqual(state.createdInput, {
    workspaceId: "workspace-7",
    membershipId: "membership-1",
    input: { runId, caseId, rationale: "Compare expected and retrieved grounding." },
  });
});

test("only owners can move an open item into a terminal review state", async () => {
  state.role = "MEMBER";
  const denied = await itemRoute.PATCH(request({ status: "RESOLVED" }, "PATCH"), {
    params: Promise.resolve({ improvement_id: "item-2" }),
  });
  assert.equal(denied.status, 403);
  assert.equal(state.reviewedInput, null);

  state.role = "OWNER";
  const invalid = await itemRoute.PATCH(request({ status: "OPEN" }, "PATCH"), {
    params: Promise.resolve({ improvement_id: "item-2" }),
  });
  assert.equal(invalid.status, 400);

  const reviewed = await itemRoute.PATCH(
    request({ status: "RESOLVED", reviewNote: "Closed review, no fix claimed." }, "PATCH"),
    { params: Promise.resolve({ improvement_id: "item-2" }) },
  );
  assert.equal(reviewed.status, 200);
  assert.deepEqual(state.reviewedInput, {
    workspaceId: "workspace-7",
    membershipId: "membership-1",
    id: "item-2",
    status: "RESOLVED",
    reviewNote: "Closed review, no fix claimed.",
  });
});
