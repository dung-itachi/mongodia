/**
 * useMarketingDashboard Hook (Sprint 7.1 — Dashboard Repository Refactor)
 * Sprint 8.0: Thêm filter params để support area/team/mkt filtering
 *
 * Fetch marketing dashboard data using React Query.
 * Uses dashboardKeys.marketing() for domain-specific cache keys.
 *
 * Cache:
 * - staleTime: 60s
 * - gcTime: 5 minutes
 */

import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "@/hooks/dashboardKeys";
import type { MarketingDashboardData } from "@/types/marketing-dashboard";
import type { MarketingDashboardFilter } from "@/types/marketing-dashboard-filter";

export type UseMarketingDashboardParams = {
  filter?: MarketingDashboardFilter;
};

const buildQueryString = (filter?: MarketingDashboardFilter): string => {
  if (!filter) return "";
  const params = new URLSearchParams();
  if (filter.period) params.set("period", filter.period);
  if (filter.dateRange?.startDate) params.set("startDate", filter.dateRange.startDate);
  if (filter.dateRange?.endDate) params.set("endDate", filter.dateRange.endDate);
  if (filter.marketingEmployeeId) params.set("marketingEmployeeId", filter.marketingEmployeeId);
  if (filter.teamId) params.set("teamId", filter.teamId);
  if (filter.areaId) params.set("areaId", filter.areaId);
  const query = params.toString();
  return query ? `?${query}` : "";
};

const fetchMarketingDashboard =
  async (filter?: MarketingDashboardFilter): Promise<MarketingDashboardData> => {
    const queryString = buildQueryString(filter);
    const response = await fetch(`/api/marketing/dashboard${queryString}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
      throw new Error(
        result.message || "Failed to fetch marketing dashboard data"
      );
    }

    return result.data;
  };

export function useMarketingDashboard(params?: UseMarketingDashboardParams) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingDashboardData, Error>({
    queryKey: dashboardKeys.marketing(params?.filter),
    queryFn: () => fetchMarketingDashboard(params?.filter),
    staleTime: 60 * 1000,   // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: false,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export default useMarketingDashboard;
