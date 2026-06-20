import "server-only";

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
  const [contact, recentMessages] = await Promise.all([
    db.contact.findFirst({
      where: { id: contactId, workspaceId },
      select: { name: true, email: true, tags: true },
    }),
    db.message.findMany({
      where: {
        conversationId,
        visibility: "PUBLIC",
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { authorType: true, body: true },
    }),
  ]);

  const tags = (() => {
    try {
      return JSON.parse(contact?.tags ?? "[]") as string[];
    } catch {
      return [];
    }
  })();

  const history = recentMessages
    .reverse()
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
