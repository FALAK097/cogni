"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, requireData } from "@/lib/api/client";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import { getAllIntegrations } from "@/lib/integrations/registry";
import { queryKeys } from "@/lib/query-keys";

export function useIntegrations() {
  const activeWorkspaceId = useActiveWorkspaceId();

  return useQuery({
    queryKey: activeWorkspaceId
      ? queryKeys.integrations.workspace(activeWorkspaceId)
      : queryKeys.integrations.list(),
    queryFn: async () => {
      if (!activeWorkspaceId) {
        return { integrations: getAllIntegrations(), workspaceIntegrations: [] };
      }

      const { data, error } = await api.GET("/api/dashboard/integrations");
      const workspaceIntegrations = requireData(
        data,
        error,
        "Failed to fetch workspace integrations",
      ) as Array<{ slug?: string; integrationSlug?: string; status?: string }>;

      return {
        integrations: getAllIntegrations(),
        workspaceIntegrations: workspaceIntegrations.map((entry) => ({
          ...entry,
          slug: entry.integrationSlug ?? entry.slug,
        })),
      };
    },
    enabled: Boolean(activeWorkspaceId),
    staleTime: 0,
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async ({
      slug,
    }: {
      slug: string;
      credentials?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) => {
      if (!activeWorkspaceId) throw new Error("No active workspace");
      const { data, error } = await api.POST("/api/dashboard/integrations", {
        body: { slug },
      });
      return requireData(data, error, "Failed to connect integration");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  const activeWorkspaceId = useActiveWorkspaceId();

  return useMutation({
    mutationFn: async (slug: string) => {
      if (!activeWorkspaceId) throw new Error("No active workspace");
      const { data, error } = await api.DELETE("/api/dashboard/integrations", {
        params: { query: { slug } },
      });
      return requireData(data, error, "Failed to disconnect integration");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
}

export function useSendIntegrationTestEmail() {
  return useMutation({
    mutationFn: async () => {
      throw new Error("Test email is not configured for this integration.");
    },
  });
}
