import "server-only";

import { and, or, eq, like, desc, count } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { conversation, contact, workspaceMember, user } from "@/lib/db/schema";
import type { MessageJson } from "./conversation-service";

export type ParsedConversation = {
  id: string;
  status: string;
  subject: string | null;
  channel: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  workspaceId: string;
  visitorSessionId: string | null;
  contactId: string | null;
  assignedMemberId: string | null;
  contact: typeof contact.$inferSelect | null;
  assignedMember: (typeof workspaceMember.$inferSelect & { user: typeof user.$inferSelect }) | null;
  messages: MessageJson[];
};

export async function getInboxSummary(workspaceId: string, query?: string, status?: string) {
  const db = getDb();
  const normalizedQuery = query?.trim();

  const [
    openCountResult,
    assignedCountResult,
    escalatedCountResult,
    closedCountResult,
    contactCountResult,
  ] = await Promise.all([
    (db as any)
      .select({ val: count() })
      .from(conversation)
      .where(and(eq(conversation.workspaceId, workspaceId), eq(conversation.status, "OPEN"))),
    (db as any)
      .select({ val: count() })
      .from(conversation)
      .where(and(eq(conversation.workspaceId, workspaceId), eq(conversation.status, "ASSIGNED"))),
    (db as any)
      .select({ val: count() })
      .from(conversation)
      .where(and(eq(conversation.workspaceId, workspaceId), eq(conversation.status, "ESCALATED"))),
    (db as any)
      .select({ val: count() })
      .from(conversation)
      .where(and(eq(conversation.workspaceId, workspaceId), eq(conversation.status, "CLOSED"))),
    (db as any).select({ val: count() }).from(contact).where(eq(contact.workspaceId, workspaceId)),
  ]);

  const openCount = openCountResult[0]?.val ?? 0;
  const assignedCount = assignedCountResult[0]?.val ?? 0;
  const escalatedCount = escalatedCountResult[0]?.val ?? 0;
  const closedCount = closedCountResult[0]?.val ?? 0;
  const contactCount = contactCountResult[0]?.val ?? 0;

  const whereConds = [eq(conversation.workspaceId, workspaceId)];
  if (status) {
    whereConds.push(eq(conversation.status, status));
  }
  if (normalizedQuery) {
    const filter = or(
      like(conversation.subject, `%${normalizedQuery}%`),
      like(conversation.messages, `%${normalizedQuery}%`),
      like(contact.name, `%${normalizedQuery}%`),
      like(contact.email, `%${normalizedQuery}%`),
    );
    if (filter) {
      whereConds.push(filter);
    }
  }

  const rawConversations = await (db as any)
    .select({
      conversation,
      contact,
      assignedMember: workspaceMember,
      user,
    })
    .from(conversation)
    .leftJoin(contact, eq(conversation.contactId, contact.id))
    .leftJoin(workspaceMember, eq(conversation.assignedMemberId, workspaceMember.id))
    .leftJoin(user, eq(workspaceMember.userId, user.id))
    .where(and(...whereConds))
    .orderBy(desc(conversation.lastMessageAt));

  const conversations: ParsedConversation[] = rawConversations.map((row: any) => {
    let parsedMessages: MessageJson[] = [];
    try {
      parsedMessages = JSON.parse(row.conversation.messages || "[]") as MessageJson[];
    } catch {
      // ignore
    }
    return {
      ...row.conversation,
      contact: row.contact,
      assignedMember: row.assignedMember
        ? {
            ...row.assignedMember,
            user: row.user!,
          }
        : null,
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
  const rawConversations = await (db as any)
    .select({
      conversation,
      contact,
      assignedMember: workspaceMember,
      user,
    })
    .from(conversation)
    .leftJoin(contact, eq(conversation.contactId, contact.id))
    .leftJoin(workspaceMember, eq(conversation.assignedMemberId, workspaceMember.id))
    .leftJoin(user, eq(workspaceMember.userId, user.id))
    .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)))
    .limit(1);

  const row = rawConversations[0];
  if (!row) return null;

  let parsedMessages: MessageJson[] = [];
  try {
    parsedMessages = JSON.parse(row.conversation.messages || "[]") as MessageJson[];
  } catch {
    // ignore
  }

  return {
    ...row.conversation,
    contact: row.contact,
    assignedMember: row.assignedMember
      ? {
          ...row.assignedMember,
          user: row.user!,
        }
      : null,
    messages: parsedMessages,
  };
}
