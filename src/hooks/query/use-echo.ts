"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, requireData } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export function useEchoConfig(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.echo.config(workspaceId),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/workspaces/{workspace_id}/echo-config", {
        params: { path: { workspace_id: workspaceId } },
      });
      return requireData(data, error, "Failed to fetch widget config");
    },
    enabled: Boolean(workspaceId),
  });
}

export function useSaveEchoConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      body,
    }: {
      workspaceId: string;
      body: Record<string, unknown>;
    }) => {
      const { data, error } = await api.PUT("/api/workspaces/{workspace_id}/echo-config", {
        params: { path: { workspace_id: workspaceId } },
        body,
      });
      return requireData(data, error, "Failed to save widget config");
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.echo.config(variables.workspaceId),
      });
    },
  });
}

export function useEchoSessions(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sort?: string;
    order?: string;
  } = {},
) {
  return useQuery({
    queryKey: [
      ...queryKeys.echo.sessions(),
      options.page ?? 1,
      options.limit ?? 20,
      options.search ?? null,
      options.status ?? null,
    ],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/echo/sessions", {
        params: {
          query: {
            page: options.page ?? 1,
            limit: options.limit ?? 20,
            ...(options.search ? { search: options.search } : {}),
            ...(options.status && options.status !== "all" ? { status: options.status } : {}),
          },
        },
      });
      return requireData(data, error, "Failed to fetch echo sessions");
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useEchoSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.echo.session(sessionId),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/echo/sessions/{session_id}", {
        params: { path: { session_id: sessionId } },
      });
      return requireData(data, error, "Failed to fetch echo session");
    },
    enabled: Boolean(sessionId),
  });
}

export function useDeleteEchoSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await api.DELETE("/api/echo/sessions/{session_id}", {
        params: { path: { session_id: sessionId } },
      });
      return requireData(data, error, "Failed to delete session");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.echo.sessions() });
    },
  });
}
