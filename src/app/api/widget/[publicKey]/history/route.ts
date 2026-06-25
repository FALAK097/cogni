import { getVisitorConversationMessages } from "@/features/conversations/server/conversation-service";
import {
  assertPublicWidgetAccess,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import {
  getRequestOrigin,
  toWidgetHistoryMessages,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
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
  const authorized = await requireAuthorizedVisitorSession(db, publicKey, request);
  if ("error" in authorized) return authorized.error;

  const sessionId = new URL(request.url).searchParams.get("sessionId");
  if (!sessionId) {
    return Response.json({ error: "sessionId is required." }, { status: 400 });
  }

  const visitorId = authorized.session.visitorId;

  const session = await db.visitorSession.findFirst({
    where: {
      id: sessionId,
      widgetId: access.widget.id,
      messageCount: { gt: 0 },
      conversations: { some: { channel: "WIDGET" } },
      expiresAt: { gt: new Date() },
      ...(visitorId ? { visitorId } : { token: authorized.session.token }),
    },
  });
  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const messages = await getVisitorConversationMessages({
    db,
    visitorSessionId: session.id,
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({
      sessionId: session.id,
      browserSessionId: session.browserSessionId,
      token: session.token,
      messages: toWidgetHistoryMessages(messages),
    }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
