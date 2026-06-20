import { assertPublicWidgetAccess } from "@/features/widget/server/widget-public";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/echo-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const access = await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return access.error;

  const visitorId = new URL(request.url).searchParams.get("visitorId");
  if (!visitorId) {
    return Response.json({ error: "visitorId is required." }, { status: 400 });
  }

  const sessions = await db.visitorSession.findMany({
    where: {
      widgetId: access.widget.id,
      visitorId,
    },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
    select: {
      id: true,
      browserSessionId: true,
      lastSeenAt: true,
      messageCount: true,
      status: true,
      pageUrl: true,
    },
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({
      sessions: sessions.map((session) => ({
        sessionId: session.id,
        browserSessionId: session.browserSessionId,
        lastActivityAt: session.lastSeenAt.toISOString(),
        messageCount: session.messageCount,
        status: session.status,
        pageUrl: session.pageUrl,
      })),
    }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
