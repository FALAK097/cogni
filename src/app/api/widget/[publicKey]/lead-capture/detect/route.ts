import { parseJsonArray } from "@/features/widget/domain";
import { detectLeadCaptureTrigger } from "@/features/leads/server/lead-service";
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
    currentMessage?: string;
    messageCount?: number;
    sessionDurationMinutes?: number;
  };

  if (!body.sessionId) {
    return Response.json({ error: "sessionId is required." }, { status: 400 });
  }

  const session = await getVisitorSessionByDbId(db, body.sessionId, access.widget.id);
  if (!session) {
    return Response.json({ error: "Session not found." }, { status: 404 });
  }

  const result = await detectLeadCaptureTrigger({
    db,
    visitorSessionId: session.id,
    enableLeadCapture: access.widget.enableLeadCapture,
    leadCaptureKeywords: parseJsonArray(access.widget.leadCaptureKeywords),
    leadCaptureMinutesThreshold: access.widget.leadCaptureMinutesThreshold,
    leadCaptureMessageThreshold: access.widget.leadCaptureMessageThreshold,
    currentMessage: body.currentMessage,
    messageCount: body.messageCount ?? session.messageCount,
    sessionStartedAt: session.createdAt,
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json(result),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
