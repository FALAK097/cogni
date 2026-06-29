import { assertPublicWidgetAccess } from "@/features/widget/server/widget-public";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";
import type { SQL } from "drizzle-orm";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const access = await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return access.error;

  const body = (await request.json()) as { searchQuery?: string | null };
  const query = body.searchQuery?.trim() ?? "";

  const documents = await db.query.document.findMany({
    where: (fields, { eq, and, or, like }) => {
      const conds: SQL[] = [
        eq(fields.workspaceId, access.widget.workspaceId),
        eq(fields.status, "READY"),
      ];
      if (query) {
        const searchCond = or(
          like(fields.title, `%${query}%`),
          like(fields.sourceUrl, `%${query}%`),
        );
        if (searchCond) {
          conds.push(searchCond);
        }
      }
      return and(...conds);
    },
    orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
    limit: 10,
    columns: {
      id: true,
      title: true,
      sourceUrl: true,
      mimeType: true,
    },
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({
      documents: documents.map((document: any) => ({
        id: document.id,
        title: document.title,
        url: document.sourceUrl,
        mimeType: document.mimeType,
      })),
    }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
