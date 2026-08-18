/**
 * useMarketingBestProducts Hook
 *
 * 🏆 Hook lấy top sản phẩm bán chạy cho dashboard.
 *
 * Filter `marketingEmployeeId` (Sprint 7.4 — ADMIN có thể chọn MKT cụ thể).
 * Đối với non-GLOBAL user, API tự khoá cứng theo current user.
 */

import { useQuery } from "@tanstack/react-query";
import type { ChartPeriod } from "@/types/marketing-dashboard";

export type BestProductsItem = {
  name: string;
  count: number;
};

export type BestProductsResponse = {
  success: boolean;
  data: {
    scope: "GLOBAL" | "SELF";
    effectiveMarketingEmployeeId: string | null;
    dateRange: { start: string; end: string };
    data: BestProductsItem[];
    total: number;
  };
  message?: string;
};

export type UseMarketingBestProductsFilter = {
  period?: ChartPeriod;
  marketingEmployeeId?: string;
  areaId?: string;
  teamId?: string;
  limit?: number;
};

const fetchBestProducts = async (
  filter: UseMarketingBestProductsFilter
): Promise<BestProductsResponse["data"]> => {
  const params = new URLSearchParams();
  if (filter.period) params.set("period", filter.period);
  if (filter.marketingEmployeeId) {
    params.set("marketingEmployeeId", filter.marketingEmployeeId);
  }
  if (filter.areaId) params.set("areaId", filter.areaId);
  if (filter.teamId) params.set("teamId", filter.teamId);
  if (filter.limit) params.set("limit", String(filter.limit));

  const response = await fetch(
    `/api/marketing/dashboard/best-products?${params.toString()}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json();
  if (!result.success || !result.data) {
    throw new Error(result.message || "Failed to fetch best products");
  }
  return result.data;
};

export type UseMarketingBestProductsReturn = {
  data: BestProductsResponse["data"] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useMarketingBestProducts(
  filter: UseMarketingBestProductsFilter = {}
): UseMarketingBestProductsReturn {
  const { period = "7d", marketingEmployeeId, areaId, teamId, limit = 8 } = filter;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<BestProductsResponse["data"], Error>({
    queryKey: ["marketing", "best-products", period, marketingEmployeeId ?? null, areaId ?? null, teamId ?? null, limit],
    queryFn: () => fetchBestProducts({ period, marketingEmployeeId, areaId, teamId, limit }),
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
  };
}

export default useMarketingBestProducts;
