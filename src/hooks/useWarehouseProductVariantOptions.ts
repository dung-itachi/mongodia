/**
 * useWarehouseProductVariantOptions Hook
 *
 * Lấy variants của 1 Product (theo productId) — dùng cho dropdown
 * trong modal "Nhập" (1 SP → list variant).
 *
 * Tên hook được đổi để tránh xung đột với hook `useProductWithVariants`
 * đã có sẵn trong `@/hooks/useProductVariants.ts` của Sale flow.
 */

import { useQuery } from "@tanstack/react-query";

export type ProductVariantOption = {
  _id: string;
  sku: string;
};

type ProductVariantsResponse = {
  success: boolean;
  data: ProductVariantOption[];
  message?: string;
};

async function fetchProductVariants(
  productId: string
): Promise<ProductVariantOption[]> {
  const res = await fetch(
    `/api/warehouses/products/${productId}/variants`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as ProductVariantsResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không tải được variant");
  }
  return json.data;
}

export function useWarehouseProductVariantOptions(
  productId: string | null
) {
  const { data, isLoading, error } = useQuery<ProductVariantOption[], Error>({
    queryKey: ["warehouses", "products", productId, "variants"],
    queryFn: () => fetchProductVariants(productId as string),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    variants: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
  };
}

export default useWarehouseProductVariantOptions;