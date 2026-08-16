/**
 * useImportStock Hook
 *
 * Mutation POST /api/warehouses/[id]/import-stock — nhập kho theo combo/variant
 * vào 1 warehouse cụ thể (giữ cho tương thích API cũ).
 *
 * Lưu ý: Hiện tại UI modal "Nhập" trong card sản phẩm đang dùng combo flow.
 * Sau khi refactor sang variant, có thể bổ sung productVariantId.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export type ImportStockPayload = {
  warehouseId: string;
  comboId?: string;
  productVariantId?: string;
  quantity: number;
  note?: string;
};

export type ImportStockResponse = {
  success: boolean;
  data: {
    beforeQuantity: number;
    changeQuantity: number;
    afterQuantity: number;
    referenceCode: string;
  };
  message?: string;
};

async function postImportStock(
  payload: ImportStockPayload
): Promise<ImportStockResponse["data"]> {
  const { warehouseId, ...body } = payload;
  const res = await fetch(`/api/warehouses/${warehouseId}/import-stock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as ImportStockResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không thể nhập kho");
  }
  return json.data;
}

export type UseImportStockReturn = {
  mutateAsync: (payload: ImportStockPayload) => Promise<ImportStockResponse["data"]>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
};

export function useImportStock(): UseImportStockReturn {
  const qc = useQueryClient();
  const mutation = useMutation<
    ImportStockResponse["data"],
    Error,
    ImportStockPayload
  >({
    mutationFn: postImportStock,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["warehouses", "inventory-overview"] });
    },
  });

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  };
}

export default useImportStock;