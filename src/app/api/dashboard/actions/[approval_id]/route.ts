import { NextResponse } from "next/server";
import { z } from "zod";

import { decideApprovalRequest } from "@/features/integrations/server/approval-service";
import { executeApprovedTool } from "@/features/integrations/server/tool-executor";
import {
  type AppointmentNotificationPayload,
  appointmentWorkflowInputSchema,
} from "@/features/integrations/server/booking";
import { appendConversationMessage } from "@/features/conversations/server/conversation-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { completeWorkflowRun, updateWorkflowStep } from "@/lib/workflows/runner";
import { approvalRequest, workflowRun } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { emitDomainEvent } from "@/lib/events/domain-events";

type RouteContext = { params: Promise<{ approval_id: string }> };

const decisionSchema = z.object({
  token: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

function formatAppointmentTime(startAt: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(startAt));
}

export async function PATCH(request: Request, context: RouteContext) {
  const { db, session, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can approve actions." },
      { status: 403 },
    );
  }
  const { approval_id: approvalId } = await context.params;
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid approval decision." }, { status: 400 });
  }

  try {
    const approval = await decideApprovalRequest({
      db,
      workspaceId: workspace.id,
      approvalId,
      token: parsed.data.token,
      decision: parsed.data.decision,
      userId: session.user.id,
    });
    if (approval.status !== parsed.data.decision) {
      throw new Error(`This action was already ${approval.status.toLowerCase()}.`);
    }
    if (parsed.data.decision === "REJECTED") {
      if (approval.workflowRunId && approval.workflowStepId) {
        const bookingRun = await db.query.workflowRun.findFirst({
          where: (fields, { and, eq }) =>
            and(eq(fields.id, approval.workflowRunId!), eq(fields.workspaceId, workspace.id)),
          columns: { id: true, name: true, input: true, conversationId: true },
        });
        await updateWorkflowStep({
          db,
          workspaceId: workspace.id,
          runId: approval.workflowRunId,
          stepId: approval.workflowStepId,
          status: "CANCELLED",
          errorMessage: "Action rejected by teammate.",
        });
        await db
          .update(workflowRun)
          .set({ status: "CANCELLED", finishedAt: new Date().toISOString() })
          .where(
            and(
              eq(workflowRun.id, approval.workflowRunId!),
              eq(workflowRun.workspaceId, workspace.id),
            ),
          );

        if (bookingRun?.name === "appointment.booking" && bookingRun.conversationId) {
          const booking = appointmentWorkflowInputSchema.safeParse(
            JSON.parse(bookingRun.input) as unknown,
          );
          if (booking.success) {
            await appendConversationMessage({
              db,
              workspaceId: workspace.id,
              conversationId: bookingRun.conversationId,
              message: {
                id: crypto.randomUUID(),
                body: booking.data.handoffFallback,
                authorType: "AI",
                authorName: "Assistant",
                visibility: "PUBLIC",
                createdAt: new Date().toISOString(),
              },
              updateLastMessageAt: true,
            });
            const notificationPayload = {
              workflowRunId: bookingRun.id,
              conversationId: bookingRun.conversationId,
              title: booking.data.title,
              startAt: booking.data.startAt,
              endAt: booking.data.endAt,
              attendeeEmail: booking.data.attendeeEmail,
              timezone: booking.data.timezone,
              status: "CANCELLED",
              notificationChannel: booking.data.notificationChannel,
            } satisfies AppointmentNotificationPayload;
            await emitDomainEvent({
              db,
              workspaceId: workspace.id,
              type: "appointment.booking_cancelled",
              entityId: bookingRun.id,
              payload: notificationPayload,
            });
          }
        }
      }
      return NextResponse.json({ approval, action: null });
    }
    const action = await executeApprovedTool({
      db,
      workspaceId: workspace.id,
      actionType: approval.actionType,
      input: JSON.parse(approval.payload) as unknown,
      idempotencyKey: `approval:${approval.id}`,
      requestedById: session.user.id,
    });
    if (approval.workflowRunId && approval.workflowStepId) {
      await updateWorkflowStep({
        db,
        workspaceId: workspace.id,
        runId: approval.workflowRunId,
        stepId: approval.workflowStepId,
        status: "COMPLETED",
        output: { actionId: action.id, result: action.result },
      });
      const pendingStep = await db.query.workflowStep.findFirst({
        where: (fields, { and, eq }) =>
          and(
            eq(fields.workflowRunId, approval.workflowRunId!),
            eq(fields.workspaceId, workspace.id),
            eq(fields.status, "PENDING"),
          ),
        orderBy: (fields, { asc }) => [asc(fields.position)],
      });
      if (pendingStep?.kind === "MESSAGE") {
        const confirmation = z
          .object({
            actionType: z.literal("email.send"),
            payload: z.unknown(),
          })
          .parse(JSON.parse(pendingStep.input) as unknown);
        try {
          const confirmationAction = await executeApprovedTool({
            db,
            workspaceId: workspace.id,
            actionType: confirmation.actionType,
            input: confirmation.payload,
            idempotencyKey: `workflow-step:${pendingStep.id}`,
            requestedById: session.user.id,
          });
          await updateWorkflowStep({
            db,
            workspaceId: workspace.id,
            runId: approval.workflowRunId,
            stepId: pendingStep.id,
            status: "COMPLETED",
            output: {
              actionId: confirmationAction.id,
              result: confirmationAction.result,
            },
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Booking confirmation email failed.";
          await db.transaction(async (tx) => {
            await tx
              .update(approvalRequest)
              .set({ status: "PENDING", decidedAt: null, decidedByUserId: null })
              .where(
                and(
                  eq(approvalRequest.id, approval.id),
                  eq(approvalRequest.workspaceId, workspace.id),
                ),
              );
            await tx
              .update(workflowRun)
              .set({ status: "WAITING_APPROVAL", errorMessage: message, finishedAt: null })
              .where(
                and(
                  eq(workflowRun.id, approval.workflowRunId!),
                  eq(workflowRun.workspaceId, workspace.id),
                ),
              );
          });
          throw new Error(message + " You can retry this approval.");
        }
      }
      const remainingStep = await db.query.workflowStep.findFirst({
        where: (fields, { and, eq }) =>
          and(
            eq(fields.workflowRunId, approval.workflowRunId!),
            eq(fields.workspaceId, workspace.id),
            eq(fields.status, "PENDING"),
          ),
      });
      if (remainingStep) {
        await db
          .update(workflowRun)
          .set({ status: "RUNNING" })
          .where(
            and(
              eq(workflowRun.id, approval.workflowRunId!),
              eq(workflowRun.workspaceId, workspace.id),
            ),
          );
      } else {
        const completedRun = await completeWorkflowRun({
          db,
          workspaceId: workspace.id,
          runId: approval.workflowRunId,
          output: { actionId: action.id },
        });
        if (completedRun.name === "appointment.booking" && completedRun.conversationId) {
          const booking = appointmentWorkflowInputSchema.safeParse(
            JSON.parse(completedRun.input) as unknown,
          );
          if (booking.success) {
            await appendConversationMessage({
              db,
              workspaceId: workspace.id,
              conversationId: completedRun.conversationId,
              message: {
                id: crypto.randomUUID(),
                body: `Appointment confirmed: ${booking.data.title} on ${formatAppointmentTime(booking.data.startAt, booking.data.timezone)}. A confirmation email has been sent to ${booking.data.attendeeEmail}.`,
                authorType: "AI",
                authorName: "Assistant",
                visibility: "PUBLIC",
                createdAt: new Date().toISOString(),
              },
              updateLastMessageAt: true,
            });
            const notificationPayload = {
              workflowRunId: completedRun.id,
              conversationId: completedRun.conversationId,
              title: booking.data.title,
              startAt: booking.data.startAt,
              endAt: booking.data.endAt,
              attendeeEmail: booking.data.attendeeEmail,
              timezone: booking.data.timezone,
              status: "CONFIRMED",
              notificationChannel: booking.data.notificationChannel,
            } satisfies AppointmentNotificationPayload;
            await emitDomainEvent({
              db,
              workspaceId: workspace.id,
              type: "appointment.booked",
              entityId: completedRun.id,
              payload: notificationPayload,
            });
          }
        }
      }
    }
    return NextResponse.json({ approval, action });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not process approval." },
      { status: 400 },
    );
  }
}
