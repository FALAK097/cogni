import { format, parseISO } from "date-fns";

import type { SatisfactionPoint, TimeSeriesPoint } from "./types";

export type SatisfactionCohortResponse = {
  cohortDate: string;
  rating: "positive" | "negative";
};

export function aggregateSatisfactionByCohort(responses: readonly SatisfactionCohortResponse[]): {
  positive: number;
  negative: number;
  daily: Map<string, { positive: number; negative: number }>;
} {
  let positive = 0;
  let negative = 0;
  const daily = new Map<string, { positive: number; negative: number }>();

  for (const response of responses) {
    const counts = daily.get(response.cohortDate) ?? { positive: 0, negative: 0 };
    if (response.rating === "positive") {
      positive += 1;
      counts.positive += 1;
    } else {
      negative += 1;
      counts.negative += 1;
    }
    daily.set(response.cohortDate, counts);
  }

  return { positive, negative, daily };
}

export function aggregateWeeklyCounts(data: readonly TimeSeriesPoint[]): TimeSeriesPoint[] {
  const buckets = new Map<string, number>();
  for (const point of data) {
    const weekStart = format(parseISO(point.date), "RRRR-'W'II");
    buckets.set(weekStart, (buckets.get(weekStart) ?? 0) + point.count);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

export function aggregateWeeklySatisfaction(
  data: readonly SatisfactionPoint[],
): SatisfactionPoint[] {
  const buckets = new Map<string, { positive: number; negative: number }>();
  for (const point of data) {
    const weekStart = format(parseISO(point.date), "RRRR-'W'II");
    const bucket = buckets.get(weekStart) ?? { positive: 0, negative: 0 };
    if (point.score !== null && point.responses > 0) {
      const positive = (point.score / 5) * point.responses;
      bucket.positive += positive;
      bucket.negative += point.responses - positive;
    }
    buckets.set(weekStart, bucket);
  }
  return [...buckets.entries()].map(([date, bucket]) => {
    const responses = bucket.positive + bucket.negative;
    return {
      date,
      responses,
      score: responses > 0 ? (bucket.positive / responses) * 5 : null,
    };
  });
}
