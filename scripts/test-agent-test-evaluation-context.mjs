import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const compiled = await build({
  entryPoints: ["src/features/agent-tests/evaluation-context.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
});
const { resolveAgentTestModelIdentity, resolveAgentTestPublishCandidateIdentity } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

const widget = {
  id: "widget-id",
  updatedAt: "2026-10-27T12:00:00.000Z",
  modelProvider: "OPENAI",
  modelName: "gpt-4o-mini",
};

test("evaluation context records the effective model override", () => {
  const resolved = resolveAgentTestModelIdentity(widget, {
    provider: "GOOGLE",
    modelName: "gemini-2.5-flash",
  });
  assert.equal(resolved.modelProvider, "GOOGLE");
  assert.equal(resolved.modelName, "gemini-2.5-flash");
  assert.match(resolved.configFingerprint, /^[a-f0-9]{64}$/);
});

test("draft edits and effective model changes produce a different opaque fingerprint", () => {
  const original = resolveAgentTestModelIdentity(widget, {});
  const edited = resolveAgentTestModelIdentity(
    { ...widget, updatedAt: "2026-10-27T12:01:00.000Z" },
    {},
  );
  const overridden = resolveAgentTestModelIdentity(widget, { modelName: "gpt-4.1-mini" });
  assert.notEqual(original.configFingerprint, edited.configFingerprint);
  assert.notEqual(original.configFingerprint, overridden.configFingerprint);
  assert.equal("instructions" in original, false);
});

test("publish candidate fingerprint binds the full config even when timestamps match", () => {
  const config = {
    instructions: "Answer clearly.",
    modelProvider: "OPENAI",
    modelName: "gpt-4o-mini",
  };
  const original = resolveAgentTestPublishCandidateIdentity({ widgetId: widget.id, config }, {});
  const edited = resolveAgentTestPublishCandidateIdentity(
    { widgetId: widget.id, config: { ...config, instructions: "Use concise answers." } },
    {},
  );

  assert.notEqual(original.configFingerprint, edited.configFingerprint);
  assert.equal("instructions" in original, false);
});
