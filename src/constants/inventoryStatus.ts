/**
 * ==================================================
 * INVENTORY STATUS & TRANSACTION CONSTANTS
 * ==================================================
 *
 * Pure constants + enums dùng cho Inventory Layer.
 * KHÔNG phụ thuộc Mongo, KHÔNG có side-effect.
 *
 * ─────────────────────────────────────────────────
 *  Phân biệt 4 nhóm enum
 * ─────────────────────────────────────────────────
 *
 *  InventoryTransactionType  (enum nghiệp vụ cấp cao)
 *    ↳ INBOUND  / OUTBOUND / TRANSFER / ADJUST
 *
 *  InventoryAction           (hành vi cụ thể lên tồn kho)
 *    ↳ RESERVE / UNRESERVE / OUT / RETURN / INBOUND / ADJUST / TRANSFER_OUT / TRANSFER_IN
 *
 *  InventoryReason           (lý do khởi tạo — để audit)
 *    ↳ ORDER_CREATED / ORDER_CANCELLED / ORDER_RETURNED /
 *       SUPPLIER_RECEIVED / INVENTORY_AUDIT / WAREHOUSE_TRANSFER / …
 *
 *  InventoryState            (trạng thái hiện tại của item trong kho — cho Stock Engine sau)
 *    ↳ AVAILABLE / RESERVED / SOLD / RETURNED / ADJUSTED / TRANSFERRED
 *
 *  InventorySource           (nguồn dữ liệu tạo transaction — cho audit / batch job)
 *    ↳ MANUAL / ORDER / SUPPLIER_RECEIPT / STOCKTAKE / SYSTEM
 *
 * ─────────────────────────────────────────────────
 *  Rule layer sẽ dùng (Phase 4.2+)
 * ─────────────────────────────────────────────────
 *  - Rule: RESERVE chỉ khi sufficient AVAILABLE.
 *  - Rule: OUT chỉ khi có RESERVE trước đó (hoặc cho phép direct-OUT với lý do riêng).
 *  - Rule: RETURN cộng ngược vào AVAILABLE, ghi lý do.
 *  - Rule: TRANSFER phải tạo 1 cặp OUT (source) + IN (destination) cùng tham chiếu.
 *  - Rule: ADJUST phải kèm reason nhân viên (audit).
 * ==================================================
 */

// ==================================================
// InventoryTransactionType
// ==================================================

export enum InventoryTransactionType {
  /** Hàng vào kho (nhận từ NCC, hoàn từ đơn). */
  INBOUND = "INBOUND",
  /** Hàng ra khỏi kho (xuất bán, transfer đi). */
  OUTBOUND = "OUTBOUND",
  /** Chuyển kho nội bộ (ghi cặp OUT + IN). */
  TRANSFER = "TRANSFER",
  /** Điều chỉnh thủ công (kiểm kê, hỏng, mất). */
  ADJUST = "ADJUST",
}

// ==================================================
// InventoryAction
// ==================================================

export enum InventoryAction {
  /** Giữ chỗ khi Order tạo (chưa xuất). */
  RESERVE = "RESERVE",
  /** Trả lại chỗ giữ khi cancel trước khi OUT. */
  UNRESERVE = "UNRESERVE",
  /** Xuất kho thật (sau SHIPPING). */
  OUT = "OUT",
  /** Khách trả hàng — hoàn vào kho. */
  RETURN = "RETURN",
  /** Nhập hàng từ NCC. */
  INBOUND = "INBOUND",
  /** Điều chỉnh thủ công (kiểm kê). */
  ADJUST = "ADJUST",
  /** Xuất kho để chuyển sang kho khác (luôn đi cùng TRANSFER_IN). */
  TRANSFER_OUT = "TRANSFER_OUT",
  /** Nhập kho từ kho khác (luôn đi cùng TRANSFER_OUT). */
  TRANSFER_IN = "TRANSFER_IN",
}

// ==================================================
// InventoryReason
// ==================================================

export enum InventoryReason {
  // Order-driven
  ORDER_RESERVED = "ORDER_RESERVED",
  ORDER_UNRESERVED = "ORDER_UNRESERVED",
  ORDER_OUT = "ORDER_OUT",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  ORDER_RETURNED = "ORDER_RETURNED",

  // Supplier-driven
  SUPPLIER_RECEIVED = "SUPPLIER_RECEIVED",
  SUPPLIER_RETURNED = "SUPPLIER_RETURNED",

  // Warehouse-driven
  WAREHOUSE_TRANSFER = "WAREHOUSE_TRANSFER",
  WAREHOUSE_AUDIT = "WAREHOUSE_AUDIT",
  WAREHOUSE_DAMAGED = "WAREHOUSE_DAMAGED",
  WAREHOUSE_LOST = "WAREHOUSE_LOST",
  WAREHOUSE_FOUND = "WAREHOUSE_FOUND",

  // System-driven
  SYSTEM_ADJUST = "SYSTEM_ADJUST",
  SYSTEM_MIGRATION = "SYSTEM_MIGRATION",
}

// ==================================================
// InventoryState (trạng thái hiện tại của item trong kho)
// ==================================================
//
// Lưu ý: Phase 4.1 mới chỉ là foundation. State này sẽ được
// tính bởi Stock Engine (Phase 4.2) từ các transactions.
//
export enum InventoryState {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  SOLD = "SOLD",
  RETURNED = "RETURNED",
  ADJUSTED = "ADJUSTED",
  TRANSFERRED_OUT = "TRANSFERRED_OUT",
  TRANSFERRED_IN = "TRANSFERRED_IN",
  LOST = "LOST",
  DAMAGED = "DAMAGED",
}

// ==================================================
// InventorySource
// ==================================================

export enum InventorySource {
  /** Thao tác thủ công (nhân viên kho). */
  MANUAL = "MANUAL",
  /** Trigger từ Order flow. */
  ORDER = "ORDER",
  /** Phiếu nhập hàng từ nhà cung cấp. */
  SUPPLIER_RECEIPT = "SUPPLIER_RECEIPT",
  /** Phiếu kiểm kê định kỳ. */
  STOCKTAKE = "STOCKTAKE",
  /** Hệ thống (cron, migration, correction). */
  SYSTEM = "SYSTEM",
}

// ==================================================
// InventoryReferenceType
// ==================================================
//
// Loại tài liệu nguồn mà transaction trỏ tới.
// Mục đích: tránh đoán từ `reason`.
//
// - ORDER       — Order đơn hàng (referenceCode: OD250801001).
// - LEAD        — Lead bán hàng / chuyển đổi (referenceCode: LD250801001).
// - PURCHASE    — Phiếu nhập NCC (referenceCode: WH250801001, prefix WH xem PURCHASE).
// - TRANSFER    — Phiếu chuyển kho nội bộ (referenceCode: TR250801001).
// - ADJUSTMENT  — Phiếu kiểm kê / chỉnh sửa (referenceCode: AD250801001).
// - MANUAL      — Thao tác tay không có mã tham chiếu (vd: test / seed).
// - SUPPLIER    — Trả / nhận từ NCC (referenceCode: SP250801001).
// - SYSTEM      — Cron / migration tự sinh (referenceCode: từ engine).
//
export enum InventoryReferenceType {
  ORDER = "ORDER",
  LEAD = "LEAD",
  PURCHASE = "PURCHASE",
  TRANSFER = "TRANSFER",
  ADJUSTMENT = "ADJUSTMENT",
  SUPPLIER = "SUPPLIER",
  MANUAL = "MANUAL",
  SYSTEM = "SYSTEM",
}

/** Prefix gợi ý cho `referenceCode`. Engine code-gen (Phase 4.2+) sẽ bám theo. */
export const INVENTORY_REFERENCE_CODE_PREFIXES: Record<
  InventoryReferenceType,
  string
> = {
  [InventoryReferenceType.ORDER]: "OD",
  [InventoryReferenceType.LEAD]: "LD",
  [InventoryReferenceType.PURCHASE]: "WH",
  [InventoryReferenceType.TRANSFER]: "TR",
  [InventoryReferenceType.ADJUSTMENT]: "AD",
  [InventoryReferenceType.SUPPLIER]: "SP",
  [InventoryReferenceType.MANUAL]: "MN",
  [InventoryReferenceType.SYSTEM]: "SY",
};

// ==================================================
// Mapping helpers (data layer, KHÔNG rule logic)
// ==================================================

/** Action nào làm tăng tồn kho tại kho đích? */
export const INBOUND_ACTIONS: ReadonlySet<InventoryAction> = new Set([
  InventoryAction.UNRESERVE,
  InventoryAction.RETURN,
  InventoryAction.INBOUND,
  InventoryAction.TRANSFER_IN,
  InventoryAction.ADJUST, // ADJUST có thể + hoặc -; logic sign do changeQuantity quyết định
]);

/** Action nào làm giảm tồn kho tại kho nguồn? */
export const OUTBOUND_ACTIONS: ReadonlySet<InventoryAction> = new Set([
  InventoryAction.RESERVE,
  InventoryAction.OUT,
  InventoryAction.TRANSFER_OUT,
  InventoryAction.ADJUST,
]);

/** Action nào không thay đổi số available (chỉ dịch chuyển trạng thái)? */
export const NEUTRAL_ACTIONS: ReadonlySet<InventoryAction> = new Set([
  // RESERVE thực ra giảm available; nhưng không trừ stock tổng.
  // Marker này dành cho audit, không dùng cho sign.
]);

/** Action nào bắt buộc có `orderId` (gắn với Order)? */
export const ORDER_REQUIRED_ACTIONS: ReadonlySet<InventoryAction> = new Set([
  InventoryAction.RESERVE,
  InventoryAction.UNRESERVE,
  InventoryAction.OUT,
  InventoryAction.RETURN,
]);

/** Transaction type ↔ actions mapping. */
export const TRANSACTION_TYPE_ACTIONS: ReadonlyMap<
  InventoryTransactionType,
  ReadonlyArray<InventoryAction>
> = new Map([
  [InventoryTransactionType.INBOUND, [InventoryAction.INBOUND]],
  [
    InventoryTransactionType.OUTBOUND,
    [InventoryAction.RESERVE, InventoryAction.UNRESERVE, InventoryAction.OUT],
  ],
  [
    InventoryTransactionType.TRANSFER,
    [InventoryAction.TRANSFER_OUT, InventoryAction.TRANSFER_IN],
  ],
  [
    InventoryTransactionType.ADJUST,
    [InventoryAction.ADJUST, InventoryAction.RETURN],
  ],
]);
