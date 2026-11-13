import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import {
  bookingSettingsInputSchema,
  createAvailableSlots,
} from "@/features/integrations/server/booking";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { widget } from "@/lib/db/schema";

const defaultSettings = bookingSettingsInputSchema.parse({
  enabled: false,
  timezone: "UTC",
  durationMinutes: 30,
  bufferMinutes: 15,
  minimumNoticeMinutes: 60,
  allowedDays: [1, 2, 3, 4, 5],
  workingHours: { start: "09:00", end: "17:00", weekdays: [1, 2, 3, 4, 5] },
  handoffFallback:
    "No slots currently available. A team member will follow up with you directly in this chat.",
  notificationChannel: "INBOX",
});

export async function GET() {
  const { db, workspace } = await requireDashboardContext();
  const saved = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspace.id),
  });

  let parsedWorkingHours: Record<string, unknown> = {};
  if (saved) {
    try {
      parsedWorkingHours = JSON.parse(saved.bookingWorkingHours) as Record<string, unknown>;
    } catch {
      parsedWorkingHours = {};
    }
  }

  const settings = saved
    ? bookingSettingsInputSchema.parse({
        enabled: saved.bookingEnabled,
        timezone: saved.bookingTimezone,
        durationMinutes: saved.bookingDurationMinutes,
        minimumNoticeMinutes: saved.bookingMinimumNoticeMinutes,
        bufferMinutes:
          typeof parsedWorkingHours.bufferMinutes === "number"
            ? parsedWorkingHours.bufferMinutes
            : 15,
        allowedDays: Array.isArray(parsedWorkingHours.allowedDays)
          ? parsedWorkingHours.allowedDays
          : Array.isArray(parsedWorkingHours.weekdays)
            ? parsedWorkingHours.weekdays
            : [1, 2, 3, 4, 5],
        handoffFallback:
          typeof parsedWorkingHours.handoffFallback === "string"
            ? parsedWorkingHours.handoffFallback
            : undefined,
        notificationChannel:
          typeof parsedWorkingHours.notificationChannel === "string"
            ? parsedWorkingHours.notificationChannel
            : "INBOX",
        workingHours: parsedWorkingHours,
      })
    : defaultSettings;

  return NextResponse.json({
    settings,
    slots: settings.enabled ? createAvailableSlots(settings) : [],
  });
}

export async function PATCH(request: Request) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can change booking settings." },
      { status: 403 },
    );
  }
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

  const allowedDays = parsed.data.allowedDays ?? parsed.data.workingHours.weekdays;
  const enrichedWorkingHours = {
    ...parsed.data.workingHours,
    weekdays: allowedDays,
    bufferMinutes: parsed.data.bufferMinutes,
    allowedDays,
    handoffFallback: parsed.data.handoffFallback,
    notificationChannel: parsed.data.notificationChannel,
  };

  await db
    .update(widget)
    .set({
      bookingEnabled: parsed.data.enabled,
      bookingTimezone: parsed.data.timezone,
      bookingDurationMinutes: parsed.data.durationMinutes,
      bookingMinimumNoticeMinutes: parsed.data.minimumNoticeMinutes,
      bookingWorkingHours: JSON.stringify(enrichedWorkingHours),
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(widget.id, existing.id), eq(widget.workspaceId, workspace.id)));

  return NextResponse.json({ settings: parsed.data, slots: createAvailableSlots(parsed.data) });
}
