import { submitEchoLeadCapture } from "@/features/leads/server/lead-service";
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

  const session = await getVisitorSessionByDbId(db, body.sessionId, access.widget.id);
  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  await submitEchoLeadCapture({
    db,
    visitorSessionId: session.id,
    workspaceId: access.widget.workspaceId,
    campaignId: access.widget.selectedCampaignId,
    name: body.name.trim(),
    email: body.email?.trim() || null,
    phone: body.phone?.trim() || null,
    conversationSummary: body.conversationSummary ?? null,
    triggerType: body.triggerType ?? "manual",
    triggerValue: body.triggerValue ?? null,
    messageCount: body.messageCount ?? session.messageCount,
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    new Response(null, { status: 204 }),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
