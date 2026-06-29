"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { executeIntegrationAction } from "@/features/integrations/server/execute-action";
import { getIntegrationTool } from "@/features/integrations/server/tool-registry";
import { eq } from "drizzle-orm";
import { conversation as conversationTable } from "@/lib/db/schema";
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

  if (tool.actionType === "conversation.assign") {
    const membershipId = typeof payload.membershipId === "string" ? payload.membershipId : null;
    if (!membershipId) {
      return { error: "Select a teammate to assign." };
    }

    await db
      .update(conversationTable)
      .set({
        assignedMemberId: membershipId,
        status: "ASSIGNED",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(conversationTable.id, conversation.id));

    revalidatePath("/conversations");
    return { savedAt: Date.now() };
  }

  if (tool.actionType === "conversation.note") {
    const message = typeof payload.message === "string" ? payload.message.trim() : "";
    if (!message) {
      return { error: "Enter a note before saving." };
    }

    const conv = await db.query.conversation.findFirst({
      where: (fields, { eq }) => eq(fields.id, conversation.id),
      columns: { messages: true },
    });

    if (conv) {
      const messagesList = JSON.parse(conv.messages || "[]") as MessageJson[];
      const newMessage: MessageJson = {
        id: randomUUID(),
        body: message,
        authorType: "TEAM",
        visibility: "INTERNAL",
        createdAt: new Date().toISOString(),
      };
      await db
        .update(conversationTable)
        .set({
          messages: JSON.stringify([...messagesList, newMessage]),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(conversationTable.id, conversation.id));
    }

    revalidatePath("/conversations");
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

  revalidatePath("/integrations");
  revalidatePath("/conversations");
  return { savedAt: Date.now() };
}
