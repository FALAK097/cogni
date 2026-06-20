export type WidgetPosition = "LEFT" | "RIGHT";
export type WidgetLauncherSize = "SMALL" | "MEDIUM" | "LARGE";
export type WidgetModelProvider = "OPENAI" | "GOOGLE";

export type WidgetChatMessage = {
  id: string;
  role: "user" | "assistant";
  parts: { type: "text"; text: string }[];
};

export type WidgetSessionBootstrap = {
  token: string;
  messages: WidgetChatMessage[];
  expiresAt: string;
};

export type WidgetSettings = {
  publicKey: string;
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
  logoUrl: string | null;
  instructions: string;
  modelProvider: WidgetModelProvider;
  modelName: string;
  isEnabled: boolean;
  authorizedDomains: string[];
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
