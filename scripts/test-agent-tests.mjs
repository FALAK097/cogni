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
const {
  agentTestCaseInputSchema,
  agentTestRunInputSchema,
  getAgentTestSuiteVersion,
  matchesAgentTestOutcome,
  summarizeAgentTestRun,
} = await import(
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
const isolatedRunCompiled = await build({
  entryPoints: ["src/features/agent-tests/run-case.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { runAgentTestCase } = await import(
  `data:text/javascript;base64,${Buffer.from(isolatedRunCompiled.outputFiles[0].text).toString("base64")}`
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

test("saved test run summaries keep errors and checks not run out of the pass-rate denominator", () => {
  const results = [
    { id: "00000000-0000-4000-8000-000000000001", status: "passed" },
    { id: "00000000-0000-4000-8000-000000000002", status: "mismatch" },
    { id: "00000000-0000-4000-8000-000000000003", status: "error" },
    { id: "00000000-0000-4000-8000-000000000004", status: "not_run" },
  ];
  const parsed = agentTestRunInputSchema.safeParse({
    runId: "00000000-0000-4000-8000-000000000005",
    suiteVersion: "[]",
    results,
  });

  assert.equal(parsed.success, true);
  assert.deepEqual(summarizeAgentTestRun(results), {
    caseCount: 4,
    passedCount: 1,
    mismatchCount: 1,
    errorCount: 1,
    notRunCount: 1,
  });
  assert.equal(
    agentTestRunInputSchema.safeParse({
      runId: "00000000-0000-4000-8000-000000000005",
      suiteVersion: "[]",
      results: [results[0], results[0]],
    }).success,
    false,
  );
  assert.equal(
    getAgentTestSuiteVersion([
      { id: "case-b", updatedAt: "2026-10-07T12:00:00.000Z" },
      { id: "case-a", updatedAt: "2026-10-07T12:00:00.000Z" },
    ]),
    getAgentTestSuiteVersion([
      { id: "case-a", updatedAt: "2026-10-07T12:00:00.000Z" },
      { id: "case-b", updatedAt: "2026-10-07T12:00:00.000Z" },
    ]),
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

test("saved agent test runs reset the preview before sending the prompt", async () => {
  const order = [];
  const result = await runAgentTestCase({
    resetPreview: async () => {
      order.push("reset");
      return true;
    },
    runPrompt: async () => {
      order.push("run");
      return { outcome: "answer", grounded: true };
    },
    isErrorResult: (evidence) => evidence.outcome === "error",
  });

  assert.deepEqual(order, ["reset", "run"]);
  assert.deepEqual(result, {
    status: "completed",
    evidence: { outcome: "answer", grounded: true },
  });
});

test("a failed preview reset does not send the saved test prompt", async () => {
  let promptSent = false;
  const result = await runAgentTestCase({
    resetPreview: async () => false,
    runPrompt: async () => {
      promptSent = true;
      return { outcome: "answer", grounded: true };
    },
    isErrorResult: (evidence) => evidence.outcome === "error",
  });

  assert.equal(promptSent, false);
  assert.deepEqual(result, { status: "reset_failed" });
});

test("failed and thrown preview results remain retryable errors", async () => {
  const errorResult = await runAgentTestCase({
    resetPreview: async () => true,
    runPrompt: async () => ({ outcome: "error", grounded: false }),
    isErrorResult: (evidence) => evidence.outcome === "error",
  });
  const thrownResult = await runAgentTestCase({
    resetPreview: async () => true,
    runPrompt: async () => {
      throw new Error("private provider details");
    },
    isErrorResult: (evidence) => evidence.outcome === "error",
  });

  assert.deepEqual(errorResult, { status: "run_failed" });
  assert.deepEqual(thrownResult, { status: "run_failed" });
});

test("required sources reject unrelated or title-only evidence and require every selected source", () => {
  const outcome = "grounded_answer";
  assert.equal(
    matchesAgentTestOutcome(
      outcome,
      { outcome: "answer", grounded: true, sources: [{ documentId: "wrong" }] },
      ["policy"],
    ),
    false,
  );
  assert.equal(
    matchesAgentTestOutcome(outcome, { outcome: "answer", grounded: true, sources: [{}] }, [
      "policy",
    ]),
    false,
  );
  assert.equal(
    matchesAgentTestOutcome(
      outcome,
      { outcome: "answer", grounded: true, sources: [{ documentId: "policy" }] },
      ["policy", "billing"],
    ),
    false,
  );
  assert.equal(
    matchesAgentTestOutcome(
      outcome,
      {
        outcome: "answer",
        grounded: true,
        sources: [{ documentId: "policy" }, { documentId: "billing" }, { documentId: "extra" }],
      },
      ["policy", "billing"],
    ),
    true,
  );
  assert.equal(
    matchesAgentTestOutcome(outcome, { outcome: "handoff", grounded: false }, ["policy"]),
    false,
  );
});

test("expected source annotations are bounded, distinct UUIDs and apply only to retrieval checks", () => {
  const base = { title: "Sources", prompt: "Policy?", expectedOutcome: "grounded_answer" };
  const id = "00000000-0000-4000-8000-000000000021";
  assert.deepEqual(agentTestCaseInputSchema.parse(base).expectedSourceIds, []);
  assert.equal(
    agentTestCaseInputSchema.safeParse({ ...base, expectedSourceIds: [id] }).success,
    true,
  );
  for (const expectedSourceIds of [
    [id, id],
    ["not-an-id"],
    Array.from(
      { length: 5 },
      (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    ),
  ]) {
    assert.equal(agentTestCaseInputSchema.safeParse({ ...base, expectedSourceIds }).success, false);
  }
  for (const expectedOutcome of ["no_evidence", "human_handoff"])
    assert.equal(
      agentTestCaseInputSchema.safeParse({ ...base, expectedOutcome, expectedSourceIds: [id] })
        .success,
      false,
    );
});

test("suite evaluation uses required source IDs rather than any-source grounding", async () => {
  const cases = [
    {
      id: "check",
      title: "Billing",
      prompt: "Billing?",
      expectedOutcome: "grounded_answer",
      expectedSourceIds: ["billing"],
    },
  ];
  const mismatch = await runAgentTestSuite(cases, {
    resetPreview: async () => true,
    runPrompt: async () => ({
      outcome: "answer",
      grounded: true,
      sources: [{ documentId: "unrelated" }],
    }),
  });
  assert.equal(mismatch[0].status, "mismatch");
  const passed = await runAgentTestSuite(cases, {
    resetPreview: async () => true,
    runPrompt: async () => ({
      outcome: "answer",
      grounded: true,
      sources: [{ documentId: "billing" }],
    }),
  });
  assert.equal(passed[0].status, "passed");
});
