import { z } from "zod";
import type { MessageJson } from "@/features/conversations/server/conversation-service";
import {
  assertPublicWidgetAccess,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";

const feedbackSchema = z.object({
  messageId: z.string().min(1),
  sessionId: z.string().min(1),
  feedback: z.enum(["positive", "negative"]),
  reason: z.string().trim().max(500).nullable().default(null),
});

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

  const parsed = feedbackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid feedback payload." }, { status: 400 });
  }
  const body = parsed.data;

  if (body.sessionId !== authorized.session.id) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = await db.conversation.findFirst({
    where: {
      visitorSessionId: authorized.session.id,
      status: { not: "CLOSED" },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Active conversation not found." }, { status: 404 });
  }

  const list = JSON.parse(conversation.messages || "[]") as MessageJson[];
  const msgIndex = list.findIndex((m) => m.id === body.messageId);

  if (msgIndex === -1) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }

  list[msgIndex] = {
    ...list[msgIndex],
    feedback: body.feedback,
    feedbackReason: body.reason,
    feedbackAt: new Date().toISOString(),
  };

  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      messages: JSON.stringify(list),
    },
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    new Response(null, { status: 204 }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
