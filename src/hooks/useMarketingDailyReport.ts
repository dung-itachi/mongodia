/**
 * useMarketingDailyReport Hook
 *
 * Fetch daily report data for:
 * - 📈 Doanh số theo ngày
 * - 📊 Báo cáo Ads theo ngày
 *
 * Filter `marketingEmployeeId` (Sprint 7.4 — ADMIN có thể chọn MKT cụ thể).
 * Đối với non-GLOBAL user, API tự khoá cứng theo current user.
 */

import { useQuery } from "@tanstack/react-query";
import type { ChartPeriod } from "@/types/marketing-dashboard";

export type DailyReportScope = "GLOBAL" | "SELF";

export type DailyReportExtra = {
  scope: DailyReportScope;
  effectiveMarketingEmployeeId: string | null;
};

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
  /** Sprint X.Y — Order status breakdown theo ngày */
  pushed: number;
  called: number;
  closed: number;
  shipped: number;
  deliveredOk: number;
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
  /** Sprint X.Y — Order status totals */
  totalPushed: number;
  totalCalled: number;
  totalClosed: number;
  totalShipped: number;
  totalDeliveredOk: number;
};

export type DailyReportResponse = {
  success: boolean;
  data: {
    period: string;
    scope: DailyReportScope;
    effectiveMarketingEmployeeId: string | null;
    dateRange: {
      start: string;
      end: string;
    };
    data: DailyReportItem[];
    summary: DailyReportSummary;
  };
  message?: string;
};

export type UseMarketingDailyReportFilter = {
  period?: ChartPeriod;
  marketingEmployeeId?: string;
  /** Filter by area (resolves to MKT employees in that area). */
  areaId?: string;
  /** Filter by team (resolves to MKT employees in that team). */
  teamId?: string;
};

const fetchDailyReport = async (
  filter: UseMarketingDailyReportFilter
): Promise<DailyReportResponse["data"]> => {
  const params = new URLSearchParams();
  if (filter.period) params.set("period", filter.period);
  if (filter.marketingEmployeeId) {
    params.set("marketingEmployeeId", filter.marketingEmployeeId);
  }
  if (filter.areaId) params.set("areaId", filter.areaId);
  if (filter.teamId) params.set("teamId", filter.teamId);

  const response = await fetch(
    `/api/marketing/dashboard/daily-report?${params.toString()}`,
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
    throw new Error(result.message || "Failed to fetch daily report data");
  }

  return result.data;
};

export type UseMarketingDailyReportReturn = {
  data: DailyReportResponse["data"] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  scope: DailyReportScope | null;
  effectiveMarketingEmployeeId: string | null;
};

export function useMarketingDailyReport(
  filter: UseMarketingDailyReportFilter = {}
): UseMarketingDailyReportReturn {
  const { period = "7d", marketingEmployeeId, areaId, teamId } = filter;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<DailyReportResponse["data"], Error>({
    queryKey: ["marketing", "daily-report", period, marketingEmployeeId ?? null, areaId ?? null, teamId ?? null],
    queryFn: () => fetchDailyReport({ period, marketingEmployeeId, areaId, teamId }),
    staleTime: 60 * 1000, // 60 seconds
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
    refetch: () => {
      void refetch();
    },
    scope: data?.scope ?? null,
    effectiveMarketingEmployeeId: data?.effectiveMarketingEmployeeId ?? null,
  };
}

export default useMarketingDailyReport;
