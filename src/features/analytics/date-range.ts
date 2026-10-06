import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { normalizeTimezone } from "@/features/conversations/snooze-schedule";

export const MAX_ANALYTICS_RANGE_DAYS = 366;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AnalyticsDateRange = {
  startDate: string;
  endDate: string;
  startAt: Date;
  endBefore: Date;
  previousStartDate: string;
  previousEndDate: string;
  previousStartAt: Date;
  previousEndBefore: Date;
};

export type InvalidAnalyticsDateRangeCode = "invalid" | "range_too_long";

export class InvalidAnalyticsDateRangeError extends Error {
  constructor(readonly code: InvalidAnalyticsDateRangeCode = "invalid") {
    super(
      code === "range_too_long"
        ? `Choose an analytics date range of ${MAX_ANALYTICS_RANGE_DAYS} days or fewer.`
        : "Choose a valid start and end date for the analytics range.",
    );
    this.name = "InvalidAnalyticsDateRangeError";
  }
}
function isCalendarDate(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const parsed = parseISO(value);
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
}

export function isAnalyticsDateRangeWithinLimit(start: Date, end: Date): boolean {
  return Math.abs(differenceInCalendarDays(end, start)) + 1 <= MAX_ANALYTICS_RANGE_DAYS;
}

function startOfWorkspaceDay(date: string, timezone: string): Date {
  return fromZonedTime(`${date}T00:00:00.000`, timezone);
}

export function resolveAnalyticsDateRange(
  startDateInput: string | null | undefined,
  endDateInput: string | null | undefined,
  timezoneInput: string | null | undefined,
  now = new Date(),
): AnalyticsDateRange {
  const timezone = normalizeTimezone(timezoneInput);
  if ((startDateInput == null) !== (endDateInput == null)) {
    throw new InvalidAnalyticsDateRangeError();
  }

  const endDate = endDateInput ?? formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const startDate = startDateInput ?? format(addDays(parseISO(endDate), -6), "yyyy-MM-dd");

  if (!isCalendarDate(startDate) || !isCalendarDate(endDate) || startDate > endDate) {
    throw new InvalidAnalyticsDateRangeError();
  }

  const startCalendarDate = parseISO(startDate);
  const endCalendarDate = parseISO(endDate);
  const rangeDays = differenceInCalendarDays(endCalendarDate, startCalendarDate) + 1;
  if (rangeDays > MAX_ANALYTICS_RANGE_DAYS) {
    throw new InvalidAnalyticsDateRangeError("range_too_long");
  }
  const previousEndDate = format(addDays(startCalendarDate, -1), "yyyy-MM-dd");
  const previousStartDate = format(
    addDays(parseISO(previousEndDate), -(rangeDays - 1)),
    "yyyy-MM-dd",
  );
  const dayAfterEndDate = format(addDays(endCalendarDate, 1), "yyyy-MM-dd");
  const dayAfterPreviousEndDate = format(addDays(parseISO(previousEndDate), 1), "yyyy-MM-dd");

  return {
    startDate,
    endDate,
    startAt: startOfWorkspaceDay(startDate, timezone),
    endBefore: startOfWorkspaceDay(dayAfterEndDate, timezone),
    previousStartDate,
    previousEndDate,
    previousStartAt: startOfWorkspaceDay(previousStartDate, timezone),
    previousEndBefore: startOfWorkspaceDay(dayAfterPreviousEndDate, timezone),
  };
}
