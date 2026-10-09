import { detectLeadCaptureTrigger } from "@/features/widget/server/lead-capture";
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
    enableLeadCapture: access.settings.enableLeadCapture,
    leadCaptureKeywords: access.settings.leadCaptureKeywords,
    leadCaptureMinutesThreshold: access.settings.leadCaptureMinutesThreshold,
    leadCaptureMessageThreshold: access.settings.leadCaptureMessageThreshold,
    currentMessage: body.currentMessage,
    messageCount: body.messageCount ?? authorized.session.messageCount,
    sessionStartedAt: new Date(authorized.session.createdAt),
  });

  const origin = getRequestOrigin(request);
  return withWidgetCors(
    Response.json(result),
    origin,
    validateEmbedOrigin(origin, access.allowedDomains),
  );
}
