/**
 * ==================================================
 * WAREHOUSE TOPOLOGY RESOLVER
 * ==================================================
 *
 * Định danh KHO1 / KHO2 theo `Warehouse.code` (UPPERCASE).
 *
 *   KHO1 = "KHO1"  (Kho Trung Quốc / kho trung gian)
 *   KHO2 = "KHO2"  (Kho Mông Cổ / kho chính bán hàng)
 *
 * Topology hợp lệ DUY NHẤT:
 *
 *   NHÀ SẢN XUẤT ─── IMPORT ──→ KHO1
 *                                    │
 *                                    ├── TRANSFER ──→ KHO2 ─── ORDER_OUT ──→ KHÁCH
 *                                    │                                  │
 *                                    │                                  └── (RETURN) ──┐
 *                                    │                                                │
 *                                    └────────────────  (re-stock)  ←────────────────┘
 *
 * KHÔNG tồn tại:
 *   - KHO2 → KHO1
 *   - KHO1 → KHÁCH (ORDER_OUT/RETURN từ KHO1)
 *   - IMPORT trực tiếp vào KHO2 từ workflow nhập NCC
 *
 * Resolve dùng lookup theo `code` (UPPERCASE) — KHÔNG hard-code ObjectId.
 * Có cache in-memory nhỏ theo process để tránh query DB mỗi lần.
 */

import mongoose from "mongoose";
import Warehouse from "@/models/Warehouse";

// ─────────────────────────────────────────────────────────────────────────
// Warehouse codes (canonical, UPPERCASE)
// ─────────────────────────────────────────────────────────────────────────

export const WAREHOUSE_CODES = {
  KHO1: "KHO1",
  KHO2: "KHO2",
} as const;

export type WarehouseRole = "INTERMEDIARY" | "MAIN";

const ROLE_BY_CODE: Record<string, WarehouseRole> = {
  [WAREHOUSE_CODES.KHO1]: "INTERMEDIARY",
  [WAREHOUSE_CODES.KHO2]: "MAIN",
};

export interface WarehouseTopology {
  kho1: mongoose.Types.ObjectId;
  kho2: mongoose.Types.ObjectId;
}

// ─────────────────────────────────────────────────────────────────────────
// Cache (in-memory, short-lived)
// ─────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { ids: WarehouseTopology; expires: number }>();

function cacheKey() {
  return "default";
}

async function loadFromDb(): Promise<WarehouseTopology> {
  const rows = await Warehouse.find({
    code: { $in: [WAREHOUSE_CODES.KHO1, WAREHOUSE_CODES.KHO2] },
    isActive: true,
  })
    .select("_id code")
    .lean();

  const kho1 = rows.find((r) => r.code === WAREHOUSE_CODES.KHO1);
  const kho2 = rows.find((r) => r.code === WAREHOUSE_CODES.KHO2);

  if (!kho1) {
    throw new Error(
      `Không tìm thấy kho với code "${WAREHOUSE_CODES.KHO1}". Cần seed Warehouse trước.`
    );
  }
  if (!kho2) {
    throw new Error(
      `Không tìm thấy kho với code "${WAREHOUSE_CODES.KHO2}". Cần seed Warehouse trước.`
    );
  }
  return { kho1: kho1._id, kho2: kho2._id };
}

/**
 * Returns ObjectIds của KHO1 và KHO2. Cached trong process (30s).
 */
export async function getWarehouseTopology(
  session?: mongoose.ClientSession
): Promise<WarehouseTopology> {
  const now = Date.now();
  const key = cacheKey();
  const hit = cache.get(key);
  if (hit && hit.expires > now) {
    return hit.ids;
  }
  const ids = await loadFromDb().then(async (topology) => {
    // If caller passes a session, do not cache (transaction isolation).
    if (session) return topology;
    return topology;
  });
  // Always populate cache (cheap re-reads)
  if (!session) {
    cache.set(key, { ids, expires: now + CACHE_TTL_MS });
  }
  return ids;
}

/** Reset cache — dùng cho tests hoặc sau khi seed warehouse mới. */
export function resetWarehouseTopologyCache(): void {
  cache.clear();
}

/** Resolve role (INTERMEDIARY | MAIN | null) cho một warehouseId. */
export async function getWarehouseRole(
  warehouseId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<WarehouseRole | null> {
  const oid =
    typeof warehouseId === "string"
      ? new mongoose.Types.ObjectId(warehouseId)
      : warehouseId;
  const w = await Warehouse.findOne({ _id: oid, isActive: true })
    .select("code")
    .session(session ?? null)
    .lean();
  if (!w) return null;
  return ROLE_BY_CODE[w.code] ?? null;
}

/**
 * KHO2 = MAIN (kho chính bán hàng) — single source of truth cho tồn bán.
 * Trả về ObjectId của KHO2 hoặc throw nếu chưa seed.
 */
export async function getKho2Id(
  session?: mongoose.ClientSession
): Promise<mongoose.Types.ObjectId> {
  const { kho2 } = await getWarehouseTopology(session);
  return kho2;
}

/**
 * KHO1 = INTERMEDIARY (kho trung gian).
 */
export async function getKho1Id(
  session?: mongoose.ClientSession
): Promise<mongoose.Types.ObjectId> {
  const { kho1 } = await getWarehouseTopology(session);
  return kho1;
}

/** So sánh warehouseId với KHO2 (O(1) — dùng cho Order validation). */
export async function isKho2(
  warehouseId: string | mongoose.Types.ObjectId | null | undefined,
  session?: mongoose.ClientSession
): Promise<boolean> {
  if (!warehouseId) return false;
  const kho2Id = await getKho2Id(session);
  return toComparable(warehouseId) === toComparable(kho2Id);
}

/** So sánh warehouseId với KHO1 (O(1) — dùng cho transfer source). */
export async function isKho1(
  warehouseId: string | mongoose.Types.ObjectId | null | undefined,
  session?: mongoose.ClientSession
): Promise<boolean> {
  if (!warehouseId) return false;
  const kho1Id = await getKho1Id(session);
  return toComparable(warehouseId) === toComparable(kho1Id);
}

function toComparable(id: string | mongoose.Types.ObjectId): string {
  return typeof id === "string" ? id : id.toString();
}

/** So sánh 2 warehouseId bằng nhau (string compare). */
export function sameWarehouse(
  a: string | mongoose.Types.ObjectId | null | undefined,
  b: string | mongoose.Types.ObjectId | null | undefined
): boolean {
  if (!a || !b) return false;
  return toComparable(a) === toComparable(b);
}

// ─────────────────────────────────────────────────────────────────────────
// Topology validators
// ─────────────────────────────────────────────────────────────────────────

export type TopologyViolationCode =
  | "ORDER_KHO1_NOT_ALLOWED"
  | "TRANSFER_DIRECTION_INVALID"
  | "TRANSFER_SOURCE_DESTINATION_SAME"
  | "IMPORT_INTO_KHO2_NOT_ALLOWED"
  | "WAREHOUSE_NOT_FOUND";

/**
 * Validate Order.warehouseId: chỉ được dùng KHO2.
 *
 * Được gọi trong reserve/ship/return flow + Order POST/PATCH.
 * Throw Error với `.code` để API layer map sang HTTP 400.
 */
export async function validateOrderWarehouse(
  warehouseId: string | mongoose.Types.ObjectId | null | undefined,
  session?: mongoose.ClientSession
): Promise<void> {
  if (!warehouseId) return; // schema đã enforce required; để null nếu upstream cho phép
  const role = await getWarehouseRole(warehouseId, session);
  if (role === null) {
    throw topologyError(
      `Kho ${warehouseId} không tồn tại hoặc đã ngừng hoạt động.`,
      "WAREHOUSE_NOT_FOUND"
    );
  }
  if (role !== "MAIN") {
    throw topologyError(
      "Đơn hàng chỉ được gán cho KHO2 (kho chính bán hàng). " +
        "KHO1 (kho trung gian) không tham gia order reserve/ship/return.",
      "ORDER_KHO1_NOT_ALLOWED"
    );
  }
}

/**
 * Validate WarehouseTransfer direction:
 *   source = KHO1, destination = KHO2.
 *
 * Reject:
 *   - source === destination (KHO1→KHO1 hoặc KHO2→KHO2)
 *   - source = KHO2 (KHO2 → KHO1)
 *   - destination = KHO1 (KHO1 → KHO1)
 *   - any warehouse not seeded
 */
export async function validateTransferDirection(
  sourceWarehouseId: string | mongoose.Types.ObjectId,
  destinationWarehouseId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<void> {
  if (sameWarehouse(sourceWarehouseId, destinationWarehouseId)) {
    throw topologyError(
      "Kho nguồn và kho đích phải khác nhau.",
      "TRANSFER_SOURCE_DESTINATION_SAME"
    );
  }
  const sourceRole = await getWarehouseRole(sourceWarehouseId, session);
  if (sourceRole === null) {
    throw topologyError(
      `Kho nguồn ${sourceWarehouseId} không tồn tại hoặc đã ngừng hoạt động.`,
      "WAREHOUSE_NOT_FOUND"
    );
  }
  if (sourceRole !== "INTERMEDIARY") {
    throw topologyError(
      "TRANSFER chỉ hợp lệ theo chiều KHO1 → KHO2. " +
        `Kho nguồn phải là KHO1 (kho trung gian), không phải KHO2.`,
      "TRANSFER_DIRECTION_INVALID"
    );
  }
  const destRole = await getWarehouseRole(destinationWarehouseId, session);
  if (destRole === null) {
    throw topologyError(
      `Kho đích ${destinationWarehouseId} không tồn tại hoặc đã ngừng hoạt động.`,
      "WAREHOUSE_NOT_FOUND"
    );
  }
  if (destRole !== "MAIN") {
    throw topologyError(
      "TRANSFER chỉ hợp lệ theo chiều KHO1 → KHO2. " +
        `Kho đích phải là KHO2 (kho chính bán hàng), không phải KHO1.`,
      "TRANSFER_DIRECTION_INVALID"
    );
  }
}

/**
 * Validate IMPORT target: phải là KHO1.
 * Reject IMPORT vào KHO2 (vì sẽ bypass transfer workflow).
 */
export async function validateImportTarget(
  targetWarehouseId: string | mongoose.Types.ObjectId,
  session?: mongoose.ClientSession
): Promise<void> {
  const role = await getWarehouseRole(targetWarehouseId, session);
  if (role === null) {
    throw topologyError(
      `Kho ${targetWarehouseId} không tồn tại hoặc đã ngừng hoạt động.`,
      "WAREHOUSE_NOT_FOUND"
    );
  }
  if (role !== "INTERMEDIARY") {
    throw topologyError(
      "IMPORT từ nhà sản xuất chỉ được vào KHO1 (kho trung gian). " +
        "Muốn KHO2 tăng tồn, tạo WarehouseTransfer KHO1 → KHO2.",
      "IMPORT_INTO_KHO2_NOT_ALLOWED"
    );
  }
}

export function topologyError(message: string, code: TopologyViolationCode): Error {
  const err = new Error(message) as Error & { code?: TopologyViolationCode; status?: number };
  err.code = code;
  err.status = 400;
  return err;
}
