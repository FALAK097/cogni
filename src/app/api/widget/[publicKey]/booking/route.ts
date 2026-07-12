import { z } from "zod";

import {
  bookingSettingsInputSchema,
  createAvailableSlots,
} from "@/features/integrations/server/booking";
import {
  assertPublicWidgetAccess,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import {
  getRequestOrigin,
  widgetPreflightResponse,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";
import { createWorkflowWithSteps } from "@/lib/workflows/runner";

type RouteContext = { params: Promise<{ publicKey: string }> };

const confirmBookingSchema = z.object({
  conversationId: z.string().min(1),
  startAt: z.iso.datetime(),
  endAt: z.iso.datetime(),
  attendeeEmail: z.email(),
  title: z.string().trim().min(1).max(200).default("Customer meeting"),
});

export function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}

async function getBookingContext(request: Request, publicKey: string) {
  const db = getDb();
  const access = await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return { error: access.error };
  const visitor = await requireAuthorizedVisitorSession(db, publicKey, request);
  if ("error" in visitor) return { error: visitor.error };
  const saved = access.widget;
  if (!saved.bookingEnabled) {
    return { error: Response.json({ error: "Booking is unavailable." }, { status: 404 }) };
  }
  const settings = bookingSettingsInputSchema.parse({
    enabled: saved.bookingEnabled,
    timezone: saved.bookingTimezone,
    durationMinutes: saved.bookingDurationMinutes,
    minimumNoticeMinutes: saved.bookingMinimumNoticeMinutes,
    workingHours: JSON.parse(saved.bookingWorkingHours) as unknown,
  });
  return { db, access, visitor, settings };
}

function corsResponse(request: Request, allowedDomains: string[], body: unknown, status = 200) {
  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json(body, { status }),
    origin,
    validateEmbedOrigin(origin, allowedDomains),
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { publicKey } = await context.params;
  const result = await getBookingContext(request, publicKey);
  if ("error" in result) return result.error;
  return corsResponse(request, result.access.allowedDomains, {
    timezone: result.settings.timezone,
    durationMinutes: result.settings.durationMinutes,
    slots: createAvailableSlots(result.settings),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { publicKey } = await context.params;
  const result = await getBookingContext(request, publicKey);
  if ("error" in result) return result.error;
  const parsed = confirmBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return corsResponse(request, result.access.allowedDomains, { error: "Invalid booking." }, 400);
  }
  const conversation = await result.db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.id, parsed.data.conversationId),
        eq(fields.workspaceId, result.access.widget.workspaceId),
        eq(fields.visitorSessionId, result.visitor.session.id),
      ),
    columns: { id: true },
  });
  if (!conversation) {
    return corsResponse(
      request,
      result.access.allowedDomains,
      { error: "Conversation not found." },
      404,
    );
  }
  const validSlot = createAvailableSlots(result.settings).some(
    (slot) => slot.startAt === parsed.data.startAt && slot.endAt === parsed.data.endAt,
  );
  if (!validSlot) {
    return corsResponse(
      request,
      result.access.allowedDomains,
      { error: "Slot is no longer available." },
      409,
    );
  }

  const workflow = await createWorkflowWithSteps({
    db: result.db,
    workspaceId: result.access.widget.workspaceId,
    conversationId: conversation.id,
    name: "appointment.booking",
    idempotencyKey: `booking:${conversation.id}:${parsed.data.startAt}`,
    input: parsed.data,
    steps: [
      {
        name: "Approve and create calendar event",
        kind: "ACTION",
        input: {
          actionType: "calendar.create",
          payload: {
            conversationId: conversation.id,
            title: parsed.data.title,
            startAt: parsed.data.startAt,
            endAt: parsed.data.endAt,
            attendeeEmail: parsed.data.attendeeEmail,
            timezone: result.settings.timezone,
          },
        },
      },
      {
        name: "Send booking confirmation",
        kind: "MESSAGE",
        input: { startAt: parsed.data.startAt, attendeeEmail: parsed.data.attendeeEmail },
      },
    ],
  });
  return corsResponse(request, result.access.allowedDomains, {
    workflowId: workflow.run.id,
    status: "PENDING_TEAM_APPROVAL",
    message: "Your requested time is reserved pending team confirmation.",
  });
}
