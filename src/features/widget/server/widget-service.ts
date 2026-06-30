import "server-only";

import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/db/client";
import { widget as widgetTable } from "@/lib/db/schema";
import {
  hostnameMatches,
  normalizeFontFamily,
  normalizeFontSize,
  normalizeLauncherSize,
  normalizeLogoUrl,
  normalizePosition,
  parseJsonArray,
  type WidgetPublicConfig,
  type WidgetWidgetConfig,
  type WidgetBorderRadiusStyle,
  type WidgetLauncherSize,
  type WidgetModelProvider,
  type WidgetPosition,
  type WidgetSettings,
  type WidgetShadowSize,
  type WidgetTheme,
} from "@/features/widget/domain";

type WidgetRecord = Awaited<ReturnType<typeof ensureWorkspaceWidget>>;

export async function ensureWorkspaceWidget(db: Db, workspaceId: string) {
  const existing = await db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.workspaceId, workspaceId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(widgetTable)
    .values({
      id: randomUUID(),
      publicKey: randomUUID().replace(/-/g, ""),
      workspaceId,
      updatedAt: new Date().toISOString(),
    })
    .returning();

  return created;
}

export function toWidgetSettings(widget: WidgetRecord): WidgetSettings {
  return toWidgetWidgetConfig(widget);
}

export function toWidgetWidgetConfig(widget: WidgetRecord): WidgetWidgetConfig {
  return {
    publicKey: widget.publicKey,
    workspaceId: widget.workspaceId,
    displayName: widget.displayName,
    welcomeMessage: widget.welcomeMessage,
    inputPlaceholder: widget.inputPlaceholder,
    primaryColor: widget.primaryColor,
    backgroundColor: widget.backgroundColor,
    textColor: widget.textColor,
    borderColor: widget.borderColor ?? "#EAECF0",
    fontFamily: normalizeFontFamily(widget.fontFamily ?? "Inter"),
    fontSize: normalizeFontSize(widget.fontSize ?? "14px"),
    position: normalizePosition(widget.position),
    launcherSize: normalizeLauncherSize(widget.launcherSize),
    panelWidth: widget.panelWidth,
    panelHeight: widget.panelHeight,
    borderRadius: widget.borderRadius,
    borderRadiusStyle: widget.borderRadiusStyle as WidgetBorderRadiusStyle,
    logoUrl: normalizeLogoUrl(widget.logoUrl),
    instructions: widget.instructions,
    escalationKeywords: widget.escalationKeywords,
    modelProvider: widget.modelProvider as WidgetModelProvider,
    modelName: widget.modelName,
    isEnabled: widget.isEnabled,
    authorizedDomains: JSON.parse(widget.authorizedDomains || "[]") as string[],
    theme: widget.theme as WidgetTheme,
    userBubbleColor: widget.userBubbleColor,
    userBubbleTextColor: widget.userBubbleTextColor,
    botBubbleColor: widget.botBubbleColor,
    botBubbleTextColor: widget.botBubbleTextColor,
    headerGradientFrom: widget.headerGradientFrom,
    headerGradientTo: widget.headerGradientTo,
    shadowSize: widget.shadowSize as WidgetShadowSize,
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
  };
}

export function toWidgetPublicConfig(
  widget: NonNullable<Awaited<ReturnType<typeof getPublicWidget>>>,
): WidgetPublicConfig {
  const settings = toWidgetWidgetConfig(widget as WidgetRecord);

  return {
    workspaceId: widget.workspaceId,
    publicKey: widget.publicKey,
    position: settings.position,
    theme: settings.theme,
    agentName: settings.displayName,
    welcomeMessage: settings.welcomeMessage,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
    userBubbleColor: settings.userBubbleColor,
    userBubbleTextColor: settings.userBubbleTextColor,
    botBubbleColor: settings.botBubbleColor,
    botBubbleTextColor: settings.botBubbleTextColor,
    headerGradientFrom: settings.headerGradientFrom,
    headerGradientTo: settings.headerGradientTo,
    backgroundColor: settings.backgroundColor,
    textColor: settings.textColor,
    borderColor: settings.borderColor,
    fontFamily: settings.fontFamily,
    fontSize: settings.fontSize,
    launcherSize: settings.launcherSize,
    borderRadius: settings.borderRadiusStyle,
    shadowSize: settings.shadowSize,
    inputPlaceholder: settings.inputPlaceholder,
    suggestions: settings.suggestions,
    hideSuggestionsOnInteract: settings.hideSuggestionsOnInteract,
    previewMessages: settings.previewMessages,
    autoShowPreviewDelay: settings.autoShowPreviewDelay,
    showBranding: settings.showBranding,
    privacyPolicyUrl: settings.privacyPolicyUrl,
    enableLeadCapture: settings.enableLeadCapture,
    leadCaptureKeywords: settings.leadCaptureKeywords,
    leadCaptureMinutesThreshold: settings.leadCaptureMinutesThreshold,
    leadCaptureMessageThreshold: settings.leadCaptureMessageThreshold,
    enableBrochure: settings.enableBrochure,
    brochureSuggestionText: settings.brochureSuggestionText,
    allowedDomains: settings.authorizedDomains,
  };
}

export async function getPublicWidget(db: Db, publicKey: string) {
  return db.query.widget.findFirst({
    where: (fields, { eq }) => eq(fields.publicKey, publicKey),
    with: {
      workspace: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export function validateEmbedOrigin(origin: string | null, allowedDomains: string[]) {
  if (!origin || allowedDomains.length === 0) return false;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return allowedDomains.some((allowed) => hostnameMatches(hostname, allowed));
  } catch {
    return false;
  }
}

export function mapLauncherSizeToPixels(size: WidgetLauncherSize | WidgetPosition | string) {
  const normalized = normalizeLauncherSize(String(size));
  if (normalized === "sm") return 48;
  if (normalized === "lg") return 64;
  return 56;
}
