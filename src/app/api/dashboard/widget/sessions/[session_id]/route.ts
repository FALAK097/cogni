import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { engagedVisitorSessionWhere } from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";

type RouteContext = { params: Promise<{ session_id: string }> };

export async function GET(_request: Request, context: RouteContext) {
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
      ...engagedVisitorSessionWhere,
    },
    include: {
      contact: true,
      leadCapture: { select: { leadId: true } },
      conversations: {
        where: {
          channel: "WIDGET",
          messages: { contains: '"authorType":"VISITOR"' },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = session.conversations[0];
  const messagesList = conversation
    ? (JSON.parse(conversation.messages || "[]") as MessageJson[])
    : [];

  const messages = messagesList.map((message) => ({
    id: message.id,
    role: message.authorType === "VISITOR" ? "user" : "assistant",
    content: message.body,
    timestamp: message.createdAt,
    feedback: message.feedback ?? null,
    feedbackReason: message.feedbackReason ?? null,
  }));

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
    createdAt: session.createdAt.toISOString(),
    lastActivityAt: session.lastSeenAt.toISOString(),
    ipData: session.ipData ? JSON.parse(session.ipData) : null,
    messages,
    contactName: session.contact?.name,
    contactEmail: session.contact?.email,
  });
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
      ...engagedVisitorSessionWhere,
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
