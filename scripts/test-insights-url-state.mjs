import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/insights-url-state.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  plugins: [
    {
      name: "resolve-project-aliases",
      setup(buildContext) {
        buildContext.onResolve({ filter: /^@\// }, ({ path: importPath }) => ({
          path: path.resolve(`src/${importPath.slice(2)}.ts`),
        }));
      },
    },
  ],
});
const urlState = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);

test("Insights defaults to the workspace's last seven calendar days without query values", () => {
  const now = new Date("2026-10-02T01:00:00.000Z");
  const result = urlState.resolveInsightsDateQuery(null, null, "Asia/Kolkata", now);

  assert.equal(result.dates.startDate, "2026-09-26");
  assert.equal(result.dates.endDate, "2026-10-02");
  assert.equal(result.invalidQuery, false);
  assert.deepEqual(urlState.serializeInsightsDateRange(result.value, "Asia/Kolkata", now), {
    from: null,
    to: null,
  });
});

test("malformed, incomplete, and reversed query ranges fall back safely", () => {
  const now = new Date("2026-10-02T01:00:00.000Z");

  for (const [from, to] of [
    ["2026-02-30", "2026-03-01"],
    ["2026-10-01", null],
    ["2026-10-02", "2026-10-01"],
  ]) {
    const result = urlState.resolveInsightsDateQuery(from, to, "Asia/Kolkata", now);
    assert.equal(result.invalidQuery, true);
    assert.equal(result.dates.startDate, "2026-09-26");
    assert.equal(result.dates.endDate, "2026-10-02");
  }
});

test("oversized query ranges reset safely with a clear reason", () => {
  const now = new Date("2026-10-02T01:00:00.000Z");
  const result = urlState.resolveInsightsDateQuery("2023-01-01", "2024-01-02", "UTC", now);

  assert.equal(result.invalidQuery, true);
  assert.equal(result.invalidQueryReason, "range_too_long");
  assert.equal(result.dates.startDate, "2026-09-26");
  assert.equal(result.dates.endDate, "2026-10-02");
});

test("custom date ranges serialize as calendar dates and round-trip", () => {
  const now = new Date("2026-10-02T01:00:00.000Z");
  const defaults = urlState.resolveInsightsDateQuery(null, null, "Asia/Kolkata", now);
  const custom = {
    start: new Date(defaults.value.start.getTime() - 86_400_000),
    end: defaults.value.end,
  };
  const query = urlState.serializeInsightsDateRange(custom, "Asia/Kolkata", now);
  const restored = urlState.resolveInsightsDateQuery(query.from, query.to, "Asia/Kolkata", now);

  assert.deepEqual(query, { from: "2026-09-25", to: "2026-10-02" });
  assert.equal(restored.dates.startDate, "2026-09-25");
  assert.equal(restored.dates.endDate, "2026-10-02");
  assert.equal(restored.invalidQuery, false);
});
