"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, requireData } from "@/lib/api/client";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";

export function useCampaigns() {
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useQuery<{ campaigns: Array<{ id: string; name: string; description?: string | null }> }>({
    queryKey: queryKeys.workspaces.campaigns(workspaceId),
    queryFn: async (): Promise<{
      campaigns: Array<{ id: string; name: string; description?: string | null }>;
    }> => {
      const { data, error } = await api.GET<{
        campaigns: Array<{ id: string; name: string; description?: string | null }>;
      }>("/api/workspaces/{workspace_id}/campaigns", {
        params: { path: { workspace_id: workspaceId } },
      });
      return requireData(data, error, "Failed to fetch campaigns");
    },
    enabled: Boolean(workspaceId),
  });
}

export function useCampaign(id: string) {
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useQuery({
    queryKey: [...queryKeys.workspaces.campaigns(workspaceId), id],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/api/workspaces/{workspace_id}/campaigns/{campaign_id}",
        {
          params: { path: { workspace_id: workspaceId, campaign_id: id } },
        },
      );
      return requireData(data, error, "Failed to fetch campaign");
    },
    enabled: Boolean(id) && Boolean(workspaceId),
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useMutation({
    mutationFn: async (body: {
      name: string;
      description?: string | null;
      instructions?: string | null;
      documentIds?: string[];
    }) => {
      const { data, error } = await api.POST("/api/workspaces/{workspace_id}/campaigns", {
        params: { path: { workspace_id: workspaceId } },
        body,
      });
      return requireData(data, error, "Failed to create campaign");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.campaigns(workspaceId),
      });
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useMutation({
    mutationFn: async ({
      campaignId,
      body,
    }: {
      campaignId: string;
      body: Record<string, unknown>;
    }) => {
      const { data, error } = await api.PUT(
        "/api/workspaces/{workspace_id}/campaigns/{campaign_id}",
        {
          params: { path: { workspace_id: workspaceId, campaign_id: campaignId } },
          body,
        },
      );
      return requireData(data, error, "Failed to update campaign");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.campaigns(workspaceId),
      });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await api.DELETE(
        "/api/workspaces/{workspace_id}/campaigns/{campaign_id}",
        {
          params: { path: { workspace_id: workspaceId, campaign_id: campaignId } },
        },
      );
      return requireData(data, error, "Failed to delete campaign");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaces.campaigns(workspaceId),
      });
    },
  });
}
