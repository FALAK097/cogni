import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/navigation/app-routes.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const routes = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("primary labels resolve to matching canonical page URLs", () => {
  assert.deepEqual(routes.APP_ROUTES, {
    inbox: "/inbox",
    agent: "/agent",
    insights: "/insights",
    settings: "/settings",
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(routes.APP_PAGES).map(([key, page]) => [key, page.href])),
    routes.APP_ROUTES,
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(routes.APP_PAGES).map(([key, page]) => [key, page.label])),
    { inbox: "Inbox", agent: "Agent", insights: "Insights", settings: "Settings" },
  );
});

test("Agent stays on one canonical page while preserving useful section anchors", () => {
  assert.equal(routes.agentHref(), "/agent");
  assert.equal(routes.agentHref("#knowledge"), "/agent#knowledge");
  assert.deepEqual(routes.AGENT_TABS, ["build", "test", "deploy"]);
});

test("legacy page redirects preserve repeated search parameters", () => {
  assert.equal(
    routes.queryStringFromSearchParams({ range: "30d", label: ["billing", "urgent"] }),
    "range=30d&label=billing&label=urgent",
  );
});
