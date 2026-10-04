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

test("Agent tabs use one canonical URL key and omit the default tab", () => {
  assert.equal(routes.agentHref("build"), "/agent");
  assert.equal(routes.agentHref("test"), "/agent?tab=test");
  assert.equal(routes.agentHref("customize", "#knowledge"), "/agent?tab=customize#knowledge");
});

test("legacy Agent tab names map into the current four tabs", () => {
  assert.equal(routes.resolveAgentTab("appearance"), "customize");
  assert.equal(routes.resolveAgentTab("installation"), "deploy");
  assert.equal(routes.resolveAgentTab("test"), "test");
  assert.equal(routes.resolveAgentTab("unknown"), "build");
});

test("Agent redirects old tab parameters to one canonical tab key", () => {
  assert.equal(
    routes.canonicalAgentPath({ subtab: "appearance", view: "open", tag: ["billing", "urgent"] }),
    "/agent?view=open&tag=billing&tag=urgent&tab=customize",
  );
  assert.equal(
    routes.canonicalAgentPath({ section: "build", source: "setup" }),
    "/agent?source=setup",
  );
  assert.equal(routes.canonicalAgentPath({ section: "invalid" }), "/agent");
  assert.equal(routes.canonicalAgentPath({ tab: "build" }), "/agent");
  assert.equal(routes.canonicalAgentPath({ tab: ["test", "deploy"] }), "/agent?tab=test");
  assert.equal(routes.canonicalAgentPath({ subtab: "test" }).includes("subtab="), false);
  assert.equal(routes.canonicalAgentPath({ section: "test" }).includes("section="), false);
});

test("legacy page redirects preserve repeated search parameters", () => {
  assert.equal(
    routes.queryStringFromSearchParams({ range: "30d", label: ["billing", "urgent"] }),
    "range=30d&label=billing&label=urgent",
  );
});
