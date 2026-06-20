import "server-only";

import { getDb } from "@/lib/db/client";

export async function listDocuments(workspaceId: string, query?: string) {
  return getDb().document.findMany({
    where: {
      workspaceId,
      ...(query?.trim()
        ? {
            OR: [{ title: { contains: query.trim() } }, { sourceUrl: { contains: query.trim() } }],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { chunks: true } },
    },
  });
}
