import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/widget/agent-timeouts.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const timeouts = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("preview waits past the model deadline and stays within the route limit", () => {
  assert.ok(timeouts.WIDGET_PREVIEW_RESPONSE_TIMEOUT_MS > timeouts.WIDGET_AGENT_RUN_TIMEOUT_MS);
  assert.equal(
    timeouts.WIDGET_PREVIEW_RESPONSE_TIMEOUT_MS - timeouts.WIDGET_AGENT_RUN_TIMEOUT_MS,
    timeouts.WIDGET_PREVIEW_RESPONSE_BUFFER_MS,
  );
  assert.ok(timeouts.WIDGET_PREVIEW_RESPONSE_TIMEOUT_MS < 60_000);
});
