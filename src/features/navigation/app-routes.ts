export const APP_PAGES = {
  inbox: {
    href: "/inbox",
    label: "Inbox",
    description: "Review and reply to customer conversations.",
  },
  agent: {
    href: "/agent",
    label: "Agent",
    description: "Build, test and deploy your AI support agent.",
  },
  insights: {
    href: "/insights",
    label: "Insights",
    description: "Understand conversation volume, response times and customer feedback.",
  },
  settings: {
    href: "/settings",
    label: "Settings",
    description: "Manage workspace access and connections.",
  },
} as const;

export const APP_ROUTES = {
  inbox: APP_PAGES.inbox.href,
  agent: APP_PAGES.agent.href,
  insights: APP_PAGES.insights.href,
  settings: APP_PAGES.settings.href,
} as const;

export const LEGACY_REDIRECTS = {
  widget: APP_ROUTES.agent,
} as const;

export const AGENT_TABS = ["build", "test", "deploy"] as const;
export type AgentTab = (typeof AGENT_TABS)[number];

export function agentHref(hash?: string): string {
  const fragment = hash ? `#${encodeURIComponent(hash.replace(/^#/, ""))}` : "";
  return `${APP_ROUTES.agent}${fragment}`;
}

export function queryStringFromSearchParams(
  params: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const entry of value) query.append(key, entry);
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }
  return query.toString();
}
