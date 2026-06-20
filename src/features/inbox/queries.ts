import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";

function conversationWhere(
  workspaceId: string,
  query?: string,
  status?: string,
): Prisma.ConversationWhereInput {
  const normalizedQuery = query?.trim();

  return {
    workspaceId,
    ...(status ? { status } : {}),
    ...(normalizedQuery
      ? {
          OR: [
            { subject: { contains: normalizedQuery } },
            { contact: { name: { contains: normalizedQuery } } },
            { contact: { email: { contains: normalizedQuery } } },
            {
              messages: {
                some: {
                  body: { contains: normalizedQuery },
                },
              },
            },
          ],
        }
      : {}),
  };
}

export async function getInboxSummary(workspaceId: string, query?: string, status?: string) {
  const db = getDb();
  const where = conversationWhere(workspaceId, query, status);

  const [openCount, assignedCount, escalatedCount, closedCount, contactCount, conversations] =
    await Promise.all([
      db.conversation.count({ where: { workspaceId, status: "OPEN" } }),
      db.conversation.count({ where: { workspaceId, status: "ASSIGNED" } }),
      db.conversation.count({ where: { workspaceId, status: "ESCALATED" } }),
      db.conversation.count({ where: { workspaceId, status: "CLOSED" } }),
      db.contact.count({ where: { workspaceId } }),
      db.conversation.findMany({
        where,
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
        include: {
          authorUser: true,
          attachments: true,
        },
      },
    },
  });
}
