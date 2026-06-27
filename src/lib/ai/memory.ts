import type { MessageJson } from "@/features/conversations/server/conversation-service";
import type { Db } from "@/lib/db/client";

export async function buildAgentMemoryContext({
  db,
  workspaceId,
  conversationId,
  contactId,
}: {
  db: Db;
  workspaceId: string;
  conversationId: string;
  contactId: string;
}) {
  const [contact, conversation] = await Promise.all([
    db.query.contact.findFirst({
      where: (c, { eq, and }) => and(eq(c.id, contactId), eq(c.workspaceId, workspaceId)),
      columns: { name: true, email: true, tags: true },
    }),
    db.query.conversation.findFirst({
      where: (c, { eq }) => eq(c.id, conversationId),
      columns: { messages: true },
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
