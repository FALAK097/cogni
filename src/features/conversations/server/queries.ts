import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";
import type { MessageJson } from "./conversation-service";

const widgetConversationBase = {
  channel: "WIDGET",
  messages: { contains: '"authorType":"VISITOR"' },
} satisfies Prisma.ConversationWhereInput;

function conversationFilterWhere(
  filter: string | undefined,
  membershipId: string | undefined,
): Prisma.ConversationWhereInput {
  switch (filter) {
    case "unassigned":
      return { ...widgetConversationBase, assignedMemberId: null, status: { not: "CLOSED" } };
    case "mine":
      return membershipId
        ? { ...widgetConversationBase, assignedMemberId: membershipId }
        : { ...widgetConversationBase, id: { in: [] } };
    case "open":
      return { ...widgetConversationBase, status: "OPEN" };
    case "closed":
      return { ...widgetConversationBase, status: "CLOSED" };
    default:
      return widgetConversationBase;
  }
}

function conversationWhere(
  workspaceId: string,
  query?: string,
  filter?: string,
  membershipId?: string,
): Prisma.ConversationWhereInput {
  const normalizedQuery = query?.trim();

  return {
    workspaceId,
    ...conversationFilterWhere(filter, membershipId),
    ...(normalizedQuery
      ? {
          OR: [
            { subject: { contains: normalizedQuery } },
            { contact: { name: { contains: normalizedQuery } } },
            { contact: { email: { contains: normalizedQuery } } },
            { messages: { contains: normalizedQuery } },
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
      visitorSession: true;
    };
  }>,
  "messages"
> & {
  messages: MessageJson[];
};

function parseMessages(messagesJson: string): MessageJson[] {
  try {
    return JSON.parse(messagesJson || "[]") as MessageJson[];
  } catch {
    return [];
  }
}

function countUnreadMessages(messages: MessageJson[]): number {
  return messages.filter((message) => message.authorType === "VISITOR" && !message.readAt).length;
}

function conversationHasUnread(messages: MessageJson[]): boolean {
  return messages.some((message) => message.authorType === "VISITOR" && !message.readAt);
}

function computeUnreadTabCounts(
  conversations: Array<{
    messages: string;
    assignedMemberId: string | null;
    status: string;
  }>,
  membershipId?: string,
) {
  const withUnread = conversations.map((conversation) => ({
    assignedMemberId: conversation.assignedMemberId,
    status: conversation.status,
    hasUnread: conversationHasUnread(parseMessages(conversation.messages)),
  }));

  return {
    all: withUnread.filter((conversation) => conversation.hasUnread).length,
    unassigned: withUnread.filter(
      (conversation) =>
        conversation.hasUnread &&
        !conversation.assignedMemberId &&
        conversation.status !== "CLOSED",
    ).length,
    mine: membershipId
      ? withUnread.filter(
          (conversation) =>
            conversation.hasUnread && conversation.assignedMemberId === membershipId,
        ).length
      : 0,
    open: withUnread.filter(
      (conversation) => conversation.hasUnread && conversation.status === "OPEN",
    ).length,
    closed: withUnread.filter(
      (conversation) => conversation.hasUnread && conversation.status === "CLOSED",
    ).length,
  };
}

export async function markConversationAsRead(workspaceId: string, conversationId: string) {
  const db = getDb();
  const conversation = await db.conversation.findFirst({
    where: { id: conversationId, workspaceId },
    select: { messages: true },
  });

  if (!conversation) return false;

  const messages = parseMessages(conversation.messages);
  const now = new Date().toISOString();
  let changed = false;
  const updatedMessages = messages.map((message) => {
    if (message.authorType === "VISITOR" && !message.readAt) {
      changed = true;
      return { ...message, readAt: now };
    }
    return message;
  });

  if (!changed) return true;

  await db.conversation.update({
    where: { id: conversationId },
    data: { messages: JSON.stringify(updatedMessages) },
  });

  return true;
}

function getLastPublicMessage(messages: MessageJson[]) {
  const publicMessages = messages.filter(
    (message) => message.visibility === "PUBLIC" || !message.visibility,
  );
  return publicMessages[publicMessages.length - 1] ?? null;
}

export async function getInboxSummary(
  workspaceId: string,
  query?: string,
  filter?: string,
  membershipId?: string,
) {
  const db = getDb();
  const where = conversationWhere(workspaceId, query, filter, membershipId);
  const countBase = { workspaceId, ...widgetConversationBase };

  const [countConversations, rawConversations] = await Promise.all([
    db.conversation.findMany({
      where: countBase,
      select: {
        messages: true,
        assignedMemberId: true,
        status: true,
      },
    }),
    db.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      include: {
        contact: true,
        assignedMember: {
          include: { user: true },
        },
        visitorSession: true,
      },
    }),
  ]);

  const conversations: ParsedConversation[] = rawConversations.map((conversation) => ({
    ...conversation,
    messages: parseMessages(conversation.messages),
  }));

  return {
    counts: computeUnreadTabCounts(countConversations, membershipId),
    conversations,
  };
}

export async function getConversation(
  workspaceId: string,
  conversationId: string,
): Promise<ParsedConversation | null> {
  const db = getDb();
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      workspaceId,
      ...widgetConversationBase,
    },
    include: {
      contact: {
        include: {
          notes: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: {
              authorUser: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      assignedMember: {
        include: { user: true },
      },
      visitorSession: true,
      widget: true,
    },
  });

  if (!conversation) return null;

  return {
    ...conversation,
    messages: parseMessages(conversation.messages),
  };
}

export function mapConversationToListItem(conversation: ParsedConversation) {
  const lastMessage = getLastPublicMessage(conversation.messages);

  return {
    id: conversation.id,
    visitorSessionId: conversation.visitorSessionId,
    visitorId: conversation.visitorSession?.visitorId ?? conversation.contactId,
    contactName: conversation.contact.name,
    contactEmail: conversation.contact.email,
    status: conversation.status,
    assigneeName: conversation.assignedMember?.user.name ?? null,
    assigneeId: conversation.assignedMemberId,
    unreadCount: countUnreadMessages(conversation.messages),
    preview: lastMessage?.body ?? conversation.subject,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    country: conversation.visitorSession?.country ?? null,
    city: conversation.visitorSession?.city ?? null,
  };
}
