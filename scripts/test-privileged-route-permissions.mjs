import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  membershipRole: "MEMBER",
  sideEffects: 0,
  requireDashboardContext: async () => ({
    db: { testDatabase: true },
    workspace: { id: "workspace-1" },
    membership: { id: "member-1", role: state.membershipRole },
    session: { user: { id: "user-1" } },
  }),
};
globalThis.__privilegedRoutePermissionTest = state;

const stubs = {
  "next/server": `export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };`,
  "@/lib/auth/dashboard-context": `export const requireDashboardContext = () => globalThis.__privilegedRoutePermissionTest.requireDashboardContext();`,
  "@/lib/workflows/runner": `export const createWorkflowWithSteps = (...args) => { globalThis.__privilegedRoutePermissionTest.sideEffects += 1; return args; }; export const completeWorkflowRun = () => {}; export const updateWorkflowStep = () => {};`,
  "@/features/integrations/server/approval-service": `export const createApprovalRequest = () => { globalThis.__privilegedRoutePermissionTest.sideEffects += 1; };`,
  "@/features/agent-tests/input": `export const agentTestCaseInputSchema = { safeParse: (value) => ({ success: true, data: value }) };`,
  "@/features/agent-tests/server/cases": `export const createAgentTestCase = () => { globalThis.__privilegedRoutePermissionTest.sideEffects += 1; }; export const listAgentTestCases = () => []; export class AgentTestCaseTitleConflictError extends Error {}`,
  "@/features/integrations/server/composio-connections": `export const COMPOSIO_PROVIDER_SLUGS = {}; export const COMPOSIO_TOOLKITS = {}; export const createComposioClient = () => { globalThis.__privilegedRoutePermissionTest.sideEffects += 1; }; export const getComposioProviderBySlug = () => null; export const getOrCreateAuthConfig = () => {};`,
  "@/lib/db/schema": `export const integration = { workspaceId: "workspaceId", provider: "provider" }; export const workflowRun = { id: "id", workspaceId: "workspaceId" };`,
  "@/lib/env/server": `export const env = {};`,
  "drizzle-orm": `export const and = (...args) => args; export const eq = (...args) => args;`,
  "@/features/workflows/progression": `export const getWorkflowProgression = () => ({ kind: "complete" });`,
};

async function loadRoute(entryPoint) {
  const compiled = await build({
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    alias: { "@": resolve("src") },
    plugins: [
      {
        name: "privileged-route-permission-test",
        setup(buildContext) {
          buildContext.onResolve({ filter: /^(next\/server|drizzle-orm|@\/.*)$/ }, (args) =>
            args.path in stubs
              ? { path: args.path, namespace: "privileged-route-permission-test" }
              : undefined,
          );
          buildContext.onLoad(
            { filter: /.*/, namespace: "privileged-route-permission-test" },
            (args) => ({ contents: stubs[args.path], loader: "js" }),
          );
        },
      },
    ],
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
  );
}

const integrationRoutes = await loadRoute("src/app/api/dashboard/integrations/route.ts");
const workflowRoutes = await loadRoute("src/app/api/dashboard/workflows/route.ts");
const advanceWorkflowRoute = await loadRoute(
  "src/app/api/dashboard/workflows/[workflow_id]/advance/route.ts",
);
const agentTestRoutes = await loadRoute("src/app/api/dashboard/agent-test-cases/route.ts");

const request = new Request("https://cogni.test/api/dashboard/mutation", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});

async function expectMemberDenied(handler, args = [request]) {
  state.membershipRole = "MEMBER";
  state.sideEffects = 0;
  const response = await handler(...args);
  assert.equal(response.status, 403);
  assert.equal(state.sideEffects, 0);
}

test("members cannot create or disconnect workspace integrations", async () => {
  await expectMemberDenied(integrationRoutes.POST);
  await expectMemberDenied(integrationRoutes.DELETE, [
    new Request("https://cogni.test/api/dashboard/integrations?slug=slack", {
      method: "DELETE",
    }),
  ]);
});

test("members cannot create or advance workflows", async () => {
  await expectMemberDenied(workflowRoutes.POST);
  await expectMemberDenied(advanceWorkflowRoute.POST, [
    request,
    { params: Promise.resolve({ workflow_id: "workflow-1" }) },
  ]);
});

test("members cannot create agent evaluation cases", async () => {
  await expectMemberDenied(agentTestRoutes.POST);
});
