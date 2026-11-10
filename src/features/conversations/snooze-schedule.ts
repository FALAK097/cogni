import {
  addDays,
  addHours,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfDay,
} from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

export type SnoozePreset = "one-hour" | "four-hours" | "tomorrow-morning" | "next-monday";

export function normalizeTimezone(timezone: string | null | undefined) {
  if (!timezone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return timezone;
  } catch {
    return "UTC";
  }
}

function atNineInTimezone(day: Date, timezone: string) {
  const morning = setMilliseconds(setSeconds(setMinutes(setHours(day, 9), 0), 0), 0);
  return fromZonedTime(morning, timezone);
}

export function getSnoozeUntil(preset: SnoozePreset, timezone: string, now = new Date()) {
  if (preset === "one-hour") return addHours(now, 1).toISOString();
  if (preset === "four-hours") return addHours(now, 4).toISOString();

  const validTimezone = normalizeTimezone(timezone);
  const localToday = startOfDay(toZonedTime(now, validTimezone));
  if (preset === "tomorrow-morning") {
    return atNineInTimezone(addDays(localToday, 1), validTimezone).toISOString();
  }

  const daysUntilMonday = (8 - localToday.getDay()) % 7 || 7;
  return atNineInTimezone(addDays(localToday, daysUntilMonday), validTimezone).toISOString();
}
