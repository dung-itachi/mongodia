/**
 * useDashboardCharts Hook (Sprint 4.2 - Dashboard Charts)
 *
 * Fetch dashboard chart data using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import type { DashboardChartsData } from "@/types/dashboard-chart";

const fetchDashboardCharts = async (): Promise<DashboardChartsData> => {
  const response = await fetch("/api/dashboard/charts", {
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
    throw new Error(result.message || "Failed to fetch dashboard charts");
  }

  return result.data;
};

export function useDashboardCharts() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardChartsData, Error>({
    queryKey: ["dashboard", "charts"],
    queryFn: fetchDashboardCharts,
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

export default useDashboardCharts;