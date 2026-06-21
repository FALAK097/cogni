import { NextResponse } from "next/server";

import {
  normalizeHostname,
  normalizeLauncherSize,
  normalizePosition,
  stringifyJsonArray,
} from "@/features/widget/domain";
import { ensureWorkspaceWidget, toWidgetSettings } from "@/features/widget/server/widget-service";
import { requireDashboardContext } from "@/lib/auth/dashboard-context";

async function saveWidgetConfig(body: Record<string, unknown>) {
  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);
  const current = toWidgetSettings(widget);

  const authorizedDomains = Array.isArray(body.allowedDomains)
    ? body.allowedDomains.filter((item): item is string => typeof item === "string")
    : current.authorizedDomains;

  const domains = authorizedDomains
    .map((domain) => normalizeHostname(domain))
    .filter((domain): domain is string => Boolean(domain));

  const suggestions = Array.isArray(body.suggestions)
    ? body.suggestions.filter((item): item is string => typeof item === "string")
    : current.suggestions;

  const previewMessages = Array.isArray(body.previewMessages)
    ? body.previewMessages.filter((item): item is string => typeof item === "string")
    : current.previewMessages;

  const leadCaptureKeywords = Array.isArray(body.leadCaptureKeywords)
    ? body.leadCaptureKeywords.filter((item): item is string => typeof item === "string")
    : current.leadCaptureKeywords;

  const updated = await db.widget.update({
    where: { id: widget.id },
    data: {
      displayName: typeof body.agentName === "string" ? body.agentName : current.displayName,
      welcomeMessage:
        typeof body.welcomeMessage === "string" ? body.welcomeMessage : current.welcomeMessage,
      logoUrl: typeof body.logoUrl === "string" ? body.logoUrl || null : current.logoUrl,
      primaryColor:
        typeof body.primaryColor === "string" ? body.primaryColor : current.primaryColor,
      userBubbleColor:
        typeof body.userBubbleColor === "string" ? body.userBubbleColor : current.userBubbleColor,
      userBubbleTextColor:
        typeof body.userBubbleTextColor === "string"
          ? body.userBubbleTextColor
          : current.userBubbleTextColor,
      botBubbleColor:
        typeof body.botBubbleColor === "string" ? body.botBubbleColor : current.botBubbleColor,
      botBubbleTextColor:
        typeof body.botBubbleTextColor === "string"
          ? body.botBubbleTextColor
          : current.botBubbleTextColor,
      headerGradientFrom:
        typeof body.headerGradientFrom === "string"
          ? body.headerGradientFrom
          : current.headerGradientFrom,
      headerGradientTo:
        typeof body.headerGradientTo === "string"
          ? body.headerGradientTo
          : current.headerGradientTo,
      theme: body.theme === "dark" ? "dark" : body.theme === "light" ? "light" : current.theme,
      position: normalizePosition(
        typeof body.position === "string" ? body.position : current.position,
      ),
      launcherSize: normalizeLauncherSize(
        typeof body.launcherSize === "string" ? body.launcherSize : current.launcherSize,
      ),
      borderRadiusStyle:
        body.borderRadius === "none" ||
        body.borderRadius === "full" ||
        body.borderRadius === "default"
          ? body.borderRadius
          : current.borderRadiusStyle,
      shadowSize:
        body.shadowSize === "none" || body.shadowSize === "md" || body.shadowSize === "lg"
          ? body.shadowSize
          : current.shadowSize,
      inputPlaceholder:
        typeof body.inputPlaceholder === "string"
          ? body.inputPlaceholder
          : current.inputPlaceholder,
      suggestions: stringifyJsonArray(suggestions),
      previewMessages: stringifyJsonArray(previewMessages),
      hideSuggestionsOnInteract:
        typeof body.hideSuggestionsOnInteract === "boolean"
          ? body.hideSuggestionsOnInteract
          : current.hideSuggestionsOnInteract,
      autoShowPreviewDelay:
        typeof body.autoShowPreviewDelay === "number"
          ? body.autoShowPreviewDelay
          : current.autoShowPreviewDelay,
      showBranding:
        typeof body.showBranding === "boolean" ? body.showBranding : current.showBranding,
      privacyPolicyUrl:
        typeof body.privacyPolicyUrl === "string"
          ? body.privacyPolicyUrl
          : current.privacyPolicyUrl,
      enableLeadCapture:
        typeof body.enableLeadCapture === "boolean"
          ? body.enableLeadCapture
          : current.enableLeadCapture,
      leadCaptureKeywords: stringifyJsonArray(leadCaptureKeywords),
      leadCaptureMinutesThreshold:
        typeof body.leadCaptureMinutesThreshold === "number"
          ? body.leadCaptureMinutesThreshold
          : current.leadCaptureMinutesThreshold,
      leadCaptureMessageThreshold:
        typeof body.leadCaptureMessageThreshold === "number"
          ? body.leadCaptureMessageThreshold
          : current.leadCaptureMessageThreshold,
      enableBrochure:
        typeof body.enableBrochure === "boolean" ? body.enableBrochure : current.enableBrochure,
      brochureSuggestionText:
        typeof body.brochureSuggestionText === "string"
          ? body.brochureSuggestionText
          : current.brochureSuggestionText,
      isEnabled: typeof body.isEnabled === "boolean" ? body.isEnabled : current.isEnabled,
      instructions:
        typeof body.instructions === "string" ? body.instructions : current.instructions,
      authorizedDomains: JSON.stringify(domains),
    },
  });

  const settings = toWidgetSettings(updated);
  return {
    ...settings,
    workspaceId: workspace.id,
    agentName: settings.displayName,
    allowedDomains: settings.authorizedDomains,
    borderRadius: settings.borderRadiusStyle,
  };
}

export async function GET() {
  const { db, workspace } = await requireDashboardContext();
  const widget = await ensureWorkspaceWidget(db, workspace.id);
  const settings = toWidgetSettings(widget);

  return NextResponse.json({
    ...settings,
    workspaceId: workspace.id,
    agentName: settings.displayName,
    allowedDomains: settings.authorizedDomains,
    borderRadius: settings.borderRadiusStyle,
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const settings = await saveWidgetConfig(body);
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const settings = await saveWidgetConfig(body);
  return NextResponse.json(settings);
}
