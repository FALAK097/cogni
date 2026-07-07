import type { MessageJson } from "@/features/conversations/server/conversation-service";
import {
  assertPublicWidgetAccess,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import {
  getRequestOrigin,
  widgetPreflightResponse,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";

export function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}

function getLastPublicMessage(messagesJson: string) {
  try {
    const messages = JSON.parse(messagesJson || "[]") as MessageJson[];
    const publicMessages = messages.filter(
      (message) => message.visibility === "PUBLIC" || !message.visibility,
    );
    return publicMessages[publicMessages.length - 1] ?? null;
  } catch {
    return null;
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

  const queryVisitorId = new URL(request.url).searchParams.get("visitorId");
  const visitorId = authorized.session.visitorId;
  if (!visitorId) {
    const origin = getRequestOrigin(request);
    return withWidgetCors(
      Response.json({ sessions: [] }),
      origin,
      validateEmbedOrigin(origin, access.allowedDomains),
    );
  }
  if (queryVisitorId && queryVisitorId !== visitorId) {
    return Response.json({ error: "visitorId does not match session." }, { status: 403 });
  }

  const currentSessionId = new URL(request.url).searchParams.get("currentSessionId");
  const nowIso = new Date().toISOString();

  const sessions = await db.query.visitorSession.findMany({
    where: (fields, { eq, and, gt, sql }) =>
      and(
        eq(fields.widgetId, access.widget.id),
        eq(fields.visitorId, visitorId),
        gt(fields.messageCount, 0),
        gt(fields.expiresAt, nowIso),
        sql`exists (
          select 1 from conversation
          where conversation.visitorSessionId = ${fields.id}
            and conversation.channel = 'WIDGET'
            and conversation.messages like '%"authorType":"VISITOR"%'
        )`,
      ),
    orderBy: (fields, { desc }) => [desc(fields.lastSeenAt)],
    limit: 20,
    with: {
      conversations: {
        where: (fields, { eq, and, like }) =>
          and(eq(fields.channel, "WIDGET"), like(fields.messages, '%"authorType":"VISITOR"%')),
        orderBy: (fields, { desc }) => [desc(fields.lastMessageAt)],
        limit: 1,
        columns: {
          messages: true,
          subject: true,
        },
      },
    },
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({
      sessions: sessions.map((session) => {
        const conversation = session.conversations[0];
        const lastMessage = conversation ? getLastPublicMessage(conversation.messages) : null;

        return {
          id: session.id,
          browserSessionId: session.browserSessionId,
          token: session.id === authorized.session.id ? authorized.session.token : null,
          lastActivityAt: new Date(session.lastSeenAt).toISOString(),
          messageCount: session.messageCount,
          preview: lastMessage?.body ?? conversation?.subject ?? "No messages yet",
          isCurrent: currentSessionId ? session.id === currentSessionId : false,
        };
      }),
    }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
