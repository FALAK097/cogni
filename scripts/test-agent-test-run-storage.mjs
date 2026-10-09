import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";

const state = {
  savedCases: [],
  records: new Map(),
  caseWhere: null,
  historyWhere: null,
  insertCount: 0,
};
globalThis.__agentTestRunStorageState = state;

const stubs = {
  "server-only": "",
  "drizzle-orm": `
    export const eq = (field, value) => ({ op: "eq", field, value });
    export const and = (...conditions) => ({ op: "and", conditions });
    export const gte = (field, value) => ({ op: "gte", field, value });
    export const lt = (field, value) => ({ op: "lt", field, value });
    export const asc = (field) => ({ op: "asc", field });
    export const desc = (field) => ({ op: "desc", field });
  `,
  "@/lib/db/client": `export const getDb = () => globalThis.__agentTestRunStorageState.db;`,
  "@/lib/db/schema": `
    export const agentTestCase = { workspaceId: "case.workspaceId", id: "case.id" };
    export const agentTestRun = {
      id: "run.id", resultDigest: "run.resultDigest", workspaceId: "run.workspaceId",
      createdAt: "run.createdAt", caseCount: "run.caseCount", passedCount: "run.passedCount",
      mismatchCount: "run.mismatchCount", errorCount: "run.errorCount", notRunCount: "run.notRunCount",
    };
  `,
};

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
                            caseCount,
                            passedCount,
                            mismatchCount,
                            errorCount,
                            notRunCount,
                          }) => ({
                            id,
                            createdAt,
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
    { id: "case-1", updatedAt: "2026-10-07T12:00:00.000Z", workspaceId: "workspace-a" },
    { id: "case-2", updatedAt: "2026-10-07T12:00:00.000Z", workspaceId: "workspace-a" },
  ];
  state.records = new Map();
  state.caseWhere = null;
  state.historyWhere = null;
  state.insertCount = 0;
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
    passedCount: 1,
    mismatchCount: 0,
    errorCount: 1,
    notRunCount: 0,
  });
  assert.deepEqual(state.caseWhere, { op: "eq", field: "case.workspaceId", value: "workspace-a" });
  assert.equal(row.workspaceId, "workspace-a");
  assert.equal(row.createdByMembershipId, "member-a");
  assert.equal("results" in row, false);
  assert.equal("prompt" in row, false);
  assert.equal("transcript" in row, false);
  assert.equal("resultDigest" in row, true);
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
          { id: "case-1", status: "mismatch" },
          { id: "case-2", status: "error" },
        ],
      },
      state.db,
    ),
    AgentTestRunConflictError,
  );
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
