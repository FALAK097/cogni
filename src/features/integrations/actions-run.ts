"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createApprovalRequest } from "@/features/integrations/server/approval-service";
import { executeApprovedTool } from "@/features/integrations/server/tool-executor";
import { getIntegrationTool } from "@/features/integrations/server/tool-registry";
import { requireAuth, requireDashboardContext } from "@/lib/auth/dashboard-context";

export type IntegrationRunState = {
  error?: string;
  savedAt?: number;
};

const runToolSchema = z.object({
  actionType: z.string().min(1),
  conversationId: z.string().min(1),
  payload: z.string().optional(),
});

export async function runIntegrationToolAction(
  _previousState: IntegrationRunState,
  formData: FormData,
): Promise<IntegrationRunState> {
  await requireAuth();
  const { db, session, workspace } = await requireDashboardContext();

  const parsed = runToolSchema.safeParse({
    actionType: formData.get("actionType"),
    conversationId: formData.get("conversationId"),
    payload: formData.get("payload") ?? "{}",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid action." };
  }

  const tool = getIntegrationTool(parsed.data.actionType);
  if (!tool) {
    return { error: "Unknown integration action." };
  }

  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, parsed.data.conversationId), eq(fields.workspaceId, workspace.id)),
    with: { contact: true },
  });

  if (!conversation) {
    return { error: "Conversation not found." };
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(parsed.data.payload ?? "{}") as Record<string, unknown>;
  } catch {
    return { error: "Action payload must be valid JSON." };
  }

  const input = { conversationId: conversation.id, ...payload };
  if (tool.requiresApproval) {
    await createApprovalRequest({
      db,
      workspaceId: workspace.id,
      conversationId: conversation.id,
      actionType: tool.actionType,
      input,
      summary: tool.label,
    });
  } else {
    await executeApprovedTool({
      db,
      workspaceId: workspace.id,
      actionType: tool.actionType,
      input,
      idempotencyKey: `dashboard:${session.user.id}:${crypto.randomUUID()}`,
      requestedById: session.user.id,
    });
  }

  revalidatePath("/integrations");
  revalidatePath("/conversations");
  return { savedAt: Date.now() };
}
