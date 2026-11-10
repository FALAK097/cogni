"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import type { DashboardAnalytics } from "@/features/analytics/types";
import { useActiveWorkspaceId } from "@/hooks/use-auth";
import { api, requireData } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export type DashboardAnalyticsParams = {
  startDate?: string;
  endDate?: string;
};

export function useDashboardAnalytics(params: DashboardAnalyticsParams) {
  const workspaceId = useActiveWorkspaceId() ?? "";

  return useQuery({
    queryKey: queryKeys.analytics.dashboard(workspaceId, params.startDate, params.endDate),
    enabled: Boolean(workspaceId),
    queryFn: async () => {
      const { data, error } = await api.GET<DashboardAnalytics>("/api/dashboard/analytics", {
        params: {
          query: {
            startDate: params.startDate,
            endDate: params.endDate,
          },
        },
      });
      return requireData(data, error, "Failed to load dashboard analytics");
    },
    staleTime: 30_000,
  });
}

export function useReviewKnowledgeGap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { question: string; status: "OPEN" | "RESOLVED" | "IGNORED" }) => {
      const response = await fetch("/api/dashboard/analytics/knowledge-gaps", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const error = z.object({ error: z.string() }).safeParse(body);
        throw new Error(error.success ? error.data.error : "Could not update this knowledge gap.");
      }
      return z.object({ status: z.enum(["OPEN", "RESOLVED", "IGNORED"]) }).parse(body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}
