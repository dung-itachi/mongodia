/**
 * ==================================================
 * Inventory Mapper
 * ==================================================
 *
 * Convert IInventoryHistory (Mongoose Document) → InventoryHistoryResponse (DTO).
 *
 * KHÔNG truy cập DB.
 * KHÔNG rule logic.
 * ==================================================
 */

import type { IInventoryHistory } from "@/models/InventoryHistory";

import {
  InventoryTransactionType,
  InventoryAction,
  InventoryReason,
  InventorySource,
  InventoryReferenceType,
} from "@/constants/inventoryStatus";

// ==================================================
// Labels
// ==================================================

export const INVENTORY_TRANSACTION_TYPE_LABELS: Record<
  InventoryTransactionType,
  string
> = {
  [InventoryTransactionType.INBOUND]: "Nhập kho",
  [InventoryTransactionType.OUTBOUND]: "Xuất kho",
  [InventoryTransactionType.TRANSFER]: "Chuyển kho",
  [InventoryTransactionType.ADJUST]: "Điều chỉnh",
};

export const INVENTORY_ACTION_LABELS: Record<InventoryAction, string> = {
  [InventoryAction.RESERVE]: "Giữ chỗ",
  [InventoryAction.UNRESERVE]: "Bỏ giữ chỗ",
  [InventoryAction.OUT]: "Xuất hàng",
  [InventoryAction.RETURN]: "Hoàn hàng",
  [InventoryAction.INBOUND]: "Nhập hàng",
  [InventoryAction.ADJUST]: "Điều chỉnh tồn",
  [InventoryAction.TRANSFER_OUT]: "Chuyển đi",
  [InventoryAction.TRANSFER_IN]: "Chuyển đến",
};

export const INVENTORY_REASON_LABELS: Record<InventoryReason, string> = {
  [InventoryReason.ORDER_RESERVED]: "Giữ chỗ cho đơn",
  [InventoryReason.ORDER_UNRESERVED]: "Bỏ giữ chỗ cho đơn",
  [InventoryReason.ORDER_OUT]: "Xuất hàng cho đơn",
  [InventoryReason.ORDER_CANCELLED]: "Đơn bị hủy",
  [InventoryReason.ORDER_RETURNED]: "Khách trả hàng",
  [InventoryReason.SUPPLIER_RECEIVED]: "Nhận từ nhà cung cấp",
  [InventoryReason.SUPPLIER_RETURNED]: "Trả lại nhà cung cấp",
  [InventoryReason.WAREHOUSE_TRANSFER]: "Chuyển kho nội bộ",
  [InventoryReason.WAREHOUSE_AUDIT]: "Kiểm kê định kỳ",
  [InventoryReason.WAREHOUSE_DAMAGED]: "Hàng hỏng",
  [InventoryReason.WAREHOUSE_LOST]: "Hàng mất",
  [InventoryReason.WAREHOUSE_FOUND]: "Hàng thừa khi kiểm kê",
  [InventoryReason.SYSTEM_ADJUST]: "Hệ thống điều chỉnh",
  [InventoryReason.SYSTEM_MIGRATION]: "Di trú dữ liệu",
};

export const INVENTORY_SOURCE_LABELS: Record<InventorySource, string> = {
  [InventorySource.MANUAL]: "Thủ công",
  [InventorySource.ORDER]: "Từ đơn hàng",
  [InventorySource.SUPPLIER_RECEIPT]: "Phiếu nhập NCC",
  [InventorySource.STOCKTAKE]: "Phiếu kiểm kê",
  [InventorySource.SYSTEM]: "Hệ thống",
};

export const INVENTORY_REFERENCE_TYPE_LABELS: Record<
  InventoryReferenceType,
  string
> = {
  [InventoryReferenceType.ORDER]: "Đơn hàng",
  [InventoryReferenceType.LEAD]: "Lead",
  [InventoryReferenceType.PURCHASE]: "Phiếu nhập kho (NCC)",
  [InventoryReferenceType.TRANSFER]: "Chuyển kho",
  [InventoryReferenceType.ADJUSTMENT]: "Điều chỉnh tồn",
  [InventoryReferenceType.SUPPLIER]: "Nhà cung cấp",
  [InventoryReferenceType.MANUAL]: "Thao tác tay",
  [InventoryReferenceType.SYSTEM]: "Hệ thống",
};

// ==================================================
// Response DTO
// ==================================================

export interface InventoryHistoryResponse {
  _id: string;
  warehouseId: string;
  productVariantId?: string;
  comboId?: string;
  orderId?: string;
  employeeId: string;
  transactionType: InventoryTransactionType;
  transactionTypeLabel: string;
  action: InventoryAction;
  actionLabel: string;
  reason: InventoryReason;
  reasonLabel: string;
  source: InventorySource;
  sourceLabel: string;
  referenceType?: InventoryReferenceType;
  referenceTypeLabel?: string;
  referenceCode?: string;
  beforeQuantity: number;
  changeQuantity: number;
  afterQuantity: number;
  note?: string;
  createdAt: string;
}

// ==================================================
// Mappers
// ==================================================

/** Helper ép kiểu an toàn từ string sang enum (phòng khi DB lưu string cũ). */
function asTransactionType(v: string): InventoryTransactionType {
  return (Object.values(InventoryTransactionType) as string[]).includes(v)
    ? (v as InventoryTransactionType)
    : InventoryTransactionType.ADJUST;
}

function asAction(v: string): InventoryAction {
  return (Object.values(InventoryAction) as string[]).includes(v)
    ? (v as InventoryAction)
    : InventoryAction.ADJUST;
}

function asReason(v: string): InventoryReason {
  return (Object.values(InventoryReason) as string[]).includes(v)
    ? (v as InventoryReason)
    : InventoryReason.SYSTEM_ADJUST;
}

function asSource(v: string): InventorySource {
  return (Object.values(InventorySource) as string[]).includes(v)
    ? (v as InventorySource)
    : InventorySource.SYSTEM;
}

function asReferenceType(
  v: string | null | undefined
): InventoryReferenceType | undefined {
  if (!v) return undefined;
  return (Object.values(InventoryReferenceType) as string[]).includes(v)
    ? (v as InventoryReferenceType)
    : undefined;
}

/** Map 1 row → DTO. */
export function mapInventoryHistory(
  history: IInventoryHistory
): InventoryHistoryResponse {
  const transactionType = asTransactionType(history.transactionType);
  const action = asAction(history.action);
  const reason = asReason(history.reason);
  const source = asSource(history.source);
  const referenceType = asReferenceType(history.referenceType);

  return {
    _id: history._id.toString(),
    warehouseId: history.warehouseId.toString(),
    productVariantId: history.productVariantId?.toString(),
    comboId: history.comboId?.toString(),
    orderId: history.orderId?.toString(),
    employeeId: history.employeeId.toString(),
    transactionType,
    transactionTypeLabel: INVENTORY_TRANSACTION_TYPE_LABELS[transactionType],
    action,
    actionLabel: INVENTORY_ACTION_LABELS[action],
    reason,
    reasonLabel: INVENTORY_REASON_LABELS[reason],
    source,
    sourceLabel: INVENTORY_SOURCE_LABELS[source],
    referenceType,
    referenceTypeLabel: referenceType
      ? INVENTORY_REFERENCE_TYPE_LABELS[referenceType]
      : undefined,
    referenceCode: history.referenceCode ?? undefined,
    beforeQuantity: history.beforeQuantity,
    changeQuantity: history.changeQuantity,
    afterQuantity: history.afterQuantity,
    note: history.note,
    createdAt: history.createdAt.toISOString(),
  };
}

/** Map list rows → list DTO. */
export function mapInventoryHistoryList(
  histories: IInventoryHistory[]
): InventoryHistoryResponse[] {
  return histories.map(mapInventoryHistory);
}
