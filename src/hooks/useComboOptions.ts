/**
 * useComboOptions Hook
 *
 * Lấy danh sách Combo đang active để dùng trong dropdown chọn sản phẩm
 * khi nhập kho.
 */

import { useQuery } from "@tanstack/react-query";

export type ComboOption = {
  _id: string;
  code: string;
  name: string;
  productId: string;
  productName: string;
  packageQuantity: number;
  sellingPrice: number;
};

type ComboOptionsResponse = {
  success: boolean;
  data: ComboOption[];
  message?: string;
};

async function fetchOptions(): Promise<ComboOption[]> {
  const res = await fetch("/api/combos/options");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as ComboOptionsResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không tải được combo");
  }
  return json.data;
}

export function useComboOptions() {
  const { data, isLoading, error } = useQuery<ComboOption[], Error>({
    queryKey: ["combos", "options"],
    queryFn: fetchOptions,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    options: data ?? [],
    loading: isLoading,
    error: error?.message ?? null,
  };
}

export default useComboOptions;