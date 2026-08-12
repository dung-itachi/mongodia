/**
 * ==================================================
 * WAREHOUSE HISTORY TYPES
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Type definitions for Warehouse Stock Movement History UI.
 */

import type { WarehouseStockMovementType, WarehouseStockItemType, WarehouseStockReferenceType } from "@/models/WarehouseStockMovement";

// ============================================================================
// Movement Types & Labels
// ============================================================================

export const MOVEMENT_TYPE_LABELS: Record<WarehouseStockMovementType, string> = {
  IMPORT: "Nhập kho",
  TRANSFER_OUT: "Chuyển đi",
  TRANSFER_IN: "Nhận chuyển",
  ORDER_OUT: "Xuất đơn",
  ORDER_RETURN: "Hoàn đơn",
  ADJUSTMENT: "Điều chỉnh",
};

export const MOVEMENT_TYPE_COLORS: Record<WarehouseStockMovementType, string> = {
  IMPORT: "green",
  TRANSFER_OUT: "orange",
  TRANSFER_IN: "blue",
  ORDER_OUT: "red",
  ORDER_RETURN: "purple",
  ADJUSTMENT: "magenta",
};

export const MOVEMENT_TYPE_OPTIONS = Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// ============================================================================
// Reference Type Labels
// ============================================================================

export const REFERENCE_TYPE_LABELS: Record<WarehouseStockReferenceType, string> = {
  RECEIPT: "Phiếu nhập",
  TRANSFER: "Phiếu chuyển",
  ORDER: "Đơn hàng",
  ADJUSTMENT: "Điều chỉnh",
};

// ============================================================================
// Item Type Labels
// ============================================================================

export const ITEM_TYPE_LABELS: Record<WarehouseStockItemType, string> = {
  PRODUCT: "Sản phẩm",
  GIFT: "Quà tặng",
};

// ============================================================================
// API Response Types
// ============================================================================

export interface WarehouseInfo {
  _id: string;
  code: string;
  name: string;
}

export interface ProductInfo {
  _id: string;
  code: string;
  name: string;
}

export interface VariantInfo {
  _id: string;
  sku: string;
  variantValues?: Array<{ _id: string; value: string }>;
}

export interface GiftInfo {
  _id: string;
  name: string;
}

export interface EmployeeInfo {
  _id: string;
  employeeCode: string;
  fullName: string;
}

export interface WarehouseStockMovementItem {
  _id: string;
  warehouseId: WarehouseInfo;
  itemType: WarehouseStockItemType;
  productId: ProductInfo | null;
  variantId: VariantInfo | null;
  giftId: GiftInfo | null;
  type: WarehouseStockMovementType;
  quantity: number;
  referenceType: WarehouseStockReferenceType;
  referenceId: string | null;
  referenceCode: string;
  createdBy: EmployeeInfo;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseHistoryFilters {
  warehouseId?: string;
  type?: WarehouseStockMovementType;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WarehouseHistoryResponse {
  items: WarehouseStockMovementItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
