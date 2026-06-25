import { NextResponse } from "next/server";

import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { ensureWorkspaceWidget } from "@/features/widget/server/widget-service";
import { dashboardEngagedVisitorSessionWhere } from "@/features/widget/server/widget-data-filters";
import type { MessageJson } from "@/features/conversations/server/conversation-service";
import type { Prisma } from "@/generated/prisma/client";

const engagedConversationWhere = {
  channel: "WIDGET",
  messages: { contains: '"authorType":"VISITOR"' },
} as const;

function countUnreadMessages(messagesJson: string): number {
  try {
    const messages = JSON.parse(messagesJson || "[]") as MessageJson[];
    return messages.filter((message) => message.authorType === "VISITOR" && !message.readAt).length;
  } catch {
    return 0;
  }
}

function getLastPublicMessage(messagesJson: string) {
  try {
    const messages = JSON.parse(messagesJson || "[]") as MessageJson[];
    const publicMessages = messages.filter(
      (message) => message.visibility === "PUBLIC" || !message.visibility,
    );
    return publicMessages[publicMessages.length - 1] ?? null;
  } catch {
    return null;
  }
}

function conversationFilterWhere(
  filter: string,
  membershipId: string,
): Prisma.ConversationWhereInput {
  switch (filter) {
    case "unassigned":
      return { ...engagedConversationWhere, assignedMemberId: null, status: { not: "CLOSED" } };
    case "mine":
      return { ...engagedConversationWhere, assignedMemberId: membershipId };
    case "open":
      return { ...engagedConversationWhere, status: "OPEN" };
    case "closed":
      return { ...engagedConversationWhere, status: "CLOSED" };
    default:
      return engagedConversationWhere;
  }
}

export async function GET(request: Request) {
  const { db, workspace, membership } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);
  const { searchParams } = new URL(request.url);

  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "20");
  const search = searchParams.get("search")?.trim();
  const filter = searchParams.get("filter") ?? "all";

  const baseWhere: Prisma.VisitorSessionWhereInput = {
    widgetId: widget.id,
    ...dashboardEngagedVisitorSessionWhere,
    ...(search
      ? {
          OR: [
            { visitorId: { contains: search } },
            { hostname: { contains: search } },
            { country: { contains: search } },
            { city: { contains: search } },
            { contact: { name: { contains: search } } },
            { contact: { email: { contains: search } } },
          ],
        }
      : {}),
    ...(filter !== "all"
      ? {
          conversations: {
            some: conversationFilterWhere(filter, membership.id),
          },
        }
      : {}),
  };

  const countBaseWhere: Prisma.VisitorSessionWhereInput = {
    widgetId: widget.id,
    ...dashboardEngagedVisitorSessionWhere,
  };

  const [total, sessions, allCount, unassignedCount, mineCount, openCount, closedCount] =
    await Promise.all([
      db.visitorSession.count({ where: baseWhere }),
      db.visitorSession.findMany({
        where: baseWhere,
        orderBy: { lastSeenAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          contact: true,
          conversations: {
            where: engagedConversationWhere,
            orderBy: { lastMessageAt: "desc" },
            take: 1,
            include: {
              assignedMember: {
                include: { user: true },
              },
            },
          },
        },
      }),
      db.visitorSession.count({ where: countBaseWhere }),
      db.visitorSession.count({
        where: {
          ...countBaseWhere,
          conversations: {
            some: conversationFilterWhere("unassigned", membership.id),
          },
        },
      }),
      db.visitorSession.count({
        where: {
          ...countBaseWhere,
          conversations: {
            some: conversationFilterWhere("mine", membership.id),
          },
        },
      }),
      db.visitorSession.count({
        where: {
          ...countBaseWhere,
          conversations: {
            some: conversationFilterWhere("open", membership.id),
          },
        },
      }),
      db.visitorSession.count({
        where: {
          ...countBaseWhere,
          conversations: {
            some: conversationFilterWhere("closed", membership.id),
          },
        },
      }),
    ]);

  return NextResponse.json({
    sessions: sessions.map((session) => {
      const conversation = session.conversations[0];
      const lastMessage = conversation ? getLastPublicMessage(conversation.messages) : null;

      return {
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
        conversationId: conversation?.id ?? null,
        conversationStatus: conversation?.status ?? "OPEN",
        assigneeName: conversation?.assignedMember?.user.name ?? null,
        assigneeId: conversation?.assignedMemberId ?? null,
        unreadCount: conversation ? countUnreadMessages(conversation.messages) : 0,
        preview: lastMessage?.body ?? conversation?.subject ?? "No messages yet",
        messages: lastMessage ? [{ content: lastMessage.body }] : [],
        ipData: session.ipData ? JSON.parse(session.ipData) : null,
        _count: { messages: session.messageCount },
      };
    }),
    counts: {
      all: allCount,
      unassigned: unassignedCount,
      mine: mineCount,
      open: openCount,
      closed: closedCount,
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
