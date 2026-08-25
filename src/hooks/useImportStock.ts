/**
 * useImportStock Hook
 *
 * Mutation POST /api/warehouse/imports — nhập kho vào một kho cụ thể
 * (giờ chỉ định KHO1 = kho trung gian theo business rule).
 *
 * Path dữ liệu: WarehouseInventory + WarehouseStockMovement (IMPORT),
 * KHÔNG đụng vào legacy `Inventory` model.
 *
 * Trước đây hook này gọi `/api/warehouses/[id]/import-stock` (đã deprecated).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export type ImportStockPayload = {
  warehouseId: string;
  productId?: string;
  variantId?: string;
  giftId?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  note?: string;
};

export type ImportStockResponseItem = {
  itemType: string;
  productName?: string;
  giftName?: string;
  beforeQuantity: number;
  afterQuantity: number;
  change: number;
};

export type ImportStockResponseData = {
  receiptCode: string;
  movements: ImportStockResponseItem[];
};

export type ImportStockResponse = {
  success: boolean;
  data: { receiptCode: string; items: ImportStockResponseItem[] };
  message?: string;
};

async function postImportStock(
  payload: ImportStockPayload
): Promise<ImportStockResponseData> {
  const res = await fetch("/api/warehouse/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouseId: payload.warehouseId,
      note: payload.note ?? "",
      items: [
        {
          productId: payload.productId,
          variantId: payload.variantId,
          giftId: payload.giftId,
          orderedQuantity: payload.orderedQuantity,
          receivedQuantity: payload.receivedQuantity,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as ImportStockResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không thể nhập kho");
  }
  return {
    receiptCode: json.data.receiptCode,
    movements: json.data.items.map((m) => ({
      itemType: m.itemType,
      productName: m.productName,
      giftName: m.giftName,
      beforeQuantity: m.beforeQuantity,
      afterQuantity: m.afterQuantity,
      change: m.change,
    })),
  };
}

export type UseImportStockReturn = {
  mutateAsync: (payload: ImportStockPayload) => Promise<ImportStockResponseData>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
};

export function useImportStock(): UseImportStockReturn {
  const qc = useQueryClient();
  const mutation = useMutation<
    ImportStockResponseData,
    Error,
    ImportStockPayload
  >({
    mutationFn: postImportStock,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["warehouses", "inventory-overview"] });
      void qc.invalidateQueries({ queryKey: ["warehouse", "inventory"] });
      void qc.invalidateQueries({ queryKey: ["warehouse", "movements"] });
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