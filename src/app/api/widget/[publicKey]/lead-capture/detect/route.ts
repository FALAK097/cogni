import { parseJsonArray } from "@/features/widget/domain";
import { detectLeadCaptureTrigger } from "@/features/leads/server/lead-service";
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
    currentMessage?: string;
    messageCount?: number;
    sessionDurationMinutes?: number;
  };

  if (!body.sessionId) {
    return Response.json({ error: "sessionId is required." }, { status: 400 });
  }

  if (body.sessionId !== authorized.session.id) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const result = await detectLeadCaptureTrigger({
    db,
    visitorSessionId: authorized.session.id,
    enableLeadCapture: access.widget.enableLeadCapture,
    leadCaptureKeywords: parseJsonArray(access.widget.leadCaptureKeywords),
    leadCaptureMinutesThreshold: access.widget.leadCaptureMinutesThreshold,
    leadCaptureMessageThreshold: access.widget.leadCaptureMessageThreshold,
    currentMessage: body.currentMessage,
    messageCount: body.messageCount ?? authorized.session.messageCount,
    sessionStartedAt: authorized.session.createdAt,
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json(result),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
