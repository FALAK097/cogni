import { NextResponse } from "next/server";
import { z } from "zod";

import { decideApprovalRequest } from "@/features/integrations/server/approval-service";
import { executeApprovedTool } from "@/features/integrations/server/tool-executor";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { completeWorkflowRun, updateWorkflowStep } from "@/lib/workflows/runner";
import { approvalRequest, workflowRun } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type RouteContext = { params: Promise<{ approval_id: string }> };

const decisionSchema = z.object({
  token: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(request: Request, context: RouteContext) {
  const { db, session, workspace } = await requireDashboardContext();
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
    if (parsed.data.decision === "REJECTED") {
      if (approval.workflowRunId && approval.workflowStepId) {
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
        await completeWorkflowRun({
          db,
          workspaceId: workspace.id,
          runId: approval.workflowRunId,
          output: { actionId: action.id },
        });
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
