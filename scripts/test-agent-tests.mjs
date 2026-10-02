import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/agent-tests/input.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { agentTestCaseInputSchema, matchesAgentTestOutcome } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("agent test cases enforce concise, bounded user input", () => {
  assert.equal(
    agentTestCaseInputSchema.safeParse({
      title: "  Billing answer  ",
      prompt: "  How do I update billing?  ",
      expectedOutcome: "grounded_answer",
    }).success,
    true,
  );
  assert.equal(
    agentTestCaseInputSchema.safeParse({
      title: " ",
      prompt: "x".repeat(1_001),
      expectedOutcome: "other",
    }).success,
    false,
  );
});

test("saved test expectations match only the observed preview evidence", () => {
  assert.equal(
    matchesAgentTestOutcome("grounded_answer", { outcome: "answer", grounded: true }),
    true,
  );
  assert.equal(
    matchesAgentTestOutcome("no_evidence", { outcome: "answer", grounded: false }),
    true,
  );
  assert.equal(
    matchesAgentTestOutcome("human_handoff", { outcome: "handoff", grounded: false }),
    true,
  );
  assert.equal(
    matchesAgentTestOutcome("grounded_answer", { outcome: "error", grounded: false }),
    false,
  );
  assert.equal(
    matchesAgentTestOutcome("no_evidence", { outcome: "answer", grounded: true }),
    false,
  );
});
