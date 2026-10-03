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
const suiteCompiled = await build({
  entryPoints: ["src/features/agent-tests/run-suite.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { runAgentTestSuite } = await import(
  `data:text/javascript;base64,${Buffer.from(suiteCompiled.outputFiles[0].text).toString("base64")}`
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

test("saved test suites reset the preview before every prompt and keep running after mismatches", async () => {
  const order = [];
  const results = await runAgentTestSuite(
    [
      { id: "grounded", title: "grounded", prompt: "billing", expectedOutcome: "grounded_answer" },
      {
        id: "no-evidence",
        title: "no-evidence",
        prompt: "unsupported",
        expectedOutcome: "no_evidence",
      },
      { id: "handoff", title: "handoff", prompt: "human", expectedOutcome: "human_handoff" },
    ],
    {
      resetPreview: async () => {
        order.push("reset");
        return true;
      },
      runPrompt: async (testCase) => {
        order.push(`run:${testCase.id}`);
        if (testCase.id === "grounded") return { outcome: "answer", grounded: true };
        if (testCase.id === "no-evidence") return { outcome: "answer", grounded: true };
        return { outcome: "handoff", grounded: false };
      },
    },
  );

  assert.deepEqual(order, [
    "reset",
    "run:grounded",
    "reset",
    "run:no-evidence",
    "reset",
    "run:handoff",
  ]);
  assert.deepEqual(
    results.map(({ id, status }) => [id, status]),
    [
      ["grounded", "passed"],
      ["no-evidence", "mismatch"],
      ["handoff", "passed"],
    ],
  );
});

test("a failed preview reset marks later checks not run without sending their prompts", async () => {
  const sentPrompts = [];
  const results = await runAgentTestSuite(
    [
      { id: "first", title: "first", prompt: "one", expectedOutcome: "grounded_answer" },
      { id: "second", title: "second", prompt: "two", expectedOutcome: "grounded_answer" },
      { id: "third", title: "third", prompt: "three", expectedOutcome: "grounded_answer" },
    ],
    {
      resetPreview: async () => sentPrompts.length === 0,
      runPrompt: async (testCase) => {
        sentPrompts.push(testCase.prompt);
        return { outcome: "answer", grounded: true };
      },
    },
  );

  assert.deepEqual(sentPrompts, ["one"]);
  assert.deepEqual(
    results.map(({ id, status }) => [id, status]),
    [
      ["first", "passed"],
      ["second", "error"],
      ["third", "not_run"],
    ],
  );
});
