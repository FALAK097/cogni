import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/widget/widget-settings-state.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { getWidgetSettingsLoadState } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("agent settings show a skeleton while the first request loads", () => {
  assert.equal(getWidgetSettingsLoadState({ hasData: false, isError: false }), "loading");
});

test("agent settings show a blocking recovery state when the first request fails", () => {
  assert.equal(getWidgetSettingsLoadState({ hasData: false, isError: true }), "error");
});

test("agent settings retain cached data when a background refresh fails", () => {
  assert.equal(getWidgetSettingsLoadState({ hasData: true, isError: true }), "stale-error");
});

test("agent settings are ready when data loads successfully", () => {
  assert.equal(getWidgetSettingsLoadState({ hasData: true, isError: false }), "ready");
});
