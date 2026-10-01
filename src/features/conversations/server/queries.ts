import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, like, lt, ne, or, sql } from "drizzle-orm";

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
import { appendConversationMessage, type MessageJson } from "./conversation-service";
import { encodeInboxCursor, type InboxCursor } from "../inbox-pagination";
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

  const appended = await appendConversationMessage({
    db,
    workspaceId,
    conversationId,
    message: newMessage,
    updateLastMessageAt: options.updateLastMessageAt,
  });
  if (!appended) return false;

  await broadcastConversationEvent({
    type: "message",
    conversationId,
    messageId: appended.message.id,
  });
  return appended.inserted;
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

export async function getInboxPage(
  workspaceId: string,
  options: {
    query?: string;
    filter?: string;
    membershipId: string;
    limit: number;
    cursor: InboxCursor | null;
  },
) {
  const db = getDb();
  const unread = hasUnreadVisitorMessagesSql(conversationTable);
  const baseWhere = and(
    eq(conversationTable.workspaceId, workspaceId),
    getInboxConversationBaseCond(conversationTable),
  );
  const cursorWhere = options.cursor
    ? or(
        lt(conversationTable.lastMessageAt, options.cursor.lastMessageAt),
        and(
          eq(conversationTable.lastMessageAt, options.cursor.lastMessageAt),
          lt(conversationTable.id, options.cursor.id),
        ),
      )
    : undefined;

  const [countRows, fetchedConversations] = await Promise.all([
    db
      .select({
        all: sql<number>`count(*) filter (where ${unread})`.mapWith(Number),
        unassigned: sql<number>`count(*) filter (
          where ${unread}
            and ${conversationTable.assignedMemberId} is null
            and ${conversationTable.status} <> 'CLOSED'
        )`.mapWith(Number),
        mine: options.membershipId
          ? sql<number>`count(*) filter (
              where ${unread} and ${conversationTable.assignedMemberId} = ${options.membershipId}
            )`.mapWith(Number)
          : sql<number>`0`.mapWith(Number),
        open: sql<number>`count(*) filter (
          where ${unread} and ${conversationTable.status} = 'OPEN'
        )`.mapWith(Number),
        closed: sql<number>`count(*) filter (
          where ${unread} and ${conversationTable.status} = 'CLOSED'
        )`.mapWith(Number),
      })
      .from(conversationTable)
      .where(baseWhere),
    db.query.conversation.findMany({
      where: (fields) =>
        and(
          conversationWhereCond(
            fields as typeof conversationTable,
            workspaceId,
            options.query,
            options.filter,
            options.membershipId,
          ),
          cursorWhere,
        ),
      orderBy: [desc(conversationTable.lastMessageAt), desc(conversationTable.id)],
      limit: options.limit + 1,
      with: {
        contact: true,
        workspaceMember: {
          with: { user: true },
        },
        visitorSession: true,
      },
    }),
  ]);

  const hasMore = fetchedConversations.length > options.limit;
  const rawConversations = hasMore
    ? fetchedConversations.slice(0, options.limit)
    : fetchedConversations;
  const conversations = rawConversations.map((conversation) =>
    mapConversationRow({
      ...conversation,
      contact: { ...conversation.contact, contactNotes: undefined },
    }),
  );
  const lastConversation = rawConversations.at(-1);
  const nextCursor =
    hasMore && lastConversation
      ? encodeInboxCursor({
          lastMessageAt: new Date(lastConversation.lastMessageAt).toISOString(),
          id: lastConversation.id,
        })
      : null;
  const countRow = countRows[0] ?? { all: 0, unassigned: 0, mine: 0, open: 0, closed: 0 };

  return {
    counts: countRow,
    conversations,
    pagination: { limit: options.limit, hasMore, nextCursor },
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
    aiPaused: conversation.aiPaused,
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
