export const APP_PAGES = {
  inbox: {
    href: "/inbox",
    label: "Inbox",
    description: "Review and reply to customer conversations.",
  },
  agent: {
    href: "/agent",
    label: "Agent",
    description: "Build, test, customize and deploy your AI support agent.",
  },
  insights: {
    href: "/insights",
    label: "Insights",
    description: "Understand conversation volume, response times and customer feedback.",
  },
  settings: {
    href: "/settings",
    label: "Settings",
    description: "Manage workspace connections.",
  },
} as const;

export const APP_ROUTES = {
  inbox: APP_PAGES.inbox.href,
  agent: APP_PAGES.agent.href,
  insights: APP_PAGES.insights.href,
  settings: APP_PAGES.settings.href,
} as const;

export const AGENT_TABS = ["build", "test", "customize", "deploy"] as const;
export type AgentTab = (typeof AGENT_TABS)[number];

const LEGACY_AGENT_TABS: Record<string, AgentTab> = {
  general: "build",
  agent: "build",
  behaviour: "build",
  appearance: "customize",
  "conversation-starter": "customize",
  "suggested-questions": "customize",
  content: "customize",
  "lead-capture": "build",
  installation: "deploy",
  embed: "deploy",
};

export function resolveAgentTab(value?: string | null): AgentTab {
  if (value && AGENT_TABS.includes(value as AgentTab)) return value as AgentTab;
  return (value && LEGACY_AGENT_TABS[value]) || "build";
}

export function isAgentTab(value?: string | null): value is AgentTab {
  return Boolean(value && AGENT_TABS.includes(value as AgentTab));
}

export function agentHref(tab?: AgentTab, hash?: string): string {
  const query = tab && tab !== "build" ? `?tab=${tab}` : "";
  const fragment = hash ? `#${encodeURIComponent(hash.replace(/^#/, ""))}` : "";
  return `${APP_ROUTES.agent}${query}${fragment}`;
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

export function canonicalAgentPath(params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "tab" || key === "section" || key === "subtab" || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) query.append(key, entry);
    } else {
      query.set(key, value);
    }
  }

  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const rawSection = Array.isArray(params.section) ? params.section[0] : params.section;
  const rawSubtab = Array.isArray(params.subtab) ? params.subtab[0] : params.subtab;
  const requestedTab = rawTab ?? rawSection ?? rawSubtab;
  const tab = resolveAgentTab(requestedTab);
  if (requestedTab && tab !== "build") query.set("tab", tab);

  return `${APP_ROUTES.agent}${query.size > 0 ? `?${query.toString()}` : ""}`;
}
