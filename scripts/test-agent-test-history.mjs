import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/agent-tests/history.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const { selectAgentTestRunHistory } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const run = (id, suiteDigest) => ({
  id,
  suiteDigest,
  createdAt: id,
  caseCount: 1,
  passedCount: 1,
  mismatchCount: 0,
  errorCount: 0,
  notRunCount: 0,
});

test("latest-suite comparison excludes other versions and unknown legacy runs", () => {
  const runs = [
    run("1", null),
    run("2", "version-a"),
    run("3", "version-b"),
    run("4", "version-a"),
    run("5", "version-b"),
  ];
  const selected = selectAgentTestRunHistory(runs, "latest-suite");
  assert.deepEqual(
    selected.runs.map((entry) => entry.id),
    ["3", "5"],
  );
  assert.equal(selected.versionCount, 2);
  assert.equal(selected.unversionedCount, 1);
  assert.equal(selected.latestSuiteDigest, "version-b");
  assert.equal(runs.length, 5);
});

test("all-runs view preserves chronological history and includes unknown versions", () => {
  const runs = [run("1", null), run("2", "version-a")];
  assert.deepEqual(selectAgentTestRunHistory(runs, "all").runs, runs);
});

test("legacy-only history cannot be presented as a comparable suite", () => {
  const selected = selectAgentTestRunHistory([run("1", null), run("2", null)], "latest-suite");
  assert.deepEqual(selected.runs, []);
  assert.equal(selected.latestSuiteDigest, null);
  assert.equal(selected.unversionedCount, 2);
  assert.equal(selected.versionCount, 0);
});

test("a period without runs has no invented baseline", () => {
  assert.deepEqual(selectAgentTestRunHistory([], "latest-suite"), {
    runs: [],
    latestSuiteDigest: null,
    versionCount: 0,
    unversionedCount: 0,
  });
});
