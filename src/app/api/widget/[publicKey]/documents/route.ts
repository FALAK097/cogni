import { assertPublicWidgetAccess } from "@/features/widget/server/widget-public";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";

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

  const documents = await db.document.findMany({
    where: {
      workspaceId: access.widget.workspaceId,
      status: "READY",
      ...(query
        ? {
            OR: [{ title: { contains: query } }, { sourceUrl: { contains: query } }],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      sourceUrl: true,
      mimeType: true,
    },
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({
      documents: documents.map((document) => ({
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
