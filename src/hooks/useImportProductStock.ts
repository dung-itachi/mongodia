/**
 * useImportProductStock Hook
 *
 * Mutation POST /api/warehouses/import-product-stock — "+ Thêm SP kho"
 * nhập 1 variant vào TẤT CẢ kho active.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export type ImportProductStockPayload = {
  productVariantId: string;
  quantity: number;
  note?: string;
};

export type ImportProductStockResponse = {
  success: boolean;
  data: {
    updatedWarehouses: number;
    totalChange: number;
    referenceCode: string;
  };
  message?: string;
};

async function postImportProductStock(
  payload: ImportProductStockPayload
): Promise<ImportProductStockResponse["data"]> {
  const res = await fetch("/api/warehouses/import-product-stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as ImportProductStockResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không thể nhập SP kho");
  }
  return json.data;
}

export type UseImportProductStockReturn = {
  mutateAsync: (payload: ImportProductStockPayload) => Promise<ImportProductStockResponse["data"]>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
};

export function useImportProductStock(): UseImportProductStockReturn {
  const qc = useQueryClient();
  const mutation = useMutation<
    ImportProductStockResponse["data"],
    Error,
    ImportProductStockPayload
  >({
    mutationFn: postImportProductStock,
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

export default useImportProductStock;