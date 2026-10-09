import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { test } from "node:test";
import { build } from "esbuild";
import postgres from "postgres";
import { z } from "zod";
import "dotenv/config";

process.env.SKIP_ENV_VALIDATION ??= "true";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1", "::1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("Agent test history integration tests require a local DATABASE_URL.");
}
const outputFile = join(process.cwd(), "node_modules/.cache/cogni-agent-test-history/runs.mjs");
await mkdir(resolve(outputFile, ".."), { recursive: true });
await build({
  stdin: {
    contents: `export { getDb } from "@/lib/db/client";
      export * from "@/features/agent-tests/server/runs";
      export { listAgentTestCases } from "@/features/agent-tests/server/cases";
      export { getAgentTestSuiteVersion } from "@/features/agent-tests/input";`,
    resolveDir: process.cwd(),
    sourcefile: "agent-test-history-db-entry.ts",
  },
  outfile: outputFile,
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  alias: { "@": resolve("src") },
  plugins: [
    {
      name: "server-only-test-stub",
      setup(context) {
        context.onResolve({ filter: /^server-only$/ }, () => ({
          path: "server-only",
          namespace: "stub",
        }));
        context.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          contents: "export {};",
          loader: "js",
        }));
      },
    },
  ],
});
const {
  getDb,
  recordAgentTestRun,
  listAgentTestRuns,
  hasAgentTestRuns,
  listAgentTestCases,
  getAgentTestSuiteVersion,
  AgentTestRunConflictError,
  AgentTestSuiteChangedError,
} = await import(pathToFileURL(outputFile).href);

test("Postgres history isolates tenants, deduplicates concurrent saves, validates suites and date bounds", async () => {
  const raw = postgres(databaseUrl, { max: 1, prepare: false });
  const workspaceId = randomUUID();
  const foreignId = randomUUID();
  const userId = randomUUID();
  const memberId = randomUUID();
  const caseId = randomUUID();
  const runId = randomUUID();
  const now = new Date().toISOString();
  try {
    await raw`INSERT INTO workspace (id, name, slug, "updatedAt") VALUES (${workspaceId}, 'History test', ${workspaceId}, ${now}), (${foreignId}, 'Foreign history', ${foreignId}, ${now})`;
    await raw`INSERT INTO "user" (id, name, email, "updatedAt") VALUES (${userId}, 'History owner', ${`${userId}@example.test`}, ${now})`;
    await raw`INSERT INTO workspace_member (id, role, "updatedAt", "userId", "workspaceId") VALUES (${memberId}, 'OWNER', ${now}, ${userId}, ${workspaceId})`;
    await raw`INSERT INTO agent_test_case (id, title, prompt, "expectedOutcome", "updatedAt", "workspaceId") VALUES (${caseId}, 'Check', 'Private prompt', 'grounded_answer', ${now}, ${workspaceId})`;
    const cases = await listAgentTestCases(workspaceId);
    const input = {
      runId,
      suiteVersion: getAgentTestSuiteVersion(cases),
      results: [{ id: caseId, status: "passed" }],
    };
    const [first, duplicate] = await Promise.all([
      recordAgentTestRun(workspaceId, memberId, input),
      recordAgentTestRun(workspaceId, memberId, input),
    ]);
    assert.deepEqual(first, duplicate);
    const rows = await raw`SELECT * FROM agent_test_run WHERE "workspaceId" = ${workspaceId}`;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].passedCount, 1);
    const history = await listAgentTestRuns(workspaceId, new Date(0), new Date("2100-01-01"));
    assert.equal(
      z.string().datetime({ offset: true }).safeParse(history[0].createdAt).success,
      true,
      "API timestamps must satisfy the Insights client contract",
    );
    assert.equal("prompt" in rows[0], false);
    await assert.rejects(
      recordAgentTestRun(workspaceId, memberId, {
        ...input,
        results: [{ id: caseId, status: "mismatch" }],
      }),
      AgentTestRunConflictError,
    );
    assert.equal(await hasAgentTestRuns(foreignId), false);
    assert.deepEqual(await listAgentTestRuns(foreignId, new Date(0), new Date("2100-01-01")), []);
    await raw`UPDATE agent_test_run SET "createdAt" = '2026-10-01T00:00:00Z' WHERE id = ${runId} AND "workspaceId" = ${workspaceId}`;
    assert.equal(
      (await listAgentTestRuns(workspaceId, new Date("2026-10-01"), new Date("2026-10-02"))).length,
      1,
    );
    assert.equal(
      (await listAgentTestRuns(workspaceId, new Date("2026-09-30"), new Date("2026-10-01"))).length,
      0,
    );
    await raw`UPDATE agent_test_case SET "updatedAt" = "updatedAt" + interval '1 second' WHERE id = ${caseId} AND "workspaceId" = ${workspaceId}`;
    await assert.rejects(
      recordAgentTestRun(workspaceId, memberId, { ...input, runId: randomUUID() }),
      AgentTestSuiteChangedError,
    );
  } finally {
    await raw`DELETE FROM workspace WHERE id IN (${workspaceId}, ${foreignId})`;
    await raw`DELETE FROM "user" WHERE id = ${userId}`;
    await getDb().$client.end({ timeout: 5 });
    await raw.end({ timeout: 5 });
  }
});
