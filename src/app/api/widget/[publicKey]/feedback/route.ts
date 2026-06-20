import {
  assertPublicWidgetAccess,
  getVisitorSessionByDbId,
} from "@/features/widget/server/widget-public";
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
    messageId?: string;
    sessionId?: string;
    feedback?: string;
    reason?: string | null;
  };

  if (!body.messageId || !body.sessionId || !body.feedback) {
    return Response.json({ error: "Invalid feedback payload." }, { status: 400 });
  }

  const session = await getVisitorSessionByDbId(db, body.sessionId, access.widget.id);
  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  await db.messageFeedback.upsert({
    where: {
      messageId_visitorSessionId: {
        messageId: body.messageId,
        visitorSessionId: session.id,
      },
    },
    update: {
      feedback: body.feedback,
      reason: body.reason ?? null,
    },
    create: {
      messageId: body.messageId,
      visitorSessionId: session.id,
      feedback: body.feedback,
      reason: body.reason ?? null,
    },
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    new Response(null, { status: 204 }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
