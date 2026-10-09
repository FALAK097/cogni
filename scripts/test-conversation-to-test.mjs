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

const { agentTestCaseInputSchema, buildAgentTestCaseFromQuestion } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("buildAgentTestCaseFromQuestion builds a valid case from a raw question", () => {
  const result = buildAgentTestCaseFromQuestion("Can I get a refund after 30 days?");
  assert.equal(result.title, "Can I get a refund after 30 days?");
  assert.equal(result.prompt, "Can I get a refund after 30 days?");
  assert.equal(result.expectedOutcome, "grounded_answer");
  assert.deepEqual(result.expectedSourceIds, []);
  assert.equal(agentTestCaseInputSchema.safeParse(result).success, true);
});

test("buildAgentTestCaseFromQuestion truncates long titles cleanly with ellipsis", () => {
  const veryLongQuestion =
    "What is the exact return policy when an item was purchased on a discount during black friday but arrived damaged?";
  const result = buildAgentTestCaseFromQuestion(veryLongQuestion);
  assert.equal(result.title.length <= 80, true);
  assert.equal(result.title.endsWith("…"), true);
  assert.equal(agentTestCaseInputSchema.safeParse(result).success, true);
});

test("buildAgentTestCaseFromQuestion limits expected sources to 4 unique IDs and only for grounded answers", () => {
  const source1 = "00000000-0000-4000-8000-000000000001";
  const source2 = "00000000-0000-4000-8000-000000000002";
  const source3 = "00000000-0000-4000-8000-000000000003";
  const source4 = "00000000-0000-4000-8000-000000000004";
  const source5 = "00000000-0000-4000-8000-000000000005";

  const grounded = buildAgentTestCaseFromQuestion("Question", {
    expectedOutcome: "grounded_answer",
    expectedSourceIds: [source1, source2, source3, source4, source5, source1],
  });
  assert.equal(grounded.expectedSourceIds.length, 4);
  assert.deepEqual(grounded.expectedSourceIds, [source1, source2, source3, source4]);
  assert.equal(agentTestCaseInputSchema.safeParse(grounded).success, true);

  const handoff = buildAgentTestCaseFromQuestion("Question", {
    expectedOutcome: "human_handoff",
    expectedSourceIds: [source1, source2],
  });
  assert.deepEqual(handoff.expectedSourceIds, []);
  assert.equal(agentTestCaseInputSchema.safeParse(handoff).success, true);

  const noEvidence = buildAgentTestCaseFromQuestion("Question", {
    expectedOutcome: "no_evidence",
    expectedSourceIds: [source1],
  });
  assert.deepEqual(noEvidence.expectedSourceIds, []);
  assert.equal(agentTestCaseInputSchema.safeParse(noEvidence).success, true);
});

test("buildAgentTestCaseFromQuestion uses fallback title when input question is empty whitespace", () => {
  const result = buildAgentTestCaseFromQuestion("   ");
  assert.equal(result.title, "Customer question");
  assert.equal(result.prompt, "");
});
