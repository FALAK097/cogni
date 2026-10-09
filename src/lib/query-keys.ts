const widgetBaseKey = ["widget"] as const;

export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  workspaces: {
    all: ["workspaces"] as const,
    list: () => [...queryKeys.workspaces.all, "list"] as const,
    members: (workspaceId: string) =>
      [...queryKeys.workspaces.all, workspaceId, "members"] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    widget: () => [...queryKeys.analytics.all, "widget"] as const,
    dashboard: (workspaceId: string, startDate?: string, endDate?: string) =>
      [...queryKeys.analytics.all, "dashboard", workspaceId, startDate, endDate] as const,
  },
  documents: {
    all: ["documents"] as const,
    list: () => [...queryKeys.documents.all, "list"] as const,
  },
  knowledgeBase: {
    all: ["knowledge-base"] as const,
    sources: (workspaceId: string, knowledgeBaseId?: string | null) =>
      [
        ...queryKeys.knowledgeBase.all,
        "sources",
        workspaceId,
        knowledgeBaseId ?? "default",
      ] as const,
  },
  widget: {
    all: widgetBaseKey,
    agentTests: (workspaceId: string) =>
      [...queryKeys.widget.all, "agent-tests", workspaceId] as const,
    agentTestRuns: {
      all: [...widgetBaseKey, "agent-test-runs"] as const,
      list: (workspaceId: string, startDate: string, endDate: string) =>
        [...widgetBaseKey, "agent-test-runs", workspaceId, startDate, endDate] as const,
    },
    sessions: () => [...queryKeys.widget.all, "sessions"] as const,
    session: (id: string) => [...queryKeys.widget.all, "session", id] as const,
    config: (workspaceId: string) => [...queryKeys.widget.all, "config", workspaceId] as const,
  },
  integrations: {
    all: ["integrations"] as const,
    list: () => [...queryKeys.integrations.all, "list"] as const,
    workspace: (workspaceId: string) =>
      [...queryKeys.integrations.all, "workspace", workspaceId] as const,
    detail: (slug: string) => [...queryKeys.integrations.all, "detail", slug] as const,
    approvals: () => [...queryKeys.integrations.all, "approvals"] as const,
    bookingSettings: () => [...queryKeys.integrations.all, "booking-settings"] as const,
  },
  conversations: {
    all: ["conversations"] as const,
    list: (workspaceId?: string) =>
      [...queryKeys.conversations.all, "list", workspaceId ?? "all-workspaces"] as const,
    detail: (workspaceId: string, id: string) =>
      [...queryKeys.conversations.all, "detail", workspaceId, id] as const,
    savedViews: (workspaceId: string) =>
      [...queryKeys.conversations.all, "saved-views", workspaceId] as const,
    macros: (workspaceId: string) =>
      [...queryKeys.conversations.all, "macros", workspaceId] as const,
  },
} as const;
