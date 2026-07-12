import { NextResponse } from "next/server";
import { z } from "zod";

import { decideApprovalRequest } from "@/features/integrations/server/approval-service";
import { executeApprovedTool } from "@/features/integrations/server/tool-executor";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { updateWorkflowStep } from "@/lib/workflows/runner";
import { workflowRun } from "@/lib/db/schema";
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
              eq(workflowRun.id, approval.workflowRunId),
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
      await db
        .update(workflowRun)
        .set({ status: "RUNNING" })
        .where(
          and(
            eq(workflowRun.id, approval.workflowRunId),
            eq(workflowRun.workspaceId, workspace.id),
          ),
        );
    }
    return NextResponse.json({ approval, action });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not process approval." },
      { status: 400 },
    );
  }
}
