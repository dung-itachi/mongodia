/**
 * useMarketingDailyReport Hook
 * 
 * Fetch daily report data for:
 * - 📈 Doanh số theo ngày
 * - 📊 Báo cáo Ads theo ngày
 */

import { useQuery } from "@tanstack/react-query";
import type { ChartPeriod } from "@/types/marketing-dashboard";

export type DailyReportItem = {
  date: string;
  revenue: number;
  orders: number;
  avgOrder: number;
  adsSpent: number;
  adsRevenue: number;
  leads: number;
  closedLeads: number;
  roas: number;
};

export type DailyReportSummary = {
  totalDays: number;
  totalRevenue: number;
  totalOrders: number;
  avgDailyRevenue: number;
  totalAdsSpent: number;
  totalAdsRevenue: number;
  totalLeads: number;
  totalClosedLeads: number;
  overallROAS: number;
};

export type DailyReportResponse = {
  success: boolean;
  data: {
    period: string;
    dateRange: {
      start: string;
      end: string;
    };
    data: DailyReportItem[];
    summary: DailyReportSummary;
  };
  message?: string;
};

const fetchDailyReport = async (period: ChartPeriod): Promise<DailyReportResponse["data"]> => {
  const response = await fetch(`/api/marketing/dashboard/daily-report?period=${period}`, {
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
    throw new Error(result.message || "Failed to fetch daily report data");
  }

  return result.data;
};

export function useMarketingDailyReport(period: ChartPeriod = "7d") {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DailyReportResponse["data"], Error>({
    queryKey: ["marketing", "daily-report", period],
    queryFn: () => fetchDailyReport(period),
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

export default useMarketingDailyReport;
