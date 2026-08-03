/**
 * useMarketingDashboard Hook (Sprint 5.1 — Marketing Dashboard)
 *
 * Fetch marketing dashboard data using React Query.
 */

import { useQuery } from "@tanstack/react-query";
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
    queryKey: ["marketing", "dashboard"],
    queryFn: fetchMarketingDashboard,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
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