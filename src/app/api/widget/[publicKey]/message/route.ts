import {
  recordAiMessage,
  recordVisitorMessage,
} from "@/features/conversations/server/conversation-service";
import { assertPublicWidgetAccess } from "@/features/widget/server/widget-public";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/echo-utils";
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

  const body = (await request.json()) as {
    sessionId?: string;
    role?: string;
    content?: string;
  };

  if (!body.sessionId || !body.role || !body.content?.trim()) {
    return Response.json({ error: "Invalid message payload." }, { status: 400 });
  }

  const session = await db.visitorSession.findFirst({
    where: { id: body.sessionId, widgetId: access.widget.id },
    include: {
      widget: {
        include: {
          workspace: { select: { id: true } },
        },
      },
    },
  });
  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  let messageId: string;
  if (body.role === "user") {
    const conversation = await recordVisitorMessage({
      db,
      visitorSession: session,
      text: body.content.trim(),
    });
    const latest = await db.message.findFirst({
      where: { conversationId: conversation.id, authorType: "VISITOR" },
      orderBy: { createdAt: "desc" },
    });
    messageId = latest?.id ?? conversation.id;
    await db.visitorSession.update({
      where: { id: session.id },
      data: { messageCount: { increment: 1 } },
    });
  } else {
    const conversation = await db.conversation.findFirst({
      where: { visitorSessionId: session.id },
      orderBy: { lastMessageAt: "desc" },
    });
    if (!conversation) {
      return Response.json({ error: "Conversation not found." }, { status: 404 });
    }
    await recordAiMessage({
      db,
      conversationId: conversation.id,
      text: body.content.trim(),
    });
    const latest = await db.message.findFirst({
      where: { conversationId: conversation.id, authorType: "AI" },
      orderBy: { createdAt: "desc" },
    });
    messageId = latest?.id ?? conversation.id;
  }

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({ message: { id: messageId } }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
