import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createApprovalRequest,
  getApprovalToken,
} from "@/features/integrations/server/approval-service";
import { executeApprovedTool } from "@/features/integrations/server/tool-executor";
import { parseToolInput } from "@/features/integrations/server/tool-registry";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

const proposeActionSchema = z.object({
  actionType: z.string().min(1),
  input: z.record(z.string(), z.unknown()),
  summary: z.string().trim().min(1).max(500),
  conversationId: z.string().min(1),
  agentRunId: z.string().min(1).optional(),
});

export async function GET() {
  const { db, workspace } = await requireDashboardContext();
  const approvals = await db.query.approvalRequest.findMany({
    where: (fields, { and, eq, gt }) =>
      and(
        eq(fields.workspaceId, workspace.id),
        eq(fields.status, "PENDING"),
        gt(fields.expiresAt, new Date().toISOString()),
      ),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit: 100,
  });
  return NextResponse.json({
    approvals: approvals.map((approval) => ({
      ...approval,
      token: getApprovalToken(approval),
      tokenHash: undefined,
    })),
  });
}

export async function POST(request: Request) {
  const { db, session, workspace } = await requireDashboardContext();
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
