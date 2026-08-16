/**
 * useWarehouseProductVariants Hook
 *
 * Lấy breakdown từng variant của 1 Product cho Drawer "Chi tiết".
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

async function fetchVariants(
  productId: string
): Promise<WarehouseProductVariantsData> {
  const res = await fetch(
    `/api/warehouses/inventory-overview/${productId}/variants`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as WarehouseProductVariantsResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không tải được chi tiết sản ph�m");
  }
  return json.data;
}

export function useWarehouseProductVariants(productId: string | null) {
  const { data, isLoading, error, refetch } = useQuery<
    WarehouseProductVariantsData,
    Error
  >({
    queryKey: ["warehouses", "inventory-overview", "variants", productId],
    queryFn: () => fetchVariants(productId as string),
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