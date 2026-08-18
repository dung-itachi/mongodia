/**
 * useMarketingDashboardDrillDown Hook (Sprint 7.3 — Drill-down & Export)
 *
 * Fetch drill-down data using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "@/hooks/dashboardKeys";
import type { DrillDownData } from "@/types/marketing-dashboard";
import type { MarketingDashboardFilter } from "@/types/marketing-dashboard-filter";

function buildDrillDownQueryString(filter: MarketingDashboardFilter, cardKey?: string): string {
  const params = new URLSearchParams();
  params.set("period", filter.period);
  if (filter.dateRange) {
    params.set("startDate", filter.dateRange.startDate);
    params.set("endDate", filter.dateRange.endDate);
  }
  if (filter.facebookPageId) params.set("facebookPageId", filter.facebookPageId);
  if (filter.marketingEmployeeId) params.set("marketingEmployeeId", filter.marketingEmployeeId);
  if (filter.campaignId) params.set("campaignId", filter.campaignId);
  if (filter.source) params.set("source", filter.source);
  if (filter.status) params.set("status", filter.status);
  // Sprint 8.0: Area/Team filters
  if (filter.teamId) params.set("teamId", filter.teamId);
  if (filter.areaId) params.set("areaId", filter.areaId);
  // Sprint 8.x: card key filter
  if (cardKey) params.set("cardKey", cardKey);
  return params.toString();
}

const fetchDrillDownData = async (queryString: string): Promise<DrillDownData> => {
  const response = await fetch(`/api/marketing/dashboard/drill-down?${queryString}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch drill-down data");
  }

  return result.data;
};

export function useMarketingDashboardDrillDown(
  filter: MarketingDashboardFilter | null,
  cardKey?: string
) {
  const { data, isLoading, error, refetch } = useQuery<DrillDownData, Error>({
    queryKey: [...dashboardKeys.marketing(), "drill-down", filter, cardKey],
    queryFn: () => {
      if (!filter) throw new Error("No filter provided");
      const queryString = buildDrillDownQueryString(filter, cardKey);
      return fetchDrillDownData(queryString);
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: Boolean(filter),
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
