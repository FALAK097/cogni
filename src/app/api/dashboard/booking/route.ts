import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import {
  bookingSettingsInputSchema,
  createAvailableSlots,
} from "@/features/integrations/server/booking";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { widget } from "@/lib/db/schema";

const defaultSettings = bookingSettingsInputSchema.parse({
  enabled: false,
  timezone: "UTC",
  durationMinutes: 30,
  minimumNoticeMinutes: 60,
  workingHours: { start: "09:00", end: "17:00", weekdays: [1, 2, 3, 4, 5] },
});

export async function GET() {
  const { db, workspace } = await requireDashboardContext();
  const saved = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
  });
  const settings = saved
    ? bookingSettingsInputSchema.parse({
        enabled: saved.bookingEnabled,
        timezone: saved.bookingTimezone,
        durationMinutes: saved.bookingDurationMinutes,
        minimumNoticeMinutes: saved.bookingMinimumNoticeMinutes,
        workingHours: JSON.parse(saved.bookingWorkingHours) as unknown,
      })
    : defaultSettings;
  return NextResponse.json({
    settings,
    slots: settings.enabled ? createAvailableSlots(settings) : [],
  });
}

export async function PATCH(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const parsed = bookingSettingsInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const existing = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
    columns: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }
  await db
    .update(widget)
    .set({
      bookingEnabled: parsed.data.enabled,
      bookingTimezone: parsed.data.timezone,
      bookingDurationMinutes: parsed.data.durationMinutes,
      bookingMinimumNoticeMinutes: parsed.data.minimumNoticeMinutes,
      bookingWorkingHours: JSON.stringify(parsed.data.workingHours),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(widget.id, existing.id));
  return NextResponse.json({ settings: parsed.data, slots: createAvailableSlots(parsed.data) });
}
