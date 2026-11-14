import { formatInTimeZone } from "date-fns-tz";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { verifyWidgetBootstrapToken } from "@/features/widget/server/widget-bootstrap";

import {
  type AppointmentNotificationPayload,
  type AppointmentWorkflowInput,
  type BookingSettings,
  appointmentWorkflowInputSchema,
  bookingSettingsInputSchema,
} from "@/features/integrations/server/booking";
import { getCalendarAdapter } from "@/features/integrations/server/calendar-adapter";
import {
  assertPublicWidgetAccess,
  assertPreviewWidgetAccess,
  bearerToken,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import {
  getRequestOrigin,
  widgetPreflightResponse,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { type Db, getDb, runDbWriteOperation } from "@/lib/db/client";
import { createApprovalRequest } from "@/features/integrations/server/approval-service";
import { createWorkflowWithSteps, updateWorkflowStep } from "@/lib/workflows/runner";
import { approvalRequest, workflowRun, workflowStep } from "@/lib/db/schema";
import { emitDomainEvent } from "@/lib/events/domain-events";
import { notifyWorkspaceMembers } from "@/lib/notifications/create-notification";
import {
  appendConversationMessage,
  startVisitorConversation,
} from "@/features/conversations/server/conversation-service";

type RouteContext = { params: Promise<{ publicKey: string }> };

const confirmBookingSchema = appointmentWorkflowInputSchema
  .omit({
    handoffFallback: true,
    notificationChannel: true,
    timezone: true,
    conversationId: true,
  })
  .extend({ sessionId: z.string().uuid(), interactionId: z.string().uuid() });

export function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}

async function getBookingContext(request: Request, publicKey: string) {
  const db = getDb();
  const preview = new URL(request.url).searchParams.get("preview") === "true";
  const access = preview
    ? await assertPreviewWidgetAccess(db, publicKey, request)
    : await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return { error: access.error };
  const visitor = await requireAuthorizedVisitorSession(db, publicKey, request);
  const token = bearerToken(request);
  const bootstrap = token ? verifyWidgetBootstrapToken(token) : null;
  if (
    "error" in visitor &&
    (!bootstrap || bootstrap.widgetId !== access.widget.id || bootstrap.publicKey !== publicKey)
  ) {
    return { error: visitor.error };
  }
  const settings = bookingSettingsInputSchema.parse(access.bookingSettings);
  if (!settings.enabled) {
    return { error: Response.json({ error: "Booking is unavailable." }, { status: 404 }) };
  }
  return { db, access, visitor: "error" in visitor ? null : visitor, bootstrap, settings, preview };
}

function corsResponse(request: Request, allowedDomains: string[], body: unknown, status = 200) {
  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json(body, { status }),
    origin,
    validateEmbedOrigin(origin, allowedDomains),
  );
}

async function getAvailableSlots(
  db: Db,
  workspaceId: string,
  settings: BookingSettings,
  includeReserved = false,
) {
  const adapter = await getCalendarAdapter(workspaceId, db);
  const rangeStart = new Date(Date.now() + settings.minimumNoticeMinutes * 60_000);
  const rangeEnd = new Date(rangeStart.getTime() + 14 * 24 * 60 * 60_000);
  const availability = await adapter.findAvailability({
    startAt: rangeStart.toISOString(),
    endAt: rangeEnd.toISOString(),
    timezone: settings.timezone,
    durationMinutes: settings.durationMinutes,
    bufferMinutes: settings.bufferMinutes,
    allowedDays: settings.allowedDays ?? settings.workingHours.weekdays,
    workingHours: settings.workingHours,
  });
  if (includeReserved || availability.freeSlots.length === 0) return availability.freeSlots;
  const reservations = await db.query.workflowRun.findMany({
    where: (fields, { and, eq, inArray }) =>
      and(
        eq(fields.workspaceId, workspaceId),
        eq(fields.name, "appointment.booking"),
        inArray(
          fields.idempotencyKey,
          availability.freeSlots.map((slot) => `booking:${workspaceId}:${slot.startAt}`),
        ),
      ),
    columns: { idempotencyKey: true },
  });
  const reserved = new Set(reservations.map((run) => run.idempotencyKey));
  return availability.freeSlots.filter(
    (slot) => !reserved.has(`booking:${workspaceId}:${slot.startAt}`),
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { publicKey } = await context.params;
  const result = await getBookingContext(request, publicKey);
  if ("error" in result) return result.error;
  const slots = await getAvailableSlots(
    result.db,
    result.access.widget.workspaceId,
    result.settings,
  );
  return corsResponse(request, result.access.allowedDomains, {
    enabled: result.settings.enabled,
    timezone: result.settings.timezone,
    durationMinutes: result.settings.durationMinutes,
    bufferMinutes: result.settings.bufferMinutes,
    handoffFallback: result.settings.handoffFallback,
    slots,
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
  const authorizedBrowserSessionId =
    result.visitor?.session.browserSessionId ?? result.bootstrap?.browserSessionId;
  if (authorizedBrowserSessionId !== parsed.data.sessionId) {
    return corsResponse(
      request,
      result.access.allowedDomains,
      { error: "Invalid widget session." },
      401,
    );
  }
  const availableSlots = await getAvailableSlots(
    result.db,
    result.access.widget.workspaceId,
    result.settings,
    true,
  );
  const validSlot = availableSlots.some(
    (slot) => slot.startAt === parsed.data.startAt && slot.endAt === parsed.data.endAt,
  );
  if (!validSlot) {
    return corsResponse(
      request,
      result.access.allowedDomains,
      {
        error: "Slot is no longer available.",
        fallbackMessage: result.settings.handoffFallback,
      },
      409,
    );
  }

  if (result.preview) {
    return corsResponse(request, result.access.allowedDomains, {
      status: "PREVIEW",
      message: "Preview only. No appointment request was created.",
    });
  }

  const started = result.visitor
    ? null
    : result.bootstrap
      ? await startVisitorConversation({
          db: result.db,
          widget: result.access.widget,
          hostname: result.bootstrap.hostname,
          browserSessionId: result.bootstrap.browserSessionId,
          visitorId: result.bootstrap.visitorId,
          identity: { name: null, email: parsed.data.attendeeEmail },
          metadata: {
            pageUrl: null,
            referrer: null,
            browser: null,
            deviceType: null,
            os: null,
            country: null,
            city: null,
            timezone: result.settings.timezone,
            language: null,
            screenSize: null,
          },
          text: `Appointment request: ${parsed.data.title}`,
          clientMessageId: parsed.data.interactionId,
        })
      : null;
  const visitorSession = result.visitor?.session ?? started?.visitorSession;
  if (!visitorSession) {
    return corsResponse(
      request,
      result.access.allowedDomains,
      { error: "Widget session is required." },
      401,
    );
  }
  const conversation = await result.db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.workspaceId, result.access.widget.workspaceId),
        eq(fields.visitorSessionId, visitorSession.id),
      ),
    orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
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
  const workspaceId = result.access.widget.workspaceId;
  const idempotencyKey = `booking:${workspaceId}:${parsed.data.startAt}`;
  const workflowInput = {
    conversationId: conversation.id,
    title: parsed.data.title,
    startAt: parsed.data.startAt,
    endAt: parsed.data.endAt,
    attendeeEmail: parsed.data.attendeeEmail,
    timezone: result.settings.timezone,
    handoffFallback: result.settings.handoffFallback,
    notificationChannel: result.settings.notificationChannel,
  } satisfies AppointmentWorkflowInput;
  const calendarPayload = {
    conversationId: conversation.id,
    title: parsed.data.title,
    startAt: parsed.data.startAt,
    endAt: parsed.data.endAt,
    attendeeEmail: parsed.data.attendeeEmail,
    timezone: result.settings.timezone,
  };
  const confirmationPayload = {
    conversationId: conversation.id,
    to: parsed.data.attendeeEmail,
    subject: `Confirmed: ${parsed.data.title}`,
    text: `Your appointment is confirmed for ${parsed.data.startAt} to ${parsed.data.endAt} (${result.settings.timezone}). Reply to this email if you need to make a change.`,
  };
  const existing = await result.db.query.workflowRun.findFirst({
    where: (fields, { and, eq }) =>
      and(eq(fields.workspaceId, workspaceId), eq(fields.idempotencyKey, idempotencyKey)),
  });
  if (existing) {
    const sameRequest =
      JSON.stringify(JSON.parse(existing.input)) === JSON.stringify(workflowInput);
    if (
      !sameRequest &&
      existing.conversationId === conversation.id &&
      existing.status === "WAITING_APPROVAL"
    ) {
      const corrected = await runDbWriteOperation(result.db, async (tx) => {
        const [pendingApproval] = await tx
          .update(approvalRequest)
          .set({
            payload: JSON.stringify(calendarPayload),
            summary: `Create calendar event and email confirmation to ${parsed.data.attendeeEmail}`,
          })
          .where(
            and(
              eq(approvalRequest.workflowRunId, existing.id),
              eq(approvalRequest.workspaceId, workspaceId),
              eq(approvalRequest.status, "PENDING"),
            ),
          )
          .returning({ id: approvalRequest.id });
        if (!pendingApproval) return false;
        await tx
          .update(workflowRun)
          .set({ input: JSON.stringify(workflowInput) })
          .where(and(eq(workflowRun.id, existing.id), eq(workflowRun.workspaceId, workspaceId)));
        await tx
          .update(workflowStep)
          .set({
            input: JSON.stringify({ actionType: "calendar.create", payload: calendarPayload }),
          })
          .where(
            and(
              eq(workflowStep.workflowRunId, existing.id),
              eq(workflowStep.workspaceId, workspaceId),
              eq(workflowStep.position, 0),
            ),
          );
        await tx
          .update(workflowStep)
          .set({
            input: JSON.stringify({ actionType: "email.send", payload: confirmationPayload }),
          })
          .where(
            and(
              eq(workflowStep.workflowRunId, existing.id),
              eq(workflowStep.workspaceId, workspaceId),
              eq(workflowStep.position, 1),
            ),
          );
        return true;
      });
      if (corrected) {
        return corsResponse(request, result.access.allowedDomains, {
          workflowId: existing.id,
          status: "PENDING_TEAM_APPROVAL",
          message: "Your pending booking details were updated.",
          appointment: calendarPayload,
          fallbackMessage: result.settings.handoffFallback,
        });
      }
    }
    return corsResponse(
      request,
      result.access.allowedDomains,
      {
        error: sameRequest
          ? "This booking request is already pending."
          : "Slot is already reserved.",
        workflowId: existing.id,
        fallbackMessage: result.settings.handoffFallback,
      },
      409,
    );
  }

  const workflow = await createWorkflowWithSteps({
    db: result.db,
    workspaceId,
    conversationId: conversation.id,
    name: "appointment.booking",
    idempotencyKey,
    input: workflowInput,
    steps: [
      {
        name: "Approve and create calendar event",
        kind: "ACTION",
        input: {
          actionType: "calendar.create",
          payload: calendarPayload,
        },
      },
      {
        name: "Send attendee confirmation",
        kind: "MESSAGE",
        input: {
          actionType: "email.send",
          payload: confirmationPayload,
        },
      },
    ],
  });
  if (!workflow.created) {
    return corsResponse(
      request,
      result.access.allowedDomains,
      {
        error: "Slot is already reserved.",
        workflowId: workflow.run.id,
        fallbackMessage: result.settings.handoffFallback,
      },
      409,
    );
  }
  const actionStep = workflow.steps[0];
  if (!actionStep) throw new Error("Booking workflow step was not created.");
  const actionInput = JSON.parse(actionStep.input) as {
    actionType: string;
    payload: unknown;
  };
  const approval = await createApprovalRequest({
    db: result.db,
    workspaceId,
    conversationId: conversation.id,
    workflowRunId: workflow.run.id,
    workflowStepId: actionStep.id,
    actionType: actionInput.actionType,
    input: actionInput.payload,
    summary: `Create calendar event and email confirmation to ${parsed.data.attendeeEmail}`,
  });
  if (!approval.created) {
    return corsResponse(
      request,
      result.access.allowedDomains,
      {
        error: "This booking request is already pending.",
        workflowId: workflow.run.id,
        fallbackMessage: result.settings.handoffFallback,
      },
      409,
    );
  }
  await updateWorkflowStep({
    db: result.db,
    workspaceId,
    runId: workflow.run.id,
    stepId: actionStep.id,
    status: "WAITING_APPROVAL",
    output: { approvalId: approval.approval.id },
  });
  await result.db
    .update(workflowRun)
    .set({ status: "WAITING_APPROVAL" })
    .where(and(eq(workflowRun.id, workflow.run.id), eq(workflowRun.workspaceId, workspaceId)));

  const notificationPayload = {
    workflowRunId: workflow.run.id,
    conversationId: conversation.id,
    title: parsed.data.title,
    startAt: parsed.data.startAt,
    endAt: parsed.data.endAt,
    attendeeEmail: parsed.data.attendeeEmail,
    timezone: result.settings.timezone,
    status: "REQUESTED",
    notificationChannel: result.settings.notificationChannel,
  } satisfies AppointmentNotificationPayload;

  await emitDomainEvent({
    db: result.db,
    workspaceId,
    type: "appointment.booking_requested",
    entityId: workflow.run.id,
    payload: notificationPayload,
  });

  await notifyWorkspaceMembers({
    db: result.db,
    workspaceId,
    type: "appointment.booking_requested",
    title: "New appointment requested",
    body: `${parsed.data.title} with ${parsed.data.attendeeEmail} for ${parsed.data.startAt}`,
  });

  const formattedTime = formatInTimeZone(
    parsed.data.startAt,
    result.settings.timezone,
    "EEE, MMM d, yyyy · h:mm a",
  );
  await appendConversationMessage({
    db: result.db,
    workspaceId,
    conversationId: conversation.id,
    message: {
      id: crypto.randomUUID(),
      body: `Appointment requested: ${parsed.data.title} on ${formattedTime} (${result.settings.timezone}). Our team has received your booking details and will confirm shortly.`,
      authorType: "AI",
      authorName: result.access.widget.displayName || "Assistant",
      visibility: "PUBLIC",
      createdAt: new Date().toISOString(),
    },
    updateLastMessageAt: true,
  });

  return corsResponse(request, result.access.allowedDomains, {
    sessionId: visitorSession.id,
    sessionToken: visitorSession.token,
    workflowId: workflow.run.id,
    status: "PENDING_TEAM_APPROVAL",
    message: "Your requested time is reserved pending team confirmation.",
    appointment: calendarPayload,
    fallbackMessage: result.settings.handoffFallback,
  });
}
