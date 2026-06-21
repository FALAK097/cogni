export type WidgetPosition = "bottom-left" | "bottom-right";
export type WidgetLauncherSize = "sm" | "md" | "lg";
export type WidgetModelProvider = "OPENAI" | "GOOGLE";
export type WidgetTheme = "light" | "dark";
export type WidgetBorderRadiusStyle = "none" | "default" | "full";
export type WidgetShadowSize = "none" | "md" | "lg";

export type WidgetWidgetConfig = {
  publicKey: string;
  workspaceId: string;
  displayName: string;
  welcomeMessage: string;
  inputPlaceholder: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  position: WidgetPosition;
  launcherSize: WidgetLauncherSize;
  panelWidth: number;
  panelHeight: number;
  borderRadius: number;
  borderRadiusStyle: WidgetBorderRadiusStyle;
  logoUrl: string | null;
  instructions: string;
  escalationKeywords: string;
  modelProvider: WidgetModelProvider;
  modelName: string;
  isEnabled: boolean;
  authorizedDomains: string[];
  theme: WidgetTheme;
  userBubbleColor: string;
  userBubbleTextColor: string;
  botBubbleColor: string;
  botBubbleTextColor: string;
  headerGradientFrom: string;
  headerGradientTo: string;
  shadowSize: WidgetShadowSize;
  suggestions: string[];
  hideSuggestionsOnInteract: boolean;
  previewMessages: string[];
  autoShowPreviewDelay: number;
  showBranding: boolean;
  privacyPolicyUrl: string;
  enableLeadCapture: boolean;
  leadCaptureKeywords: string[];
  leadCaptureMinutesThreshold: number;
  leadCaptureMessageThreshold: number;
  enableBrochure: boolean;
  brochureSuggestionText: string;
};

export type WidgetSettings = WidgetWidgetConfig;

export type WidgetPublicConfig = {
  workspaceId: string;
  publicKey: string;
  position: WidgetPosition;
  theme: WidgetTheme;
  agentName: string;
  welcomeMessage: string;
  logoUrl: string | null;
  primaryColor: string;
  userBubbleColor: string;
  userBubbleTextColor: string;
  botBubbleColor: string;
  botBubbleTextColor: string;
  headerGradientFrom: string;
  headerGradientTo: string;
  launcherSize: WidgetLauncherSize;
  borderRadius: WidgetBorderRadiusStyle;
  shadowSize: WidgetShadowSize;
  inputPlaceholder: string;
  suggestions: string[];
  hideSuggestionsOnInteract: boolean;
  previewMessages: string[];
  autoShowPreviewDelay: number;
  showBranding: boolean;
  privacyPolicyUrl: string;
  enableLeadCapture: boolean;
  leadCaptureKeywords: string[];
  leadCaptureMinutesThreshold: number;
  leadCaptureMessageThreshold: number;
  enableBrochure: boolean;
  brochureSuggestionText: string;
  allowedDomains: string[];
};

export const widgetModelOptions: Record<WidgetModelProvider, { label: string; value: string }[]> = {
  OPENAI: [
    { label: "GPT-5 mini", value: "gpt-5-mini" },
    { label: "GPT-5.1", value: "gpt-5.1" },
  ],
  GOOGLE: [
    { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
    { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
  ],
};

export function parseJsonArray(value: string, fallback: string[] = []) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return fallback;
  }
}

export function stringifyJsonArray(value: string[]) {
  return JSON.stringify(value);
}

export function normalizePosition(value: string): WidgetPosition {
  if (value === "LEFT" || value === "bottom-left") return "bottom-left";
  return "bottom-right";
}

export function normalizeLauncherSize(value: string): WidgetLauncherSize {
  const normalized = value.toLowerCase();
  if (normalized === "small" || normalized === "sm") return "sm";
  if (normalized === "large" || normalized === "lg") return "lg";
  return "md";
}

export function normalizeHostname(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  const wildcard = trimmed.startsWith("*.");
  const candidate = wildcard ? trimmed.slice(2) : trimmed;

  try {
    const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
    const hostname = url.hostname.replace(/\.$/, "");

    if (!hostname || hostname.includes("*")) {
      return null;
    }

    return wildcard ? `*.${hostname}` : hostname;
  } catch {
    return null;
  }
}

export function hostnameMatches(hostname: string, allowedHostname: string) {
  if (allowedHostname.startsWith("*.")) {
    const root = allowedHostname.slice(2);
    return hostname !== root && hostname.endsWith(`.${root}`);
  }

  return hostname === allowedHostname;
}
