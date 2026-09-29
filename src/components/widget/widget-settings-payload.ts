import type { DashboardWidgetConfig } from "@/hooks/query";
import { normalizeLogoUrl } from "@/features/widget/domain";

export type WidgetCustomizerConfig = Pick<
  DashboardWidgetConfig,
  | "publicKey"
  | "position"
  | "theme"
  | "agentName"
  | "welcomeMessage"
  | "logoUrl"
  | "primaryColor"
  | "backgroundColor"
  | "textColor"
  | "userBubbleColor"
  | "userBubbleTextColor"
  | "botBubbleColor"
  | "botBubbleTextColor"
  | "headerGradientFrom"
  | "headerGradientTo"
  | "launcherSize"
  | "borderRadius"
  | "shadowSize"
  | "inputPlaceholder"
  | "suggestions"
  | "hideSuggestionsOnInteract"
  | "previewMessages"
  | "autoShowPreviewDelay"
  | "showBranding"
  | "privacyPolicyUrl"
  | "enableLeadCapture"
  | "leadCaptureKeywords"
  | "leadCaptureMinutesThreshold"
  | "leadCaptureMessageThreshold"
  | "enableBrochure"
  | "brochureSuggestionText"
  | "allowedDomains"
  | "instructions"
  | "escalationKeywords"
  | "borderColor"
  | "fontFamily"
  | "fontSize"
  | "modelProvider"
  | "modelName"
> & {
  workspaceId: string;
  secondaryTextColor: string;
  linkColor: string;
};

export function toSavePayload(config: WidgetCustomizerConfig) {
  return {
    agentName: config.agentName,
    modelProvider: config.modelProvider,
    modelName: config.modelName,
    welcomeMessage: config.welcomeMessage,
    logoUrl: normalizeLogoUrl(config.logoUrl?.trim() ? config.logoUrl.trim() : null),
    primaryColor: config.primaryColor,
    backgroundColor: config.backgroundColor,
    textColor: config.textColor,
    userBubbleColor: config.userBubbleColor,
    userBubbleTextColor: config.userBubbleTextColor,
    botBubbleColor: config.botBubbleColor,
    botBubbleTextColor: config.secondaryTextColor,
    headerGradientFrom: config.headerGradientFrom,
    headerGradientTo: config.headerGradientFrom,
    theme: config.theme,
    position: config.position,
    launcherSize: config.launcherSize,
    borderRadius: config.borderRadius,
    shadowSize: config.shadowSize,
    inputPlaceholder: config.inputPlaceholder,
    suggestions: config.suggestions.filter((item) => item.trim()),
    previewMessages: config.previewMessages.filter((item) => item.trim()),
    hideSuggestionsOnInteract: config.hideSuggestionsOnInteract,
    autoShowPreviewDelay: config.autoShowPreviewDelay,
    showBranding: config.showBranding,
    privacyPolicyUrl: config.privacyPolicyUrl,
    enableLeadCapture: config.enableLeadCapture,
    leadCaptureKeywords: config.leadCaptureKeywords.filter((item) => item.trim()),
    leadCaptureMinutesThreshold: config.leadCaptureMinutesThreshold,
    leadCaptureMessageThreshold: config.leadCaptureMessageThreshold,
    enableBrochure: config.enableBrochure,
    brochureSuggestionText: config.brochureSuggestionText,
    allowedDomains: config.allowedDomains || [],
    instructions: config.instructions,
    escalationKeywords: config.escalationKeywords,
    borderColor: config.borderColor,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
  };
}
