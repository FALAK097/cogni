"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, requireData } from "@/lib/api/client";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";

export type KnowledgeBaseSource = {
  id: string;
  knowledgeBaseId?: string | null;
  sourceType: string;
  displayName: string;
  canonicalUrl?: string | null;
  previewUrl?: string | null;
  status: string;
  lastError?: string | null;
  lastFetchedAt?: string | null;
  chunkCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeBase = {
  id: string;
  workspaceId: string;
  name: string;
  status?: string | null;
  sourceCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeBaseEnvelope = {
  knowledgeBase?: KnowledgeBase | null;
  operation?: { status?: string; message?: string } | null;
};

export interface KnowledgeBasesResponse {
  knowledgeBases: KnowledgeBase[];
  count: number;
}

export interface KnowledgeBaseSourcesResponse {
  knowledgeBase: KnowledgeBase;
  sources: KnowledgeBaseSource[];
  count: number;
}

export function useKnowledgeBases() {
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useQuery<KnowledgeBasesResponse>({
    queryKey: queryKeys.knowledgeBase.list(workspaceId),
    queryFn: async () => {
      const { data, error } = await api.GET<KnowledgeBasesResponse>("/api/knowledge-base", {
        params: { query: { workspaceId } },
      });
      return requireData(data, error, "Failed to fetch knowledge bases");
    },
    enabled: Boolean(workspaceId),
  });
}

export function useKnowledgeBaseSources(
  knowledgeBaseId?: string | null,
  options?: { enabled?: boolean },
) {
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useQuery<KnowledgeBaseSourcesResponse>({
    queryKey: queryKeys.knowledgeBase.sources(workspaceId, knowledgeBaseId),
    queryFn: async () => {
      const { data, error } = await api.GET<KnowledgeBaseSourcesResponse>(
        "/api/knowledge-base/sources",
        {
          params: {
            query: {
              workspaceId,
              knowledgeBaseId: knowledgeBaseId ?? "default",
            },
          },
        },
      );
      return requireData(data, error, "Failed to fetch knowledge sources");
    },
    enabled: Boolean(workspaceId) && (options?.enabled ?? true),
  });
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { name: string }) => {
      const { data, error } = await api.POST<{ knowledgeBase: KnowledgeBase }>(
        "/api/knowledge-base",
        { body },
      );
      return requireData(data, error, "Failed to create knowledge base");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useUpdateKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_body: { id: string; name: string }) => ({ ok: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (_id: string) => ({ ok: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useCreateRagSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: {
      url: string | string[];
      mode?: "scrape" | "crawl";
      knowledgeBaseId?: string;
      includePaths?: string;
      excludePaths?: string;
      maxPages?: number;
      maxDepth?: number;
    }) => {
      const { data, error } = await api.POST<{ addedSources: number; sourceIds: string[] }>(
        "/api/knowledge-base/sources/website",
        { body },
      );
      return requireData(data, error, "Failed to add website source");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useCreateKnowledgeBaseApiSource() {
  return useMutation({
    mutationFn: async () => {
      throw new Error("API sources are not supported yet.");
    },
  });
}

export function useDeleteKnowledgeBaseSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data, error } = await api.DELETE<{ ok: boolean }>(
        "/api/knowledge-base/sources/{source_id}",
        {
          params: { path: { source_id: sourceId } },
        },
      );
      return requireData(data, error, "Failed to delete source");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useUpdateKnowledgeBaseSource() {
  return useMutation({
    mutationFn: async () => {
      throw new Error("Source editing is not supported yet.");
    },
  });
}

export function useUploadRagDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/dashboard/knowledge-base/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const json = (await response.json()) as { error?: string };
        throw new Error(json.error ?? "Failed to upload file");
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useResyncAllKnowledgeBaseSources() {
  return useMutation({
    mutationFn: async () => ({ ok: true }),
  });
}
