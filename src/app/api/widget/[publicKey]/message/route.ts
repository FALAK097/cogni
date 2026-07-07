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
import type { MessageJson } from "@/features/conversations/server/conversation-service";

export function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const access = await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return access.error;
  const authorized = await requireAuthorizedVisitorSession(db, publicKey, request);
  if ("error" in authorized) return authorized.error;

  const body = (await request.json()) as {
    sessionId?: string;
    role?: string;
    content?: string;
  };

  if (
    body.sessionId !== authorized.session.id ||
    body.role !== "assistant" ||
    !body.content?.trim()
  ) {
    return Response.json({ error: "Invalid message payload." }, { status: 400 });
  }

  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and }) =>
      and(eq(fields.visitorSessionId, authorized.session.id), eq(fields.channel, "WIDGET")),
    orderBy: (fields, { desc }) => [desc(fields.updatedAt)],
  });

  if (!conversation) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }

  const messagesList = JSON.parse(conversation.messages || "[]") as MessageJson[];
  const contentToMatch = body.content.trim();
  const matchedMessage = [...messagesList]
    .reverse()
    .find((m) => m.authorType === "AI" && m.body === contentToMatch);

  if (!matchedMessage) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({ message: { id: matchedMessage.id } }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
