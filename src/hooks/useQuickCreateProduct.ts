/**
 * useQuickCreateProduct Hook (single-warehouse variant)
 *
 * Pipeline 3 bước để tạo nhanh Product + Variant + nhập kho ngay từ
 * trang `/warehouses`:
 *
 *   1. POST /api/products          → tạo Product
 *   2. POST /api/product-variants  → tạo Variant (đính VariantValue IDs)
 *   3. POST /api/warehouse/imports → IMPORT vào đúng 1 kho (KHO1) đã chọn
 *
 * Hook này dùng cho `QuickCreateProductDrawer`.
 *
 * Lưu ý business rule:
 *   - IMPORT phải đi vào KHO1 (kho trung gian / kho Trung Quốc).
 *   - KHÔNG cộng trực tiếp vào KHO2.
 *   - Để KHO2 có tồn, tạo WarehouseTransfer KHO1 → KHO2.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export type QuickCreateProductInput = {
  // ---- Warehouse (REQUIRED — chọn kho đích IMPORT) ----
  warehouseId: string;
  // ---- Product ----
  code: string;
  name: string;
  categoryCode: string;
  description?: string;
  // ---- Variant ----
  sku: string;
  variantValueIds: string[];
  // ---- Import ----
  quantity: number;
  note?: string;
};

export type QuickCreateProductResult = {
  productId: string;
  productCode: string;
  productName: string;
  productVariantId: string;
  variantSku: string;
  receiptCode: string;
  importedQuantity: number;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message?: string;
};

// ---- 1. Create Product ----
async function postCreateProduct(input: {
  code: string;
  name: string;
  categoryCode: string;
  description?: string;
  image?: string;
}): Promise<{ _id: string; code: string; name: string }> {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<{
    _id: string;
    code: string;
    name: string;
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Không thể tạo sản phẩm");
  }
  return json.data;
}

// ---- 2. Create Variant ----
async function postCreateVariant(input: {
  productId: string;
  sku: string;
  variantValues: string[];
}): Promise<{ _id: string; sku: string }> {
  const res = await fetch("/api/product-variants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResponse<{
    _id: string;
    sku: string;
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Không thể tạo variant");
  }
  return json.data;
}

// ---- 3. Import stock (single warehouse, workflow API) ----
async function postImportStock(
  warehouseId: string,
  productVariantId: string,
  quantity: number,
  note?: string
): Promise<{ receiptCode: string; items: unknown[] }> {
  const res = await fetch("/api/warehouse/imports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      warehouseId,
      note: note ?? "",
      items: [
        {
          variantId: productVariantId,
          orderedQuantity: quantity,
          receivedQuantity: quantity,
        },
      ],
    }),
  });
  const json = (await res.json()) as ApiResponse<{
    receiptCode: string;
    items: unknown[];
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Không thể nhập kho");
  }
  return json.data;
}

async function runQuickCreate(
  input: QuickCreateProductInput
): Promise<QuickCreateProductResult> {
  if (!input.warehouseId) {
    throw new Error("Vui lòng chọn kho đích để IMPORT");
  }

  // 1. Tạo Product
  const product = await postCreateProduct({
    code: input.code,
    name: input.name,
    categoryCode: input.categoryCode,
    description: input.description,
  });

  // 2. Tạo Variant
  const variant = await postCreateVariant({
    productId: product._id,
    sku: input.sku,
    variantValues: input.variantValueIds,
  });

  // 3. IMPORT vào đúng 1 kho (KHO1 theo business rule)
  const importResult = await postImportStock(
    input.warehouseId,
    variant._id,
    input.quantity,
    input.note
  );

  return {
    productId: product._id,
    productCode: product.code,
    productName: product.name,
    productVariantId: variant._id,
    variantSku: variant.sku,
    receiptCode: importResult.receiptCode,
    importedQuantity: input.quantity,
  };
}

export type UseQuickCreateProductReturn = {
  mutateAsync: (
    input: QuickCreateProductInput
  ) => Promise<QuickCreateProductResult>;
  isPending: boolean;
  error: string | null;
  reset: () => void;
};

export function useQuickCreateProduct(): UseQuickCreateProductReturn {
  const qc = useQueryClient();
  const mutation = useMutation<QuickCreateProductResult, Error, QuickCreateProductInput>(
    {
      mutationFn: runQuickCreate,
      onSuccess: () => {
        void qc.invalidateQueries({
          queryKey: ["warehouses", "inventory-overview"],
        });
        void qc.invalidateQueries({
          queryKey: ["warehouses", "products"],
        });
        void qc.invalidateQueries({ queryKey: ["warehouse", "inventory"] });
        void qc.invalidateQueries({ queryKey: ["warehouse", "movements"] });
      },
    }
  );

  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error?.message ?? null,
    reset: mutation.reset,
  };
}

export default useQuickCreateProduct;