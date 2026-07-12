import "server-only";

import { generateText } from "ai";
import { and, eq } from "drizzle-orm";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { retrieveKnowledgeContext } from "@/features/knowledge/server/retrieval";
import { getWidgetModel } from "@/lib/ai/providers";
import type { Db } from "@/lib/db/client";
import { contact, conversation } from "@/lib/db/schema";

export const supportedChatChannels = ["SLACK", "DISCORD", "TEAMS", "GCHAT", "WHATSAPP"] as const;
export type SupportedChatChannel = (typeof supportedChatChannels)[number];

export async function ingestOmnichannelMessage({
  db,
  channel,
  externalThreadId,
  externalMessageId,
  externalUserId,
  userName,
  text,
}: {
  db: Db;
  channel: SupportedChatChannel;
  externalThreadId: string;
  externalMessageId: string;
  externalUserId: string;
  userName: string;
  text: string;
}) {
  const connections = await db.query.integration.findMany({
    where: (fields, { eq, and }) =>
      and(eq(fields.provider, channel), eq(fields.status, "CONNECTED")),
    limit: 2,
  });
  if (connections.length !== 1) {
    throw new Error(`Expected one active ${channel} connection; found ${connections.length}.`);
  }
  const connection = connections[0];
  const workspaceId = connection.workspaceId;
  const externalId = `${channel.toLowerCase()}:${externalUserId}`;
  await db
    .insert(contact)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      externalId,
      name: userName || `${channel} user`,
      updatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({
      target: [contact.workspaceId, contact.externalId],
      set: {
        name: userName || `${channel} user`,
        lastSeenAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  const channelContact = await db.query.contact.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.workspaceId, workspaceId), eq(fields.externalId, externalId)),
  });
  if (!channelContact) throw new Error("Could not resolve channel contact.");

  let current = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(
        eq(fields.workspaceId, workspaceId),
        eq(fields.channel, channel),
        eq(fields.externalThreadId, externalThreadId),
      ),
  });
  const now = new Date().toISOString();
  const incoming: MessageJson = {
    id: crypto.randomUUID(),
    clientId: externalMessageId,
    body: text,
    authorType: "VISITOR",
    visibility: "PUBLIC",
    createdAt: now,
  };
  if (!current) {
    const [created] = await db
      .insert(conversation)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        contactId: channelContact.id,
        channel,
        externalThreadId,
        subject: text.slice(0, 100) || `${channel} conversation`,
        messages: JSON.stringify([incoming]),
        updatedAt: now,
        lastMessageAt: now,
      })
      .returning();
    current = created;
  } else {
    const messages = JSON.parse(current.messages) as MessageJson[];
    if (!messages.some((message) => message.clientId === externalMessageId)) {
      const [updated] = await db
        .update(conversation)
        .set({
          messages: JSON.stringify([...messages, incoming]),
          updatedAt: now,
          lastMessageAt: now,
        })
        .where(and(eq(conversation.id, current.id), eq(conversation.workspaceId, workspaceId)))
        .returning();
      current = updated;
    }
  }
  return { connection, contact: channelContact, conversation: current };
}

export async function answerOmnichannelMessage({
  db,
  workspaceId,
  conversationId,
  text,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  text: string;
}) {
  const widget = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspaceId),
    with: { workspace: true },
  });
  if (!widget) throw new Error("Workspace agent is not configured.");
  const sources = await retrieveKnowledgeContext(workspaceId, text, 4);
  const result = await generateText({
    model: getWidgetModel(widget.modelProvider as "OPENAI" | "GOOGLE", widget.modelName),
    instructions: [
      `You are ${widget.displayName}, support assistant for ${widget.workspace.name}.`,
      widget.instructions,
      "Answer concisely from reliable knowledge. If unsure, offer human help.",
      sources
        .map((source) => `[Source: ${source.title}]\n${source.content.slice(0, 1200)}`)
        .join("\n\n"),
    ].join("\n"),
    prompt: text,
    timeout: { totalMs: 45_000, stepMs: 20_000 },
  });
  const current = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.id, conversationId), eq(fields.workspaceId, workspaceId)),
  });
  if (!current) throw new Error("Conversation not found.");
  const messages = JSON.parse(current.messages) as MessageJson[];
  const response: MessageJson = {
    id: crypto.randomUUID(),
    body: result.text,
    authorType: "AI",
    visibility: "PUBLIC",
    createdAt: new Date().toISOString(),
  };
  await db
    .update(conversation)
    .set({
      messages: JSON.stringify([...messages, response]),
      updatedAt: response.createdAt,
      lastMessageAt: response.createdAt,
    })
    .where(and(eq(conversation.id, conversationId), eq(conversation.workspaceId, workspaceId)));
  return result.text;
}
