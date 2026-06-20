import "server-only";

import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import {
  hostnameMatches,
  normalizeLauncherSize,
  normalizePosition,
  parseJsonArray,
  type EchoPublicConfig,
  type EchoWidgetConfig,
  type WidgetBorderRadiusStyle,
  type WidgetLauncherSize,
  type WidgetModelProvider,
  type WidgetPosition,
  type WidgetSettings,
  type WidgetShadowSize,
  type WidgetTheme,
} from "@/features/widget/domain";

const visitorSessionDurationMs = 1000 * 60 * 60 * 24 * 90;

type WidgetRecord = Awaited<ReturnType<typeof ensureWorkspaceWidget>>;

export async function ensureWorkspaceWidget(db: PrismaClient, workspaceId: string) {
  return db.widget.upsert({
    where: { workspaceId },
    update: {},
    create: {
      workspaceId,
    },
    include: {
      authorizedDomains: {
        orderBy: { hostname: "asc" },
      },
    },
  });
}

export function toWidgetSettings(widget: WidgetRecord): WidgetSettings {
  return toEchoWidgetConfig(widget);
}

export function toEchoWidgetConfig(widget: WidgetRecord): EchoWidgetConfig {
  return {
    publicKey: widget.publicKey,
    workspaceId: widget.workspaceId,
    displayName: widget.displayName,
    welcomeMessage: widget.welcomeMessage,
    inputPlaceholder: widget.inputPlaceholder,
    primaryColor: widget.primaryColor,
    backgroundColor: widget.backgroundColor,
    textColor: widget.textColor,
    position: normalizePosition(widget.position),
    launcherSize: normalizeLauncherSize(widget.launcherSize),
    panelWidth: widget.panelWidth,
    panelHeight: widget.panelHeight,
    borderRadius: widget.borderRadius,
    borderRadiusStyle: widget.borderRadiusStyle as WidgetBorderRadiusStyle,
    logoUrl: widget.logoUrl,
    instructions: widget.instructions,
    escalationKeywords: widget.escalationKeywords,
    modelProvider: widget.modelProvider as WidgetModelProvider,
    modelName: widget.modelName,
    isEnabled: widget.isEnabled,
    authorizedDomains: widget.authorizedDomains.map((domain) => domain.hostname),
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
    selectedCampaignId: widget.selectedCampaignId,
  };
}

export function toEchoPublicConfig(
  widget: NonNullable<Awaited<ReturnType<typeof getPublicWidget>>>,
): EchoPublicConfig {
  const settings = toEchoWidgetConfig({
    ...widget,
    authorizedDomains: widget.authorizedDomains,
  } as WidgetRecord);

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
    selectedCampaignId: settings.selectedCampaignId,
  };
}

export async function getPublicWidget(db: PrismaClient, publicKey: string) {
  return db.widget.findUnique({
    where: { publicKey },
    include: {
      authorizedDomains: true,
      workspace: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export function isHostnameAuthorized(hostname: string, authorizedDomains: { hostname: string }[]) {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");
  return authorizedDomains.some((domain) => hostnameMatches(normalizedHostname, domain.hostname));
}

export function validateEmbedOrigin(origin: string | null, allowedDomains: string[]) {
  if (!origin) return true;
  if (allowedDomains.length === 0) return true;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return allowedDomains.some((allowed) => hostnameMatches(hostname, allowed));
  } catch {
    return false;
  }
}

export async function createVisitorSession(
  db: PrismaClient,
  widgetId: string,
  hostname: string,
  metadata?: {
    visitorId?: string;
    browserSessionId?: string;
    pageUrl?: string;
    referrer?: string;
    browser?: string;
    deviceType?: string;
    os?: string;
    country?: string;
    city?: string;
    timezone?: string;
    language?: string;
    screenSize?: string;
    ipData?: string;
  },
) {
  return db.visitorSession.create({
    data: {
      widgetId,
      hostname,
      token: randomUUID(),
      browserSessionId: metadata?.browserSessionId ?? randomUUID(),
      visitorId: metadata?.visitorId,
      pageUrl: metadata?.pageUrl,
      referrer: metadata?.referrer,
      browser: metadata?.browser,
      deviceType: metadata?.deviceType,
      os: metadata?.os,
      country: metadata?.country,
      city: metadata?.city,
      timezone: metadata?.timezone,
      language: metadata?.language,
      screenSize: metadata?.screenSize,
      ipData: metadata?.ipData,
      expiresAt: new Date(Date.now() + visitorSessionDurationMs),
    },
  });
}

export async function resolveVisitorSession({
  db,
  widgetId,
  hostname,
  token,
  metadata,
}: {
  db: PrismaClient;
  widgetId: string;
  hostname: string;
  token?: string | null;
  metadata?: {
    visitorId?: string;
    browserSessionId?: string;
    pageUrl?: string;
    referrer?: string;
    browser?: string;
    deviceType?: string;
    os?: string;
    country?: string;
    city?: string;
    timezone?: string;
    language?: string;
    screenSize?: string;
    ipData?: string;
  };
}) {
  const now = new Date();

  if (metadata?.browserSessionId) {
    const byBrowserSession = await db.visitorSession.findFirst({
      where: {
        browserSessionId: metadata.browserSessionId,
        widgetId,
        expiresAt: { gt: now },
      },
    });

    if (byBrowserSession) {
      return db.visitorSession.update({
        where: { id: byBrowserSession.id },
        data: {
          lastSeenAt: now,
          expiresAt: new Date(Date.now() + visitorSessionDurationMs),
          visitorId: metadata.visitorId ?? byBrowserSession.visitorId,
          pageUrl: metadata.pageUrl ?? byBrowserSession.pageUrl,
          referrer: metadata.referrer ?? byBrowserSession.referrer,
          browser: metadata.browser ?? byBrowserSession.browser,
          deviceType: metadata.deviceType ?? byBrowserSession.deviceType,
          os: metadata.os ?? byBrowserSession.os,
          country: metadata.country ?? byBrowserSession.country,
          city: metadata.city ?? byBrowserSession.city,
          timezone: metadata.timezone ?? byBrowserSession.timezone,
          language: metadata.language ?? byBrowserSession.language,
          screenSize: metadata.screenSize ?? byBrowserSession.screenSize,
          ipData: metadata.ipData ?? byBrowserSession.ipData,
        },
      });
    }
  }

  if (token) {
    const existing = await db.visitorSession.findFirst({
      where: {
        token,
        widgetId,
        expiresAt: { gt: now },
      },
    });

    if (existing) {
      return db.visitorSession.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          expiresAt: new Date(Date.now() + visitorSessionDurationMs),
          visitorId: metadata?.visitorId ?? existing.visitorId,
          pageUrl: metadata?.pageUrl ?? existing.pageUrl,
          referrer: metadata?.referrer ?? existing.referrer,
        },
      });
    }
  }

  return createVisitorSession(db, widgetId, hostname, metadata);
}

export function mapLauncherSizeToPixels(size: WidgetLauncherSize | WidgetPosition | string) {
  const normalized = normalizeLauncherSize(String(size));
  if (normalized === "sm") return 48;
  if (normalized === "lg") return 64;
  return 56;
}
