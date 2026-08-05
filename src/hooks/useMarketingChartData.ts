/**
 * useMarketingChartData Hook (Sprint 7.2 — Charts & Analytics)
 *
 * Fetch chart data using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "@/hooks/dashboardKeys";
import type { ChartData, ChartPeriod } from "@/types/marketing-dashboard";

const fetchChartData = async (period: ChartPeriod): Promise<ChartData> => {
  const response = await fetch(`/api/marketing/dashboard/chart?period=${period}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch chart data");
  }

  return result.data;
};

export function useMarketingChartData(period: ChartPeriod) {
  const { data, isLoading, error, refetch } = useQuery<ChartData, Error>({
    queryKey: [...dashboardKeys.marketingCharts(), period],
    queryFn: () => fetchChartData(period),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
    refetch,
  };
}
