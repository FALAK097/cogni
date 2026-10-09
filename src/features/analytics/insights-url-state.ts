import { endOfDay, format, parseISO, startOfDay } from "date-fns";

import {
  InvalidAnalyticsDateRangeError,
  resolveAnalyticsDateRange,
} from "@/features/analytics/date-range";
import type {
  AnalyticsDateRange,
  InvalidAnalyticsDateRangeCode,
} from "@/features/analytics/date-range";

export type InsightsDateRangeValue = { start: Date; end: Date };

export type ResolvedInsightsDateRange = {
  value: InsightsDateRangeValue;
  dates: Pick<AnalyticsDateRange, "startDate" | "endDate">;
  invalidQuery: boolean;
  invalidQueryReason: InvalidAnalyticsDateRangeCode | null;
};

export function resolveInsightsDateQuery(
  from: string | null,
  to: string | null,
  timezone: string,
  now = new Date(),
): ResolvedInsightsDateRange {
  let invalidQueryReason: InvalidAnalyticsDateRangeCode | null = null;
  let range: AnalyticsDateRange;

  try {
    range = resolveAnalyticsDateRange(from, to, timezone, now);
  } catch (error) {
    invalidQueryReason = error instanceof InvalidAnalyticsDateRangeError ? error.code : "invalid";
    range = resolveAnalyticsDateRange(null, null, timezone, now);
  }

  return {
    value: {
      start: startOfDay(parseISO(range.startDate)),
      end: endOfDay(parseISO(range.endDate)),
    },
    dates: { startDate: range.startDate, endDate: range.endDate },
    invalidQuery: invalidQueryReason !== null,
    invalidQueryReason,
  };
}

export function serializeInsightsDateRange(
  value: InsightsDateRangeValue,
  timezone: string,
  now = new Date(),
): { from: string | null; to: string | null } {
  const from = format(value.start, "yyyy-MM-dd");
  const to = format(value.end, "yyyy-MM-dd");
  const defaults = resolveAnalyticsDateRange(null, null, timezone, now);

  if (from === defaults.startDate && to === defaults.endDate) {
    return { from: null, to: null };
  }

  return { from, to };
}
