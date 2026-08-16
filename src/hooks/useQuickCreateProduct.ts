/**
 * useQuickCreateProduct Hook
 *
 * Pipeline 3 bước để tạo nhanh Product + Variant + nhập kho ngay từ
 * trang `/warehouses`:
 *
 *   1. POST /api/products          → tạo Product
 *   2. POST /api/product-variants  → tạo Variant (đính VariantValue IDs)
 *   3. POST /api/warehouses/import-product-stock → nhập SL vào tất cả kho
 *
 * Hook này dùng cho `QuickCreateProductDrawer`.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

export type QuickCreateProductInput = {
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
  updatedWarehouses: number;
  totalChange: number;
  referenceCode: string;
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

// ---- 3. Import stock ----
async function postImportStock(
  productVariantId: string,
  quantity: number,
  note?: string
): Promise<{
  updatedWarehouses: number;
  totalChange: number;
  referenceCode: string;
}> {
  const res = await fetch("/api/warehouses/import-product-stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productVariantId,
      quantity,
      note: note ?? "",
    }),
  });
  const json = (await res.json()) as ApiResponse<{
    updatedWarehouses: number;
    totalChange: number;
    referenceCode: string;
  }>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message || "Không thể nhập kho");
  }
  return json.data;
}

async function runQuickCreate(
  input: QuickCreateProductInput
): Promise<QuickCreateProductResult> {
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

  // 3. Nhập kho
  const importResult = await postImportStock(
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
    updatedWarehouses: importResult.updatedWarehouses,
    totalChange: importResult.totalChange,
    referenceCode: importResult.referenceCode,
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