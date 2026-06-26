import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export const engagedVisitorSessionWhere = {
  hostname: { not: "dashboard-preview" },
  messageCount: { gt: 0 },
  conversations: {
    some: {
      channel: "WIDGET",
      messages: { contains: '"authorType":"VISITOR"' },
    },
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
