"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { executeIntegrationAction } from "@/features/integrations/server/execute-action";
import { getIntegrationTool } from "@/features/integrations/server/tool-registry";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

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

  const { db, session, workspace } = await requireDashboardContext();
  const conversation = await db.conversation.findFirst({
    where: {
      id: parsed.data.conversationId,
      workspaceId: workspace.id,
    },
    include: { contact: true },
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

  if (tool.actionType === "conversation.assign") {
    const membershipId = typeof payload.membershipId === "string" ? payload.membershipId : null;
    if (!membershipId) {
      return { error: "Select a teammate to assign." };
    }

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedMembershipId: membershipId,
        status: "ASSIGNED",
      },
    });

    revalidatePath(`/dashboard/inbox/${conversation.id}`);
    return { savedAt: Date.now() };
  }

  if (tool.actionType === "conversation.note") {
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    if (!message) {
      return { error: "Enter a note before saving." };
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        body: message,
        authorType: "TEAM",
        authorUserId: session.user.id,
        visibility: "INTERNAL",
      },
    });

    revalidatePath(`/dashboard/inbox/${conversation.id}`);
    return { savedAt: Date.now() };
  }

  await executeIntegrationAction({
    db,
    workspaceId: workspace.id,
    provider: tool.provider,
    actionType: tool.actionType,
    requestedById: session.user.id,
    payload: {
      conversationId: conversation.id,
      contactEmail: conversation.contact.email,
      contactName: conversation.contact.name,
      ...payload,
    },
  });

  revalidatePath("/dashboard/integrations");
  revalidatePath(`/dashboard/inbox/${conversation.id}`);
  return { savedAt: Date.now() };
}
