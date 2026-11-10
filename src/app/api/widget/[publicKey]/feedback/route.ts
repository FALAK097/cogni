import { z } from "zod";
import { setAiMessageFeedback } from "@/features/conversations/server/conversation-service";
import {
  assertPublicWidgetAccess,
  assertPreviewWidgetAccess,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import {
  getRequestOrigin,
  widgetPreflightResponse,
  withWidgetCors,
} from "@/features/widget/server/widget-utils";
import { validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";

const feedbackSchema = z.object({
  messageId: z.string().min(1),
  sessionId: z.string().min(1),
  feedback: z.enum(["positive", "negative"]),
  reason: z.string().trim().max(500).nullable().default(null),
  preview: z.boolean().default(false),
});

export function OPTIONS(request: Request) {
  return widgetPreflightResponse(request);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const parsed = feedbackSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: "Invalid feedback payload." }, { status: 400 });
  }
  const body = parsed.data;

  const access = body.preview
    ? await assertPreviewWidgetAccess(db, publicKey, request)
    : await assertPublicWidgetAccess(db, publicKey, request);
  if ("error" in access) return access.error;
  const authorized = await requireAuthorizedVisitorSession(db, publicKey, request);
  if ("error" in authorized) return authorized.error;

  if (body.sessionId !== authorized.session.id) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const conversation = await db.query.conversation.findFirst({
    where: (fields, { eq, and, ne }) =>
      and(
        eq(fields.visitorSessionId, authorized.session.id),
        eq(fields.workspaceId, access.widget.workspaceId),
        eq(fields.widgetId, access.widget.id),
        ne(fields.status, "CLOSED"),
      ),
  });

  if (!conversation) {
    return Response.json({ error: "Active conversation not found." }, { status: 404 });
  }

  const feedbackAt = new Date().toISOString();
  const updated = await setAiMessageFeedback({
    db,
    conversationId: conversation.id,
    workspaceId: access.widget.workspaceId,
    visitorSessionId: authorized.session.id,
    messageId: body.messageId,
    feedback: body.feedback,
    reason: body.reason,
    feedbackAt,
  });

  if (!updated) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    new Response(null, { status: 204 }),
    origin,
    body.preview || validateEmbedOrigin(origin, access.allowedDomains),
  );
}
