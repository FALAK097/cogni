import "server-only";

import { getDb } from "@/lib/db/client";

export async function listContacts(workspaceId: string, query?: string) {
  const normalizedQuery = query?.trim();

  return getDb().contact.findMany({
    where: {
      workspaceId,
      ...(normalizedQuery
        ? {
            OR: [
              { name: { contains: normalizedQuery } },
              { email: { contains: normalizedQuery } },
              { externalId: { contains: normalizedQuery } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { conversations: true },
      },
    },
  });
}

export async function getContact(workspaceId: string, contactId: string) {
  return getDb().contact.findFirst({
    where: {
      id: contactId,
      workspaceId,
    },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          authorUser: {
            select: { name: true },
          },
        },
      },
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        take: 10,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
      _count: {
        select: { conversations: true },
      },
    },
  });
}
