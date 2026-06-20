"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isConversationStatus } from "@/features/inbox/constants";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

export type InboxActionState = {
  error?: string;
  submittedAt?: number;
};

const createConversationSchema = z.object({
  contactName: z.string().trim().min(1, "Enter the customer name.").max(80),
  contactEmail: z.union([z.literal(""), z.email("Enter a valid email address.")]),
  subject: z.string().trim().min(1, "Enter a subject.").max(120),
  message: z.string().trim().min(1, "Enter the first message.").max(10_000),
});

const replySchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().trim().min(1, "Write a reply before sending.").max(10_000),
});

export async function createConversationAction(
  _previousState: InboxActionState,
  formData: FormData,
): Promise<InboxActionState> {
  const parsed = createConversationSchema.safeParse({
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the conversation details." };
  }

  const { db, membership, session, workspace } = await requireDashboardContext();
  const email = parsed.data.contactEmail || null;
  const existingContact = email
    ? await db.contact.findUnique({
        where: {
          workspaceId_email: {
            workspaceId: workspace.id,
            email,
          },
        },
      })
    : null;
  const contact =
    existingContact ??
    (await db.contact.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.data.contactName,
        email,
      },
    }));
  const conversation = await db.conversation.create({
    data: {
      workspaceId: workspace.id,
      contactId: contact.id,
      assignedMembershipId: membership.id,
      status: "ASSIGNED",
      channel: "MANUAL",
      subject: parsed.data.subject,
      messages: {
        create: {
          body: parsed.data.message,
          authorType: "TEAM",
          authorUserId: session.user.id,
        },
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  redirect(`/dashboard/inbox/${conversation.id}`);
}

export async function replyToConversationAction(
  _previousState: InboxActionState,
  formData: FormData,
): Promise<InboxActionState> {
  const parsed = replySchema.safeParse({
    conversationId: formData.get("conversationId"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your reply." };
  }

  const { db, membership, session, workspace } = await requireDashboardContext();
  const conversation = await db.conversation.findFirst({
    where: {
      id: parsed.data.conversationId,
      workspaceId: workspace.id,
    },
    select: { id: true },
  });

  if (!conversation) {
    return { error: "This conversation is no longer available." };
  }

  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      assignedMembershipId: membership.id,
      status: "ASSIGNED",
      lastMessageAt: new Date(),
      messages: {
        create: {
          body: parsed.data.message,
          authorType: "TEAM",
          authorUserId: session.user.id,
        },
      },
    },
  });

  console.info("conversation.reply.sent", {
    workspaceId: workspace.id,
    conversationId: conversation.id,
    authorUserId: session.user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${conversation.id}`);
  return { submittedAt: Date.now() };
}

export async function updateConversationStatusAction(formData: FormData) {
  const conversationId = formData.get("conversationId");
  const status = formData.get("status");

  if (
    typeof conversationId !== "string" ||
    typeof status !== "string" ||
    !isConversationStatus(status)
  ) {
    return;
  }

  const { db, workspace } = await requireDashboardContext();
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId: workspace.id,
    },
    select: { id: true },
  });

  if (!conversation) {
    return;
  }

  await db.conversation.update({
    where: { id: conversation.id },
    data: { status },
  });

  console.info("conversation.status.updated", {
    workspaceId: workspace.id,
    conversationId: conversation.id,
    status,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${conversation.id}`);
}
