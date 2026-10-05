"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, requireData } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import type { InboxChannel } from "@/features/conversations/inbox-pagination";
import type {
  WidgetWidgetConfig,
  WidgetBorderRadiusStyle,
  WidgetPublicationStatus,
} from "@/features/widget/domain";
import { toast } from "@/components/ui/use-toast";
import type { AgentTestCaseInput } from "@/features/agent-tests/input";
import { parseInboxConversationEventsResponse } from "@/features/conversations/inbox-events";

export type DashboardWidgetConfig = Omit<WidgetWidgetConfig, "borderRadius"> & {
  agentName: string;
  allowedDomains: string[];
  borderRadius: WidgetBorderRadiusStyle;
  publication: WidgetPublicationStatus;
};

export type AgentTestCase = AgentTestCaseInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export interface IpData {
  ip?: string;
  countryCode?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}

export type ConversationFilter =
  | "all"
  | "unread"
  | "unassigned"
  | "mine"
  | "open"
  | "closed"
  | "snoozed";

export interface InboxSavedView {
  id: string;
  name: string;
  filter: ConversationFilter;
  channel: InboxChannel | null;
  assigneeFilter: string;
  labelFilter: string | null;
  createdByMembershipId: string | null;
}

export interface InboxMacro {
  id: string;
  name: string;
  content: string;
  createdByMembershipId: string | null;
}

export interface WidgetSessionSummary {
  id: string;
  visitorId: string;
  status: string;
  messageCount: number;
  country: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  hostname: string | null;
  lastActivityAt: string;
  createdAt: string;
  contactName: string;
  contactEmail: string | null;
  conversationId: string | null;
  conversationStatus: string;
  assigneeName: string | null;
  assigneeId: string | null;
  unreadCount: number;
  preview: string;
  messages: Array<{ content: string }>;
  ipData?: IpData | null;
  _count: { messages: number };
}

export interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  authorType: "VISITOR" | "AI" | "TEAM";
  authorName: string | null;
  content: string;
  timestamp: string;
  visibility: "PUBLIC" | "INTERNAL";
  feedback?: "positive" | "negative" | null;
  feedbackReason?: string | null;
  feedbackAt?: string | null;
  citations?: Array<{ documentId: string; title: string; excerpt: string }>;
  isInternal: boolean;
  metadata?: {
    type?: string;
    documents?: Array<{ fileName: string; description?: string; fileUrl: string }>;
  };
}

export interface WidgetAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string;
}

export interface WidgetContactNote {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
}

export interface WidgetInternalNote {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
}

export interface WidgetPreviousConversation {
  id: string;
  subject: string;
  status: string;
  lastMessageAt: string;
}

export interface WidgetWorkflowRun {
  id: string;
  name: string;
  status: string;
  input: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  steps: {
    id: string;
    position: number;
    name: string;
    kind: string;
    status: string;
    errorMessage: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  }[];
}

export interface WidgetSessionDetail {
  id: string;
  visitorId: string;
  city: string | null;
  country: string | null;
  os: string | null;
  browser: string | null;
  screenSize: string | null;
  pageUrl: string | null;
  referrer: string | null;
  timezone: string | null;
  createdAt: string;
  lastActivityAt: string;
  ipData?: IpData | null;
  messages: WidgetMessage[];
  attachments?: WidgetAttachment[];
  contactName?: string | null;
  contactEmail?: string | null;
  contactId?: string | null;
  contactExternalId?: string | null;
  contactCreatedAt?: string | null;
  contactLastSeenAt?: string | null;
  contactPhone?: string | null;
  contactTags?: string[];
  conversationLabels?: string[];
  contactSource?: string | null;
  contactCapturedAt?: string | null;
  contactCaptureContext?: Record<string, unknown> | null;
  conversationId?: string | null;
  conversationStatus?: string;
  aiPaused?: boolean;
  conversationChannel?: string;
  conversationStartedAt?: string;
  conversationSubject?: string;
  snoozedUntil?: string | null;
  workspaceTimezone?: string;
  assigneeName?: string | null;
  assigneeId?: string | null;
  agentName?: string;
  currentMembershipId?: string;
  previousConversations?: WidgetPreviousConversation[];
  contactNotes?: WidgetContactNote[];
  internalNotes?: WidgetInternalNote[];
  workflows?: WidgetWorkflowRun[];
}

export interface WidgetSessionsResponse {
  sessions: WidgetSessionSummary[];
  counts: {
    all: number;
    unassigned: number;
    mine: number;
    open: number;
    closed: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function useWidgetConfig(workspaceId: string) {
  return useQuery<DashboardWidgetConfig>({
    queryKey: queryKeys.widget.config(workspaceId),
    queryFn: async () => {
      const { data, error } = await api.GET<DashboardWidgetConfig>(
        "/api/workspaces/{workspace_id}/widget-config",
        {
          params: { path: { workspace_id: workspaceId } },
        },
      );
      return requireData(data, error, "Failed to fetch widget config");
    },
    enabled: Boolean(workspaceId),
  });
}

export function useSaveWidgetConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: Record<string, unknown>;
    }) => {
      const { data, error } = await api.PUT<DashboardWidgetConfig>(
        "/api/workspaces/{workspace_id}/widget-config",
        {
          params: { path: { workspace_id: workspaceId } },
          body,
        },
      );
      return requireData(data, error, "Failed to save widget config");
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKeys.widget.config(variables.workspaceId), data);
    },
  });
}

export function usePublishWidgetConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      restoreVersion,
    }: {
      workspaceId: string;
      restoreVersion?: number;
    }) => {
      const response = await fetch("/api/dashboard/widget/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(restoreVersion ? { restoreVersion } : {}),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Could not publish agent changes.";
        throw new Error(message);
      }
      return { workspaceId, config: result as DashboardWidgetConfig };
    },
    onSuccess: ({ workspaceId, config }) => {
      queryClient.setQueryData(queryKeys.widget.config(workspaceId), config);
    },
  });
}

export function useWidgetSessions(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    filter?: ConversationFilter;
    sort?: string;
    order?: string;
  } = {},
) {
  return useQuery<WidgetSessionsResponse>({
    queryKey: [
      ...queryKeys.widget.sessions(),
      options.page ?? 1,
      options.limit ?? 20,
      options.search ?? null,
      options.filter ?? "all",
    ],
    queryFn: async () => {
      const { data, error } = await api.GET<WidgetSessionsResponse>("/api/widget/sessions", {
        params: {
          query: {
            page: options.page ?? 1,
            limit: options.limit ?? 20,
            ...(options.search ? { search: options.search } : {}),
            ...(options.filter && options.filter !== "all" ? { filter: options.filter } : {}),
          },
        },
      });
      return requireData(data, error, "Failed to fetch widget sessions");
    },
    placeholderData: (previousData) => previousData,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });
}

export function useWidgetSession(sessionId: string) {
  return useQuery<WidgetSessionDetail>({
    queryKey: queryKeys.widget.session(sessionId),
    queryFn: async () => {
      const { data, error } = await api.GET<WidgetSessionDetail>(
        "/api/widget/sessions/{session_id}",
        {
          params: { path: { session_id: sessionId } },
        },
      );
      return requireData(data, error, "Failed to fetch widget session");
    },
    enabled: Boolean(sessionId),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useDeleteWidgetSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await api.DELETE<{ ok: boolean }>(
        "/api/widget/sessions/{session_id}",
        {
          params: { path: { session_id: sessionId } },
        },
      );
      return requireData(data, error, "Failed to delete session");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.widget.sessions() });
    },
  });
}

export function useAssignWidgetSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/widget/sessions/{session_id}",
        {
          params: { path: { session_id: sessionId } },
          body: { action: "assign" },
        },
      );
      return requireData(data, error, "Failed to assign conversation");
    },
    onSuccess: (_data, sessionId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.widget.sessions() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.widget.session(sessionId) });
    },
  });
}

export function useSendSessionMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      message,
      action,
    }: {
      sessionId: string;
      message: string;
      action: "reply" | "note";
    }) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/widget/sessions/{session_id}",
        {
          params: { path: { session_id: sessionId } },
          body: { action, message },
        },
      );
      return requireData(data, error, "Failed to send message");
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.widget.session(variables.sessionId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.widget.sessions() });
    },
  });
}

export interface ConversationSummary {
  id: string;
  visitorSessionId: string | null;
  visitorId: string;
  contactName: string;
  contactEmail: string | null;
  status: string;
  aiPaused: boolean;
  assigneeName: string | null;
  assigneeId: string | null;
  unreadCount: number;
  lastUnreadVisitorMessageId: string | null;
  preview: string;
  lastMessageAt: string;
  country: string | null;
  city: string | null;
  channel: string;
  subject: string;
  snoozedUntil: string | null;
  labels: string[];
}

export type ConversationDetail = WidgetSessionDetail;

export interface ConversationsResponse {
  conversations: ConversationSummary[];
  counts: {
    total: number;
    all: number;
    unassigned: number;
    mine: number;
    open: number;
    closed: number;
    snoozed: number;
  };
  currentMembershipId: string;
  workspaceTimezone: string;
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface WorkspaceMemberOption {
  id: string;
  name: string;
}

export function useWorkspaceMembers() {
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useQuery<{ members: WorkspaceMemberOption[] }>({
    queryKey: queryKeys.workspaces.members(workspaceId),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await api.GET<{ members: WorkspaceMemberOption[] }>(
        "/api/dashboard/workspace-members",
      );
      return requireData(data, error, "Failed to fetch workspace members");
    },
  });
}

export function useConversations(
  options: {
    limit?: number;
    cursor?: string | null;
    search?: string;
    filter?: ConversationFilter;
    channel?: InboxChannel;
    assignee?: string;
    label?: string;
  } = {},
) {
  const workspaceId = useActiveWorkspaceId() ?? "";
  const search = options.search?.trim() || null;
  const cursor = options.cursor ?? null;

  return useQuery<ConversationsResponse>({
    queryKey: [
      ...queryKeys.conversations.list(workspaceId),
      options.limit ?? 20,
      cursor,
      search,
      options.filter ?? "all",
      options.channel ?? "all-channels",
      options.assignee ?? "all-assignees",
      options.label ?? "all-labels",
    ],
    queryFn: async () => {
      const { data, error } = await api.GET<ConversationsResponse>("/api/conversations", {
        params: {
          query: {
            limit: options.limit ?? 20,
            ...(cursor ? { cursor } : {}),
            ...(search ? { search } : {}),
            ...(options.filter && options.filter !== "all" ? { filter: options.filter } : {}),
            ...(options.channel ? { channel: options.channel } : {}),
            ...(options.assignee ? { assignee: options.assignee } : {}),
            ...(options.label ? { label: options.label } : {}),
          },
        },
      });
      return requireData(data, error, "Failed to fetch conversations");
    },
    enabled: Boolean(workspaceId),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === workspaceId ? previousData : undefined,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });
}

export function useInboxConversationEvents() {
  const workspaceId = useActiveWorkspaceId() ?? "";
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) return;

    const controller = new AbortController();
    let cursor: string | null = null;
    let retryDelay = 3_500;
    let nextPollAt = 0;
    let inFlight = false;

    const invalidateInbox = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list(workspaceId) });
      void queryClient.invalidateQueries({
        queryKey: [...queryKeys.conversations.all, "detail", workspaceId],
      });
    };

    const poll = () => {
      if (document.visibilityState === "hidden" || inFlight || Date.now() < nextPollAt) return;
      inFlight = true;

      const url = new URL("/api/dashboard/conversations/events", window.location.origin);
      if (cursor !== null) url.searchParams.set("after", cursor);

      void fetch(url, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
        .then(async (response): Promise<unknown> => {
          if (!response.ok) throw new Error("Inbox updates are temporarily unavailable.");
          const payload: unknown = await response.json();
          return payload;
        })
        .then((payload) => {
          const parsed = parseInboxConversationEventsResponse(payload);
          if (!parsed) throw new Error("Inbox updates returned an invalid response.");

          if (cursor === null || parsed.reset || parsed.events.length > 0) invalidateInbox();
          cursor = parsed.cursor;
          retryDelay = 3_500;
          nextPollAt = Date.now() + retryDelay;
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            retryDelay = Math.min(retryDelay * 2, 30_000);
            nextPollAt = Date.now() + retryDelay;
          }
        })
        .finally(() => {
          inFlight = false;
        });
    };

    const resume = () => {
      if (document.visibilityState === "visible") {
        void poll();
      }
    };

    const pollInterval = window.setInterval(poll, 3_500);
    document.addEventListener("visibilitychange", resume);
    void poll();
    return () => {
      window.clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", resume);
      controller.abort();
    };
  }, [queryClient, workspaceId]);
}

export function useInboxSavedViews() {
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useQuery<{ views: InboxSavedView[] }>({
    queryKey: queryKeys.conversations.savedViews(workspaceId),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await api.GET<{ views: InboxSavedView[] }>(
        "/api/dashboard/inbox-views",
      );
      return requireData(data, error, "Failed to fetch saved inbox views");
    },
  });
}

export function useCreateInboxSavedView() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async (view: Omit<InboxSavedView, "id" | "createdByMembershipId">) => {
      const response = await fetch("/api/dashboard/inbox-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(view),
      });
      const result: { view?: InboxSavedView; error?: string } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok || !result.view) {
        throw new Error(result.error ?? "Failed to save inbox view.");
      }
      return result.view;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.savedViews(workspaceId),
      });
    },
  });
}

export function useDeleteInboxSavedView() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async (viewId: string) => {
      const response = await fetch(`/api/dashboard/inbox-views/${viewId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result: { error?: string } = await response.json().catch(() => ({}));
        throw new Error(result.error ?? "Failed to delete inbox view.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.savedViews(workspaceId),
      });
    },
  });
}

export function useInboxMacros() {
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useQuery<{ macros: InboxMacro[] }>({
    queryKey: queryKeys.conversations.macros(workspaceId),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const response = await fetch("/api/dashboard/inbox-macros");
      const result: { macros?: InboxMacro[]; error?: string } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok || !result.macros) {
        throw new Error(result.error ?? "Failed to load saved replies.");
      }
      return { macros: result.macros };
    },
  });
}

export function useCreateInboxMacro() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async (input: { name: string; content: string }) => {
      const response = await fetch("/api/dashboard/inbox-macros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result: { macro?: InboxMacro; error?: string } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok || !result.macro) {
        throw new Error(result.error ?? "Failed to save reply.");
      }
      return result.macro;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.macros(workspaceId),
      });
    },
  });
}

export function useUpdateInboxMacro() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async ({
      macroId,
      ...input
    }: {
      macroId: string;
      name: string;
      content: string;
    }) => {
      const response = await fetch(`/api/dashboard/inbox-macros/${encodeURIComponent(macroId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const result: { macro?: InboxMacro; error?: string } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok || !result.macro) {
        throw new Error(result.error ?? "Failed to update saved reply.");
      }
      return result.macro;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.macros(workspaceId),
      });
    },
  });
}

export function useDeleteInboxMacro() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async (macroId: string) => {
      const response = await fetch(`/api/dashboard/inbox-macros/${encodeURIComponent(macroId)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result: { error?: string } = await response.json().catch(() => ({}));
        throw new Error(result.error ?? "Failed to delete saved reply.");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.macros(workspaceId),
      });
    },
  });
}

export function useAgentTestCases() {
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useQuery<{ cases: AgentTestCase[] }>({
    queryKey: queryKeys.widget.agentTests(workspaceId),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const response = await fetch("/api/dashboard/agent-test-cases");
      const result: { cases?: AgentTestCase[]; error?: string } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok || !result.cases)
        throw new Error(result.error ?? "Failed to load agent tests.");
      return { cases: result.cases };
    },
  });
}

export function useSaveAgentTestCase() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async (input: AgentTestCaseInput & { id?: string }) => {
      const response = await fetch(
        input.id
          ? `/api/dashboard/agent-test-cases/${encodeURIComponent(input.id)}`
          : "/api/dashboard/agent-test-cases",
        {
          method: input.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: input.title,
            prompt: input.prompt,
            expectedOutcome: input.expectedOutcome,
          }),
        },
      );
      const result: { case?: AgentTestCase; error?: string } = await response
        .json()
        .catch(() => ({}));
      if (!response.ok || !result.case)
        throw new Error(result.error ?? "Failed to save agent test.");
      return result.case;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.widget.agentTests(workspaceId) });
    },
  });
}

export function useDeleteAgentTestCase() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async (caseId: string) => {
      const response = await fetch(
        `/api/dashboard/agent-test-cases/${encodeURIComponent(caseId)}`,
        { method: "DELETE" },
      );
      const result: { error?: string } = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Failed to delete agent test.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.widget.agentTests(workspaceId) });
    },
  });
}

export function useUpdateContactTag() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async (input: {
      conversationId: string;
      action: "add" | "remove";
      tag: string;
    }) => {
      const response = await fetch(
        `/api/dashboard/conversations/${encodeURIComponent(input.conversationId)}/contact-tags`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: input.action, tag: input.tag }),
        },
      );
      const result: { tags?: string[]; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok || !result.tags) {
        throw new Error(result.error ?? "Could not update contact tags.");
      }
      return { conversationId: input.conversationId, tags: result.tags };
    },
    onSuccess: ({ conversationId, tags }) => {
      queryClient.setQueryData<ConversationDetail>(
        queryKeys.conversations.detail(workspaceId, conversationId),
        (current) => (current ? { ...current, contactTags: tags } : current),
      );
    },
  });
}

export function useUpdateConversationLabel() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useMutation({
    mutationFn: async (input: {
      conversationId: string;
      action: "add" | "remove";
      label: string;
    }) => {
      const response = await fetch(
        `/api/dashboard/conversations/${encodeURIComponent(input.conversationId)}/labels`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: input.action, label: input.label }),
        },
      );
      const result: { labels?: string[]; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok || !result.labels) {
        throw new Error(result.error ?? "Could not update conversation labels.");
      }
      return { conversationId: input.conversationId, labels: result.labels };
    },
    onSuccess: ({ conversationId, labels }) => {
      queryClient.setQueryData<ConversationDetail>(
        queryKeys.conversations.detail(workspaceId, conversationId),
        (current) => (current ? { ...current, conversationLabels: labels } : current),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list(workspaceId) });
    },
  });
}

export function useConversation(conversationId: string) {
  const workspaceId = useActiveWorkspaceId() ?? "";
  return useQuery<ConversationDetail>({
    queryKey: queryKeys.conversations.detail(workspaceId, conversationId),
    queryFn: async () => {
      const { data, error } = await api.GET<ConversationDetail>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
        },
      );
      return requireData(data, error, "Failed to fetch conversation");
    },
    enabled: Boolean(conversationId && workspaceId),
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await api.DELETE<{ ok: boolean }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
        },
      );
      return requireData(data, error, "Failed to delete conversation");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

export function useTakeOverConversation() {
  return useConversationStateAction("takeover");
}

export function useAssignConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      assignedMemberId,
    }: {
      conversationId: string;
      assignedMemberId: string | null;
    }) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
          body: { action: "assign_to_member", assignedMemberId },
        },
      );
      return requireData(data, error, "Failed to update conversation assignee");
    },
    onSuccess: () => invalidateConversationQueries(queryClient),
  });
}

export function useSetConversationAiPaused() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, paused }: { conversationId: string; paused: boolean }) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
          body: { action: "set_ai_paused", paused },
        },
      );
      return requireData(data, error, "Failed to update AI replies");
    },
    onSuccess: () => invalidateConversationQueries(queryClient),
  });
}

export function useSetConversationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      status,
    }: {
      conversationId: string;
      status: "CLOSED" | "OPEN";
    }) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
          body: { action: status === "CLOSED" ? "close" : "reopen" },
        },
      );
      return requireData(data, error, "Failed to update conversation status");
    },
    onSuccess: () => invalidateConversationQueries(queryClient),
  });
}

export function useSetConversationSnooze() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      snoozedUntil,
    }: {
      conversationId: string;
      snoozedUntil: string | null;
    }) => {
      const { data, error } = await api.PATCH<{ ok: boolean; snoozedUntil: string | null }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
          body: {
            action: snoozedUntil ? "snooze" : "unsnooze",
            ...(snoozedUntil ? { snoozedUntil } : {}),
          },
        },
      );
      return requireData(data, error, "Failed to update snooze");
    },
    onSuccess: () => invalidateConversationQueries(queryClient),
  });
}

function invalidateConversationQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
}

function useConversationStateAction(action: "assign" | "takeover") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
          body: { action },
        },
      );
      return requireData(
        data,
        error,
        action === "takeover"
          ? "Failed to take over conversation"
          : "Failed to assign conversation",
      );
    },
    onSuccess: () => {
      invalidateConversationQueries(queryClient);
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      throughMessageId,
    }: {
      conversationId: string;
      throughMessageId: string;
    }) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
          body: { action: "read", readThroughMessageId: throughMessageId },
        },
      );
      return requireData(data, error, "Failed to mark conversation as read");
    },
    onSuccess: () => {
      invalidateConversationQueries(queryClient);
    },
    onError: () => {
      toast({
        title: "Couldn’t confirm the conversation was marked as read",
        description: "It remains unread. Reopen the conversation to try again.",
        variant: "destructive",
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}

export function useSendConversationMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      message,
      action,
    }: {
      conversationId: string;
      message: string;
      action: "reply" | "note";
    }) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
          body: { action, message },
        },
      );
      return requireData(data, error, "Failed to send message");
    },
    onSuccess: () => {
      invalidateConversationQueries(queryClient);
    },
  });
}
