import "server-only";

import type { Prisma } from "@/generated/prisma/client";

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
