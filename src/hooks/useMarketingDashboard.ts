/**
 * useMarketingDashboard Hook (Sprint 7.1 — Dashboard Repository Refactor)
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

const fetchMarketingDashboard =
  async (): Promise<MarketingDashboardData> => {
    const response = await fetch("/api/marketing/dashboard", {
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

export function useMarketingDashboard() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<MarketingDashboardData, Error>({
    queryKey: dashboardKeys.marketing(),
    queryFn: fetchMarketingDashboard,
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
