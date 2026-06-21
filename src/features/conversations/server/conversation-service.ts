import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma, PrismaClient, VisitorSession, Widget } from "@/generated/prisma/client";

const visitorSessionDurationMs = 1000 * 60 * 60 * 24 * 90;

type VisitorSessionContext = VisitorSession & {
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

type WidgetContext = Widget & {
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

async function appendVisitorMessage(
  tx: Prisma.TransactionClient,
  visitorSession: VisitorSessionContext,
  text: string,
  clientMessageId: string,
) {
  const now = new Date();

  const existingConversation = await tx.conversation.findFirst({
    where: {
      visitorSessionId: visitorSession.id,
      status: { not: "CLOSED" },
      channel: "WIDGET",
    },
    orderBy: { updatedAt: "desc" },
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
      createdAt: now.toISOString(),
    };

    const updatedMessages = [...messagesList, newMessage];
    const conversation = await tx.conversation.update({
      where: { id: existingConversation.id },
      data: {
        lastMessageAt: now,
        messages: JSON.stringify(updatedMessages),
      },
    });

    await tx.visitorSession.update({
      where: { id: visitorSession.id },
      data: {
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + visitorSessionDurationMs),
        messageCount: { increment: 1 },
      },
    });

    return {
      conversation,
      visitorMessageId: newMessage.id,
      replayed: false,
    };
  }

  let contactId = visitorSession.contactId;
  if (!contactId) {
    const contact = await tx.contact.create({
      data: {
        workspaceId: visitorSession.widget.workspace.id,
        name: "Website visitor",
        lastSeenAt: now,
      },
    });
    contactId = contact.id;
    await tx.visitorSession.update({
      where: { id: visitorSession.id },
      data: { contactId },
    });
  }

  const newMessage: MessageJson = {
    id: randomUUID(),
    body: text,
    authorType: "VISITOR",
    visibility: "PUBLIC",
    clientId: clientMessageId,
    createdAt: now.toISOString(),
  };

  const conversation = await tx.conversation.create({
    data: {
      workspaceId: visitorSession.widget.workspace.id,
      contactId,
      visitorSessionId: visitorSession.id,
      widgetId: visitorSession.widget.id,
      channel: "WIDGET",
      subject: text.slice(0, 100),
      messages: JSON.stringify([newMessage]),
    },
  });

  await tx.visitorSession.update({
    where: { id: visitorSession.id },
    data: {
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + visitorSessionDurationMs),
      messageCount: { increment: 1 },
    },
  });

  console.info("conversation.created", {
    workspaceId: visitorSession.widget.workspace.id,
    widgetId: visitorSession.widget.id,
    conversationId: conversation.id,
    channel: "WIDGET",
  });

  return {
    conversation,
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
  db: PrismaClient;
  visitorSession: VisitorSessionContext;
  text: string;
  clientMessageId: string;
}) {
  return db.$transaction((tx) => appendVisitorMessage(tx, visitorSession, text, clientMessageId));
}

export async function startVisitorConversation({
  db,
  widget,
  hostname,
  browserSessionId,
  visitorId,
  metadata,
  identity,
  text,
  clientMessageId,
}: {
  db: PrismaClient;
  widget: WidgetContext;
  hostname: string;
  browserSessionId: string;
  visitorId: string | null;
  metadata: VisitorMetadata;
  identity: VisitorIdentity;
  text: string;
  clientMessageId: string;
}) {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const existing = await tx.visitorSession.findFirst({
      where: {
        widgetId: widget.id,
        browserSessionId,
        expiresAt: { gt: now },
      },
    });
    let contactId = existing?.contactId ?? null;
    if (!contactId && identity.email) {
      const contact = await tx.contact.findFirst({
        where: {
          workspaceId: widget.workspace.id,
          email: identity.email,
        },
      });
      contactId = contact?.id ?? null;
    }
    if (!contactId && (identity.name || identity.email)) {
      const contact = await tx.contact.create({
        data: {
          workspaceId: widget.workspace.id,
          name: identity.name ?? identity.email?.split("@")[0] ?? "Website visitor",
          email: identity.email,
          lastSeenAt: now,
        },
      });
      contactId = contact.id;
    }

    const visitorSession =
      existing ??
      (await tx.visitorSession.create({
        data: {
          widgetId: widget.id,
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
          expiresAt: new Date(now.getTime() + visitorSessionDurationMs),
        },
      }));

    if (existing) {
      await tx.visitorSession.update({
        where: { id: existing.id },
        data: {
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
        },
      });
    }

    const sessionContext: VisitorSessionContext = {
      ...visitorSession,
      contactId: contactId ?? visitorSession.contactId,
      widget: {
        id: widget.id,
        workspace: { id: widget.workspace.id },
      },
    };
    const messageResult = await appendVisitorMessage(tx, sessionContext, text, clientMessageId);

    return {
      ...messageResult,
      visitorSession: {
        ...visitorSession,
        widget,
      },
    };
  });
}

export async function getVisitorConversationMessages({
  db,
  visitorSessionId,
}: {
  db: PrismaClient;
  visitorSessionId: string;
}) {
  const conversation = await db.conversation.findFirst({
    where: {
      visitorSessionId,
      status: { not: "CLOSED" },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!conversation) return [];

  const list = JSON.parse(conversation.messages || "[]") as MessageJson[];
  return list.filter((m) => m.visibility === "PUBLIC" || !m.visibility);
}

export async function recordAiMessage({
  db,
  conversationId,
  text,
  replyToMessageId,
}: {
  db: PrismaClient;
  conversationId: string;
  text: string;
  replyToMessageId: string;
}) {
  return db.$transaction(async (tx) => {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const now = new Date();
    const list = JSON.parse(conversation.messages || "[]") as MessageJson[];
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
    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
        messages: JSON.stringify(updatedMessages),
      },
    });

    return aiMessage;
  });
}
