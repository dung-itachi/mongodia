/**
 * ==================================================
 * SALES DASHBOARD HOOKS
 * ==================================================
 *
 * Sprint 8.2 — Sales Dashboard
 *
 * React Query hooks for Sales Dashboard.
 */

import { useQuery } from "@tanstack/react-query";
import type {
  SalesDashboardResponse,
  SalesDashboardChartResponse,
  SalesDashboardRankingResponse,
  SalesDashboardFilter,
} from "@/types/sales-dashboard";

// ============================================================================
// API Functions
// ============================================================================

async function fetchDashboard(params?: SalesDashboardFilter): Promise<SalesDashboardResponse> {
  const searchParams = new URLSearchParams();
  if (params?.saleEmployeeId) {
    searchParams.set("saleEmployeeId", params.saleEmployeeId);
  }

  const url = `/api/sales/dashboard${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể lấy dữ liệu dashboard");
  }

  return data.data;
}

async function fetchDashboardChart(params?: SalesDashboardFilter): Promise<SalesDashboardChartResponse> {
  const searchParams = new URLSearchParams();
  if (params?.saleEmployeeId) {
    searchParams.set("saleEmployeeId", params.saleEmployeeId);
  }
  if (params?.days) {
    searchParams.set("days", String(params.days));
  }

  const url = `/api/sales/dashboard/chart${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể lấy dữ liệu biểu đồ");
  }

  return data.data;
}

async function fetchDashboardRanking(params?: SalesDashboardFilter): Promise<SalesDashboardRankingResponse> {
  const searchParams = new URLSearchParams();
  if (params?.saleEmployeeId) {
    searchParams.set("saleEmployeeId", params.saleEmployeeId);
  }
  if (params?.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const url = `/api/sales/dashboard/ranking${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể lấy dữ liệu xếp hạng");
  }

  return data.data;
}

// ============================================================================
// Hooks
// ============================================================================

export function useSalesDashboard(params?: SalesDashboardFilter) {
  return useQuery({
    queryKey: ["sales-dashboard", params],
    queryFn: () => fetchDashboard(params),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

export function useSalesDashboardChart(params?: SalesDashboardFilter) {
  return useQuery({
    queryKey: ["sales-dashboard-chart", params],
    queryFn: () => fetchDashboardChart(params),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}

export function useSalesDashboardRanking(params?: SalesDashboardFilter) {
  return useQuery({
    queryKey: ["sales-dashboard-ranking", params],
    queryFn: () => fetchDashboardRanking(params),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
}
