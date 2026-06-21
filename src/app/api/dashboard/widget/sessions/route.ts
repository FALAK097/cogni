import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";
import { engagedVisitorSessionWhere } from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";

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
    ...engagedVisitorSessionWhere,
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
          where: {
            channel: "WIDGET",
            messages: { contains: '"authorType":"VISITOR"' },
          },
          orderBy: { lastMessageAt: "desc" },
          take: 1,
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
      os: session.os,
      hostname: session.hostname,
      lastActivityAt: session.lastSeenAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      contactName: session.contact?.name ?? "Visitor",
      contactEmail: session.contact?.email,
      preview: (() => {
        const convo = session.conversations[0];
        if (!convo) return "No messages yet";
        const list = JSON.parse(convo.messages || "[]") as MessageJson[];
        const last = list[list.length - 1];
        return last?.body ?? convo.subject ?? "No messages yet";
      })(),
      messages: (() => {
        const convo = session.conversations[0];
        if (!convo) return [];
        const list = JSON.parse(convo.messages || "[]") as MessageJson[];
        const last = list[list.length - 1];
        return last ? [{ content: last.body }] : [];
      })(),
      ipData: session.ipData ? JSON.parse(session.ipData) : null,
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
