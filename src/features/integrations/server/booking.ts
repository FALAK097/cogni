import "server-only";

import { addDays, addMinutes, format, isAfter, startOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { z } from "zod";

const workingHoursSchema = z.object({
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
});

export const bookingSettingsInputSchema = z.object({
  enabled: z.boolean(),
  timezone: z.string().trim().min(1).max(80),
  durationMinutes: z.number().int().min(15).max(240),
  minimumNoticeMinutes: z.number().int().min(0).max(10_080),
  workingHours: workingHoursSchema,
});

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function createAvailableSlots(
  settings: z.infer<typeof bookingSettingsInputSchema>,
  now = new Date(),
) {
  const earliest = addMinutes(now, settings.minimumNoticeMinutes);
  const slots: { startAt: string; endAt: string; label: string }[] = [];
  const startMinutes = minutesFromTime(settings.workingHours.start);
  const endMinutes = minutesFromTime(settings.workingHours.end);

  for (let dayOffset = 0; dayOffset < 14 && slots.length < 20; dayOffset += 1) {
    const zonedDay = startOfDay(toZonedTime(addDays(now, dayOffset), settings.timezone));
    if (!settings.workingHours.weekdays.includes(zonedDay.getDay())) continue;
    for (
      let minute = startMinutes;
      minute + settings.durationMinutes <= endMinutes;
      minute += settings.durationMinutes
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
      if (slots.length >= 20) break;
    }
  }
  return slots;
}
