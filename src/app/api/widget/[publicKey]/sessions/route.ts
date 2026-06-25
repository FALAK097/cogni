import type { MessageJson } from "@/features/conversations/server/conversation-service";
import { assertPublicWidgetAccess, bearerToken } from "@/features/widget/server/widget-public";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";

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

  const visitorId = new URL(request.url).searchParams.get("visitorId");
  if (!visitorId) {
    return Response.json({ error: "visitorId is required." }, { status: 400 });
  }

  const currentSessionId = new URL(request.url).searchParams.get("currentSessionId");
  const token = bearerToken(request);

  const sessions = await db.visitorSession.findMany({
    where: {
      widgetId: access.widget.id,
      visitorId,
      messageCount: { gt: 0 },
      expiresAt: { gt: new Date() },
      conversations: {
        some: {
          channel: "WIDGET",
          messages: { contains: '"authorType":"VISITOR"' },
        },
      },
    },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
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
      sessions: sessions.map((session) => {
        const conversation = session.conversations[0];
        const lastMessage = conversation ? getLastPublicMessage(conversation.messages) : null;

        return {
          id: session.id,
          browserSessionId: session.browserSessionId,
          token: token && session.id === currentSessionId ? session.token : null,
          lastActivityAt: session.lastSeenAt.toISOString(),
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
