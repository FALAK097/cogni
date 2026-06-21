import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";
import type { MessageJson } from "./conversation-service";

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
                contains: normalizedQuery,
              },
            },
          ],
        }
      : {}),
  };
}

export type ParsedConversation = Omit<
  Prisma.ConversationGetPayload<{
    include: {
      contact: true;
      assignedMember: {
        include: { user: true };
      };
    };
  }>,
  "messages"
> & {
  messages: MessageJson[];
};

export async function getInboxSummary(workspaceId: string, query?: string, status?: string) {
  const db = getDb();
  const where = conversationWhere(workspaceId, query, status);

  const [openCount, assignedCount, escalatedCount, closedCount, contactCount, rawConversations] =
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
          assignedMember: {
            include: { user: true },
          },
        },
      }),
    ]);

  const conversations: ParsedConversation[] = rawConversations.map((c) => {
    let parsedMessages: MessageJson[] = [];
    try {
      parsedMessages = JSON.parse(c.messages || "[]") as MessageJson[];
    } catch {
      // ignore
    }
    return {
      ...c,
      messages: parsedMessages,
    };
  });

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

export async function getConversation(
  workspaceId: string,
  conversationId: string,
): Promise<ParsedConversation | null> {
  const db = getDb();
  const c = await db.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
    },
    include: {
      contact: true,
      assignedMember: {
        include: { user: true },
      },
    },
  });

  if (!c) return null;

  let parsedMessages: MessageJson[] = [];
  try {
    parsedMessages = JSON.parse(c.messages || "[]") as MessageJson[];
  } catch {
    // ignore
  }

  return {
    ...c,
    messages: parsedMessages,
  };
}
