export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  workspaces: {
    all: ["workspaces"] as const,
    list: () => [...queryKeys.workspaces.all, "list"] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    widget: () => [...queryKeys.analytics.all, "widget"] as const,
    dashboard: (startDate?: string, endDate?: string) =>
      [...queryKeys.analytics.all, "dashboard", startDate, endDate] as const,
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
    all: ["widget"] as const,
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
    list: () => [...queryKeys.conversations.all, "list"] as const,
    detail: (id: string) => [...queryKeys.conversations.all, "detail", id] as const,
  },
} as const;
