/**
 * useMarketingDailyAdsReport Hook
 * 
 * Fetch daily ads report data from MarketingExpenseReport:
 * - Tổng tiêu, Xin sáng, Xin chiều, Xin gấp
 * - Tiền dư, DS, %Ads(xin/DS)
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ChartPeriod } from "@/types/marketing-dashboard";

export type DailyAdsReportRow = {
  date: string;
  xinSang: number;
  xinChieu: number;
  xinGap: number;
  daTieuSang: number;
  daTieuChieu: number;
  daTieuGap: number;
  tongTieu: number;
  tongXin: number;
  tienDu: number;
  totalRevenue: number;
  totalLeads: number;
  closedLeads: number;
  percentAds: number;
};

export type DailyAdsReportSummary = {
  totalDays: number;
  tongXin: number;
  tongTieu: number;
  tienDu: number;
  totalRevenue: number;
  totalLeads: number;
  closedLeads: number;
  percentAds: number;
};

export type DailyAdsReportResponse = {
  success: boolean;
  data: {
    period: string;
    dateRange: {
      start: string;
      end: string;
    };
    data: DailyAdsReportRow[];
    summary: DailyAdsReportSummary;
  };
  message?: string;
};

const fetchDailyAdsReport = async (period: ChartPeriod): Promise<DailyAdsReportResponse["data"]> => {
  const response = await api.get(`/api/marketing/dashboard/daily-ads-report?period=${period}`);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch daily ads report data");
  }

  return response.data.data;
};

export function useMarketingDailyAdsReport(period: ChartPeriod = "7d") {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DailyAdsReportResponse["data"], Error>({
    queryKey: ["marketing", "daily-ads-report", period],
    queryFn: () => fetchDailyAdsReport(period),
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

export default useMarketingDailyAdsReport;
