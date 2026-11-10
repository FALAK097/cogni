import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

globalThis.__widgetPublishRouteTest = {
  membershipRole: "MEMBER",
  publishCalls: 0,
  configReads: 0,
  publishResult: { ok: true, widget: { id: "widget-1" } },
  requireDashboardContext: async () => ({
    db: { testDatabase: true },
    workspace: { id: "workspace-1" },
    membership: { role: globalThis.__widgetPublishRouteTest.membershipRole },
    session: { user: { id: "owner-1" } },
  }),
  publishWidgetDraft: async (db, workspaceId, userId, restoreVersion) => {
    assert.equal(db.testDatabase, true);
    assert.equal(workspaceId, "workspace-1");
    assert.equal(userId, "owner-1");
    globalThis.__widgetPublishRouteTest.publishCalls += 1;
    globalThis.__widgetPublishRouteTest.restoreVersion = restoreVersion;
    return globalThis.__widgetPublishRouteTest.publishResult;
  },
  ensureWorkspaceWidget: async (db, workspaceId) => {
    assert.equal(db.testDatabase, true);
    assert.equal(workspaceId, "workspace-1");
    globalThis.__widgetPublishRouteTest.configReads += 1;
    return { id: "widget-1" };
  },
  getWidgetPublicationStatus: async () => ({
    current: { version: 2 },
    versions: [],
    hasUnpublishedChanges: false,
  }),
  toWidgetSettings: () => ({ displayName: "Support agent", authorizedDomains: [] }),
};

const compiled = await build({
  entryPoints: ["src/app/api/dashboard/widget/publish/route.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "widget-publish-route-test",
      setup(buildContext) {
        const stubs = {
          "next/server":
            'export const NextResponse = { json: (value, init = {}) => new Response(JSON.stringify(value), { ...init, headers: { "content-type": "application/json", ...init.headers } }) };',
          "@/lib/auth/dashboard-context":
            "export const requireDashboardContext = () => globalThis.__widgetPublishRouteTest.requireDashboardContext();",
          "@/features/widget/server/widget-publication-service":
            "export const publishWidgetDraft = (...args) => globalThis.__widgetPublishRouteTest.publishWidgetDraft(...args);",
          "@/features/widget/server/widget-service":
            "export const ensureWorkspaceWidget = (...args) => globalThis.__widgetPublishRouteTest.ensureWorkspaceWidget(...args); export const getWidgetPublicationStatus = (...args) => globalThis.__widgetPublishRouteTest.getWidgetPublicationStatus(...args); export const toWidgetSettings = (...args) => globalThis.__widgetPublishRouteTest.toWidgetSettings(...args);",
        };
        buildContext.onResolve(
          {
            filter:
              /^(next\/server|@\/(lib\/auth\/dashboard-context|features\/widget\/server\/(widget-publication-service|widget-service)))$/,
          },
          (args) => ({ path: args.path, namespace: "widget-publish-route-test" }),
        );
        buildContext.onLoad({ filter: /.*/, namespace: "widget-publish-route-test" }, (args) => ({
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

function publishRequest(body = {}) {
  return new Request("https://cogni.test/api/dashboard/widget/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("workspace members cannot publish and denied requests have no publish side effects", async () => {
  const state = globalThis.__widgetPublishRouteTest;
  state.membershipRole = "MEMBER";
  state.publishCalls = 0;
  state.configReads = 0;

  const response = await route.POST(publishRequest());

  assert.equal(response.status, 403);
  assert.equal(state.publishCalls, 0);
  assert.equal(state.configReads, 0);
});

test("owners can restore an earlier version and receive the updated deployment state", async () => {
  const state = globalThis.__widgetPublishRouteTest;
  state.membershipRole = "OWNER";
  state.publishCalls = 0;
  state.configReads = 0;
  state.publishResult = { ok: true, widget: { id: "widget-1" } };

  const response = await route.POST(publishRequest({ restoreVersion: 1 }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(state.publishCalls, 1);
  assert.equal(state.restoreVersion, 1);
  assert.equal(state.configReads, 1);
  assert.equal(payload.agentName, "Support agent");
  assert.equal(payload.publication.current.version, 2);
});

test("owners cannot send unknown publish fields", async () => {
  const state = globalThis.__widgetPublishRouteTest;
  state.membershipRole = "OWNER";
  state.publishCalls = 0;

  const response = await route.POST(publishRequest({ workspaceId: "foreign-workspace" }));

  assert.equal(response.status, 400);
  assert.equal(state.publishCalls, 0);
});
