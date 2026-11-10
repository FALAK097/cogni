import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/integrations/action-recovery.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const recovery = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { getActionExecutionDecision, getActionStatusForDisplay } = recovery;

test("action recovery reuses completed work and blocks in-flight or uncertain writes", () => {
  assert.equal(getActionExecutionDecision(null, "SLACK"), "START");
  assert.equal(getActionExecutionDecision("COMPLETED", "SLACK"), "RETURN_COMPLETED");
  assert.equal(getActionExecutionDecision("PENDING", "SLACK"), "BLOCK_RUNNING");
  assert.equal(getActionExecutionDecision("RUNNING", "SLACK"), "BLOCK_RUNNING");
  assert.equal(getActionExecutionDecision("UNKNOWN", "SLACK"), "RECONCILE_UNKNOWN");
});

test("only idempotent or confirmed-not-sent failures are retryable", () => {
  assert.equal(getActionExecutionDecision("FAILED", "INTERNAL"), "RETRY_FAILED");
  assert.equal(
    getActionExecutionDecision("FAILED", "INTERNAL", "conversation.note"),
    "RECONCILE_UNKNOWN",
  );
  assert.equal(
    getActionExecutionDecision("FAILED", "INTERNAL", "conversation.assign"),
    "RETRY_FAILED",
  );
  assert.equal(getActionExecutionDecision("FAILED", "RESEND"), "RETRY_FAILED");
  assert.equal(getActionExecutionDecision("NOT_SENT", "SLACK"), "RETRY_NOT_SENT");
  assert.equal(getActionExecutionDecision("FAILED", "SLACK"), "RECONCILE_UNKNOWN");
  assert.equal(getActionExecutionDecision("FAILED", "GOOGLE_CALENDAR"), "RECONCILE_UNKNOWN");
});

test("legacy external failures are displayed as uncertain outcomes", () => {
  assert.equal(getActionStatusForDisplay("FAILED", "SLACK"), "UNKNOWN");
  assert.equal(getActionStatusForDisplay("FAILED", "INTERNAL", "conversation.note"), "UNKNOWN");
  assert.equal(getActionStatusForDisplay("FAILED", "GOOGLE_CALENDAR"), "UNKNOWN");
  assert.equal(getActionStatusForDisplay("FAILED", "RESEND"), "FAILED");
  assert.equal(getActionStatusForDisplay("NOT_SENT", "SLACK"), "NOT_SENT");
});
