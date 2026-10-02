"use client";

import { useQuery } from "@tanstack/react-query";

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
