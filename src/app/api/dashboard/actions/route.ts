import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createApprovalRequest,
  getApprovalToken,
} from "@/features/integrations/server/approval-service";
import {
  ACTION_OUTCOME_UNKNOWN_MESSAGE,
  getActionStatusForDisplay,
} from "@/features/integrations/action-recovery";
import { executeApprovedTool } from "@/features/integrations/server/tool-executor";
import { parseToolInput } from "@/features/integrations/server/tool-registry";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { canManageWorkspace } from "@/lib/auth/permissions";

const proposeActionSchema = z.object({
  actionType: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
  summary: z.string().trim().min(1).max(500),
  conversationId: z.string().min(1),
  agentRunId: z.string().min(1).optional(),
});

export async function GET() {
  const { db, workspace, membership } = await requireDashboardContext();
  const canManage = canManageWorkspace(membership.role);
  const approvals = await db.query.approvalRequest.findMany({
    where: (fields, { and, eq, gt, or }) =>
      and(
        eq(fields.workspaceId, workspace.id),
        or(eq(fields.status, "PENDING"), eq(fields.status, "APPROVED")),
        gt(fields.expiresAt, new Date().toISOString()),
      ),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: 100,
  });
  const actionable = await Promise.all(
    approvals.map(async (approval) => {
      if (approval.status === "PENDING") {
        return { approval, actionStatus: null, actionErrorMessage: null };
      }
      const action = await db.query.integrationAction.findFirst({
        where: (fields, { and, eq }) =>
          and(
            eq(fields.workspaceId, workspace.id),
            eq(fields.idempotencyKey, `approval:${approval.id}`),
          ),
        columns: { status: true, provider: true, actionType: true, errorMessage: true },
      });
      const actionStatus = action
        ? getActionStatusForDisplay(action.status, action.provider, action.actionType)
        : null;
      if (actionStatus === "COMPLETED" || actionStatus === "RUNNING") return null;
      return {
        approval,
        actionStatus,
        actionErrorMessage:
          actionStatus === "UNKNOWN"
            ? ACTION_OUTCOME_UNKNOWN_MESSAGE
            : (action?.errorMessage ?? null),
      };
    }),
  );
  return NextResponse.json({
    approvals: actionable
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
      .map(({ approval, actionStatus, actionErrorMessage }) => ({
        ...approval,
        actionStatus,
        actionErrorMessage,
        token: canManage ? getApprovalToken(approval) : null,
        tokenHash: undefined,
      })),
  });
}

export async function POST(request: Request) {
  const { db, session, workspace, membership } = await requireDashboardContext();
  const parsed = proposeActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, parsed.data.conversationId), eq(fields.workspaceId, workspace.id)),
    columns: { id: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  try {
    const parsedTool = parseToolInput(parsed.data.actionType, parsed.data.input);
    if (!parsedTool.tool.requiresApproval) {
      if (!canManageWorkspace(membership.role)) {
        return NextResponse.json(
          { error: "Only workspace owners can run actions that do not require approval." },
          { status: 403 },
        );
      }
      const action = await executeApprovedTool({
        db,
        workspaceId: workspace.id,
        actionType: parsedTool.tool.actionType,
        input: parsedTool.input,
        idempotencyKey: `dashboard:${session.user.id}:${crypto.randomUUID()}`,
        requestedById: session.user.id,
      });
      return NextResponse.json({ action, approval: null });
    }
    const result = await createApprovalRequest({
      db,
      workspaceId: workspace.id,
      actionType: parsed.data.actionType,
      input: parsed.data.input,
      summary: parsed.data.summary,
      conversationId: conversation.id,
      agentRunId: parsed.data.agentRunId,
    });
    return NextResponse.json({
      approval: {
        id: result.approval.id,
        actionType: result.approval.actionType,
        riskLevel: result.approval.riskLevel,
        summary: result.approval.summary,
        status: result.approval.status,
        expiresAt: result.approval.expiresAt,
        token: result.token,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not propose action." },
      { status: 400 },
    );
  }
}
