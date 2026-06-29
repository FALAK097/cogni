import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { conversation, visitorSession as visitorSessionTable, contact } from "@/lib/db/schema";
import type { widget as widgetTable } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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

type TransactionDb = Parameters<Parameters<Db["transaction"]>[0]>[0];
type ConversationDb = Db | TransactionDb;

async function appendVisitorMessage(
  tx: ConversationDb,
  visitorSession: VisitorSessionContext,
  text: string,
  clientMessageId: string,
) {
  const now = new Date();
  const nowIso = now.toISOString();

  const existingConversation = await tx.query.conversation.findFirst({
    where: (convo, { eq, and, ne }) =>
      and(
        eq(convo.visitorSessionId, visitorSession.id),
        ne(convo.status, "CLOSED"),
        eq(convo.channel, "WIDGET"),
      ),
    orderBy: (convo, { desc }) => [desc(convo.updatedAt)],
  });

  if (existingConversation) {
    const messagesList = JSON.parse(existingConversation.messages || "[]") as MessageJson[];
    const replayed = messagesList.find((m) => m.clientId === clientMessageId);
    if (replayed) {
      return {
        conversation: existingConversation,
        visitorMessageId: replayed.id,
        replayed: true,
      };
    }

    const newMessage: MessageJson = {
      id: randomUUID(),
      body: text,
      authorType: "VISITOR",
      visibility: "PUBLIC",
      clientId: clientMessageId,
      createdAt: nowIso,
    };

    const updatedMessages = [...messagesList, newMessage];
    const results = await tx
      .update(conversation)
      .set({
        lastMessageAt: nowIso,
        messages: JSON.stringify(updatedMessages),
        updatedAt: nowIso,
      })
      .where(eq(conversation.id, existingConversation.id))
      .returning();

    const updatedConvo = results[0];

    await tx
      .update(visitorSessionTable)
      .set({
        lastSeenAt: nowIso,
        expiresAt: new Date(now.getTime() + visitorSessionDurationMs).toISOString(),
        messageCount: sql`${visitorSessionTable.messageCount} + 1`,
      })
      .where(eq(visitorSessionTable.id, visitorSession.id));

    return {
      conversation: updatedConvo,
      visitorMessageId: newMessage.id,
      replayed: false,
    };
  }

  let contactId = visitorSession.contactId;
  if (!contactId) {
    const contactResults = await tx
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
    await tx
      .update(visitorSessionTable)
      .set({ contactId })
      .where(eq(visitorSessionTable.id, visitorSession.id));
  }

  const newMessage: MessageJson = {
    id: randomUUID(),
    body: text,
    authorType: "VISITOR",
    visibility: "PUBLIC",
    clientId: clientMessageId,
    createdAt: nowIso,
  };

  const conversationResults = await tx
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

  await tx
    .update(visitorSessionTable)
    .set({
      lastSeenAt: nowIso,
      expiresAt: new Date(now.getTime() + visitorSessionDurationMs).toISOString(),
      messageCount: sql`${visitorSessionTable.messageCount} + 1`,
    })
    .where(eq(visitorSessionTable.id, visitorSession.id));

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
  return db.transaction((tx) => appendVisitorMessage(tx, visitorSession, text, clientMessageId));
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
  return db.transaction(async (tx) => {
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
  return (db as any).transaction(async (tx: any) => {
    const conversationData = await tx.query.conversation.findFirst({
      where: (convo: any, { eq }: any) => eq(convo.id, conversationId),
    });

    if (!conversationData) {
      throw new Error("Conversation not found");
    }

    const now = new Date();
    const list = JSON.parse(conversationData.messages || "[]") as MessageJson[];
    const existing = list.find((m) => m.replyToMessageId === replyToMessageId);
    if (existing) {
      return existing;
    }

    const aiMessage: MessageJson = {
      id: randomUUID(),
      body: text,
      authorType: "AI",
      visibility: "PUBLIC",
      replyToMessageId,
      createdAt: now.toISOString(),
    };

    const updatedMessages = [...list, aiMessage];
    await tx
      .update(conversation)
      .set({
        lastMessageAt: now.toISOString(),
        messages: JSON.stringify(updatedMessages),
        updatedAt: now.toISOString(),
      })
      .where(eq(conversation.id, conversationId));

    return aiMessage;
  });
}
