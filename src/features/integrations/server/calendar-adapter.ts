import "server-only";

import { Composio } from "@composio/core";
import { randomUUID } from "node:crypto";
import { addDays, addMinutes, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Db } from "@/lib/db/client";
import { env } from "@/lib/env/server";
import { getIntegrationTool, toComposioArguments } from "./tool-registry";

export type CalendarAvailabilitySlot = {
  startAt: string;
  endAt: string;
  label: string;
};

export type CalendarAvailabilityResult = {
  busy: Array<{ start: string; end: string }>;
  freeSlots: CalendarAvailabilitySlot[];
};

export type CalendarAvailabilityQuery = {
  startAt: string;
  endAt: string;
  timezone: string;
  calendarIds?: string[];
  durationMinutes?: number;
  bufferMinutes?: number;
  allowedDays?: number[];
  workingHours?: { start: string; end: string };
};

export type CalendarEventCreateInput = {
  title: string;
  startAt: string;
  endAt: string;
  attendeeEmail: string;
  timezone: string;
  description?: string;
  createMeetingRoom?: boolean;
  conversationId?: string;
};

export type CalendarEventResult = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  attendeeEmail: string;
  timezone: string;
  status: "confirmed" | "tentative";
  meetUrl?: string;
  htmlLink?: string;
};

export interface CalendarAdapter {
  findAvailability(query: CalendarAvailabilityQuery): Promise<CalendarAvailabilityResult>;
  createEvent(input: CalendarEventCreateInput): Promise<CalendarEventResult>;
}

type ProviderRecord = Record<string, unknown>;

function asRecord(value: unknown): ProviderRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as ProviderRecord)
    : null;
}

function readString(record: ProviderRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function findArrayByKey(value: unknown, keys: Set<string>): unknown[] | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const [key, child] of Object.entries(record)) {
    if (keys.has(key) && Array.isArray(child)) return child;
  }
  for (const child of Object.values(record)) {
    const match = findArrayByKey(child, keys);
    if (match) return match;
  }
  return null;
}

function findStringByKey(value: unknown, keys: Set<string>): string | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const [key, child] of Object.entries(record)) {
    if (keys.has(key) && typeof child === "string" && child.length > 0) return child;
  }
  for (const child of Object.values(record)) {
    const match = findStringByKey(child, keys);
    if (match) return match;
  }
  return null;
}

type ProviderInterval = { start: Date; end: Date };

function normalizeProviderIntervals(data: ProviderRecord): ProviderInterval[] {
  const rawSlots = findArrayByKey(
    data,
    new Set(["free_slots", "freeSlots", "available_slots", "availableSlots", "slots"]),
  );
  if (rawSlots === null) {
    throw new Error("Google Calendar returned no usable availability data.");
  }
  return rawSlots.flatMap((value): ProviderInterval[] => {
    const slot = asRecord(value);
    if (!slot) return [];
    const startAt = readString(slot, ["start", "startAt", "start_time", "start_datetime"]);
    const endAt = readString(slot, ["end", "endAt", "end_time", "end_datetime"]);
    if (!startAt || !endAt) return [];
    const start = parseISO(startAt);
    const end = parseISO(endAt);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      !isAfter(end, start)
    ) {
      return [];
    }
    return [{ start, end }];
  });
}

function minutesFromTime(value: string) {
  const [hours = 0, minutes = 0] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * The provider returns free gaps, not appointments. Intersect each day's working
 * window with those gaps and emit stable slots sized by the configured duration.
 */
function buildAppointmentSlots(
  intervals: ProviderInterval[],
  query: CalendarAvailabilityQuery,
): CalendarAvailabilitySlot[] {
  if (intervals.length === 0) return [];
  const timezone = query.timezone;
  const durationMinutes = Math.max(15, query.durationMinutes ?? 30);
  const bufferMinutes = Math.max(0, query.bufferMinutes ?? 15);
  const stepMinutes = Math.max(15, durationMinutes + bufferMinutes);
  const allowedDays = query.allowedDays ?? [1, 2, 3, 4, 5];
  const workingStart = minutesFromTime(query.workingHours?.start ?? "09:00");
  const workingEnd = minutesFromTime(query.workingHours?.end ?? "17:00");
  if (workingStart >= workingEnd) return [];

  const rangeStart = parseISO(query.startAt);
  const rangeEnd = parseISO(query.endAt);
  const slots: CalendarAvailabilitySlot[] = [];

  for (let dayOffset = 0; dayOffset < 14 && slots.length < 24; dayOffset += 1) {
    const currentDay = addDays(rangeStart, dayOffset);
    if (isAfter(currentDay, rangeEnd)) break;
    const zonedDay = startOfDay(toZonedTime(currentDay, timezone));
    if (!allowedDays.includes(zonedDay.getDay())) continue;

    for (let minute = workingStart; minute + durationMinutes <= workingEnd; minute += stepMinutes) {
      const localStart = addMinutes(zonedDay, minute);
      const slotStart = fromZonedTime(localStart, timezone);
      const slotEnd = addMinutes(slotStart, durationMinutes);
      if (isBefore(slotStart, rangeStart) || isAfter(slotEnd, rangeEnd)) continue;
      const available = intervals.some(
        (interval) => !isBefore(slotStart, interval.start) && !isAfter(slotEnd, interval.end),
      );
      if (!available) continue;
      slots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        label: `${format(localStart, "EEE, MMM d · h:mm a")} (${timezone})`,
      });
      if (slots.length >= 24) break;
    }
  }
  return slots;
}

class ComposioCalendarAdapter implements CalendarAdapter {
  constructor(
    private readonly workspaceId: string,
    private readonly connectedAccountId: string,
    private readonly toolkitVersion: string | null,
  ) {}

  private async execute(
    actionType: "calendar.find_availability" | "calendar.create",
    input: ProviderRecord,
  ) {
    if (!env.COMPOSIO_API_KEY) throw new Error("Google Calendar is not configured.");
    const tool = getIntegrationTool(actionType);
    if (!tool?.composioToolSlug) throw new Error("Google Calendar action is unavailable.");
    const result = await new Composio({ apiKey: env.COMPOSIO_API_KEY }).tools.execute(
      tool.composioToolSlug,
      {
        userId: this.workspaceId,
        connectedAccountId: this.connectedAccountId,
        version: this.toolkitVersion ?? "latest",
        dangerouslySkipVersionCheck: this.toolkitVersion === null,
        arguments: toComposioArguments(actionType, input),
      },
      { signal: AbortSignal.timeout(20_000) },
    );
    if (!result.successful) {
      throw new Error(result.error ?? "Google Calendar action failed.");
    }
    return result.data;
  }

  async findAvailability(query: CalendarAvailabilityQuery): Promise<CalendarAvailabilityResult> {
    const data = await this.execute("calendar.find_availability", { ...query });
    return {
      busy: [],
      freeSlots: buildAppointmentSlots(normalizeProviderIntervals(data), query),
    };
  }

  async createEvent(input: CalendarEventCreateInput): Promise<CalendarEventResult> {
    const data = await this.execute("calendar.create", { ...input });
    const id = findStringByKey(data, new Set(["id", "event_id", "eventId"]));
    if (!id) throw new Error("Google Calendar did not return an event ID.");
    const meetUrl = findStringByKey(
      data,
      new Set(["hangout_link", "hangoutLink", "meet_url", "meetUrl"]),
    );
    const htmlLink = findStringByKey(
      data,
      new Set(["html_link", "htmlLink", "event_url", "eventUrl"]),
    );
    return {
      id,
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeEmail: input.attendeeEmail,
      timezone: input.timezone,
      status: "confirmed",
      ...(meetUrl ? { meetUrl } : {}),
      ...(htmlLink ? { htmlLink } : {}),
    };
  }
}

export class MockCalendarAdapter implements CalendarAdapter {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  async findAvailability({
    startAt,
    endAt,
    timezone,
    durationMinutes = 30,
    bufferMinutes = 15,
    allowedDays = [1, 2, 3, 4, 5],
    workingHours = { start: "09:00", end: "17:00" },
  }: CalendarAvailabilityQuery): Promise<CalendarAvailabilityResult> {
    const rangeStart = parseISO(startAt);
    const rangeEnd = parseISO(endAt);
    const freeSlots: CalendarAvailabilitySlot[] = [];

    // Deterministic busy windows (e.g. daily 12:00-13:00 lunch)
    const busy: Array<{ start: string; end: string }> = [];

    // Scan up to 14 days or until rangeEnd
    for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
      const currentDay = addDays(rangeStart, dayOffset);
      if (isAfter(currentDay, rangeEnd)) break;

      const zonedDay = startOfDay(toZonedTime(currentDay, timezone));
      const dayOfWeek = zonedDay.getDay();

      if (!allowedDays.includes(dayOfWeek)) continue;

      // Add lunch busy window
      const lunchStart = fromZonedTime(addMinutes(zonedDay, 12 * 60), timezone);
      const lunchEnd = fromZonedTime(addMinutes(zonedDay, 13 * 60), timezone);
      busy.push({ start: lunchStart.toISOString(), end: lunchEnd.toISOString() });

      const [startHour = 9, startMinutePart = 0] = workingHours.start.split(":").map(Number);
      const [endHour = 17, endMinutePart = 0] = workingHours.end.split(":").map(Number);
      const slotInterval = Math.max(15, durationMinutes + bufferMinutes);
      const startMinute = startHour * 60 + startMinutePart;
      const endMinute = endHour * 60 + endMinutePart;

      for (
        let minute = startMinute;
        minute + durationMinutes <= endMinute;
        minute += slotInterval
      ) {
        // Reject every appointment that overlaps the busy window, including long meetings.
        if (minute < 13 * 60 && minute + durationMinutes > 12 * 60) continue;

        const localStart = addMinutes(zonedDay, minute);
        const slotStart = fromZonedTime(localStart, timezone);
        const slotEnd = addMinutes(slotStart, durationMinutes);

        if (isBefore(slotStart, rangeStart) || isAfter(slotEnd, rangeEnd)) {
          continue;
        }

        freeSlots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          label: `${format(localStart, "EEE, MMM d · h:mm a")} (${timezone})`,
        });

        if (freeSlots.length >= 24) break;
      }

      if (freeSlots.length >= 24) break;
    }

    return { busy, freeSlots };
  }

  async createEvent(input: CalendarEventCreateInput): Promise<CalendarEventResult> {
    const eventId = `mock_evt_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const meetCode = `mock-${randomUUID().slice(0, 4)}-${randomUUID().slice(0, 4)}`;

    return {
      id: eventId,
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeEmail: input.attendeeEmail,
      timezone: input.timezone,
      status: "confirmed",
      meetUrl:
        input.createMeetingRoom !== false ? `https://meet.google.com/${meetCode}` : undefined,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}&workspace=${encodeURIComponent(this.workspaceId)}`,
    };
  }
}

export async function getCalendarAdapter(workspaceId: string, db?: Db): Promise<CalendarAdapter> {
  if (db) {
    const connection = await db.query.integration.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.workspaceId, workspaceId), eq(fields.provider, "GOOGLE_CALENDAR")),
    });

    if (connection?.connectedAccountId && connection.status === "CONNECTED") {
      if (!env.COMPOSIO_API_KEY) throw new Error("Google Calendar is not configured.");
      return new ComposioCalendarAdapter(
        workspaceId,
        connection.connectedAccountId,
        connection.toolkitVersion,
      );
    }
  }

  if (env.ENV === "development") return new MockCalendarAdapter(workspaceId);
  throw new Error("Connect Google Calendar before enabling appointment booking.");
}
