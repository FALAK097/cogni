"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, requireData } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";
import type { WidgetWidgetConfig, WidgetBorderRadiusStyle } from "@/features/widget/domain";

export type DashboardWidgetConfig = Omit<WidgetWidgetConfig, "borderRadius"> & {
  agentName: string;
  allowedDomains: string[];
  borderRadius: WidgetBorderRadiusStyle;
};

export interface IpData {
  ip?: string;
  countryCode?: string;
  country?: string;
  city?: string;
  region?: string;
  timezone?: string;
}

export type ConversationFilter = "all" | "unassigned" | "mine" | "open" | "closed";

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
  isInternal: boolean;
  metadata?: {
    type?: string;
    documents?: Array<{ fileName: string; description?: string; fileUrl: string }>;
  };
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
  contactName?: string | null;
  contactEmail?: string | null;
  contactId?: string | null;
  contactExternalId?: string | null;
  contactCreatedAt?: string | null;
  contactLastSeenAt?: string | null;
  contactPhone?: string | null;
  contactSource?: string | null;
  contactCapturedAt?: string | null;
  contactCaptureContext?: Record<string, unknown> | null;
  conversationId?: string | null;
  conversationStatus?: string;
  aiPaused?: boolean;
  conversationChannel?: string;
  conversationStartedAt?: string;
  conversationSubject?: string;
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
  preview: string;
  lastMessageAt: string;
  country: string | null;
  city: string | null;
  channel: string;
  subject: string;
}

export type ConversationDetail = WidgetSessionDetail;

export interface ConversationsResponse {
  conversations: ConversationSummary[];
  counts: {
    all: number;
    unassigned: number;
    mine: number;
    open: number;
    closed: number;
  };
  currentMembershipId: string;
  pagination: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export function useConversations(
  options: {
    limit?: number;
    cursor?: string | null;
    search?: string;
    filter?: ConversationFilter;
  } = {},
) {
  const search = options.search?.trim() || null;
  const cursor = options.cursor ?? null;

  return useQuery<ConversationsResponse>({
    queryKey: [
      ...queryKeys.conversations.list(),
      options.limit ?? 20,
      cursor,
      search,
      options.filter ?? "all",
    ],
    queryFn: async () => {
      const { data, error } = await api.GET<ConversationsResponse>("/api/conversations", {
        params: {
          query: {
            limit: options.limit ?? 20,
            ...(cursor ? { cursor } : {}),
            ...(search ? { search } : {}),
            ...(options.filter && options.filter !== "all" ? { filter: options.filter } : {}),
          },
        },
      });
      return requireData(data, error, "Failed to fetch conversations");
    },
    placeholderData: (previousData) => previousData,
    refetchInterval: 8_000,
    refetchOnWindowFocus: true,
  });
}

export function useConversation(conversationId: string) {
  return useQuery<ConversationDetail>({
    queryKey: queryKeys.conversations.detail(conversationId),
    queryFn: async () => {
      const { data, error } = await api.GET<ConversationDetail>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
        },
      );
      return requireData(data, error, "Failed to fetch conversation");
    },
    enabled: Boolean(conversationId),
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
    onSuccess: (_data, variables) =>
      invalidateConversationQueries(queryClient, variables.conversationId),
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
    onSuccess: (_data, variables) =>
      invalidateConversationQueries(queryClient, variables.conversationId),
  });
}

function invalidateConversationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.detail(conversationId) });
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
    onSuccess: (_data, conversationId) => {
      invalidateConversationQueries(queryClient, conversationId);
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { data, error } = await api.PATCH<{ ok: boolean }>(
        "/api/conversations/{conversation_id}",
        {
          params: { path: { conversation_id: conversationId } },
          body: { action: "read" },
        },
      );
      return requireData(data, error, "Failed to mark conversation as read");
    },
    onSuccess: (_data, conversationId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(conversationId),
      });
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
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(variables.conversationId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    },
  });
}
