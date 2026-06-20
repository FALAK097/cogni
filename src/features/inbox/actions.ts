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
  visibility: z.enum(["PUBLIC", "INTERNAL"]).default("PUBLIC"),
});

const assignSchema = z.object({
  conversationId: z.string().min(1),
  membershipId: z.string().min(1),
});

async function getOwnedConversation(workspaceId: string, conversationId: string) {
  const { db } = await requireDashboardContext();
  return db.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    select: { id: true },
  });
}

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
    visibility: formData.get("visibility") ?? "PUBLIC",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your reply." };
  }

  const { db, membership, session, workspace } = await requireDashboardContext();
  const conversation = await getOwnedConversation(workspace.id, parsed.data.conversationId);

  if (!conversation) {
    return { error: "This conversation is no longer available." };
  }

  const isInternal = parsed.data.visibility === "INTERNAL";

  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      assignedMembershipId: isInternal ? undefined : membership.id,
      ...(isInternal
        ? {}
        : {
            status: "ASSIGNED",
            aiPaused: true,
            lastMessageAt: new Date(),
          }),
      messages: {
        create: {
          body: parsed.data.message,
          authorType: "TEAM",
          authorUserId: session.user.id,
          visibility: parsed.data.visibility,
        },
      },
    },
  });

  console.info(isInternal ? "conversation.note.added" : "conversation.reply.sent", {
    workspaceId: workspace.id,
    conversationId: conversation.id,
    authorUserId: session.user.id,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${conversation.id}`);
  return { submittedAt: Date.now() };
}

export async function assignConversationAction(formData: FormData) {
  const parsed = assignSchema.safeParse({
    conversationId: formData.get("conversationId"),
    membershipId: formData.get("membershipId"),
  });

  if (!parsed.success || !parsed.data.membershipId) {
    return;
  }

  const { db, workspace } = await requireDashboardContext();
  const [conversation, membership] = await Promise.all([
    getOwnedConversation(workspace.id, parsed.data.conversationId),
    db.membership.findFirst({
      where: {
        id: parsed.data.membershipId,
        workspaceId: workspace.id,
      },
      select: { id: true },
    }),
  ]);

  if (!conversation || !membership) {
    return;
  }

  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      assignedMembershipId: membership.id,
      status: "ASSIGNED",
    },
  });

  console.info("conversation.assigned", {
    workspaceId: workspace.id,
    conversationId: conversation.id,
    membershipId: membership.id,
  });

  revalidatePath("/dashboard/inbox");
  revalidatePath(`/dashboard/inbox/${conversation.id}`);
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
  const conversation = await getOwnedConversation(workspace.id, conversationId);

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

export async function pauseConversationAiAction(formData: FormData) {
  const conversationId = formData.get("conversationId");
  if (typeof conversationId !== "string") return;

  const { db, workspace } = await requireDashboardContext();
  await db.conversation.updateMany({
    where: { id: conversationId, workspaceId: workspace.id },
    data: { aiPaused: true, status: "ESCALATED" },
  });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function resumeConversationAiAction(formData: FormData) {
  const conversationId = formData.get("conversationId");
  if (typeof conversationId !== "string") return;

  const { db, workspace } = await requireDashboardContext();
  await db.conversation.updateMany({
    where: { id: conversationId, workspaceId: workspace.id },
    data: { aiPaused: false, status: "OPEN" },
  });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}

export async function markConversationReadAction(formData: FormData) {
  const conversationId = formData.get("conversationId");
  if (typeof conversationId !== "string") return;

  const { db, workspace } = await requireDashboardContext();
  await db.message.updateMany({
    where: {
      conversationId,
      readAt: null,
      conversation: { workspaceId: workspace.id },
    },
    data: { readAt: new Date() },
  });
  revalidatePath(`/dashboard/inbox/${conversationId}`);
}
