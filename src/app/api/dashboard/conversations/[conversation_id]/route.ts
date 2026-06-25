import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { getConversation, markConversationAsRead } from "@/features/conversations/server/queries";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getDb } from "@/lib/db/client";

type RouteContext = { params: Promise<{ conversation_id: string }> };

function mapMessageToClient(message: MessageJson, agentName: string) {
  const isTeam = message.authorType === "TEAM";
  const isVisitor = message.authorType === "VISITOR";

  return {
    id: message.id,
    role: isVisitor ? ("user" as const) : ("assistant" as const),
    authorType: message.authorType,
    authorName: isVisitor ? null : isTeam ? "You" : agentName,
    content: message.body,
    timestamp: message.createdAt,
    visibility: message.visibility ?? "PUBLIC",
    feedback: message.feedback ?? null,
    feedbackReason: message.feedbackReason ?? null,
    feedbackAt: message.feedbackAt ?? null,
    isInternal: message.visibility === "INTERNAL",
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { workspace, membership } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;

  const conversation = await getConversation(workspace.id, conversationId);
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const agentName = conversation.widget?.displayName ?? "Assistant";
  const session = conversation.visitorSession;

  const publicMessages = conversation.messages
    .filter((message) => message.visibility === "PUBLIC" || !message.visibility)
    .map((message) => mapMessageToClient(message, agentName));

  const internalNotes = conversation.messages
    .filter((message) => message.authorType === "TEAM" && message.visibility === "INTERNAL")
    .map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
    }));

  const db = getDb();
  const previous = await db.conversation.findMany({
    where: {
      contactId: conversation.contactId,
      workspaceId: workspace.id,
      id: { not: conversation.id },
      channel: "WIDGET",
    },
    orderBy: { lastMessageAt: "desc" },
    take: 5,
    select: {
      id: true,
      subject: true,
      status: true,
      lastMessageAt: true,
    },
  });
  const previousConversations = previous.map((entry) => ({
    id: entry.id,
    subject: entry.subject,
    status: entry.status,
    lastMessageAt: entry.lastMessageAt.toISOString(),
  }));

  const contactWithNotes = conversation.contact as typeof conversation.contact & {
    notes?: Array<{
      id: string;
      body: string;
      createdAt: Date;
      authorUser: { name: string };
    }>;
  };

  return NextResponse.json({
    id: conversation.id,
    visitorSessionId: conversation.visitorSessionId,
    visitorId: session?.visitorId ?? conversation.contactId,
    city: session?.city ?? null,
    country: session?.country ?? null,
    os: session?.os ?? null,
    browser: session?.browser ?? null,
    screenSize: session?.screenSize ?? null,
    pageUrl: session?.pageUrl ?? null,
    referrer: session?.referrer ?? null,
    timezone: session?.timezone ?? null,
    createdAt: conversation.createdAt.toISOString(),
    lastActivityAt: conversation.lastMessageAt.toISOString(),
    ipData: session?.ipData ? JSON.parse(session.ipData) : null,
    messages: publicMessages,
    contactName: conversation.contact.name,
    contactEmail: conversation.contact.email,
    contactId: conversation.contact.id,
    contactExternalId: conversation.contact.externalId,
    contactCreatedAt: conversation.contact.createdAt.toISOString(),
    contactLastSeenAt: conversation.contact.lastSeenAt?.toISOString() ?? null,
    conversationId: conversation.id,
    conversationStatus: conversation.status,
    conversationChannel: conversation.channel,
    conversationStartedAt: conversation.createdAt.toISOString(),
    assigneeName: conversation.assignedMember?.user.name ?? null,
    assigneeId: conversation.assignedMemberId,
    agentName,
    currentMembershipId: membership.id,
    previousConversations,
    contactNotes:
      contactWithNotes.notes?.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
        authorName: note.authorUser.name,
      })) ?? [],
    internalNotes,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;

  let body: { action?: string; message?: string };
  try {
    body = (await request.json()) as { action?: string; message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, workspaceId: workspace.id },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (body.action === "assign") {
    await db.conversation.update({
      where: { id: conversation.id },
      data: { assignedMemberId: membership.id, status: "ASSIGNED" },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "read") {
    await markConversationAsRead(workspace.id, conversation.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reply" || body.action === "note") {
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const messagesList = JSON.parse(conversation.messages || "[]") as MessageJson[];
    const now = new Date();
    const newMessage: MessageJson = {
      id: randomUUID(),
      body: message,
      authorType: "TEAM",
      visibility: body.action === "note" ? "INTERNAL" : "PUBLIC",
      createdAt: now.toISOString(),
    };

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        ...(body.action === "reply" ? { lastMessageAt: now } : {}),
        messages: JSON.stringify([...messagesList, newMessage]),
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { conversation_id: conversationId } = await context.params;

  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, workspaceId: workspace.id },
    include: { visitorSession: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (conversation.visitorSessionId) {
    await db.conversation.deleteMany({
      where: { visitorSessionId: conversation.visitorSessionId },
    });
    await db.visitorSession.deleteMany({ where: { id: conversation.visitorSessionId } });
  } else {
    await db.conversation.delete({ where: { id: conversation.id } });
  }

  return NextResponse.json({ ok: true });
}
