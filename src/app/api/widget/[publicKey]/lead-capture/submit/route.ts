import { submitWidgetLeadCapture } from "@/features/leads/server/lead-service";
import {
  assertPublicWidgetAccess,
  requireAuthorizedVisitorSession,
} from "@/features/widget/server/widget-public";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/widget-utils";
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
    name?: string;
    email?: string;
    phone?: string;
    conversationSummary?: string;
    triggerType?: string;
    triggerValue?: string;
    messageCount?: number;
  };

  if (!body.sessionId || !body.name?.trim()) {
    return Response.json({ error: "Invalid lead capture payload." }, { status: 400 });
  }

  if (body.sessionId !== authorized.session.id) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  await submitWidgetLeadCapture({
    db,
    visitorSessionId: authorized.session.id,
    workspaceId: access.widget.workspaceId,
    name: body.name.trim(),
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    conversationSummary: body.conversationSummary ?? null,
    triggerType: body.triggerType ?? "manual",
    triggerValue: body.triggerValue ?? null,
    messageCount: body.messageCount ?? authorized.session.messageCount,
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    new Response(null, { status: 204 }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
