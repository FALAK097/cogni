import assert from "node:assert/strict";
import { format, parseISO } from "date-fns";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["src/features/analytics/aggregation.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
});
const analytics = await import(
  `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
);
const { aggregateSatisfactionByCohort, aggregateWeeklyCounts, aggregateWeeklySatisfaction } =
  analytics;

test("satisfaction KPI totals and daily series use the same conversation cohort", () => {
  const result = aggregateSatisfactionByCohort([
    { cohortDate: "2026-06-02", rating: "positive" },
    { cohortDate: "2026-06-02", rating: "negative" },
    { cohortDate: "2026-06-03", rating: "positive" },
  ]);

  assert.equal(result.positive + result.negative, 3);
  assert.deepEqual(result.daily.get("2026-06-02"), { positive: 1, negative: 1 });
  assert.deepEqual(result.daily.get("2026-06-03"), { positive: 1, negative: 0 });
});

test("weekly conversation counts use ISO week-years across New Year", () => {
  const [week] = aggregateWeeklyCounts([
    { date: "2020-12-31", count: 2 },
    { date: "2021-01-01", count: 3 },
  ]);

  assert.deepEqual(week, { date: "2020-W53", count: 5 });
  assert.equal(format(parseISO(week.date), "MMM d"), "Dec 28");
});

test("weekly satisfaction combines month boundaries and weights by response count", () => {
  const [week] = aggregateWeeklySatisfaction([
    { date: "2026-02-28", score: 4, responses: 2 },
    { date: "2026-03-01", score: 2, responses: 1 },
  ]);

  assert.equal(week?.date, "2026-W09");
  assert.equal(week?.responses, 3);
  assert.ok(Math.abs((week?.score ?? 0) - 10 / 3) < 1e-10);
});

test("weekly satisfaction keeps weeks without feedback as unavailable", () => {
  assert.deepEqual(
    aggregateWeeklySatisfaction([{ date: "2026-03-02", score: null, responses: 0 }]),
    [{ date: "2026-W10", score: null, responses: 0 }],
  );
});
