import "server-only";

import { and, eq, ne, gt, like, sql } from "drizzle-orm";
import type { Prisma } from "@/generated/prisma/client";
import type { conversation, visitorSession } from "@/lib/db/schema";

const engagedConversationWhere = {
  channel: "WIDGET",
  messages: { contains: '"authorType":"VISITOR"' },
} as const;

export const engagedVisitorSessionWhere = {
  hostname: { not: "dashboard-preview" },
  messageCount: { gt: 0 },
  conversations: {
    some: engagedConversationWhere,
  },
} satisfies Prisma.VisitorSessionWhereInput;

/** Dashboard inbox lists every engaged session, including dashboard preview chats. */
export const dashboardEngagedVisitorSessionWhere = {
  messageCount: { gt: 0 },
  conversations: {
    some: engagedConversationWhere,
  },
} satisfies Prisma.VisitorSessionWhereInput;

export function widgetConversationWhere(workspaceId: string): Prisma.ConversationWhereInput {
  return {
    workspaceId,
    channel: "WIDGET",
    visitorSession: {
      is: {
        hostname: { not: "dashboard-preview" },
        messageCount: { gt: 0 },
      },
    },
    messages: { contains: '"authorType":"VISITOR"' },
  };
}

export function widgetLeadWhere(workspaceId: string): Prisma.LeadWhereInput {
  return {
    workspaceId,
    source: "WIDGET",
    capturedFromChat: true,
    leadCapture: {
      is: {
        formSubmittedAt: { not: null },
        visitorSession: { is: engagedVisitorSessionWhere },
      },
    },
  };
}

export function getEngagedVisitorSessionCond(s: typeof visitorSession) {
  return and(
    ne(s.hostname, "dashboard-preview"),
    gt(s.messageCount, 0),
    sql`exists (
      select 1 from conversation 
      where conversation.visitorSessionId = ${s.id} 
        and conversation.channel = 'WIDGET' 
        and conversation.messages like '%"authorType":"VISITOR"%'
    )`,
  );
}

export function getDashboardEngagedVisitorSessionCond(s: typeof visitorSession) {
  return and(
    gt(s.messageCount, 0),
    sql`exists (
      select 1 from conversation 
      where conversation.visitorSessionId = ${s.id} 
        and conversation.channel = 'WIDGET' 
        and conversation.messages like '%"authorType":"VISITOR"%'
    )`,
  );
}

export function getWidgetConversationCond(c: typeof conversation, workspaceId: string) {
  return and(
    eq(c.workspaceId, workspaceId),
    eq(c.channel, "WIDGET"),
    like(c.messages, '%"authorType":"VISITOR"%'),
    sql`exists (
      select 1 from visitor_session 
      where visitor_session.id = ${c.visitorSessionId} 
        and visitor_session.hostname != 'dashboard-preview' 
        and visitor_session.messageCount > 0
    )`,
  );
}
