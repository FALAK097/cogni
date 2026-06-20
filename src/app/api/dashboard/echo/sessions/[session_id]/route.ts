import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";

type RouteContext = { params: Promise<{ session_id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { db, workspace } = await requireDashboardContext();
  const { session_id: sessionId } = await context.params;
  const widget = await db.widget.findUnique({ where: { workspaceId: workspace.id } });

  if (!widget) {
    return NextResponse.json({ error: "Widget not found." }, { status: 404 });
  }

  const session = await db.visitorSession.findFirst({
    where: { id: sessionId, widgetId: widget.id },
    include: {
      contact: true,
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            include: {
              feedback: true,
              attachments: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = session.conversations[0];
  const messages =
    conversation?.messages.map((message) => ({
      id: message.id,
      role: message.authorType === "VISITOR" ? "user" : "assistant",
      content: message.body,
      timestamp: message.createdAt.toISOString(),
      feedback:
        message.feedback[0]?.feedback === "POSITIVE"
          ? "positive"
          : message.feedback[0]?.feedback === "NEGATIVE"
            ? "negative"
            : undefined,
      feedbackReason: message.feedback[0]?.reason ?? undefined,
    })) ?? [];

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
    ipData: session.ipData ? JSON.parse(session.ipData) : undefined,
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
    where: { id: sessionId, widgetId: widget.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  await db.visitorSession.delete({ where: { id: session.id } });
  return NextResponse.json({ ok: true });
}
