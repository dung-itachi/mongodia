/**
 * useWarehouseProductVariants Hook
 *
 * Lấy breakdown từng variant của 1 Product cho Drawer "Chi tiết".
 *
 * Hỗ trợ 2 filter để khớp với overview API:
 *  - `warehouseId`: lọc theo 1 kho cụ thể
 *  - `warehouseCode`: lọc theo KHO1 / KHO2 (warehouses hard-coded theo code)
 *    — bỏ qua nếu đã có warehouseId.
 */

import { useQuery } from "@tanstack/react-query";

export type WarehouseVariantOverviewItem = {
  productVariantId: string;
  sku: string;
  stock: number;
  shipping: number;
  returning: number;
  delivered: number;
  returned: number;
  imported: number;
};

export type WarehouseProductVariantsData = {
  product: {
    _id: string;
    code: string;
    name: string;
  };
  items: WarehouseVariantOverviewItem[];
};

type WarehouseProductVariantsResponse = {
  success: boolean;
  data: WarehouseProductVariantsData;
  message?: string;
};

export type WarehouseProductVariantsParams = {
  productId: string;
  warehouseId?: string | null;
  warehouseCode?: string | null;
};

async function fetchVariants(
  params: WarehouseProductVariantsParams
): Promise<WarehouseProductVariantsData> {
  const search = new URLSearchParams();
  if (params.warehouseId) {
    search.set("warehouseId", params.warehouseId);
  }
  if (params.warehouseCode) {
    search.set("warehouseCode", params.warehouseCode);
  }
  const url = `/api/warehouses/inventory-overview/${params.productId}/variants${
    search.toString() ? `?${search.toString()}` : ""
  }`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as WarehouseProductVariantsResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không tải được chi tiết sản phẩm");
  }
  return json.data;
}

export function useWarehouseProductVariants(
  productId: string | null,
  filters: { warehouseId?: string | null; warehouseCode?: string | null } = {}
) {
  const { data, isLoading, error, refetch } = useQuery<
    WarehouseProductVariantsData,
    Error
  >({
    queryKey: [
      "warehouses",
      "inventory-overview",
      "variants",
      productId,
      filters,
    ],
    queryFn: () =>
      fetchVariants({
        productId: productId as string,
        warehouseId: filters.warehouseId,
        warehouseCode: filters.warehouseCode,
      }),
    enabled: !!productId,
    staleTime: 60 * 1000,
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

export default useWarehouseProductVariants;