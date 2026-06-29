import "server-only";

import { getDb } from "@/lib/db/client";

export async function listDocuments(workspaceId: string, query?: string) {
  const db = getDb();
  const docs = await db.query.document.findMany({
    where: (fields, { eq, and, or, like }) => {
      const workspaceCond = eq(fields.workspaceId, workspaceId);
      const queryTrimmed = query?.trim();
      if (queryTrimmed) {
        return and(
          workspaceCond,
          or(like(fields.title, `%${queryTrimmed}%`), like(fields.sourceUrl, `%${queryTrimmed}%`)),
        );
      }
      return workspaceCond;
    },
    orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
    with: {
      documentChunks: {
        columns: {
          id: true,
        },
      },
    },
  });

  return docs.map((doc) => ({
    ...doc,
    createdAt: new Date(doc.createdAt),
    updatedAt: new Date(doc.updatedAt),
    _count: {
      chunks: doc.documentChunks.length,
    },
  }));
}
