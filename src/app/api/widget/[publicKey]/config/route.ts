import { parseJsonArray } from "@/features/widget/domain";
import { getRequestOrigin, withWidgetCors } from "@/features/widget/server/widget-utils";
import { getPublicWidget, validateEmbedOrigin } from "@/features/widget/server/widget-service";
import { getDb } from "@/lib/db/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const widget = await getPublicWidget(db, publicKey);

  if (!widget || !widget.isEnabled) {
    return Response.json({ error: "Widget is unavailable." }, { status: 404 });
  }

  const origin = getRequestOrigin(request);
  const allowedDomains = JSON.parse(widget.authorizedDomains || "[]") as string[];
  const allowed = validateEmbedOrigin(origin, allowedDomains);
  if (!allowed) {
    return Response.json({ error: "This domain is not authorized." }, { status: 403 });
  }

  const config = {
    workspaceId: widget.workspaceId,
    publicKey: widget.publicKey,
    position: widget.position,
    theme: widget.theme,
    agentName: widget.displayName,
    welcomeMessage: widget.welcomeMessage,
    logoUrl: widget.logoUrl,
    primaryColor: widget.primaryColor,
    userBubbleColor: widget.userBubbleColor,
    userBubbleTextColor: widget.userBubbleTextColor,
    botBubbleColor: widget.botBubbleColor,
    botBubbleTextColor: widget.botBubbleTextColor,
    headerGradientFrom: widget.headerGradientFrom,
    headerGradientTo: widget.headerGradientTo,
    backgroundColor: widget.backgroundColor,
    textColor: widget.textColor,
    launcherSize: widget.launcherSize,
    borderRadius: widget.borderRadiusStyle,
    shadowSize: widget.shadowSize,
    inputPlaceholder: widget.inputPlaceholder,
    suggestions: parseJsonArray(widget.suggestions),
    hideSuggestionsOnInteract: widget.hideSuggestionsOnInteract,
    previewMessages: parseJsonArray(widget.previewMessages),
    autoShowPreviewDelay: widget.autoShowPreviewDelay,
    showBranding: widget.showBranding,
    privacyPolicyUrl: widget.privacyPolicyUrl,
    enableLeadCapture: widget.enableLeadCapture,
    leadCaptureKeywords: parseJsonArray(widget.leadCaptureKeywords),
    leadCaptureMinutesThreshold: widget.leadCaptureMinutesThreshold,
    leadCaptureMessageThreshold: widget.leadCaptureMessageThreshold,
    enableBrochure: widget.enableBrochure,
    brochureSuggestionText: widget.brochureSuggestionText,
    allowedDomains,
  };

  return withWidgetCors(Response.json(config), origin, allowed);
}

export async function OPTIONS(
  request: Request,
  { params }: { params: Promise<{ publicKey: string }> },
) {
  const { publicKey } = await params;
  const db = getDb();
  const widget = await getPublicWidget(db, publicKey);
  const origin = getRequestOrigin(request);
  const allowedDomains = widget ? (JSON.parse(widget.authorizedDomains || "[]") as string[]) : [];
  const allowed = widget ? validateEmbedOrigin(origin, allowedDomains) : false;

  return withWidgetCors(new Response(null, { status: 204 }), origin, allowed);
}
