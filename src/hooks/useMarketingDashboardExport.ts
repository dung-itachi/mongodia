/**
 * useMarketingDashboardExport Hook (Sprint 7.3 — Drill-down & Export)
 *
 * Fetch export data using React Query.
 */

import { useQuery } from "@tanstack/react-query";
import { dashboardKeys } from "@/hooks/dashboardKeys";
import type { ExportData } from "@/types/marketing-dashboard";
import type { MarketingDashboardFilter } from "@/types/marketing-dashboard-filter";

function buildExportQueryString(filter: MarketingDashboardFilter): string {
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
  return params.toString();
}

const fetchExportData = async (filter: MarketingDashboardFilter): Promise<ExportData> => {
  const queryString = buildExportQueryString(filter);
  const response = await fetch(`/api/marketing/dashboard/export?${queryString}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch export data");
  }

  return result.data;
};

export function useMarketingDashboardExport(filter: MarketingDashboardFilter) {
  const { data, isLoading, error, refetch } = useQuery<ExportData, Error>({
    queryKey: [...dashboardKeys.marketing(), "export", filter],
    queryFn: () => fetchExportData(filter),
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
