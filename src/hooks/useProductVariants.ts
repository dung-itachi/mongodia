/**
 * useProductWithVariants Hook
 *
 * Lấy Product + VariantOption + Variant list cho 1 productId.
 * Hook này được Sale flow (`SaleOrderModal`) dùng để resolve variant khi
 * chốt đơn.
 *
 * Khôi phục lại hook đã có sẵn trước khi refactor warehouse page.
 * Dùng type `ProductWithVariants` từ `@/types/variant` để tránh xung đột.
 */

import { useQuery } from "@tanstack/react-query";
import type { ProductWithVariants } from "@/types/variant";

type ProductWithVariantsResponse = {
  success: boolean;
  data: {
    product: ProductWithVariants;
    variantOptions: ProductWithVariants["variantOptions"];
    variants: ProductWithVariants["variants"];
  };
  message?: string;
};

async function fetchProductWithVariants(
  productId: string
): Promise<ProductWithVariants> {
  const res = await fetch(`/api/products/${productId}/variants`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as ProductWithVariantsResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không tải được sản phẩm + variant");
  }
  return json.data.product;
}

export function useProductWithVariants(productId: string | null) {
  const { data, isLoading, error } = useQuery<ProductWithVariants, Error>({
    queryKey: ["product-with-variants", productId],
    queryFn: () => fetchProductWithVariants(productId as string),
    enabled: !!productId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    product: data ?? null,
    loading: isLoading,
    error: error?.message ?? null,
  };
}

export default useProductWithVariants;