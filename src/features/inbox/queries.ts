import "server-only";

import { getDb } from "@/lib/db/client";

export async function getInboxSummary(workspaceId: string) {
  const db = getDb();

  const [openCount, assignedCount, escalatedCount, closedCount, contactCount, conversations] =
    await Promise.all([
      db.conversation.count({ where: { workspaceId, status: "OPEN" } }),
      db.conversation.count({ where: { workspaceId, status: "ASSIGNED" } }),
      db.conversation.count({ where: { workspaceId, status: "ESCALATED" } }),
      db.conversation.count({ where: { workspaceId, status: "CLOSED" } }),
      db.contact.count({ where: { workspaceId } }),
      db.conversation.findMany({
        where: { workspaceId },
        orderBy: { lastMessageAt: "desc" },
        include: {
          contact: true,
          assignedMembership: {
            include: { user: true },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

  return {
    counts: {
      open: openCount,
      assigned: assignedCount,
      escalated: escalatedCount,
      closed: closedCount,
      contacts: contactCount,
    },
    conversations,
  };
}

export async function getConversation(workspaceId: string, conversationId: string) {
  return getDb().conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    include: {
      contact: true,
      assignedMembership: {
        include: { user: true },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { authorUser: true },
      },
    },
  });
}
