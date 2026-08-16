/**
 * useWarehouseProducts Hook
 *
 * Lấy danh sách Product + variants đang active cho dropdown
 * modal "+ Thêm SP kho" / "Nhập kho".
 */

import { useQuery } from "@tanstack/react-query";

export type WarehouseProductVariant = {
  _id: string;
  sku: string;
  label: string;
};

export type WarehouseProduct = {
  _id: string;
  code: string;
  name: string;
  variants: WarehouseProductVariant[];
};

type WarehouseProductsResponse = {
  success: boolean;
  data: WarehouseProduct[];
  message?: string;
};

async function fetchProducts(): Promise<WarehouseProduct[]> {
  const res = await fetch("/api/warehouses/products");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as WarehouseProductsResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không tải được danh sách sản phẩm");
  }
  return json.data;
}

export function useWarehouseProducts() {
  const { data, isLoading, error } = useQuery<WarehouseProduct[], Error>({
    queryKey: ["warehouses", "products"],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    products: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
  };
}

export default useWarehouseProducts;