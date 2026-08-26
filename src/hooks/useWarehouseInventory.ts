/**
 * Warehouse Inventory Hooks
 *
 * Hooks for fetching warehouse inventory with server-side filtering support.
 * All filters are applied BEFORE pagination on the server via /api/warehouse/inventory/query.
 * Does NOT modify warehouseWorkflow.service.ts - uses separate warehouseInventoryQuery.service.ts
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWarehouses } from "./useWarehouses";
import { useProducts } from "./useProducts";
import { useGiftList } from "./useGifts";
import { useProductVariantList } from "./useVariants";

export interface WarehouseInventoryItem {
  _id: string;
  warehouseId: { _id: string; code: string; name: string } | string;
  itemType: "PRODUCT" | "GIFT";
  productId: { _id: string; code: string; name: string } | string | null;
  variantId: { _id: string; sku: string; variantValues: Array<{ name: string }> } | string | null;
  giftId: { _id: string; name: string } | string | null;
  quantity: number;
  availableQuantity: number;
  inTransitQuantity: number;
  shippedQuantity: number;
  reservedQuantity: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface WarehouseInventoryFilters {
  warehouseId?: string;
  itemType?: "PRODUCT" | "GIFT" | "";
  productId?: string;
  variantId?: string;
  giftId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WarehouseInventoryResponse {
  items: WarehouseInventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function fetchInventory(filters: WarehouseInventoryFilters): Promise<WarehouseInventoryResponse> {
  const params = new URLSearchParams();
  if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
  if (filters.itemType) params.set("itemType", filters.itemType);
  if (filters.productId) params.set("productId", filters.productId);
  if (filters.variantId) params.set("variantId", filters.variantId);
  if (filters.giftId) params.set("giftId", filters.giftId);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));

  // Use the new query endpoint that supports all filters
  const res = await fetch(`/api/warehouse/inventory/query?${params.toString()}`, {
    headers: { "Content-Type": "application/json" },
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Request thất bại");
  return data.data;
}

function extractId(ref: { _id: string } | string | null | undefined): string {
  if (!ref) return "";
  return typeof ref === "object" ? ref._id : ref;
}

function getVariantSku(variant: { sku?: string } | string | null | undefined): string {
  if (!variant) return "";
  return typeof variant === "object" ? variant.sku ?? "" : "";
}

function getVariantLabel(variant: { sku?: string; variantValues?: Array<{ name: string }> } | string | null | undefined): string {
  if (!variant) return "";
  if (typeof variant === "string") return variant;
  const sku = variant.sku ?? "";
  const values = variant.variantValues?.map((v) => v.name).join(" / ") ?? "";
  return values ? `${values}${sku ? ` (${sku})` : ""}` : sku;
}

function getProductLabel(product: { code?: string; name?: string } | string | null | undefined): string {
  if (!product) return "";
  if (typeof product === "string") return product;
  return product.name ?? product.code ?? "";
}

function getGiftLabel(gift: { name?: string } | string | null | undefined): string {
  if (!gift) return "";
  return typeof gift === "object" ? gift.name ?? "" : gift;
}

export function getItemDisplayName(item: WarehouseInventoryItem): string {
  if (item.itemType === "GIFT") {
    return getGiftLabel(item.giftId);
  }
  const productLabel = getProductLabel(item.productId);
  const variantLabel = getVariantLabel(item.variantId);
  return variantLabel ? `${productLabel} • ${variantLabel}` : productLabel;
}

export function getItemCode(item: WarehouseInventoryItem): string {
  if (item.itemType === "GIFT") {
    return "";
  }
  return getVariantSku(item.variantId) || (typeof item.productId === "object" ? item.productId?.code ?? "" : "");
}

export interface NormalizedInventoryItem extends WarehouseInventoryItem {
  itemId: string;
  displayName: string;
  displayCode: string;
  warehouseName: string;
  productIdValue: string;
  variantIdValue: string;
  giftIdValue: string;
}

function normalizeItem(item: WarehouseInventoryItem): NormalizedInventoryItem {
  return {
    ...item,
    itemId: `${extractId(item.warehouseId)}::${item.itemType}::${extractId(item.variantId)}::${extractId(item.productId)}::${extractId(item.giftId)}`,
    displayName: getItemDisplayName(item),
    displayCode: getItemCode(item),
    warehouseName: typeof item.warehouseId === "object" ? item.warehouseId?.name ?? "" : "",
    productIdValue: extractId(item.productId),
    variantIdValue: extractId(item.variantId),
    giftIdValue: extractId(item.giftId),
  };
}

export interface UseWarehouseInventoryOptions {
  filters: WarehouseInventoryFilters;
}

export function useWarehouseInventory({ filters }: UseWarehouseInventoryOptions) {
  const { data, isLoading, error, refetch, isFetching } = useQuery<WarehouseInventoryResponse, Error>({
    queryKey: ["warehouse-inventory", filters],
    queryFn: () => fetchInventory(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    // Bỏ qua fetch khi không có warehouseId (vd: parent chưa load order xong).
    // Trước đây vẫn fetch với warehouseId="" → backend trả 403 nếu user không phải
    // admin, gây log nhiễu `[object Object]` ở những chỗ serialize sai.
    enabled: !!filters.warehouseId,
  });

  const items = useMemo(() => {
    if (!data?.items) return [];
    return data.items.map(normalizeItem);
  }, [data?.items]);

  return {
    items,
    total: data?.total ?? 0,
    allItems: data?.items ?? [],
    loading: isLoading,
    fetching: isFetching,
    error: error?.message ?? null,
    refetch,
    response: data,
  };
}

export function useWarehouseInventorySelectors() {
  const { products, loading: productsLoading } = useProducts();
  const { data: giftsData, isLoading: giftsLoading } = useGiftList({ isActive: true });
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  const { data: variantsData, isLoading: variantsLoading } = useProductVariantList({ limit: 1000 });

  return {
    products,
    gifts: giftsData?.items ?? [],
    warehouses,
    variants: variantsData?.items ?? [],
    loading: productsLoading || giftsLoading || warehousesLoading || variantsLoading,
  };
}
