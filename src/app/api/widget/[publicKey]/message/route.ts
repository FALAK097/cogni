import {
  assertPublicWidgetAccess,
  requireAuthorizedVisitorSession,
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

  const message = await db.message.findFirst({
    where: {
      conversation: { visitorSessionId: authorized.session.id },
      authorType: "AI",
      body: body.content.trim(),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!message) {
    return Response.json({ error: "Message not found." }, { status: 404 });
  }

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json({ message }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
