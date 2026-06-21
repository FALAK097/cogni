import "server-only";

import type { MessageJson } from "@/features/conversations/server/conversation-service";
import type { PrismaClient } from "@/generated/prisma/client";

export async function buildAgentMemoryContext({
  db,
  workspaceId,
  conversationId,
  contactId,
}: {
  db: PrismaClient;
  workspaceId: string;
  conversationId: string;
  contactId: string;
}) {
  const [contact, conversation] = await Promise.all([
    db.contact.findFirst({
      where: { id: contactId, workspaceId },
      select: { name: true, email: true, tags: true },
    }),
    db.conversation.findUnique({
      where: { id: conversationId },
      select: { messages: true },
    }),
  ]);

  const tags = (() => {
    try {
      return JSON.parse(contact?.tags ?? "[]") as string[];
    } catch {
      return [];
    }
  })();

  const messagesList = (() => {
    try {
      return JSON.parse(conversation?.messages || "[]") as MessageJson[];
    } catch {
      return [];
    }
  })();

  // Filter public messages and take the last 8
  const publicMessages = messagesList.filter((m) => m.visibility === "PUBLIC" || !m.visibility);
  const recentMessages = publicMessages.slice(-8);

  const history = recentMessages
    .map((message) => `${message.authorType}: ${message.body.slice(0, 240)}`)
    .join("\n");

  return [
    contact ? `Contact: ${contact.name}${contact.email ? ` (${contact.email})` : ""}` : "",
    tags.length > 0 ? `Contact tags: ${tags.join(", ")}` : "",
    history ? `Recent conversation:\n${history}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
