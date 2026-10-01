import { randomUUID } from "node:crypto";
import { runDbWriteOperation, type Db } from "@/lib/db/client";
import { conversation, visitorSession as visitorSessionTable, contact } from "@/lib/db/schema";
import type { widget as widgetTable } from "@/lib/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";

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
  visibility?: "PUBLIC" | "INTERNAL";
  clientId?: string | null;
  replyToMessageId?: string | null;
  readAt?: string | null;
  createdAt: string;
  feedback?: "positive" | "negative" | null;
  feedbackReason?: string | null;
  feedbackAt?: string | null;
};

/**
 * Append against the current JSON array in one PostgreSQL UPDATE. The row lock
 * acquired by UPDATE serializes concurrent writers, so no message is lost when
 * a visitor, teammate, agent, or channel webhook writes at the same time.
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
  const messages = sql`COALESCE(NULLIF(${conversation.messages}, '')::jsonb, '[]'::jsonb)`;
  const duplicate = message.clientId
    ? sql`EXISTS (
        SELECT 1
        FROM jsonb_array_elements(${messages}) AS existing(item)
        WHERE existing.item ->> 'clientId' = ${message.clientId}
      )`
    : message.replyToMessageId
      ? sql`EXISTS (
          SELECT 1
          FROM jsonb_array_elements(${messages}) AS existing(item)
          WHERE existing.item ->> 'replyToMessageId' = ${message.replyToMessageId}
        )`
      : null;
  const appendedMessages = sql`(${messages} || ${JSON.stringify([message])}::jsonb)::text`;

  const conditions = [
    eq(conversation.id, conversationId),
    eq(conversation.workspaceId, workspaceId),
  ];
  if (requireAiActive) {
    conditions.push(eq(conversation.aiPaused, false), ne(conversation.status, "CLOSED"));
  }

  const [updatedConversation] = await db
    .update(conversation)
    .set({
      messages: duplicate
        ? sql`CASE WHEN ${duplicate} THEN ${conversation.messages} ELSE ${appendedMessages} END`
        : appendedMessages,
      updatedAt: message.createdAt,
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

  return {
    conversation: updatedConversation,
    message: persistedMessage ?? message,
    inserted: persistedMessage?.id === message.id,
  };
}

async function appendVisitorMessage(
  db: Db,
  visitorSession: VisitorSessionContext,
  text: string,
  clientMessageId: string,
) {
  const now = new Date();
  const nowIso = now.toISOString();

  // Serialize first-message creation per visitor session. Without locking the
  // parent row, simultaneous requests can both observe no active conversation.
  await db.execute(sql`
    SELECT id
    FROM ${visitorSessionTable}
    WHERE ${visitorSessionTable.id} = ${visitorSession.id}
      AND ${visitorSessionTable.widgetId} = ${visitorSession.widget.id}
    FOR UPDATE
  `);

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
  const messages = sql`COALESCE(NULLIF(${conversation.messages}, '')::jsonb, '[]'::jsonb)`;
  const matchingAiMessage = sql`EXISTS (
    SELECT 1
    FROM jsonb_array_elements(${messages}) AS candidate(item)
    WHERE candidate.item ->> 'id' = ${messageId}
      AND candidate.item ->> 'authorType' = 'AI'
  )`;
  const updatedMessages = sql`(
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN entry.item ->> 'id' = ${messageId}
            AND entry.item ->> 'authorType' = 'AI'
          THEN jsonb_set(
            jsonb_set(
              jsonb_set(entry.item, '{feedback}', to_jsonb(${feedback}::text), true),
              '{feedbackReason}', COALESCE(to_jsonb(${reason}::text), 'null'::jsonb), true
            ),
            '{feedbackAt}', to_jsonb(${feedbackAt}::text), true
          )
          ELSE entry.item
        END
        ORDER BY entry.ordinality
      ),
      '[]'::jsonb
    )::text
    FROM jsonb_array_elements(${messages}) WITH ORDINALITY AS entry(item, ordinality)
  )`;

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

export async function markVisitorMessagesAsRead({
  db,
  workspaceId,
  conversationId,
  readAt,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  readAt: string;
}) {
  const messages = sql`COALESCE(NULLIF(${conversation.messages}, '')::jsonb, '[]'::jsonb)`;
  const hasUnreadVisitorMessage = sql`EXISTS (
    SELECT 1
    FROM jsonb_array_elements(${messages}) AS candidate(item)
    WHERE candidate.item ->> 'authorType' = 'VISITOR'
      AND candidate.item ->> 'readAt' IS NULL
  )`;
  const updatedMessages = sql`(
    SELECT COALESCE(
      jsonb_agg(
        CASE
          WHEN entry.item ->> 'authorType' = 'VISITOR'
            AND entry.item ->> 'readAt' IS NULL
          THEN jsonb_set(entry.item, '{readAt}', to_jsonb(${readAt}::text), true)
          ELSE entry.item
        END
        ORDER BY entry.ordinality
      ),
      '[]'::jsonb
    )::text
    FROM jsonb_array_elements(${messages}) WITH ORDINALITY AS entry(item, ordinality)
  )`;

  const updated = await db
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

  return updated.length > 0;
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
  const status =
    targetStatus === "CLOSED"
      ? "CLOSED"
      : sql<string>`case when ${conversation.assignedMemberId} is null then 'OPEN' else 'ASSIGNED' end`;
  const [updated] = await db
    .update(conversation)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)))
    .returning({
      id: conversation.id,
      status: conversation.status,
      assignedMemberId: conversation.assignedMemberId,
    });

  return updated ?? null;
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
        .where(eq(visitorSessionTable.id, existing.id))
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
  conversationId,
  text,
  replyToMessageId,
}: {
  db: Db;
  conversationId: string;
  text: string;
  replyToMessageId: string;
}) {
  return runDbWriteOperation(db, async (tx) => {
    const conversationData = await tx.query.conversation.findFirst({
      where: (convo, { eq }) => eq(convo.id, conversationId),
    });

    if (!conversationData) {
      throw new Error("Conversation not found");
    }

    const now = new Date();
    const aiMessage: MessageJson = {
      id: randomUUID(),
      body: text,
      authorType: "AI",
      visibility: "PUBLIC",
      replyToMessageId,
      createdAt: now.toISOString(),
    };

    const appended = await appendConversationMessage({
      db: tx,
      workspaceId: conversationData.workspaceId,
      conversationId,
      message: aiMessage,
      requireAiActive: true,
    });

    if (!appended) return null;
    return appended.message;
  });
}
