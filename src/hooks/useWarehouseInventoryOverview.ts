/**
 * useWarehouseInventoryOverview Hook
 *
 * Lấy dữ liệu tổng quan kho (per-Product + totals) cho trang
 * `/warehouses` — thiết kế theo `mongolia-crm (7).html`.
 *
 * Mỗi item = 1 Product (gom tồn kho của tất cả variant).
 *
 * Hỗ trợ filter `warehouseId` để chỉ lấy dữ liệu của 1 kho cụ thể.
 */

import { useQuery } from "@tanstack/react-query";

export type WarehouseOverviewVariantItem = {
  productVariantId: string;
  sku: string;
  stock: number;
  imported: number;
};

export type WarehouseOverviewItem = {
  productId: string;
  productCode: string;
  productName: string;
  stock: number;
  shipping: number;
  returning: number;
  delivered: number;
  returned: number;
  imported: number;
  transferredOut: number;
  /**
   * Breakdown theo SKU. Chỉ có khi hook được gọi với
   * `includeVariants=true` (mặc định đã bật cho /warehouses để loại bỏ
   * N+1 request — trước đây phải gọi /variants lặp N lần).
   */
  variants?: WarehouseOverviewVariantItem[];
};

export type WarehouseOverviewTotals = {
  productCount: number;
  stock: number;
  shipping: number;
  returning: number;
  delivered: number;
  returned: number;
  imported: number;
  transferredOut: number;
};

export type WarehouseOverviewResponse = {
  success: boolean;
  data: {
    totals: WarehouseOverviewTotals;
    items: WarehouseOverviewItem[];
  };
  message?: string;
};

export type WarehouseOverviewParams = {
  warehouseId?: string | null;
  /** Mã kho hard-coded (KHO1 / KHO2). KHÔNG dùng areaCountryCode — Area chỉ dành cho nhân viên. */
  warehouseCode?: string | null;
  /**
   * Khi true, API đính kèm breakdown variants cho tất cả products trong
   * cùng response — FE /warehouses bật để hiển thị SKU breakdown trên card
   * mà không cần thêm N request /variants.
   */
  includeVariants?: boolean;
};

async function fetchOverview(
  params: WarehouseOverviewParams
): Promise<WarehouseOverviewResponse["data"]> {
  const search = new URLSearchParams();
  if (params.warehouseId) {
    search.set("warehouseId", params.warehouseId);
  }
  if (params.warehouseCode) {
    search.set("warehouseCode", params.warehouseCode);
  }
  if (params.includeVariants) {
    search.set("includeVariants", "true");
  }
  const url = `/api/warehouses/inventory-overview${
    search.toString() ? `?${search.toString()}` : ""
  }`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as WarehouseOverviewResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không tải được tổng quan kho");
  }
  return json.data;
}

export type UseWarehouseInventoryOverviewReturn = {
  data: WarehouseOverviewResponse["data"] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useWarehouseInventoryOverview(
  params: WarehouseOverviewParams = {}
): UseWarehouseInventoryOverviewReturn {
  const { data, isLoading, error, refetch } = useQuery<
    WarehouseOverviewResponse["data"],
    Error
  >({
    queryKey: ["warehouses", "inventory-overview", params],
    queryFn: () => fetchOverview(params),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnWindowFocus: false,
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

export default useWarehouseInventoryOverview;