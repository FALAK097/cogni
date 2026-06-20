export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    me: () => [...queryKeys.auth.all, "me"] as const,
  },
  workspaces: {
    all: ["workspaces"] as const,
    list: () => [...queryKeys.workspaces.all, "list"] as const,
    campaigns: (id: string) => [...queryKeys.workspaces.all, "campaigns", id] as const,
  },
  leads: {
    all: ["leads"] as const,
    list: (workspaceId: string) => [...queryKeys.leads.all, "list", workspaceId] as const,
  },
  campaigns: {
    all: ["campaigns"] as const,
    list: () => [...queryKeys.campaigns.all, "list"] as const,
    detail: (id: string) => [...queryKeys.campaigns.all, "detail", id] as const,
    leads: (id: string) => [...queryKeys.campaigns.all, "leads", id] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    echo: () => [...queryKeys.analytics.all, "echo"] as const,
  },
  documents: {
    all: ["documents"] as const,
    list: () => [...queryKeys.documents.all, "list"] as const,
  },
  knowledgeBase: {
    all: ["knowledge-base"] as const,
    list: (workspaceId: string) => [...queryKeys.knowledgeBase.all, "list", workspaceId] as const,
    detail: (workspaceId: string, knowledgeBaseId?: string | null) =>
      [
        ...queryKeys.knowledgeBase.all,
        "detail",
        workspaceId,
        knowledgeBaseId ?? "default",
      ] as const,
    sources: (workspaceId: string, knowledgeBaseId?: string | null) =>
      [
        ...queryKeys.knowledgeBase.all,
        "sources",
        workspaceId,
        knowledgeBaseId ?? "default",
      ] as const,
  },
  echo: {
    all: ["echo"] as const,
    sessions: () => [...queryKeys.echo.all, "sessions"] as const,
    session: (id: string) => [...queryKeys.echo.all, "session", id] as const,
    config: (workspaceId: string) => [...queryKeys.echo.all, "config", workspaceId] as const,
  },
  integrations: {
    all: ["integrations"] as const,
    list: () => [...queryKeys.integrations.all, "list"] as const,
    workspace: (workspaceId: string) =>
      [...queryKeys.integrations.all, "workspace", workspaceId] as const,
    detail: (slug: string) => [...queryKeys.integrations.all, "detail", slug] as const,
  },
  conversations: {
    all: ["conversations"] as const,
    list: () => [...queryKeys.conversations.all, "list"] as const,
    detail: (id: string) => [...queryKeys.conversations.all, "detail", id] as const,
  },
} as const;
