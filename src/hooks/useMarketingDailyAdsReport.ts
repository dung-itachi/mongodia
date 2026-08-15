/**
 * useMarketingDailyAdsReport Hook
 *
 * Fetch daily ads report data from MarketingExpenseReport:
 * - Tổng tiêu, Xin sáng, Xin chiều, Xin gấp
 * - Tiền dư, DS, %Ads(xin/DS)
 *
 * Filter `marketingEmployeeId` (Sprint 7.4 — ADMIN có thể chọn MKT cụ thể).
 * Đối với non-GLOBAL user, API tự khoá cứng theo current user.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { ChartPeriod } from "@/types/marketing-dashboard";

export type DailyAdsReportScope = "GLOBAL" | "SELF";

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
  firstReportId?: string;
  reportStatus?: string;
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
    scope: DailyAdsReportScope;
    effectiveMarketingEmployeeId: string | null;
    dateRange: {
      start: string;
      end: string;
    };
    data: DailyAdsReportRow[];
    summary: DailyAdsReportSummary;
  };
  message?: string;
};

export type UseMarketingDailyAdsReportFilter = {
  period?: ChartPeriod;
  marketingEmployeeId?: string;
};

const fetchDailyAdsReport = async (
  filter: UseMarketingDailyAdsReportFilter
): Promise<DailyAdsReportResponse["data"]> => {
  const params = new URLSearchParams();
  if (filter.period) params.set("period", filter.period);
  if (filter.marketingEmployeeId) {
    params.set("employeeId", filter.marketingEmployeeId);
  }

  const response = await api.get(
    `/api/marketing/dashboard/daily-ads-report?${params.toString()}`
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Failed to fetch daily ads report data"
    );
  }

  return response.data.data;
};

export type UseMarketingDailyAdsReportReturn = {
  data: DailyAdsReportResponse["data"] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  scope: DailyAdsReportScope | null;
  effectiveMarketingEmployeeId: string | null;
};

export function useMarketingDailyAdsReport(
  filter: UseMarketingDailyAdsReportFilter = {}
): UseMarketingDailyAdsReportReturn {
  const { period = "7d", marketingEmployeeId } = filter;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DailyAdsReportResponse["data"], Error>({
    queryKey: [
      "marketing",
      "daily-ads-report",
      period,
      marketingEmployeeId ?? null,
    ],
    queryFn: () => fetchDailyAdsReport({ period, marketingEmployeeId }),
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
    refetch: () => {
      void refetch();
    },
    scope: data?.scope ?? null,
    effectiveMarketingEmployeeId: data?.effectiveMarketingEmployeeId ?? null,
  };
}

export default useMarketingDailyAdsReport;