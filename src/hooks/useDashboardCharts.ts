/**
 * useDashboardCharts Hook
 *
 * Fetch dashboard chart data using React Query.
 * Hỗ trợ filter `range` cho topMarketing (day / week / month).
 */

import { useQuery } from "@tanstack/react-query";
import type {
  DashboardChartsData,
  TopMarketingRange,
} from "@/types/dashboard-chart";

const DEFAULT_RANGE: TopMarketingRange = "month";

const fetchDashboardCharts = async (
  range: TopMarketingRange
): Promise<DashboardChartsData> => {
  const response = await fetch(
    `/api/dashboard/charts?range=${encodeURIComponent(range)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch dashboard charts");
  }

  return result.data;
};

export type UseDashboardChartsOptions = {
  /** Lọc topMarketing theo day / week / month. Mặc định: month. */
  range?: TopMarketingRange;
};

export function useDashboardCharts(options: UseDashboardChartsOptions = {}) {
  const { range = DEFAULT_RANGE } = options;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardChartsData, Error>({
    queryKey: ["dashboard", "charts", range],
    queryFn: () => fetchDashboardCharts(range),
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