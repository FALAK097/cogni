import { getVisitorConversationMessages } from "@/features/conversations/server/conversation-service";
import { parseJsonArray } from "@/features/widget/domain";
import { assertPublicWidgetAccess } from "@/features/widget/server/widget-public";
import { toEchoHistoryMessages, withWidgetCors } from "@/features/widget/server/echo-utils";
import {
  resolveVisitorSession,
  validateEmbedOrigin,
} from "@/features/widget/server/widget-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";
import { getDb } from "@/lib/db/client";
import { getPublicWidget } from "@/features/widget/server/widget-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const body = (await request.json()) as {
    sessionId?: string;
    visitorId?: string;
    token?: string;
    hostname?: string;
    preview?: boolean;
    metadata?: Record<string, unknown>;
  };

  const hostname =
    (typeof body.metadata?.hostname === "string" ? body.metadata.hostname : body.hostname) ||
    "unknown";

  let preview = body.preview === true;
  if (hostname === "dashboard-preview") {
    try {
      const { workspace } = await requireDashboardContext();
      const widget = await getPublicWidget(db, publicKey);
      if (widget && workspace.id === widget.workspaceId) {
        preview = true;
      }
    } catch {
      return Response.json({ error: "Preview access denied." }, { status: 403 });
    }
  }

  const access = await assertPublicWidgetAccess(db, publicKey, request, { preview, hostname });
  if ("error" in access) return access.error;

  const { widget, origin, allowedDomains } = access;
  const metadata = body.metadata ?? {};

  const visitorSession = await resolveVisitorSession({
    db,
    widgetId: widget.id,
    hostname: hostname.toLowerCase().replace(/\.$/, ""),
    token: body.token,
    metadata: {
      visitorId: body.visitorId,
      browserSessionId: body.sessionId,
      pageUrl: typeof metadata.pageUrl === "string" ? metadata.pageUrl : undefined,
      referrer: typeof metadata.referrer === "string" ? metadata.referrer : undefined,
      browser: typeof metadata.browser === "string" ? metadata.browser : undefined,
      deviceType: typeof metadata.deviceType === "string" ? metadata.deviceType : undefined,
      os: typeof metadata.os === "string" ? metadata.os : undefined,
      country: typeof metadata.country === "string" ? metadata.country : undefined,
      city: typeof metadata.city === "string" ? metadata.city : undefined,
      timezone: typeof metadata.timezone === "string" ? metadata.timezone : undefined,
      language: typeof metadata.language === "string" ? metadata.language : undefined,
      screenSize: typeof metadata.screenSize === "string" ? metadata.screenSize : undefined,
      ipData:
        metadata.clientIp || metadata.ipData
          ? JSON.stringify({ clientIp: metadata.clientIp ?? metadata.ipData })
          : undefined,
    },
  });

  const messages = await getVisitorConversationMessages({
    db,
    visitorSessionId: visitorSession.id,
  });

  const isNew = messages.length === 0;

  const response = Response.json({
    sessionId: visitorSession.id,
    browserSessionId: visitorSession.browserSessionId,
    token: visitorSession.token,
    workspaceId: widget.workspaceId,
    publicKey: widget.publicKey,
    isNew,
    enableLeadCapture: widget.enableLeadCapture,
    leadCaptureKeywords: parseJsonArray(widget.leadCaptureKeywords),
    enableBrochure: widget.enableBrochure,
    brochureSuggestionText: widget.brochureSuggestionText,
    messages: toEchoHistoryMessages(messages),
  });

  return withWidgetCors(response, origin, validateEmbedOrigin(origin, allowedDomains));
}
