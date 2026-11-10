import { z } from "zod";

import {
  WIDGET_FONT_FAMILIES,
  WIDGET_FONT_SIZES,
  type WidgetBookingConfig,
  stringifyJsonArray,
  type WidgetPublishedConfig,
  type WidgetWidgetConfig,
} from "@/features/widget/domain";

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i);

export const widgetPublishedConfigSchema = z
  .object({
    booking: z
      .object({
        enabled: z.boolean(),
        timezone: z.string().trim().min(1).max(80),
        durationMinutes: z.number().int().min(15).max(240),
        minimumNoticeMinutes: z.number().int().min(0).max(10_080),
        workingHours: z
          .object({
            start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
            weekdays: z.array(z.number().int().min(0).max(6)).min(1),
          })
          .strict(),
      })
      .strict(),
    displayName: z.string().trim().min(1).max(60),
    welcomeMessage: z.string().trim().min(1).max(240),
    inputPlaceholder: z.string().trim().min(1).max(80),
    primaryColor: hexColor,
    backgroundColor: hexColor,
    textColor: hexColor,
    borderColor: hexColor,
    fontFamily: z.enum(WIDGET_FONT_FAMILIES),
    fontSize: z.enum(WIDGET_FONT_SIZES),
    position: z.enum(["bottom-left", "bottom-right"]),
    launcherSize: z.enum(["sm", "md", "lg"]),
    panelWidth: z.number().int().min(280).max(640),
    panelHeight: z.number().int().min(400).max(900),
    borderRadius: z.number().int().min(0).max(48),
    borderRadiusStyle: z.enum(["none", "default", "full"]),
    logoUrl: z.string().nullable(),
    instructions: z.string().trim().min(1).max(4_000),
    escalationKeywords: z.string().trim().min(1).max(500),
    modelProvider: z.enum(["OPENAI", "GOOGLE"]),
    modelName: z.string().trim().min(1).max(80),
    theme: z.enum(["light", "dark"]),
    userBubbleColor: hexColor,
    userBubbleTextColor: hexColor,
    botBubbleColor: hexColor,
    botBubbleTextColor: hexColor,
    headerGradientFrom: hexColor,
    headerGradientTo: hexColor,
    shadowSize: z.enum(["none", "md", "lg"]),
    suggestions: z.array(z.string().max(500)).max(10),
    hideSuggestionsOnInteract: z.boolean(),
    previewMessages: z.array(z.string().max(500)).max(10),
    autoShowPreviewDelay: z.number().int().min(0).max(30_000),
    showBranding: z.boolean(),
    privacyPolicyUrl: z.string().max(500),
    enableLeadCapture: z.boolean(),
    leadCaptureKeywords: z.array(z.string().max(100)).max(20),
    leadCaptureMinutesThreshold: z.number().int().min(1).max(120),
    leadCaptureMessageThreshold: z.number().int().min(1).max(100),
    enableBrochure: z.boolean(),
    brochureSuggestionText: z.string().trim().min(1).max(120),
  })
  .strict();

export const widgetPublicationSnapshotSchema = z
  .object({ schemaVersion: z.literal(1), config: widgetPublishedConfigSchema })
  .strict();

export type WidgetPublicationSnapshot = {
  schemaVersion: 1;
  config: WidgetPublishedConfig;
};

export function createWidgetPublicationSnapshot(
  config: WidgetWidgetConfig,
  booking: WidgetBookingConfig,
) {
  const { workspaceId, publicKey, isEnabled, authorizedDomains, ...publishedConfig } = config;
  void workspaceId;
  void publicKey;
  void isEnabled;
  void authorizedDomains;
  return widgetPublicationSnapshotSchema.parse({
    schemaVersion: 1,
    config: { ...publishedConfig, booking },
  });
}

export function parseWidgetPublicationSnapshot(value: unknown): WidgetPublicationSnapshot | null {
  const parsed = widgetPublicationSnapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function mergeWidgetPublication(
  config: WidgetPublishedConfig,
  identity: Pick<
    WidgetWidgetConfig,
    "workspaceId" | "publicKey" | "isEnabled" | "authorizedDomains"
  >,
): WidgetWidgetConfig {
  return { ...config, ...identity };
}

export function toWidgetDraftStorageValues(config: WidgetPublishedConfig) {
  return {
    bookingEnabled: config.booking.enabled,
    bookingTimezone: config.booking.timezone,
    bookingDurationMinutes: config.booking.durationMinutes,
    bookingMinimumNoticeMinutes: config.booking.minimumNoticeMinutes,
    bookingWorkingHours: JSON.stringify(config.booking.workingHours),
    displayName: config.displayName,
    welcomeMessage: config.welcomeMessage,
    inputPlaceholder: config.inputPlaceholder,
    primaryColor: config.primaryColor,
    backgroundColor: config.backgroundColor,
    textColor: config.textColor,
    borderColor: config.borderColor,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    position: config.position,
    launcherSize: config.launcherSize,
    panelWidth: config.panelWidth,
    panelHeight: config.panelHeight,
    borderRadius: config.borderRadius,
    borderRadiusStyle: config.borderRadiusStyle,
    logoUrl: config.logoUrl,
    instructions: config.instructions,
    escalationKeywords: config.escalationKeywords,
    modelProvider: config.modelProvider,
    modelName: config.modelName,
    theme: config.theme,
    userBubbleColor: config.userBubbleColor,
    userBubbleTextColor: config.userBubbleTextColor,
    botBubbleColor: config.botBubbleColor,
    botBubbleTextColor: config.botBubbleTextColor,
    headerGradientFrom: config.headerGradientFrom,
    headerGradientTo: config.headerGradientTo,
    shadowSize: config.shadowSize,
    suggestions: stringifyJsonArray(config.suggestions),
    hideSuggestionsOnInteract: config.hideSuggestionsOnInteract,
    previewMessages: stringifyJsonArray(config.previewMessages),
    autoShowPreviewDelay: config.autoShowPreviewDelay,
    showBranding: config.showBranding,
    privacyPolicyUrl: config.privacyPolicyUrl,
    enableLeadCapture: config.enableLeadCapture,
    leadCaptureKeywords: stringifyJsonArray(config.leadCaptureKeywords),
    leadCaptureMinutesThreshold: config.leadCaptureMinutesThreshold,
    leadCaptureMessageThreshold: config.leadCaptureMessageThreshold,
    enableBrochure: config.enableBrochure,
    brochureSuggestionText: config.brochureSuggestionText,
  };
}
