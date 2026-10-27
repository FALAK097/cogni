import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { createHash, createHmac } from "node:crypto";
import { resolve } from "node:path";

const state = {
  savedCases: [],
  records: new Map(),
  caseWhere: null,
  historyWhere: null,
  insertCount: 0,
  revisions: [],
};
const testSecret = "test-better-auth-secret-with-at-least-32-characters";
globalThis.__agentTestRunStorageState = state;

const stubs = {
  "server-only": "",
  "drizzle-orm": `
    export const eq = (field, value) => ({ op: "eq", field, value });
    export const and = (...conditions) => ({ op: "and", conditions });
    export const gte = (field, value) => ({ op: "gte", field, value });
    export const lt = (field, value) => ({ op: "lt", field, value });
    export const inArray = (field, values) => ({ op: "inArray", field, values });
    export const asc = (field) => ({ op: "asc", field });
    export const desc = (field) => ({ op: "desc", field });
  `,
  "@/lib/db/client": `export const getDb = () => globalThis.__agentTestRunStorageState.db;`,
  "@/lib/env/server": `export const env = { BETTER_AUTH_SECRET: "${testSecret}" };`,
  "@/lib/db/schema": `
    export const agentTestCase = { workspaceId: "case.workspaceId", id: "case.id" };
    export const agentTestRun = {
      id: "run.id", resultDigest: "run.resultDigest", suiteDigest: "run.suiteDigest", evaluationContext: "run.evaluationContext", workspaceId: "run.workspaceId",
      createdAt: "run.createdAt", caseCount: "run.caseCount", passedCount: "run.passedCount",
      mismatchCount: "run.mismatchCount", errorCount: "run.errorCount", notRunCount: "run.notRunCount",
    };
    export const documentRevision = { id: "revision.id", documentId: "revision.documentId", revisionNumber: "revision.revisionNumber", workspaceId: "revision.workspaceId" };
  `,
};

function signEvidence({
  runId = "run-1",
  caseId = "case-1",
  prompt = "Private test prompt",
  modelProvider = "GOOGLE",
  modelName = "gemini-2.0-flash",
  configFingerprint = "a".repeat(64),
  sources = [],
} = {}) {
  const canonicalSources = [...sources].sort((left, right) =>
    left.documentId.localeCompare(right.documentId),
  );
  const payload = {
    runId,
    caseId,
    workspaceId: "workspace-a",
    prompt,
    outcome: "answer",
    grounded: sources.length > 0,
    modelProvider,
    modelName,
    configFingerprint,
    sources: canonicalSources,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${createHmac("sha256", testSecret).update(encoded).digest("base64url")}`;
}

function findCondition(condition, op, field) {
  if (!condition || typeof condition !== "object") return null;
  if (condition.op === op && condition.field === field) return condition;
  for (const child of condition.conditions ?? []) {
    const found = findCondition(child, op, field);
    if (found) return found;
  }
  return null;
}

function makeDb() {
  return {
    query: {
      agentTestCase: {
        async findMany({ where }) {
          state.caseWhere = where;
          const workspaceId = findCondition(where, "eq", "case.workspaceId")?.value;
          return state.savedCases.filter((testCase) => testCase.workspaceId === workspaceId);
        },
      },
      agentTestRun: {
        async findFirst({ where }) {
          const id = findCondition(where, "eq", "run.id")?.value;
          const workspaceId = findCondition(where, "eq", "run.workspaceId")?.value;
          if (id === undefined) {
            return [...state.records.values()].find((record) => record.workspaceId === workspaceId);
          }
          const record = state.records.get(id);
          return record?.workspaceId === workspaceId ? record : undefined;
        },
      },
      documentRevision: {
        async findMany({ where }) {
          const workspaceId = findCondition(where, "eq", "revision.workspaceId")?.value;
          const ids = findCondition(where, "inArray", "revision.id")?.values ?? [];
          return state.revisions.filter(
            (revision) => revision.workspaceId === workspaceId && ids.includes(revision.id),
          );
        },
      },
    },
    insert() {
      return {
        values(value) {
          return {
            onConflictDoNothing() {
              return {
                async returning() {
                  if (state.records.has(value.id)) return [];
                  state.insertCount += 1;
                  state.records.set(value.id, {
                    ...value,
                    createdAt: "2026-10-07T12:00:00.000Z",
                  });
                  return [{ id: value.id }];
                },
              };
            },
          };
        },
      };
    },
    select() {
      return {
        from() {
          return {
            where(condition) {
              state.historyWhere = condition;
              return {
                orderBy() {
                  return {
                    async limit(limit) {
                      const workspaceId = findCondition(condition, "eq", "run.workspaceId")?.value;
                      return [...state.records.values()]
                        .filter((record) => record.workspaceId === workspaceId)
                        .filter(
                          (record) =>
                            record.createdAt >=
                              findCondition(condition, "gte", "run.createdAt").value &&
                            record.createdAt <
                              findCondition(condition, "lt", "run.createdAt").value,
                        )
                        .sort(
                          (a, b) =>
                            b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
                        )
                        .slice(0, limit)
                        .map(
                          ({
                            id,
                            createdAt,
                            suiteDigest = null,
                            evaluationContext = null,
                            caseCount,
                            passedCount,
                            mismatchCount,
                            errorCount,
                            notRunCount,
                          }) => ({
                            id,
                            createdAt,
                            suiteDigest,
                            evaluationContext,
                            caseCount,
                            passedCount,
                            mismatchCount,
                            errorCount,
                            notRunCount,
                          }),
                        );
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

const compiled = await build({
  entryPoints: ["src/features/agent-tests/server/runs.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "agent-test-run-storage-test",
      setup(context) {
        context.onResolve({ filter: /^(server-only|drizzle-orm|@\/.*)$/ }, (args) =>
          args.path in stubs
            ? { path: args.path, namespace: "agent-test-run-storage-test" }
            : undefined,
        );
        context.onLoad({ filter: /.*/, namespace: "agent-test-run-storage-test" }, (args) => ({
          contents: stubs[args.path],
          loader: "js",
        }));
      },
    },
  ],
});
const {
  AgentTestRunConflictError,
  AgentTestSuiteChangedError,
  hasAgentTestRuns,
  listAgentTestRuns,
  recordAgentTestRun,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function reset() {
  state.savedCases = [
    {
      id: "case-1",
      updatedAt: "2026-10-07T12:00:00.000Z",
      prompt: "Private test prompt",
      workspaceId: "workspace-a",
      expectedOutcome: "grounded_answer",
      expectedSourceIds: [],
    },
    {
      id: "case-2",
      updatedAt: "2026-10-07T12:00:00.000Z",
      prompt: "Private test prompt",
      workspaceId: "workspace-a",
      expectedOutcome: "human_handoff",
      expectedSourceIds: [],
    },
  ];
  state.records = new Map();
  state.caseWhere = null;
  state.historyWhere = null;
  state.insertCount = 0;
  state.revisions = [];
  state.db = makeDb();
}

const runInput = {
  runId: "run-1",
  suiteVersion: JSON.stringify([
    ["case-1", "2026-10-07T12:00:00.000Z"],
    ["case-2", "2026-10-07T12:00:00.000Z"],
  ]),
  results: [
    { id: "case-1", status: "passed" },
    { id: "case-2", status: "error" },
  ],
};

test("run persistence verifies cases in the active workspace and stores aggregate-only data", async () => {
  reset();
  const saved = await recordAgentTestRun("workspace-a", "member-a", runInput, state.db);
  const row = state.records.get("run-1");

  assert.deepEqual(saved, {
    id: "run-1",
    caseCount: 2,
    passedCount: 0,
    mismatchCount: 0,
    errorCount: 2,
    notRunCount: 0,
  });
  assert.deepEqual(state.caseWhere, { op: "eq", field: "case.workspaceId", value: "workspace-a" });
  assert.equal(row.workspaceId, "workspace-a");
  assert.equal(row.createdByMembershipId, "member-a");
  assert.equal("results" in row, false);
  assert.equal("prompt" in row, false);
  assert.equal("transcript" in row, false);
  assert.equal("resultDigest" in row, true);
  assert.match(row.suiteDigest, /^[a-f0-9]{64}$/);
  assert.equal("suiteVersion" in row, false);
  assert.equal(row.evaluationContext, null);
  const canonicalDigest = createHash("sha256")
    .update(
      JSON.stringify({
        suiteVersion: runInput.suiteVersion,
        results: runInput.results
          .map(({ id }) => ({ id, status: "error" }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest("hex");
  assert.equal(row.resultDigest, canonicalDigest);
});

test("signed evidence overrides forged client metadata and stores only scoped source revisions", async () => {
  reset();
  const documentId = "00000000-0000-4000-8000-000000000001";
  const revisionId = "00000000-0000-4000-8000-000000000002";
  state.revisions.push({
    id: revisionId,
    documentId,
    revisionNumber: 3,
    workspaceId: "workspace-a",
  });
  const input = {
    ...runInput,
    results: runInput.results.map((result) => ({
      ...result,
      modelProvider: "OPENAI",
      modelName: "forged-model",
      configFingerprint: "f".repeat(64),
      sources: [
        {
          documentId: "00000000-0000-4000-8000-000000000009",
          revisionId: null,
          revisionNumber: null,
        },
      ],
      signedEvidence: signEvidence({
        caseId: result.id,
        configFingerprint: "a".repeat(64),
        sources: [{ documentId, revisionId, revisionNumber: 3 }],
      }),
    })),
  };
  await recordAgentTestRun("workspace-a", "member-a", input, state.db);
  const context = state.records.get("run-1").evaluationContext;
  assert.equal(context.modelProvider, "GOOGLE");
  assert.equal(context.modelName, "gemini-2.0-flash");
  assert.equal(context.configFingerprint, "a".repeat(64));
  assert.deepEqual(context.cases[0].sources, [{ documentId, revisionId, revisionNumber: 3 }]);
  assert.equal(JSON.stringify(context).includes("prompt"), false);
  assert.equal(JSON.stringify(context).includes("title"), false);
  assert.equal(JSON.stringify(context).includes("content"), false);
  assert.equal(JSON.stringify(context).includes("secret"), false);
});

test("signed evidence recomputes forged mismatch statuses and aggregate digest", async () => {
  reset();
  const documentId = "00000000-0000-4000-8000-000000000001";
  const input = {
    ...runInput,
    results: runInput.results.map((result) => ({
      ...result,
      status: "mismatch",
      modelProvider: "GOOGLE",
      modelName: "gemini-2.0-flash",
      configFingerprint: "a".repeat(64),
      sources:
        result.id === "case-1" ? [{ documentId, revisionId: null, revisionNumber: null }] : [],
      signedEvidence: signEvidence({
        caseId: result.id,
        sources:
          result.id === "case-1" ? [{ documentId, revisionId: null, revisionNumber: null }] : [],
      }),
    })),
  };

  const saved = await recordAgentTestRun("workspace-a", "member-a", input, state.db);
  const row = state.records.get("run-1");
  assert.deepEqual(saved, {
    id: "run-1",
    caseCount: 2,
    passedCount: 1,
    mismatchCount: 1,
    errorCount: 0,
    notRunCount: 0,
  });
  assert.deepEqual(
    row.evaluationContext.cases.map(({ id, status }) => ({ id, status })),
    [
      { id: "case-1", status: "passed" },
      { id: "case-2", status: "mismatch" },
    ],
  );
  const expectedDigest = createHash("sha256")
    .update(
      JSON.stringify({
        suiteVersion: input.suiteVersion,
        results: [
          { id: "case-1", status: "passed" },
          { id: "case-2", status: "mismatch" },
        ],
        evaluationContext: row.evaluationContext,
      }),
    )
    .digest("hex");
  assert.equal(row.resultDigest, expectedDigest);
});

test("missing signed evidence classifies forged mismatches as errors", async () => {
  reset();
  const input = {
    ...runInput,
    results: runInput.results.map((result) => ({ ...result, status: "mismatch" })),
  };

  const saved = await recordAgentTestRun("workspace-a", "member-a", input, state.db);
  assert.equal(state.records.get("run-1").evaluationContext, null);
  assert.deepEqual(saved, {
    id: "run-1",
    caseCount: 2,
    passedCount: 0,
    mismatchCount: 0,
    errorCount: 2,
    notRunCount: 0,
  });
});

test("signed preview evidence cannot be replayed for another run or case", async () => {
  reset();
  const replayedAcrossRuns = {
    ...runInput,
    runId: "run-2",
    results: [
      {
        id: "case-1",
        status: "mismatch",
        signedEvidence: signEvidence({ caseId: "case-1" }),
      },
      { id: "case-2", status: "mismatch" },
    ],
  };
  const runResult = await recordAgentTestRun(
    "workspace-a",
    "member-a",
    replayedAcrossRuns,
    state.db,
  );
  assert.equal(state.records.get("run-2").evaluationContext, null);
  assert.equal(runResult.mismatchCount, 0);
  assert.equal(runResult.errorCount, 2);

  reset();
  const replayedAcrossCases = {
    ...runInput,
    results: [
      { id: "case-1", status: "mismatch" },
      {
        id: "case-2",
        status: "mismatch",
        signedEvidence: signEvidence({ caseId: "case-1" }),
      },
    ],
  };
  const caseResult = await recordAgentTestRun(
    "workspace-a",
    "member-a",
    replayedAcrossCases,
    state.db,
  );
  assert.equal(state.records.get("run-1").evaluationContext, null);
  assert.equal(caseResult.mismatchCount, 0);
  assert.equal(caseResult.errorCount, 2);
});

test("tampered signed preview evidence cannot create evaluation context", async () => {
  reset();
  const signedEvidence = signEvidence({ modelProvider: "OPENAI", modelName: "gpt-4o-mini" });
  const input = {
    ...runInput,
    results: runInput.results.map((result) => ({
      ...result,
      status: "mismatch",
      modelProvider: "OPENAI",
      modelName: "gpt-4o-mini",
      configFingerprint: "a".repeat(64),
      sources: [],
      signedEvidence: `${signedEvidence.slice(0, -1)}x`,
    })),
  };
  const saved = await recordAgentTestRun("workspace-a", "member-a", input, state.db);
  assert.equal(state.records.get("run-1").evaluationContext, null);
  assert.deepEqual(saved, {
    id: "run-1",
    caseCount: 2,
    passedCount: 0,
    mismatchCount: 0,
    errorCount: 2,
    notRunCount: 0,
  });
  assert.equal(
    state.records.get("run-1").resultDigest,
    createHash("sha256")
      .update(
        JSON.stringify({
          suiteVersion: input.suiteVersion,
          results: input.results
            .map(({ id }) => ({ id, status: "error" }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        }),
      )
      .digest("hex"),
  );
});

test("signed preview evidence paired with a different saved prompt cannot create context", async () => {
  reset();
  state.savedCases[1].prompt = "A different saved test prompt";
  const input = {
    ...runInput,
    results: runInput.results.map((result) => ({
      ...result,
      modelProvider: "OPENAI",
      modelName: "gpt-4o-mini",
      configFingerprint: "a".repeat(64),
      sources: [],
      signedEvidence: signEvidence({
        caseId: result.id,
        prompt: "Private test prompt",
        modelProvider: "OPENAI",
        modelName: "gpt-4o-mini",
        configFingerprint: "a".repeat(64),
      }),
    })),
  };
  await recordAgentTestRun("workspace-a", "member-a", input, state.db);
  assert.equal(state.records.get("run-1").evaluationContext, null);
});

test("evaluation context is withheld when a source revision belongs to another workspace", async () => {
  reset();
  const documentId = "00000000-0000-4000-8000-000000000001";
  const revisionId = "00000000-0000-4000-8000-000000000002";
  state.revisions.push({
    id: revisionId,
    documentId,
    revisionNumber: 3,
    workspaceId: "workspace-b",
  });
  const input = {
    ...runInput,
    results: runInput.results.map((result) => ({
      ...result,
      modelProvider: "OPENAI",
      modelName: "gpt-4o-mini",
      configFingerprint: "b".repeat(64),
      sources: [{ documentId, revisionId, revisionNumber: 3 }],
      signedEvidence: signEvidence({
        caseId: result.id,
        modelProvider: "OPENAI",
        modelName: "gpt-4o-mini",
        configFingerprint: "b".repeat(64),
        sources: [{ documentId, revisionId, revisionNumber: 3 }],
      }),
    })),
  };
  await recordAgentTestRun("workspace-a", "member-a", input, state.db);
  assert.equal(state.records.get("run-1").evaluationContext, null);
});

test("evaluation context is withheld when the draft changes during the suite", async () => {
  reset();
  const input = {
    ...runInput,
    results: runInput.results.map((result, index) => ({
      ...result,
      modelProvider: "OPENAI",
      modelName: "gpt-4o-mini",
      configFingerprint: index === 0 ? "c".repeat(64) : "d".repeat(64),
      sources: [],
      signedEvidence: signEvidence({
        caseId: result.id,
        modelProvider: "OPENAI",
        modelName: "gpt-4o-mini",
        configFingerprint: index === 0 ? "c".repeat(64) : "d".repeat(64),
      }),
    })),
  };
  await recordAgentTestRun("workspace-a", "member-a", input, state.db);
  assert.equal(state.records.get("run-1").evaluationContext, null);
});

test("evaluation context retains retrieved sources without an immutable revision", async () => {
  reset();
  const input = {
    ...runInput,
    results: runInput.results.map((result) => ({
      ...result,
      modelProvider: "OPENAI",
      modelName: "gpt-4o-mini",
      configFingerprint: "e".repeat(64),
      sources: [
        {
          documentId: "00000000-0000-4000-8000-000000000001",
          revisionId: null,
          revisionNumber: null,
        },
      ],
      signedEvidence: signEvidence({
        caseId: result.id,
        modelProvider: "OPENAI",
        modelName: "gpt-4o-mini",
        configFingerprint: "e".repeat(64),
        sources: [
          {
            documentId: "00000000-0000-4000-8000-000000000001",
            revisionId: null,
            revisionNumber: null,
          },
        ],
      }),
    })),
  };
  await recordAgentTestRun("workspace-a", "member-a", input, state.db);
  assert.deepEqual(state.records.get("run-1").evaluationContext.cases[0].sources, [
    {
      documentId: "00000000-0000-4000-8000-000000000001",
      revisionId: null,
      revisionNumber: null,
    },
  ]);
});

test("run persistence rejects results for another or changed suite before writing", async () => {
  reset();
  await assert.rejects(
    recordAgentTestRun("workspace-b", "member-b", runInput, state.db),
    AgentTestSuiteChangedError,
  );
  assert.equal(state.insertCount, 0);
  assert.equal(state.records.size, 0);
});

test("editing a saved case during a run prevents recording against a different test set", async () => {
  reset();
  state.savedCases[0].updatedAt = "2026-10-07T12:01:00.000Z";
  await assert.rejects(
    recordAgentTestRun("workspace-a", "member-a", runInput, state.db),
    AgentTestSuiteChangedError,
  );
  assert.equal(state.insertCount, 0);
});

test("run IDs are idempotent and conflicting retries are rejected", async () => {
  reset();
  await recordAgentTestRun("workspace-a", "member-a", runInput, state.db);
  await recordAgentTestRun("workspace-a", "member-a", runInput, state.db);
  assert.equal(state.insertCount, 1);

  await assert.rejects(
    recordAgentTestRun(
      "workspace-a",
      "member-a",
      {
        ...runInput,
        results: [
          {
            id: "case-1",
            status: "mismatch",
            signedEvidence: signEvidence({
              sources: [
                {
                  documentId: "00000000-0000-4000-8000-000000000001",
                  revisionId: null,
                  revisionNumber: null,
                },
              ],
            }),
          },
          { id: "case-2", status: "error", signedEvidence: signEvidence({ caseId: "case-2" }) },
        ],
      },
      state.db,
    ),
    AgentTestRunConflictError,
  );
});

test("run ID is idempotent when cases and source references are reordered", async () => {
  reset();
  const firstSource = {
    documentId: "00000000-0000-4000-8000-000000000001",
    revisionId: null,
    revisionNumber: null,
  };
  const secondSource = {
    documentId: "00000000-0000-4000-8000-000000000002",
    revisionId: null,
    revisionNumber: null,
  };
  const first = {
    ...runInput,
    results: runInput.results.map((result) => ({
      ...result,
      modelProvider: "OPENAI",
      modelName: "gpt-4o-mini",
      configFingerprint: "a".repeat(64),
      sources: [firstSource, secondSource],
      signedEvidence: signEvidence({
        caseId: result.id,
        modelProvider: "OPENAI",
        modelName: "gpt-4o-mini",
        sources: [firstSource, secondSource],
      }),
    })),
  };
  const reordered = {
    ...first,
    results: [...first.results].reverse().map((result) => ({
      ...result,
      sources: [...result.sources].reverse(),
      signedEvidence: signEvidence({
        caseId: result.id,
        modelProvider: "OPENAI",
        modelName: "gpt-4o-mini",
        sources: [...result.sources].reverse(),
      }),
    })),
  };
  await recordAgentTestRun("workspace-a", "member-a", first, state.db);
  await recordAgentTestRun("workspace-a", "member-a", reordered, state.db);
  await recordAgentTestRun(
    "workspace-a",
    "member-a",
    {
      ...reordered,
      results: reordered.results.map(({ id, status, signedEvidence }) => ({
        id,
        status,
        signedEvidence,
      })),
    },
    state.db,
  );
  assert.equal(state.insertCount, 1);
});

test("run ID rejects a retry with changed but valid signed evaluation context", async () => {
  reset();
  const firstSource = {
    documentId: "00000000-0000-4000-8000-000000000001",
    revisionId: null,
    revisionNumber: null,
  };
  const secondSource = {
    documentId: "00000000-0000-4000-8000-000000000002",
    revisionId: null,
    revisionNumber: null,
  };
  const createInput = (source) => ({
    ...runInput,
    results: runInput.results.map((result) => ({
      id: result.id,
      status: result.status,
      signedEvidence: signEvidence({
        caseId: result.id,
        modelProvider: "OPENAI",
        modelName: "gpt-4o-mini",
        configFingerprint: "a".repeat(64),
        sources: [source],
      }),
    })),
  });

  await recordAgentTestRun("workspace-a", "member-a", createInput(firstSource), state.db);
  await assert.rejects(
    recordAgentTestRun("workspace-a", "member-a", createInput(secondSource), state.db),
    AgentTestRunConflictError,
  );
  assert.equal(state.insertCount, 1);
});

test("run ID collisions in another workspace do not return that workspace's record", async () => {
  reset();
  state.records.set("run-1", {
    id: "run-1",
    workspaceId: "workspace-b",
    createdByMembershipId: "member-b",
    resultDigest: "digest-from-another-workspace",
    caseCount: 2,
    passedCount: 2,
    mismatchCount: 0,
    errorCount: 0,
    notRunCount: 0,
  });
  await assert.rejects(
    recordAgentTestRun("workspace-a", "member-a", runInput, state.db),
    AgentTestRunConflictError,
  );
});

test("run history reads include a workspace predicate", async () => {
  reset();
  state.records.set("run-a", {
    id: "run-a",
    workspaceId: "workspace-a",
    createdAt: "2026-10-07T12:00:00.000Z",
    caseCount: 2,
    passedCount: 1,
    mismatchCount: 0,
    errorCount: 1,
    notRunCount: 0,
  });
  state.records.set("run-b", {
    id: "run-b",
    workspaceId: "workspace-b",
    createdAt: "2026-10-07T12:00:00.000Z",
    caseCount: 2,
    passedCount: 2,
    mismatchCount: 0,
    errorCount: 0,
    notRunCount: 0,
  });

  const runs = await listAgentTestRuns(
    "workspace-a",
    new Date("2026-10-01T00:00:00.000Z"),
    new Date("2026-10-08T00:00:00.000Z"),
    state.db,
  );

  assert.deepEqual(
    runs.map((run) => run.id),
    ["run-a"],
  );
  assert.deepEqual(findCondition(state.historyWhere, "eq", "run.workspaceId"), {
    op: "eq",
    field: "run.workspaceId",
    value: "workspace-a",
  });
});

test("has-history checks do not report runs from another workspace", async () => {
  reset();
  state.records.set("run-b", {
    id: "run-b",
    workspaceId: "workspace-b",
    createdAt: "2026-10-07T12:00:00.000Z",
    caseCount: 1,
    passedCount: 1,
    mismatchCount: 0,
    errorCount: 0,
    notRunCount: 0,
  });
  assert.equal(await hasAgentTestRuns("workspace-a", state.db), false);
  assert.equal(await hasAgentTestRuns("workspace-b", state.db), true);
});

reset();

test("history includes the start, excludes the end and keeps the latest 50 chronologically", async () => {
  reset();
  for (let index = 0; index < 55; index += 1) {
    const id = `run-${String(index).padStart(2, "0")}`;
    state.records.set(id, {
      id,
      workspaceId: "workspace-a",
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
      caseCount: 1,
      passedCount: 1,
      mismatchCount: 0,
      errorCount: 0,
      notRunCount: 0,
    });
  }
  const runs = await listAgentTestRuns(
    "workspace-a",
    new Date("2026-10-01T00:00:00.000Z"),
    new Date("2026-10-01T00:54:00.000Z"),
    state.db,
  );
  assert.equal(runs.length, 50);
  assert.equal(runs[0].id, "run-04");
  assert.equal(runs.at(-1).id, "run-53");
  const boundary = await listAgentTestRuns(
    "workspace-a",
    new Date("2026-10-01T00:00:00.000Z"),
    new Date("2026-10-01T00:01:00.000Z"),
    state.db,
  );
  assert.deepEqual(
    boundary.map((run) => run.id),
    ["run-00"],
  );
});

test("suite fingerprints stay stable across results and change when the saved suite changes", async () => {
  reset();
  await recordAgentTestRun("workspace-a", "member-a", runInput, state.db);
  await recordAgentTestRun(
    "workspace-a",
    "member-a",
    {
      ...runInput,
      runId: "run-2",
      results: [
        { id: "case-1", status: "mismatch" },
        { id: "case-2", status: "error" },
      ],
    },
    state.db,
  );
  assert.equal(state.records.get("run-1").suiteDigest, state.records.get("run-2").suiteDigest);
  state.savedCases[0].updatedAt = "2026-10-07T12:01:00.000Z";
  const suiteVersion = JSON.stringify(state.savedCases.map(({ id, updatedAt }) => [id, updatedAt]));
  await recordAgentTestRun(
    "workspace-a",
    "member-a",
    { ...runInput, runId: "run-3", suiteVersion },
    state.db,
  );
  assert.notEqual(state.records.get("run-1").suiteDigest, state.records.get("run-3").suiteDigest);
});
