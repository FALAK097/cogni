import "server-only";

import type { PrismaClient, VisitorSession } from "@/generated/prisma/client";

type VisitorSessionContext = VisitorSession & {
  widget: {
    id: string;
    workspace: {
      id: string;
    };
  };
};

export async function recordVisitorMessage({
  db,
  visitorSession,
  text,
}: {
  db: PrismaClient;
  visitorSession: VisitorSessionContext;
  text: string;
}) {
  let conversation = await db.conversation.findFirst({
    where: {
      visitorSessionId: visitorSession.id,
      status: { not: "CLOSED" },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (conversation) {
    return db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        messages: {
          create: {
            body: text,
            authorType: "VISITOR",
          },
        },
      },
    });
  }

  const contact =
    visitorSession.contactId === null
      ? await db.contact.create({
          data: {
            workspaceId: visitorSession.widget.workspace.id,
            name: "Website visitor",
            lastSeenAt: new Date(),
          },
        })
      : null;

  if (contact) {
    await db.visitorSession.update({
      where: { id: visitorSession.id },
      data: {
        contactId: contact.id,
        lastSeenAt: new Date(),
      },
    });
  }

  conversation = await db.conversation.create({
    data: {
      workspaceId: visitorSession.widget.workspace.id,
      contactId: contact?.id ?? visitorSession.contactId!,
      visitorSessionId: visitorSession.id,
      widgetId: visitorSession.widget.id,
      channel: "WIDGET",
      subject: text.slice(0, 100),
      messages: {
        create: {
          body: text,
          authorType: "VISITOR",
        },
      },
    },
  });

  console.info("conversation.created", {
    workspaceId: visitorSession.widget.workspace.id,
    widgetId: visitorSession.widget.id,
    conversationId: conversation.id,
    channel: "WIDGET",
  });

  return conversation;
}

export async function recordAiMessage({
  db,
  conversationId,
  text,
}: {
  db: PrismaClient;
  conversationId: string;
  text: string;
}) {
  return db.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      messages: {
        create: {
          body: text,
          authorType: "AI",
        },
      },
    },
  });
}
