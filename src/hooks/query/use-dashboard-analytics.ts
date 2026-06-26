"use client";

import { useQuery } from "@tanstack/react-query";

import type { DashboardAnalytics } from "@/features/analytics/types";
import { api, requireData } from "@/lib/api/client";
import { queryKeys } from "@/lib/query-keys";

export type DashboardAnalyticsParams = {
  startDate?: string;
  endDate?: string;
};

export function useDashboardAnalytics(params: DashboardAnalyticsParams) {
  return useQuery({
    queryKey: queryKeys.analytics.dashboard(params.startDate, params.endDate),
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
