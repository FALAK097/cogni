import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { dashboardEngagedVisitorSessionWhere } from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";

type RouteContext = { params: Promise<{ session_id: string }> };

function parseMessages(messagesJson: string): MessageJson[] {
  try {
    return JSON.parse(messagesJson || "[]") as MessageJson[];
  } catch {
    return [];
  }
}

function mapMessageToClient(message: MessageJson, agentName: string) {
  const isTeam = message.authorType === "TEAM";
  const isVisitor = message.authorType === "VISITOR";
  const isInternal = message.visibility === "INTERNAL";

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
    isInternal,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { db, workspace, membership } = await requireDashboardContext();
  const { session_id: sessionId } = await context.params;
  const widget = await db.widget.findUnique({ where: { workspaceId: workspace.id } });

  if (!widget) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  const session = await db.visitorSession.findFirst({
    where: {
      id: sessionId,
      widgetId: widget.id,
      ...dashboardEngagedVisitorSessionWhere,
    },
    include: {
      contact: {
        include: {
          notes: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              authorUser: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      leadCapture: { select: { leadId: true } },
      conversations: {
        where: {
          channel: "WIDGET",
          messages: { contains: '"authorType":"VISITOR"' },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        include: {
          assignedMember: {
            include: { user: true },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = session.conversations[0];
  const messagesList = conversation ? parseMessages(conversation.messages) : [];
  const agentName = widget.displayName || "Assistant";

  const publicMessages = messagesList
    .filter((message) => message.visibility === "PUBLIC" || !message.visibility)
    .map((message) => mapMessageToClient(message, agentName));

  const internalNotes = messagesList
    .filter((message) => message.authorType === "TEAM" && message.visibility === "INTERNAL")
    .map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
    }));

  let previousConversations: Array<{
    id: string;
    subject: string;
    status: string;
    lastMessageAt: string;
  }> = [];

  if (session.contactId && conversation) {
    const previous = await db.conversation.findMany({
      where: {
        contactId: session.contactId,
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
    previousConversations = previous.map((entry) => ({
      id: entry.id,
      subject: entry.subject,
      status: entry.status,
      lastMessageAt: entry.lastMessageAt.toISOString(),
    }));
  }

  return NextResponse.json({
    id: session.id,
    visitorId: session.visitorId ?? session.id,
    city: session.city,
    country: session.country,
    os: session.os,
    browser: session.browser,
    screenSize: session.screenSize,
    pageUrl: session.pageUrl,
    referrer: session.referrer,
    timezone: session.timezone,
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastSeenAt.toISOString(),
    ipData: session.ipData ? JSON.parse(session.ipData) : null,
    messages: publicMessages,
    contactName: session.contact?.name,
    contactEmail: session.contact?.email,
    contactId: session.contact?.id ?? null,
    contactExternalId: session.contact?.externalId ?? null,
    contactCreatedAt: session.contact?.createdAt?.toISOString() ?? null,
    contactLastSeenAt: session.contact?.lastSeenAt?.toISOString() ?? null,
    conversationId: conversation?.id ?? null,
    conversationStatus: conversation?.status ?? "OPEN",
    conversationChannel: conversation?.channel ?? "WIDGET",
    conversationStartedAt:
      conversation?.createdAt?.toISOString() ?? session.createdAt.toISOString(),
    assigneeName: conversation?.assignedMember?.user.name ?? null,
    assigneeId: conversation?.assignedMemberId ?? null,
    agentName,
    currentMembershipId: membership.id,
    previousConversations,
    contactNotes:
      session.contact?.notes.map((note) => ({
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
  const { session_id: sessionId } = await context.params;

  let body: { action?: string; message?: string };
  try {
    body = (await request.json()) as { action?: string; message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const widget = await db.widget.findUnique({ where: { workspaceId: workspace.id } });
  if (!widget) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  const session = await db.visitorSession.findFirst({
    where: {
      id: sessionId,
      widgetId: widget.id,
      ...dashboardEngagedVisitorSessionWhere,
    },
    include: {
      conversations: {
        where: { channel: "WIDGET" },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = session.conversations[0];
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (body.action === "assign") {
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        assignedMemberId: membership.id,
        status: "ASSIGNED",
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reply") {
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const messagesList = parseMessages(conversation.messages);
    const now = new Date();
    const newMessage: MessageJson = {
      id: randomUUID(),
      body: message,
      authorType: "TEAM",
      visibility: "PUBLIC",
      createdAt: now.toISOString(),
    };

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: now,
        messages: JSON.stringify([...messagesList, newMessage]),
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (body.action === "note") {
    const message = body.message?.trim();
    if (!message) {
      return NextResponse.json({ error: "Note is required." }, { status: 400 });
    }

    const messagesList = parseMessages(conversation.messages);
    const newMessage: MessageJson = {
      id: randomUUID(),
      body: message,
      authorType: "TEAM",
      visibility: "INTERNAL",
      createdAt: new Date().toISOString(),
    };

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        messages: JSON.stringify([...messagesList, newMessage]),
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { session_id: sessionId } = await context.params;
  const widget = await db.widget.findUnique({ where: { workspaceId: workspace.id } });

  if (!widget) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  const session = await db.visitorSession.findFirst({
    where: {
      id: sessionId,
      widgetId: widget.id,
      ...dashboardEngagedVisitorSessionWhere,
    },
    include: {
      leadCapture: { select: { leadId: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  if (session.leadCapture?.leadId) {
    await db.lead.deleteMany({
      where: { id: session.leadCapture.leadId, workspaceId: workspace.id },
    });
  }
  await db.conversation.deleteMany({ where: { visitorSessionId: session.id } });
  await db.visitorSession.delete({ where: { id: session.id } });

  if (session.contactId) {
    const contactStillUsed = await db.contact.findFirst({
      where: {
        id: session.contactId,
        OR: [
          { conversations: { some: {} } },
          { leads: { some: {} } },
          { visitorSessions: { some: {} } },
        ],
      },
      select: { id: true },
    });
    if (!contactStillUsed) {
      await db.contact.delete({ where: { id: session.contactId } });
    }
  }
  return NextResponse.json({ ok: true });
}
