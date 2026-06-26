import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { engagedVisitorSessionWhere } from "@/features/widget/server/widget-data-filters";
import {
  assertPublicWidgetAccess,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/widget-utils";
import { getDb } from "@/lib/db/client";

function sessionPreview(conversations: { messages: string; subject: string }[]) {
  const convo = conversations[0];
  if (!convo) return "No messages yet";

  try {
    const list = JSON.parse(convo.messages || "[]") as MessageJson[];
    const last = list[list.length - 1];
    return last?.body ?? convo.subject ?? "No messages yet";
  } catch {
    return convo.subject ?? "No messages yet";
  }
}

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

  const visitorId = authorized.session.visitorId;
  if (!visitorId) {
    const origin = getRequestOrigin(request);
    return withWidgetCors(
      Response.json({ sessions: [] }),
      origin,
      validateEmbedOrigin(origin, access.allowedDomains),
    );
  }

  const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? "20"), 20);

  const sessions = await db.visitorSession.findMany({
    where: {
      widgetId: access.widget.id,
      visitorId,
      expiresAt: { gt: new Date() },
      ...engagedVisitorSessionWhere,
    },
    orderBy: { lastSeenAt: "desc" },
    take: limit,
    include: {
      conversations: {
        where: {
          channel: "WIDGET",
          messages: { contains: '"authorType":"VISITOR"' },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 1,
        select: {
          messages: true,
          subject: true,
        },
      },
    },
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({
      sessions: sessions.map((session) => ({
        id: session.id,
        browserSessionId: session.browserSessionId,
        token: session.token,
        preview: sessionPreview(session.conversations),
        lastActivityAt: session.lastSeenAt.toISOString(),
        messageCount: session.messageCount,
        isCurrent: session.id === authorized.session.id,
      })),
    }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
