import "server-only";

import { addDays, addMinutes, format, isAfter, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { z } from "zod";

const workingHoursSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1).default([1, 2, 3, 4, 5]),
});

export const bookingSettingsInputSchema = z.object({
  enabled: z.boolean(),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
        return true;
      } catch {
        return false;
      }
    }, "Enter a valid IANA timezone."),
  durationMinutes: z.number().int().min(15).max(240),
  bufferMinutes: z.number().int().min(0).max(120).default(15),
  minimumNoticeMinutes: z.number().int().min(0).max(10_080).default(60),
  allowedDays: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  workingHours: workingHoursSchema,
  handoffFallback: z
    .string()
    .trim()
    .max(500)
    .default(
      "No slots currently available. A team member will follow up with you directly in this chat.",
    ),
  notificationChannel: z.enum(["INBOX", "EMAIL", "SLACK"]).default("INBOX"),
});

export type BookingSettings = z.infer<typeof bookingSettingsInputSchema>;

export type AppointmentNotificationPayload = {
  workflowRunId: string;
  conversationId: string;
  title: string;
  startAt: string;
  endAt: string;
  attendeeEmail: string;
  timezone: string;
  status: "REQUESTED" | "CONFIRMED" | "FAILED" | "CANCELLED";
  notificationChannel: "INBOX" | "EMAIL" | "SLACK";
};

export const appointmentWorkflowInputSchema = z.object({
  conversationId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  attendeeEmail: z.string().email(),
  title: z.string().trim().min(1).max(200).default("Customer meeting"),
  timezone: z.string().trim().min(1).max(80),
  handoffFallback: z.string().trim().max(500),
  notificationChannel: z.enum(["INBOX", "EMAIL", "SLACK"]),
});

export type AppointmentWorkflowInput = z.infer<typeof appointmentWorkflowInputSchema>;

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function createAvailableSlots(
  settings: z.infer<typeof bookingSettingsInputSchema>,
  now = new Date(),
) {
  const earliest = addMinutes(now, settings.minimumNoticeMinutes ?? 60);
  const slots: { startAt: string; endAt: string; label: string }[] = [];
  const startMinutes = minutesFromTime(settings.workingHours.start);
  const endMinutes = minutesFromTime(settings.workingHours.end);
  const allowedDays = settings.allowedDays ?? settings.workingHours.weekdays ?? [1, 2, 3, 4, 5];
  const buffer = settings.bufferMinutes ?? 15;
  const interval = Math.max(15, settings.durationMinutes + buffer);

  for (let dayOffset = 0; dayOffset < 14 && slots.length < 24; dayOffset += 1) {
    const zonedDay = startOfDay(toZonedTime(addDays(now, dayOffset), settings.timezone));
    if (!allowedDays.includes(zonedDay.getDay())) continue;

    for (
      let minute = startMinutes;
      minute + settings.durationMinutes <= endMinutes;
      minute += interval
    ) {
      const localStart = addMinutes(zonedDay, minute);
      const start = fromZonedTime(localStart, settings.timezone);
      if (!isAfter(start, earliest)) continue;
      const end = addMinutes(start, settings.durationMinutes);
      slots.push({
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        label: `${format(localStart, "EEE, MMM d · h:mm a")} (${settings.timezone})`,
      });
      if (slots.length >= 24) break;
    }
  }
  return slots;
}
