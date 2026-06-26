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
  preview: string;
  messages: Array<{ content: string }>;
  ipData?: IpData | null;
  _count: { messages: number };
}

export interface WidgetMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  feedback?: "positive" | "negative" | null;
  feedbackReason?: string | null;
  feedbackAt?: string | null;
  metadata?: {
    type?: string;
    documents?: Array<{ fileName: string; description?: string; fileUrl: string }>;
  };
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
  createdAt: string;
  lastActivityAt: string;
  ipData?: IpData | null;
  messages: WidgetMessage[];
  contactName?: string | null;
  contactEmail?: string | null;
}

export interface WidgetSessionsResponse {
  sessions: WidgetSessionSummary[];
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
    status?: string;
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
      options.status ?? null,
    ],
    queryFn: async () => {
      const { data, error } = await api.GET<WidgetSessionsResponse>("/api/widget/sessions", {
        params: {
          query: {
            page: options.page ?? 1,
            limit: options.limit ?? 20,
            ...(options.search ? { search: options.search } : {}),
            ...(options.status && options.status !== "all" ? { status: options.status } : {}),
          },
        },
      });
      return requireData(data, error, "Failed to fetch widget sessions");
    },
    placeholderData: (previousData) => previousData,
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
