import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { createApprovalRequest } from "@/features/integrations/server/approval-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";
import { workflowRun } from "@/lib/db/schema";
import { completeWorkflowRun, updateWorkflowStep } from "@/lib/workflows/runner";
import { getWorkflowProgression } from "@/lib/workflows/progression";

type RouteContext = { params: Promise<{ workflow_id: string }> };

const advanceSchema = z.object({
  stepId: z.string().min(1).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  if (!canManageWorkspace(membership.role)) {
    return NextResponse.json(
      { error: "Only workspace owners can advance workflows." },
      { status: 403 },
    );
  }
  const { workflow_id: workflowId } = await context.params;
  const parsed = advanceSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid workflow step." }, { status: 400 });

  const run = await db.query.workflowRun.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, workflowId), eq(fields.workspaceId, workspace.id)),
  });
  if (!run) return NextResponse.json({ error: "Workflow not found." }, { status: 404 });
  if (["COMPLETED", "CANCELLED", "DEAD"].includes(run.status)) {
    return NextResponse.json({ error: "Workflow is already terminal." }, { status: 409 });
  }
  if (run.status !== "RUNNING") {
    return NextResponse.json({ error: "Workflow is waiting for another step." }, { status: 409 });
  }

  const steps = await db.query.workflowStep.findMany({
    where: (fields, { eq, and }) =>
      and(eq(fields.workflowRunId, run.id), eq(fields.workspaceId, workspace.id)),
    orderBy: (fields, { asc }) => [asc(fields.position)],
  });
  const progression = getWorkflowProgression(steps, parsed.data.stepId);
  if (progression.kind === "blocked") {
    return NextResponse.json(
      { error: "Complete or resolve the current workflow step before continuing." },
      { status: 409 },
    );
  }
  if (progression.kind === "out-of-order") {
    return NextResponse.json(
      { error: "Workflow steps must be completed in order." },
      { status: 409 },
    );
  }
  if (progression.kind === "complete") {
    await completeWorkflowRun({ db, workspaceId: workspace.id, runId: run.id });
    return NextResponse.json({ status: "COMPLETED" });
  }
  const step = progression.step;
  if (step.status !== "PENDING") {
    return NextResponse.json({ error: "Step is not pending." }, { status: 409 });
  }

  const input = JSON.parse(step.input) as Record<string, unknown>;
  if (step.kind === "ACTION" || step.kind === "APPROVAL") {
    const actionType = typeof input.actionType === "string" ? input.actionType : "";
    const actionInput = input.payload;
    const result = await createApprovalRequest({
      db,
      workspaceId: workspace.id,
      conversationId: run.conversationId ?? undefined,
      workflowRunId: run.id,
      workflowStepId: step.id,
      actionType,
      input: actionInput,
      summary: step.name,
    });
    await updateWorkflowStep({
      db,
      workspaceId: workspace.id,
      runId: run.id,
      stepId: step.id,
      status: "WAITING_APPROVAL",
      output: { approvalId: result.approval.id },
    });
    await db
      .update(workflowRun)
      .set({ status: "WAITING_APPROVAL" })
      .where(and(eq(workflowRun.id, run.id), eq(workflowRun.workspaceId, workspace.id)));
    return NextResponse.json({ approval: { ...result.approval, token: result.token } });
  }

  await updateWorkflowStep({
    db,
    workspaceId: workspace.id,
    runId: run.id,
    stepId: step.id,
    status: "COMPLETED",
    output: input,
  });
  return NextResponse.json({ stepId: step.id, status: "COMPLETED" });
}
