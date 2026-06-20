import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";

export async function GET(request: Request) {
  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");

  const where = {
    widgetId: widget.id,
    ...(status && status !== "all" ? { status } : {}),
    ...(search
      ? {
          OR: [
            { visitorId: { contains: search } },
            { hostname: { contains: search } },
            { country: { contains: search } },
            { city: { contains: search } },
          ],
        }
      : {}),
  };

  const [total, sessions] = await Promise.all([
    db.visitorSession.count({ where }),
    db.visitorSession.findMany({
      where,
      orderBy: { lastSeenAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contact: true,
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 1,
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      visitorId: session.visitorId,
      status: session.status,
      messageCount: session.messageCount,
      country: session.country,
      city: session.city,
      deviceType: session.deviceType,
      browser: session.browser,
      hostname: session.hostname,
      lastActivityAt: session.lastSeenAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      contactName: session.contact?.name ?? "Visitor",
      contactEmail: session.contact?.email,
      preview:
        session.conversations[0]?.messages[0]?.body ??
        session.conversations[0]?.subject ??
        "No messages yet",
      messages: session.conversations[0]?.messages[0]
        ? [{ content: session.conversations[0].messages[0].body }]
        : [],
      ipData: session.ipData ? JSON.parse(session.ipData) : undefined,
      _count: { messages: session.messageCount },
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
