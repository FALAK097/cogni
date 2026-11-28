import { randomUUID } from "node:crypto";
import { isInteractiveTransactionSupported, runDbWriteOperation, type Db } from "@/lib/db/client";
import {
  conversation,
  conversationEvent,
  visitorSession as visitorSessionTable,
  contact,
} from "@/lib/db/schema";
import type { widget as widgetTable } from "@/lib/db/schema";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import {
  enqueueClosedConversationQa,
  startConversationQaVersionAfterReopen,
} from "@/features/conversation-qa/server/queue";

const visitorSessionDurationMs = 1000 * 60 * 60 * 24 * 90;

type VisitorSessionContext = typeof visitorSessionTable.$inferSelect & {
  widget: {
    id: string;
    workspace: {
      id: string;
    };
  };
};

type VisitorMetadata = {
  pageUrl: string | null;
  referrer: string | null;
  browser: string | null;
  deviceType: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  language: string | null;
  screenSize: string | null;
};

type WidgetContext = {
  id: typeof widgetTable.$inferSelect.id;
  displayName: typeof widgetTable.$inferSelect.displayName;
  instructions: typeof widgetTable.$inferSelect.instructions;
  escalationKeywords: typeof widgetTable.$inferSelect.escalationKeywords;
  modelProvider: typeof widgetTable.$inferSelect.modelProvider;
  modelName: typeof widgetTable.$inferSelect.modelName;
  workspaceId: typeof widgetTable.$inferSelect.workspaceId;
  workspace: {
    id: string;
    name: string;
  };
};

type VisitorIdentity = {
  name: string | null;
  email: string | null;
};

export type MessageJson = {
  id: string;
  body: string;
  authorType: "VISITOR" | "AI" | "TEAM";
  authorName?: string | null;
  visibility?: "PUBLIC" | "INTERNAL";
  clientId?: string | null;
  replyToMessageId?: string | null;
  readAt?: string | null;
  createdAt: string;
  feedback?: "positive" | "negative" | null;
  feedbackReason?: string | null;
  feedbackAt?: string | null;
  citations?: MessageCitation[];
  retrievalOutcome?: "SOURCES_FOUND" | "NO_MATCH";
  metadata?: {
    type?: string;
    documents?: Array<{ fileName: string; description?: string; fileUrl: string }>;
  };
};

export type MessageCitation = {
  documentId: string;
  title: string;
  excerpt: string;
};

function sqliteMessagesArraySql(column: typeof conversation.messages) {
  return sql`CASE WHEN json_valid(${column}) AND json_type(${column}) = 'array' THEN ${column} ELSE '[]' END`;
}

async function removeConversationMessageById(
  db: Db,
  workspaceId: string,
  conversationId: string,
  messageId: string,
) {
  const messages = sqliteMessagesArraySql(conversation.messages);
  const filteredMessages = sql`COALESCE((
    SELECT json_group_array(json(entry.value))
    FROM (
      SELECT key, value
      FROM json_each(${messages})
      WHERE json_extract(value, '$.id') <> ${messageId}
      ORDER BY CAST(key AS INTEGER) ASC
    ) AS entry
  ), '[]')`;
  await db
    .update(conversation)
    .set({ messages: filteredMessages })
    .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)));
}

export async function recordConversationEvent(
  db: Db,
  workspaceId: string,
  conversationId: string,
  type: "message" | "state" | "read",
) {
  const [event] = await db
    .insert(conversationEvent)
    .values({ workspaceId, conversationId, type })
    .returning({ cursor: conversationEvent.cursor });

  if (event && BigInt(event.cursor) % BigInt(1000) === BigInt(0)) {
    const retentionCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    await db.delete(conversationEvent).where(lt(conversationEvent.createdAt, retentionCutoff));
  }
}

/**
 * Serialize an AI channel delivery with human takeover. The write lock is held
 * only for the external send and transcript write, never while generating.
 */
export async function deliverAiReplyIfActive({
  db,
  workspaceId,
  conversationId,
  message,
  deliver,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  message: MessageJson;
  deliver: () => Promise<void>;
}) {
  return runDbWriteOperation(db, async (transaction) => {
    const [current] = await transaction
      .select({ aiPaused: conversation.aiPaused, status: conversation.status })
      .from(conversation)
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)))
      .limit(1);
    if (
      !current ||
      current.aiPaused ||
      current.status === "CLOSED" ||
      current.status === "ESCALATED"
    )
      return false;

    const appended = await appendConversationMessage({
      db: transaction,
      workspaceId,
      conversationId,
      message,
      requireAiActive: true,
    });
    if (!appended || !appended.inserted) return false;
    try {
      await deliver();
    } catch (error) {
      if (!isInteractiveTransactionSupported(transaction)) {
        await removeConversationMessageById(
          transaction,
          workspaceId,
          conversationId,
          message.id,
        ).catch(() => {});
      }
      throw error;
    }
    return true;
  });
}

/**
 * Append against the current JSON array in one atomic SQLite UPDATE so no
 * message is lost when a visitor, teammate, agent, or channel webhook writes.
 */
export async function appendConversationMessage({
  db,
  workspaceId,
  conversationId,
  message,
  updateLastMessageAt = true,
  requireAiActive = false,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  message: MessageJson;
  updateLastMessageAt?: boolean;
  requireAiActive?: boolean;
}) {
  return runDbWriteOperation(db, async (transaction) => {
    const messages = sqliteMessagesArraySql(conversation.messages);
    const duplicate = message.clientId
      ? sql`EXISTS (
        SELECT 1
        FROM json_each(${messages}) AS existing
        WHERE json_extract(existing.value, '$.clientId') = ${message.clientId}
      )`
      : message.replyToMessageId
        ? sql`EXISTS (
          SELECT 1
          FROM json_each(${messages}) AS existing
          WHERE json_extract(existing.value, '$.replyToMessageId') = ${message.replyToMessageId}
        )`
        : null;
    const appendedMessages = sql`json_insert(${messages}, '$[#]', json(${JSON.stringify(message)}))`;

    const conditions = [
      eq(conversation.id, conversationId),
      eq(conversation.workspaceId, workspaceId),
    ];
    if (requireAiActive) {
      conditions.push(
        eq(conversation.aiPaused, false),
        ne(conversation.status, "CLOSED"),
        ne(conversation.status, "ESCALATED"),
      );
    }

    const [updatedConversation] = await transaction
      .update(conversation)
      .set({
        messages: duplicate
          ? sql`CASE WHEN ${duplicate} THEN ${conversation.messages} ELSE ${appendedMessages} END`
          : appendedMessages,
        updatedAt: message.createdAt,
        ...(message.authorType === "VISITOR" ? { snoozedUntil: null } : {}),
        ...(updateLastMessageAt ? { lastMessageAt: message.createdAt } : {}),
      })
      .where(and(...conditions))
      .returning();

    if (!updatedConversation) return null;

    const persistedMessages = JSON.parse(updatedConversation.messages || "[]") as MessageJson[];
    const persistedMessage = persistedMessages.find(
      (candidate) =>
        candidate.id === message.id ||
        (message.clientId && candidate.clientId === message.clientId) ||
        (message.replyToMessageId && candidate.replyToMessageId === message.replyToMessageId),
    );

    const inserted = persistedMessage?.id === message.id;
    if (inserted) {
      await recordConversationEvent(transaction, workspaceId, conversationId, "message");
    }

    return {
      conversation: updatedConversation,
      message: persistedMessage ?? message,
      inserted,
    };
  });
}

async function appendVisitorMessage(
  db: Db,
  visitorSession: VisitorSessionContext,
  text: string,
  clientMessageId: string,
) {
  const now = new Date();
  const nowIso = now.toISOString();

  const existingConversation = await db.query.conversation.findFirst({
    where: (convo, { eq, and, ne }) =>
      and(
        eq(convo.visitorSessionId, visitorSession.id),
        eq(convo.workspaceId, visitorSession.widget.workspace.id),
        eq(convo.widgetId, visitorSession.widget.id),
        ne(convo.status, "CLOSED"),
        eq(convo.channel, "WIDGET"),
      ),
    orderBy: (convo, { desc }) => [desc(convo.updatedAt)],
  });

  if (existingConversation) {
    const newMessage: MessageJson = {
      id: randomUUID(),
      body: text,
      authorType: "VISITOR",
      visibility: "PUBLIC",
      clientId: clientMessageId,
      createdAt: nowIso,
    };

    const appended = await appendConversationMessage({
      db,
      workspaceId: visitorSession.widget.workspace.id,
      conversationId: existingConversation.id,
      message: newMessage,
    });
    if (!appended) throw new Error("Conversation not found.");

    if (appended.inserted) {
      await db
        .update(visitorSessionTable)
        .set({
          lastSeenAt: nowIso,
          expiresAt: new Date(now.getTime() + visitorSessionDurationMs).toISOString(),
          messageCount: sql`${visitorSessionTable.messageCount} + 1`,
        })
        .where(
          and(
            eq(visitorSessionTable.id, visitorSession.id),
            eq(visitorSessionTable.widgetId, visitorSession.widget.id),
          ),
        );
    }

    return {
      conversation: appended.conversation,
      visitorMessageId: appended.message.id,
      replayed: !appended.inserted,
    };
  }

  let contactId = visitorSession.contactId;
  if (!contactId) {
    const contactResults = await db
      .insert(contact)
      .values({
        id: randomUUID(),
        workspaceId: visitorSession.widget.workspace.id,
        name: "Website visitor",
        lastSeenAt: nowIso,
        updatedAt: nowIso,
      })
      .returning();
    contactId = contactResults[0].id;
    await db
      .update(visitorSessionTable)
      .set({ contactId })
      .where(
        and(
          eq(visitorSessionTable.id, visitorSession.id),
          eq(visitorSessionTable.widgetId, visitorSession.widget.id),
        ),
      );
  }

  const newMessage: MessageJson = {
    id: randomUUID(),
    body: text,
    authorType: "VISITOR",
    visibility: "PUBLIC",
    clientId: clientMessageId,
    createdAt: nowIso,
  };

  const conversationResults = await db
    .insert(conversation)
    .values({
      id: randomUUID(),
      workspaceId: visitorSession.widget.workspace.id,
      contactId,
      visitorSessionId: visitorSession.id,
      widgetId: visitorSession.widget.id,
      channel: "WIDGET",
      subject: text.slice(0, 100),
      messages: JSON.stringify([newMessage]),
      updatedAt: nowIso,
    })
    .returning();
  const createdConvo = conversationResults[0];
  if (createdConvo) {
    await recordConversationEvent(
      db,
      visitorSession.widget.workspace.id,
      createdConvo.id,
      "message",
    );
  }

  await db
    .update(visitorSessionTable)
    .set({
      lastSeenAt: nowIso,
      expiresAt: new Date(now.getTime() + visitorSessionDurationMs).toISOString(),
      messageCount: sql`${visitorSessionTable.messageCount} + 1`,
    })
    .where(
      and(
        eq(visitorSessionTable.id, visitorSession.id),
        eq(visitorSessionTable.widgetId, visitorSession.widget.id),
      ),
    );

  console.info("conversation.created", {
    workspaceId: visitorSession.widget.workspace.id,
    widgetId: visitorSession.widget.id,
    conversationId: createdConvo.id,
    channel: "WIDGET",
  });

  return {
    conversation: createdConvo,
    visitorMessageId: newMessage.id,
    replayed: false,
  };
}

export async function recordVisitorMessage({
  db,
  visitorSession,
  text,
  clientMessageId,
}: {
  db: Db;
  visitorSession: VisitorSessionContext;
  text: string;
  clientMessageId: string;
}) {
  return runDbWriteOperation(db, (executor) =>
    appendVisitorMessage(executor, visitorSession, text, clientMessageId),
  );
}

export async function setAiMessageFeedback({
  db,
  conversationId,
  workspaceId,
  visitorSessionId,
  messageId,
  feedback,
  reason,
  feedbackAt,
}: {
  db: Db;
  conversationId: string;
  workspaceId: string;
  visitorSessionId: string;
  messageId: string;
  feedback: "positive" | "negative";
  reason: string | null;
  feedbackAt: string;
}) {
  const messages = sqliteMessagesArraySql(conversation.messages);
  const matchingAiMessage = sql`EXISTS (
    SELECT 1
    FROM json_each(${messages}) AS candidate
    WHERE json_extract(candidate.value, '$.id') = ${messageId}
      AND json_extract(candidate.value, '$.authorType') = 'AI'
  )`;
  const updatedMessages = sql`COALESCE((
    SELECT json_group_array(
      CASE
        WHEN json_extract(entry.value, '$.id') = ${messageId}
          AND json_extract(entry.value, '$.authorType') = 'AI'
        THEN json_set(
          entry.value,
          '$.feedback', ${feedback},
          '$.feedbackReason', json(${JSON.stringify(reason)}),
          '$.feedbackAt', ${feedbackAt}
        )
        ELSE json(entry.value)
      END
    )
    FROM (
      SELECT key, value
      FROM json_each(${messages})
      ORDER BY CAST(key AS INTEGER) ASC
    ) AS entry
  ), '[]')`;

  const updated = await db
    .update(conversation)
    .set({ messages: updatedMessages, updatedAt: feedbackAt })
    .where(
      and(
        eq(conversation.id, conversationId),
        eq(conversation.workspaceId, workspaceId),
        eq(conversation.visitorSessionId, visitorSessionId),
        ne(conversation.status, "CLOSED"),
        matchingAiMessage,
      ),
    )
    .returning({ id: conversation.id });

  return updated.length > 0;
}

export async function setAiMessageMetadata({
  db,
  workspaceId,
  conversationId,
  visitorSessionId,
  messageId,
  metadata,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  visitorSessionId: string;
  messageId: string;
  metadata: NonNullable<MessageJson["metadata"]>;
}) {
  const messages = sqliteMessagesArraySql(conversation.messages);
  const updatedMessages = sql`COALESCE((
    SELECT json_group_array(
      CASE
        WHEN json_extract(entry.value, '$.id') = ${messageId}
          AND json_extract(entry.value, '$.authorType') = 'AI'
        THEN json_set(entry.value, '$.metadata', json(${JSON.stringify(metadata)}))
        ELSE json(entry.value)
      END
    )
    FROM (
      SELECT key, value
      FROM json_each(${messages})
      ORDER BY CAST(key AS INTEGER) ASC
    ) AS entry
  ), '[]')`;

  const updated = await db
    .update(conversation)
    .set({ messages: updatedMessages })
    .where(
      and(
        eq(conversation.id, conversationId),
        eq(conversation.workspaceId, workspaceId),
        eq(conversation.visitorSessionId, visitorSessionId),
      ),
    )
    .returning({ id: conversation.id });

  return updated.length > 0;
}

export async function markVisitorMessagesAsRead({
  db,
  workspaceId,
  conversationId,
  throughMessageId,
  readAt,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  throughMessageId: string;
  readAt: string;
}) {
  return runDbWriteOperation(db, async (transaction) => {
    const messages = sqliteMessagesArraySql(conversation.messages);
    const throughMessageIndex = sql`(
      SELECT MAX(CAST(entry.key AS INTEGER))
      FROM json_each(${messages}) AS entry
      WHERE json_extract(entry.value, '$.id') = ${throughMessageId}
        AND json_extract(entry.value, '$.authorType') = 'VISITOR'
    )`;
    const hasUnreadVisitorMessage = sql`EXISTS (
      SELECT 1
      FROM json_each(${messages}) AS candidate
      WHERE json_extract(candidate.value, '$.authorType') = 'VISITOR'
        AND json_extract(candidate.value, '$.readAt') IS NULL
        AND CAST(candidate.key AS INTEGER) <= ${throughMessageIndex}
    )`;
    const updatedMessages = sql`COALESCE((
      SELECT json_group_array(
        CASE
          WHEN json_extract(entry.value, '$.authorType') = 'VISITOR'
            AND json_extract(entry.value, '$.readAt') IS NULL
            AND CAST(entry.key AS INTEGER) <= ${throughMessageIndex}
          THEN json_set(entry.value, '$.readAt', ${readAt})
          ELSE json(entry.value)
        END
      )
      FROM (
        SELECT key, value
        FROM json_each(${messages})
        ORDER BY CAST(key AS INTEGER) ASC
      ) AS entry
    ), '[]')`;

    const updated = await transaction
      .update(conversation)
      .set({ messages: updatedMessages, updatedAt: readAt })
      .where(
        and(
          eq(conversation.id, conversationId),
          eq(conversation.workspaceId, workspaceId),
          hasUnreadVisitorMessage,
        ),
      )
      .returning({ id: conversation.id });

    if (updated.length > 0) {
      await recordConversationEvent(transaction, workspaceId, conversationId, "read");
    }
    return updated.length > 0;
  });
}

export async function setConversationStatus({
  db,
  workspaceId,
  conversationId,
  status: targetStatus,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  status: "CLOSED" | "OPEN";
}) {
  return runDbWriteOperation(db, async (transaction) => {
    const [current] = await transaction
      .select({
        status: conversation.status,
        messages: conversation.messages,
      })
      .from(conversation)
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)))
      .limit(1);
    if (!current) return null;

    const status =
      targetStatus === "CLOSED"
        ? "CLOSED"
        : sql<string>`case when ${conversation.assignedMemberId} is null then 'OPEN' else 'ASSIGNED' end`;
    const [updated] = await transaction
      .update(conversation)
      .set({
        status,
        snoozedUntil: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)))
      .returning({
        id: conversation.id,
        status: conversation.status,
        assignedMemberId: conversation.assignedMemberId,
      });

    if (updated) {
      await recordConversationEvent(transaction, workspaceId, conversationId, "state");
      if (targetStatus === "CLOSED" && current.status !== "CLOSED") {
        await enqueueClosedConversationQa({
          db: transaction,
          workspaceId,
          conversationId,
          messages: current.messages,
        });
      } else if (targetStatus === "OPEN" && current.status === "CLOSED") {
        await startConversationQaVersionAfterReopen(transaction, workspaceId, conversationId);
      }
    }
    return updated ?? null;
  });
}

export async function updateConversationState({
  db,
  workspaceId,
  conversationId,
  changes,
  onlyOpen = false,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  onlyOpen?: boolean;
  changes: {
    assignedMemberId?: string | null;
    status?: (typeof conversation.$inferSelect)["status"];
    snoozedUntil?: string | null;
    aiPaused?: boolean;
    updatedAt?: string;
  };
}) {
  return runDbWriteOperation(db, async (transaction) => {
    const conditions = [
      eq(conversation.id, conversationId),
      eq(conversation.workspaceId, workspaceId),
    ];
    if (onlyOpen) conditions.push(ne(conversation.status, "CLOSED"));
    const [current] = await transaction
      .select({
        status: conversation.status,
        messages: conversation.messages,
      })
      .from(conversation)
      .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)))
      .limit(1);
    if (!current || (onlyOpen && current.status === "CLOSED")) return null;

    const [updated] = await transaction
      .update(conversation)
      .set(changes)
      .where(and(...conditions))
      .returning({ id: conversation.id, status: conversation.status });
    if (updated) {
      await recordConversationEvent(transaction, workspaceId, conversationId, "state");
      if (changes.status === "CLOSED" && current.status !== "CLOSED") {
        await enqueueClosedConversationQa({
          db: transaction,
          workspaceId,
          conversationId,
          messages: current.messages,
        });
      } else if (
        current.status === "CLOSED" &&
        changes.status !== undefined &&
        changes.status !== "CLOSED"
      ) {
        await startConversationQaVersionAfterReopen(transaction, workspaceId, conversationId);
      }
    }
    return updated ?? null;
  });
}

export async function startVisitorConversation({
  db,
  widget: widgetContext,
  hostname,
  browserSessionId,
  visitorId,
  metadata,
  identity,
  text,
  clientMessageId,
}: {
  db: Db;
  widget: WidgetContext;
  hostname: string;
  browserSessionId: string;
  visitorId: string | null;
  metadata: VisitorMetadata;
  identity: VisitorIdentity;
  text: string;
  clientMessageId: string;
}) {
  return runDbWriteOperation(db, async (tx) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const existing = await tx.query.visitorSession.findFirst({
      where: (s, { eq, and, gt }) =>
        and(
          eq(s.widgetId, widgetContext.id),
          eq(s.browserSessionId, browserSessionId),
          gt(s.expiresAt, nowIso),
        ),
    });

    let contactId = existing?.contactId ?? null;
    const visitorEmail = identity.email;
    if (!contactId && visitorEmail) {
      const existingContact = await tx.query.contact.findFirst({
        where: (c, { eq, and }) =>
          and(eq(c.workspaceId, widgetContext.workspace.id), eq(c.email, visitorEmail)),
        columns: { id: true },
      });
      contactId = existingContact?.id ?? null;
    }
    if (!contactId && (identity.name || identity.email)) {
      const contactResults = await tx
        .insert(contact)
        .values({
          id: randomUUID(),
          workspaceId: widgetContext.workspace.id,
          name: identity.name ?? identity.email?.split("@")[0] ?? "Website visitor",
          email: identity.email,
          lastSeenAt: nowIso,
          updatedAt: nowIso,
        })
        .returning();
      contactId = contactResults[0].id;
    }

    let visitorSessionData: typeof visitorSessionTable.$inferSelect;

    if (existing) {
      const results = await tx
        .update(visitorSessionTable)
        .set({
          visitorId: visitorId ?? existing.visitorId,
          hostname,
          pageUrl: metadata.pageUrl ?? existing.pageUrl,
          referrer: metadata.referrer ?? existing.referrer,
          browser: metadata.browser ?? existing.browser,
          deviceType: metadata.deviceType ?? existing.deviceType,
          os: metadata.os ?? existing.os,
          country: metadata.country ?? existing.country,
          city: metadata.city ?? existing.city,
          timezone: metadata.timezone ?? existing.timezone,
          language: metadata.language ?? existing.language,
          screenSize: metadata.screenSize ?? existing.screenSize,
          contactId: contactId ?? existing.contactId,
        })
        .where(
          and(
            eq(visitorSessionTable.id, existing.id),
            eq(visitorSessionTable.widgetId, widgetContext.id),
          ),
        )
        .returning();
      visitorSessionData = results[0];
    } else {
      const results = await tx
        .insert(visitorSessionTable)
        .values({
          id: randomUUID(),
          widgetId: widgetContext.id,
          token: randomUUID(),
          browserSessionId,
          visitorId,
          hostname,
          pageUrl: metadata.pageUrl,
          referrer: metadata.referrer,
          browser: metadata.browser,
          deviceType: metadata.deviceType,
          os: metadata.os,
          country: metadata.country,
          city: metadata.city,
          timezone: metadata.timezone,
          language: metadata.language,
          screenSize: metadata.screenSize,
          contactId,
          expiresAt: new Date(now.getTime() + visitorSessionDurationMs).toISOString(),
          updatedAt: nowIso,
        })
        .returning();
      visitorSessionData = results[0];
    }

    const sessionContext: VisitorSessionContext = {
      ...visitorSessionData,
      contactId: contactId ?? visitorSessionData.contactId,
      widget: {
        id: widgetContext.id,
        workspace: { id: widgetContext.workspace.id },
      },
    };
    const messageResult = await appendVisitorMessage(tx, sessionContext, text, clientMessageId);

    return {
      ...messageResult,
      visitorSession: {
        ...visitorSessionData,
        widget: widgetContext,
      },
    };
  });
}

export async function getVisitorConversationMessages({
  db,
  visitorSessionId,
}: {
  db: Db;
  visitorSessionId: string;
}) {
  const conversationData = await db.query.conversation.findFirst({
    where: (convo, { eq, and, ne }) =>
      and(eq(convo.visitorSessionId, visitorSessionId), ne(convo.status, "CLOSED")),
    orderBy: (convo, { desc }) => [desc(convo.updatedAt)],
  });

  if (!conversationData) return [];

  const list = JSON.parse(conversationData.messages || "[]") as MessageJson[];
  return list.filter((m) => m.visibility === "PUBLIC" || !m.visibility);
}

export async function recordAiMessage({
  db,
  workspaceId,
  conversationId,
  text,
  replyToMessageId,
  citations,
  retrievalOutcome,
  rejectInactive = false,
}: {
  db: Db;
  workspaceId?: string;
  conversationId: string;
  text: string;
  replyToMessageId: string;
  citations?: MessageCitation[];
  retrievalOutcome?: "SOURCES_FOUND" | "NO_MATCH";
  rejectInactive?: boolean;
}) {
  return runDbWriteOperation(db, async (tx) => {
    const conversationData = await tx.query.conversation.findFirst({
      where: (convo, { and: andOp, eq: eqOp }) =>
        workspaceId
          ? andOp(eqOp(convo.id, conversationId), eqOp(convo.workspaceId, workspaceId))
          : eqOp(convo.id, conversationId),
    });

    if (!conversationData) {
      throw new Error("Conversation not found");
    }

    const now = new Date();
    const seenCitationIds = new Set<string>();
    const uniqueCitations =
      citations?.filter((citation) => {
        if (seenCitationIds.has(citation.documentId)) return false;
        seenCitationIds.add(citation.documentId);
        return true;
      }) ?? [];
    const aiMessage: MessageJson = {
      id: randomUUID(),
      body: text,
      authorType: "AI",
      visibility: "PUBLIC",
      replyToMessageId,
      createdAt: now.toISOString(),
      ...(retrievalOutcome ? { retrievalOutcome } : {}),
      ...(uniqueCitations.length > 0
        ? {
            citations: uniqueCitations.slice(0, 4).map((citation) => ({
              documentId: citation.documentId,
              title: citation.title.slice(0, 160),
              excerpt: citation.excerpt.trim().slice(0, 360),
            })),
          }
        : {}),
    };

    const appended = await appendConversationMessage({
      db: tx,
      workspaceId: conversationData.workspaceId,
      conversationId,
      message: aiMessage,
      requireAiActive: true,
    });

    if (!appended) {
      if (rejectInactive) throw new Error("The conversation stopped accepting AI replies.");
      return null;
    }
    return appended.message;
  });
}
