"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, requireData } from "@/lib/api/client";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import { queryKeys } from "@/lib/query-keys";
import {
  addManualTextSourceAction,
  addUrlSourceAction,
  importSitemapSourceAction,
} from "@/features/knowledge/actions";
import { z } from "zod";

const okResponseSchema = z.object({ ok: z.boolean() });
const processSourceResponseSchema = okResponseSchema.extend({ status: z.literal("processing") });
const uploadSourceResponseSchema = z.object({
  documentId: z.string().uuid(),
  job: z.object({
    mode: z.literal("queued"),
    created: z.boolean(),
    workflowRunId: z.string().uuid().nullable(),
  }),
});

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
  sourceCount?: number;
  createdAt: string;
  updatedAt: string;
};

export interface KnowledgeBaseSourcesResponse {
  knowledgeBase: KnowledgeBase;
  sources: KnowledgeBaseSource[];
  count: number;
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
        "/api/dashboard/knowledge-base/sources",
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
    refetchInterval: (query) =>
      query.state.data?.sources.some((source) => source.status === "processing") ? 2_000 : false,
  });
}

export function useDeleteKnowledgeBaseSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const response = await fetch(`/api/dashboard/knowledge-base/sources/${sourceId}`, {
        method: "DELETE",
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const error = z.object({ error: z.string() }).safeParse(body);
        throw new Error(error.success ? error.data.error : "Failed to delete source");
      }
      return okResponseSchema.parse(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useProcessKnowledgeBaseSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sourceId, action }: { sourceId: string; action: "retry" | "sync" }) => {
      const response = await fetch(`/api/dashboard/knowledge-base/sources/${sourceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const error = z.object({ error: z.string() }).safeParse(body);
        throw new Error(error.success ? error.data.error : "Failed to process source");
      }
      return processSourceResponseSchema.parse(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
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
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const error = z.object({ error: z.string() }).safeParse(body);
        throw new Error(error.success ? error.data.error : "Failed to upload file");
      }
      return uploadSourceResponseSchema.parse(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

type KnowledgeActionState = { error?: string; savedAt?: number };

function extractActionError(result: unknown): string | null {
  if (result && typeof result === "object" && "error" in result) {
    const error = (result as KnowledgeActionState).error;
    if (typeof error === "string" && error.length > 0) return error;
  }
  return null;
}

export function useAddUrlSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { title: string; sourceUrl: string }) => {
      const formData = new FormData();
      formData.set("title", input.title);
      formData.set("sourceUrl", input.sourceUrl);
      const result = await addUrlSourceAction({}, formData);
      const error = extractActionError(result);
      if (error) throw new Error(error);
      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useAddManualTextSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      const formData = new FormData();
      formData.set("title", input.title);
      formData.set("content", input.content);
      const result = await addManualTextSourceAction({}, formData);
      const error = extractActionError(result);
      if (error) throw new Error(error);
      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}

export function useImportSitemapSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { title: string; sourceUrl: string }) => {
      const formData = new FormData();
      formData.set("title", input.title);
      formData.set("sourceUrl", input.sourceUrl);
      const result = await importSitemapSourceAction({}, formData);
      const error = extractActionError(result);
      if (error) throw new Error(error);
      return result;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.knowledgeBase.all });
    },
  });
}
