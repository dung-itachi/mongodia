/**
 * useImportProductStock Hook (single-warehouse variant)
 *
 * Trước đây hook này gọi `/api/warehouses/import-product-stock` để IMPORT
 * vào TẤT CẢ kho đang active — vi phạm business rule (KHO1 chỉ được IMPORT
 * từ nhà sản xuất, không được cộng trực tiếp vào KHO2).
 *
 * Endpoint cũ đã bị tắt (410 Gone). Hook này giờ yêu cầu `warehouseId`
 * rõ ràng và gọi workflow API mới:
 *
 *   POST /api/warehouse/imports → warehouseWorkflowService.createReceipt
 *     → WarehouseInventory (atomic, transactional)
 *     → WarehouseStockMovement (IMPORT)
 *
 * UI ở /warehouses truyền `overviewWarehouseId` (filter hiện tại của người
 * dùng) làm `warehouseId` để đảm bảo nhập đúng vào KHO1.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export type ImportProductStockPayload = {
  warehouseId: string;
  productVariantId: string;
  quantity: number;
  note?: string;
};

export type ImportProductStockItem = {
  itemType: string;
  productName?: string;
  giftName?: string;
  beforeQuantity: number;
  afterQuantity: number;
  change: number;
};

export type ImportProductStockData = {
  receiptCode: string;
  movements: ImportProductStockItem[];
};

export type ImportProductStockResponse = {
  success: boolean;
  data: { receiptCode: string; items: ImportProductStockItem[] };
  message?: string;
};

async function postImportProductStock(
  payload: ImportProductStockPayload
): Promise<ImportProductStockData> {
  const res = await fetch("/api/warehouse/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouseId: payload.warehouseId,
      note: payload.note ?? "",
      items: [
        {
          variantId: payload.productVariantId,
          orderedQuantity: payload.quantity,
          receivedQuantity: payload.quantity,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = (await res.json()) as ImportProductStockResponse;
  if (!json.success || !json.data) {
    throw new Error(json.message || "Không thể nhập SP kho");
  }
  return {
    receiptCode: json.data.receiptCode,
    movements: json.data.items,
  };
}

export type UseImportProductStockReturn = {
  mutateAsync: (payload: ImportProductStockPayload) => Promise<ImportProductStockData>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
};

export function useImportProductStock(): UseImportProductStockReturn {
  const qc = useQueryClient();
  const mutation = useMutation<
    ImportProductStockData,
    Error,
    ImportProductStockPayload
  >({
    mutationFn: postImportProductStock,
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

export default useImportProductStock;