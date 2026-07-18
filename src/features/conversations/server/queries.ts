import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, like, ne, or, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  contact as contactTable,
  conversation as conversationTable,
  type contact,
  type contactNote,
  type conversation,
  type user,
  type visitorSession,
  type widget,
  type workspaceMember,
} from "@/lib/db/schema";
import type { MessageJson } from "./conversation-service";
import { broadcastConversationEvent } from "@/lib/realtime/broadcast";

function getInboxConversationBaseCond(c: typeof conversationTable) {
  return like(c.messages, '%"authorType":"VISITOR"%');
}

function conversationFilterCond(
  c: typeof conversationTable,
  filter: string | undefined,
  membershipId: string | undefined,
) {
  const base = getInboxConversationBaseCond(c);

  switch (filter) {
    case "unassigned":
      return and(base, isNull(c.assignedMemberId), ne(c.status, "CLOSED"));
    case "mine":
      return membershipId ? and(base, eq(c.assignedMemberId, membershipId)) : sql`1 = 0`;
    case "open":
      return and(base, eq(c.status, "OPEN"));
    case "closed":
      return and(base, eq(c.status, "CLOSED"));
    default:
      return base;
  }
}

function conversationWhereCond(
  c: typeof conversationTable,
  workspaceId: string,
  query?: string,
  filter?: string,
  membershipId?: string,
) {
  const normalizedQuery = query?.trim();
  const conds = [eq(c.workspaceId, workspaceId), conversationFilterCond(c, filter, membershipId)];

  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`;
    conds.push(
      or(
        like(c.subject, pattern),
        like(c.messages, pattern),
        sql`exists (
          select 1 from contact
          where contact.id = ${c.contactId}
            and (contact.name like ${pattern} or contact.email like ${pattern})
        )`,
      )!,
    );
  }

  return and(...conds);
}

type ContactNoteWithAuthor = typeof contactNote.$inferSelect & {
  user: Pick<typeof user.$inferSelect, "id" | "name">;
};

export type ParsedConversation = Omit<typeof conversation.$inferSelect, "messages"> & {
  messages: MessageJson[];
  contact: typeof contact.$inferSelect & {
    notes?: Array<
      typeof contactNote.$inferSelect & {
        authorUser: Pick<typeof user.$inferSelect, "id" | "name">;
      }
    >;
  };
  assignedMember:
    | (typeof workspaceMember.$inferSelect & {
        user: typeof user.$inferSelect;
      })
    | null;
  visitorSession: typeof visitorSession.$inferSelect | null;
  widget?: typeof widget.$inferSelect | null;
};

function parseMessages(messagesJson: string): MessageJson[] {
  try {
    return JSON.parse(messagesJson || "[]") as MessageJson[];
  } catch {
    return [];
  }
}

function mapConversationRow(
  row: typeof conversationTable.$inferSelect & {
    contact: typeof contactTable.$inferSelect & {
      contactNotes?: ContactNoteWithAuthor[];
    };
    workspaceMember:
      | (typeof workspaceMember.$inferSelect & {
          user: typeof user.$inferSelect;
        })
      | null;
    visitorSession: typeof visitorSession.$inferSelect | null;
    widget?: typeof widget.$inferSelect | null;
  },
): ParsedConversation {
  const { workspaceMember, contact: contactRow, messages, ...conversationRow } = row;

  return {
    ...conversationRow,
    messages: parseMessages(messages),
    assignedMember: workspaceMember,
    contact: {
      ...contactRow,
      notes: contactRow.contactNotes?.map((note) => ({
        ...note,
        authorUser: note.user,
      })),
    },
    visitorSession: row.visitorSession,
    widget: row.widget,
  };
}

function countUnreadMessages(messages: MessageJson[]): number {
  return messages.filter((message) => message.authorType === "VISITOR" && !message.readAt).length;
}

function hasUnreadVisitorMessagesSql(c: typeof conversationTable) {
  return sql`exists (
    select 1 from jsonb_array_elements(${c.messages}::jsonb) as message
    where message->>'authorType' = 'VISITOR'
      and message->>'readAt' is null
  )`;
}

function computeUnreadTabCounts(
  conversations: Array<{
    assignedMemberId: string | null;
    status: string;
    hasUnread: boolean;
  }>,
  membershipId?: string,
) {
  const withUnread = conversations.map((conversation) => ({
    assignedMemberId: conversation.assignedMemberId,
    status: conversation.status,
    hasUnread: conversation.hasUnread,
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
  const now = new Date().toISOString();

  for (let attempt = 0; attempt < 3; attempt++) {
    const conversation = await db.query.conversation.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.id, conversationId), eq(fields.workspaceId, workspaceId)),
      columns: { messages: true, updatedAt: true },
    });

    if (!conversation) return false;

    const messages = parseMessages(conversation.messages);
    let changed = false;
    const updatedMessages = messages.map((message) => {
      if (message.authorType === "VISITOR" && !message.readAt) {
        changed = true;
        return { ...message, readAt: now };
      }
      return message;
    });

    if (!changed) return true;

    const result = await db
      .update(conversationTable)
      .set({
        messages: JSON.stringify(updatedMessages),
        updatedAt: now,
      })
      .where(
        and(
          eq(conversationTable.id, conversationId),
          eq(conversationTable.updatedAt, conversation.updatedAt),
        ),
      )
      .returning({ id: conversationTable.id });

    if (result.length > 0) {
      await broadcastConversationEvent({
        type: "read",
        conversationId,
        actor: "TEAM",
      });
      return true;
    }
  }

  return false;
}

export async function appendTeamConversationMessage(
  workspaceId: string,
  conversationId: string,
  message: Pick<MessageJson, "body" | "authorType" | "visibility">,
  options: { updateLastMessageAt: boolean },
): Promise<boolean> {
  const db = getDb();
  const nowIso = new Date().toISOString();
  const newMessage: MessageJson = {
    id: randomUUID(),
    body: message.body,
    authorType: message.authorType,
    visibility: message.visibility,
    createdAt: nowIso,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const conversation = await db.query.conversation.findFirst({
      where: (fields, { eq, and }) =>
        and(eq(fields.id, conversationId), eq(fields.workspaceId, workspaceId)),
      columns: { messages: true, updatedAt: true },
    });

    if (!conversation) return false;

    const messagesList = parseMessages(conversation.messages);
    const updatedMessages = [...messagesList, newMessage];

    const result = await db
      .update(conversationTable)
      .set({
        messages: JSON.stringify(updatedMessages),
        updatedAt: nowIso,
        ...(options.updateLastMessageAt ? { lastMessageAt: nowIso } : {}),
      })
      .where(
        and(
          eq(conversationTable.id, conversationId),
          eq(conversationTable.updatedAt, conversation.updatedAt),
        ),
      )
      .returning({ id: conversationTable.id });

    if (result.length > 0) {
      await broadcastConversationEvent({
        type: "message",
        conversationId,
        messageId: newMessage.id,
      });
      return true;
    }
  }

  return false;
}

export async function broadcastConversationChanged(
  conversationId: string,
  status: string,
  assignedMemberId: string | null,
) {
  await broadcastConversationEvent({
    type: "state",
    conversationId,
    status,
    assignedMemberId,
  });
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

  const [countConversations, rawConversations] = await Promise.all([
    db
      .select({
        assignedMemberId: conversationTable.assignedMemberId,
        status: conversationTable.status,
        hasUnread: hasUnreadVisitorMessagesSql(conversationTable).mapWith(Boolean),
      })
      .from(conversationTable)
      .where(
        and(
          eq(conversationTable.workspaceId, workspaceId),
          getInboxConversationBaseCond(conversationTable),
        ),
      ),
    db.query.conversation.findMany({
      where: (fields) =>
        conversationWhereCond(
          fields as typeof conversationTable,
          workspaceId,
          query,
          filter,
          membershipId,
        ),
      orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
      with: {
        contact: true,
        workspaceMember: {
          with: { user: true },
        },
        visitorSession: true,
      },
    }),
  ]);

  const conversations = rawConversations.map((conversation) =>
    mapConversationRow({
      ...conversation,
      contact: { ...conversation.contact, contactNotes: undefined },
    }),
  );

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
  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.id, conversationId),
        eq(fields.workspaceId, workspaceId),
        getInboxConversationBaseCond(fields as typeof conversationTable),
      ),
    with: {
      contact: {
        with: {
          contactNotes: {
            orderBy: (fields, { desc }) => [desc(fields.createdAt)],
            limit: 10,
            with: {
              user: {
                columns: { id: true, name: true },
              },
            },
          },
        },
      },
      workspaceMember: {
        with: { user: true },
      },
      visitorSession: true,
      widget: true,
    },
  });

  if (!conversation) return null;

  return mapConversationRow(conversation);
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
    lastMessageAt: conversation.lastMessageAt
      ? new Date(conversation.lastMessageAt).toISOString()
      : new Date().toISOString(),
    country: conversation.visitorSession?.country ?? null,
    city: conversation.visitorSession?.city ?? null,
    channel: conversation.channel,
    subject: conversation.subject,
  };
}
