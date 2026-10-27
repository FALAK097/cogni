import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";

const state = { query: null };
globalThis.__ingestionDrainPolicyTest = state;

const stubs = {
  "server-only": "",
  "next/server": `export const after = async (callback) => callback();`,
  "drizzle-orm": `
    export const and = (...conditions) => ({ type: "and", conditions });
    export const eq = (field, value) => ({ type: "eq", field, value });
    export const gt = (field, value) => ({ type: "gt", field, value });
    export const inArray = (field, values) => ({ type: "inArray", field, values });
    export const isNull = (field) => ({ type: "isNull", field });
    export const lt = (field, value) => ({ type: "lt", field, value });
    export const or = (...conditions) => ({ type: "or", conditions });
  `,
  zod: `
    const chain = { min: () => chain, max: () => chain };
    export const z = {
      literal: () => chain,
      string: () => chain,
      object: () => ({ parse: (value) => value }),
    };
  `,
  "@/features/knowledge/server/process-document": `export const processDocument = async () => {};`,
  "@/lib/db/schema": `
    export const document = { id: "document.id", workspaceId: "document.workspaceId" };
    export const workflowRun = { id: "workflowRun.id", name: "workflowRun.name", status: "workflowRun.status", startedAt: "workflowRun.startedAt", leaseExpiresAt: "workflowRun.leaseExpiresAt", leaseToken: "workflowRun.leaseToken", workspaceId: "workflowRun.workspaceId" };
  `,
  "@/lib/logging/logger": `export const logError = () => {};`,
  "@/lib/env/server": `export const env = { BETTER_AUTH_URL: "http://localhost:3000", INGESTION_RECLAIM_STALE: "true" };`,
  "@/lib/workflows/runner": `export const failWorkflowRun = async () => {};`,
};

const compiled = await build({
  entryPoints: [resolve("src/lib/jobs/ingestion.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "ingestion-drain-policy-test",
      setup(buildContext) {
        buildContext.onResolve(
          { filter: /^(server-only|next\/server|drizzle-orm|zod|@\/.*)$/ },
          (args) =>
            args.path in stubs
              ? { path: args.path, namespace: "ingestion-drain-policy-test" }
              : undefined,
        );
        buildContext.onLoad({ filter: /.*/, namespace: "ingestion-drain-policy-test" }, (args) => ({
          contents: stubs[args.path],
          loader: "js",
        }));
      },
    },
  ],
});

const ingestion = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

function createDb() {
  return {
    query: {
      workflowRun: {
        findMany: async ({ where }) => {
          state.query = where(
            {
              name: "workflowRun.name",
              status: "workflowRun.status",
              startedAt: "workflowRun.startedAt",
              leaseExpiresAt: "workflowRun.leaseExpiresAt",
            },
            {
              and: (...conditions) => ({ type: "and", conditions }),
              eq: (field, value) => ({ type: "eq", field, value }),
              inArray: (field, values) => ({ type: "inArray", field, values }),
              isNull: (field) => ({ type: "isNull", field }),
              lt: (field, value) => ({ type: "lt", field, value }),
              or: (...conditions) => ({ type: "or", conditions }),
            },
          );
          return [];
        },
      },
    },
  };
}

test("VPS drain excludes stale RUNNING jobs when takeover is disabled", async () => {
  state.query = null;

  await ingestion.drainIngestionQueue(createDb(), 5, { allowStaleRunning: false });

  const [nameCondition, statusCondition] = state.query.conditions;
  assert.equal(nameCondition.value, "document.process");
  assert.equal(statusCondition.type, "inArray");
  assert.deepEqual(statusCondition.values, ["QUEUED", "FAILED"]);
});

test("VPS Compose enables lease-based stale recovery", async () => {
  const compose = await readFile(resolve("docker-compose.yml"), "utf8");
  assert.match(compose, /INGESTION_RECLAIM_STALE:\s*"true"/);
});

test("ingestion claims persist a unique lease token and expiry before processing", async () => {
  state.claim = null;
  const db = {
    update: () => ({
      set: (values) => {
        state.claim = { values };
        return {
          where: (condition) => {
            state.claim.condition = condition;
            return {
              returning: async () => [
                {
                  input: JSON.stringify({
                    type: "document.process",
                    workspaceId: "w1",
                    documentId: "d1",
                    idempotencyKey: "k1",
                  }),
                },
              ],
            };
          },
        };
      },
    }),
    query: { workflowRun: { findFirst: async () => ({ id: "run1" }) } },
  };

  const result = await ingestion.processIngestionWorkflowRun({
    db,
    workspaceId: "w1",
    workflowRunId: "run1",
    allowStaleRunning: false,
  });

  assert.equal(result.claimed, true);
  assert.equal(state.claim.values.status, "RUNNING");
  assert.equal(typeof state.claim.values.leaseToken, "string");
  assert.ok(state.claim.values.leaseExpiresAt > new Date().toISOString());
});

test("other hosting keeps the existing stale RUNNING recovery by default", async () => {
  state.query = null;

  await ingestion.drainIngestionQueue(createDb(), 5);

  const [, eligibleStatus] = state.query.conditions;
  assert.equal(eligibleStatus.type, "or");
  assert.equal(eligibleStatus.conditions[0].type, "inArray");
  const staleRunning = eligibleStatus.conditions[1];
  assert.equal(staleRunning.conditions[0].value, "RUNNING");
  assert.equal(staleRunning.conditions[1].type, "or");
  assert.equal(staleRunning.conditions[1].conditions[0].type, "and");
  assert.equal(staleRunning.conditions[1].conditions[0].conditions[0].type, "isNull");
  assert.equal(staleRunning.conditions[1].conditions[1].type, "lt");
});
