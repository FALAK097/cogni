import "server-only";

import { randomUUID } from "node:crypto";
import { addDays, addMinutes, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import type { Db } from "@/lib/db/client";

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
        // Skip lunch hour
        if (minute >= 12 * 60 && minute < 13 * 60) continue;

        const localStart = addMinutes(zonedDay, minute);
        const slotStart = fromZonedTime(localStart, timezone);
        const slotEnd = addMinutes(slotStart, durationMinutes);

        if (isBefore(slotStart, rangeStart) || isAfter(slotStart, rangeEnd)) {
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
  // If db is provided and workspace has a live Google Calendar integration connected via Composio,
  // we could return an adapter wrapping Composio. Otherwise fallback to typed MockCalendarAdapter.
  if (db) {
    const connection = await db.query.integration.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.workspaceId, workspaceId), eq(fields.provider, "GOOGLE_CALENDAR")),
    });

    if (connection?.connectedAccountId && connection.status === "CONNECTED") {
      // Future live provider adapter can be returned here when credentials are live.
      // For MVP we safely use MockCalendarAdapter if Composio API key or connection isn't configured.
    }
  }

  return new MockCalendarAdapter(workspaceId);
}
