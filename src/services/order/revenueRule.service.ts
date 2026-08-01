/**
 * ==================================================
 * ORDER REVENUE RULE SERVICE
 * ==================================================
 *
 * PURE RULE LAYER.
 *
 * KHÔNG import Mongoose.
 * KHÔNG import Model.
 * KHÔNG query DB.
 * KHÔNG ghi DB.
 * KHÔNG transaction.
 *
 * Mọi hàm nhận input là các DTO đã được serialize (plain object, không phải
 * Mongoose Document). Engine layer (Phase 4) sẽ fetch data từ DB, sau đó
 * gọi rule layer này để quyết định.
 *
 * ─────────────────────────────────────────────────
 *  Decision model
 * ─────────────────────────────────────────────────
 *
 *  Mỗi Order, khi engine eval, được phân loại vào 1 trong 4 nhóm:
 *
 *    A. EXEMPTED        — GIFT / EXCHANGE / REPLACEMENT → không tham gia.
 *    B. UNLOCKED        — Status đã cancel / reject / fail → không tính.
 *    C. ELIGIBLE        — Được tính revenue (là owner trong family).
 *    D. LOCKED          — Có đơn trước active cùng family → chờ.
 *
 *  Ngoài ra còn case:
 *
 *    E. PREPAID_TAKEOVER — Order sau đã PREPAID, chiếm slot của order trước.
 *                         Order trước → LOCKED với reason=PREPAID_PRIORITY.
 *                         Order sau   → ELIGIBLE.
 *
 * ─────────────────────────────────────────────────
 *  Input DTO shape
 * ─────────────────────────────────────────────────
 *
 *  OrderRuleInput = {
 *    _id: string,
 *    customerId: string,
 *    productId: string | null,
 *    comboId: string | null,
 *    status: OrderStatus,
 *    isPrepaid: boolean,
 *    orderType: OrderType,
 *    createdAt: Date,        // để sắp theo thời gian
 *  }
 *
 *  Engine sẽ sort list theo createdAt ASC rồi mới đưa vào.
 * ==================================================
 */

import {
  OrderStatus,
  OrderType,
  NON_REVENUE_ORDER_TYPES,
} from "@/constants/orderStatus";
import {
  RevenueOwnerType,
  RevenueLockReason,
  RevenueUnlockReason,
  RevenuePriority,
  RevenueState,
  isRevenueActiveStatus,
  isRevenueUnlockStatus,
} from "@/constants/revenueRule";

// ==================================================
// DTOs
// ==================================================

/** Minimal shape mà rule layer cần từ một Order. */
export interface OrderRuleInput {
  _id: string;
  customerId: string;
  productId: string | null;
  comboId: string | null;
  status: OrderStatus;
  isPrepaid: boolean;
  orderType: OrderType;
  createdAt: Date | null;
}

/** Quyết định cuối cùng về revenue của 1 Order. */
export interface RevenueDecision {
  /** Trạng thái phân loại. */
  state: RevenueState;
  /** Lý do chi tiết (cho UI / debug). */
  reason: RevenueLockReason;
  /** Độ ưu tiên của Order này trong family. */
  priority: RevenuePriority;
  /**
   * ID Order đang sở hữu slot (chính nó nếu ELIGIBLE).
   * Null nếu EXEMPTED / UNLOCKED.
   */
  ownerOrderId: string | null;
  /**
   * Lý do unlock (chỉ populate khi state chuyển LOCKED → ELIGIBLE do unlock).
   * Null trong các trường hợp khác.
   */
  unlockReason: RevenueUnlockReason | null;
}

// ==================================================
// Helpers
// ==================================================

function sameString(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b;
}

function isNonRevenueType(t: OrderType): boolean {
  return NON_REVENUE_ORDER_TYPES.has(t);
}

function getPriority(input: OrderRuleInput): RevenuePriority {
  if (isNonRevenueType(input.orderType)) return RevenuePriority.NONE;
  if (input.status === OrderStatus.COMPLETED) return RevenuePriority.COMPLETED;
  if (input.isPrepaid) return RevenuePriority.PREPAID;
  return RevenuePriority.NORMAL;
}

// ==================================================
// Public API — pure rule functions
// ==================================================

/**
 * Phân loại "ai đang là owner" giữa 2 Order.
 *
 * Trả về:
 *  - SAME_PRODUCT_FAMILY       → cùng productId hoặc cùng comboId.
 *  - DIFFERENT_PRODUCT_FAMILY  → khác productId/comboId (không tranh slot).
 *  - DIFFERENT_CUSTOMER        → khác customerId.
 *  - NON_REVENUE_ORDER         → 1 trong 2 là GIFT/EXCHANGE/REPLACEMENT
 *                                → không tranh slot.
 */
export function getRevenueOwner(
  a: OrderRuleInput,
  b: OrderRuleInput
): RevenueOwnerType {
  if (isNonRevenueType(a.orderType) || isNonRevenueType(b.orderType)) {
    return RevenueOwnerType.NON_REVENUE_ORDER;
  }
  if (a.customerId !== b.customerId) {
    return RevenueOwnerType.DIFFERENT_CUSTOMER;
  }
  if (sameString(a.productId, b.productId)) {
    return RevenueOwnerType.SAME_PRODUCT_FAMILY;
  }
  if (sameString(a.comboId, b.comboId)) {
    return RevenueOwnerType.SAME_PRODUCT_FAMILY;
  }
  return RevenueOwnerType.DIFFERENT_PRODUCT_FAMILY;
}

/**
 * Order này có thể bị LOCK revenue bởi 1 đơn khác cùng family không?
 *
 * Rule:
 *  - Nếu Order là non-revenue (GIFT/EXCHANGE/REPLACEMENT) → false (không tranh).
 *  - Nếu status là unlock (CANCELLED/REJECTED/FAILED) → false (đã rời cuộc).
 *  - Nếu đơn khác là non-revenue → false.
 *  - Nếu khác customer / khác family → false.
 *  - Nếu đơn khác cùng family + đang active (PENDING/CONFIRMED/PREPAID/SHIPPING/COMPLETED)
 *    → true (Order này có thể bị lock).
 */
export function canLockRevenue(
  subject: OrderRuleInput,
  other: OrderRuleInput
): boolean {
  if (isNonRevenueType(subject.orderType)) return false;
  if (isNonRevenueType(other.orderType)) return false;
  if (isRevenueUnlockStatus(subject.status)) return false;
  if (!isRevenueActiveStatus(other.status)) return false;

  const ownerType = getRevenueOwner(subject, other);
  return ownerType === RevenueOwnerType.SAME_PRODUCT_FAMILY;
}

/**
 * Order này có thể được UNLOCK không?
 *
 * Rule:
 *  - Order hiện đang LOCKED, hoặc có thể bị lock.
 *  - Có 1 đơn khác CÙNG family mà TRƯỚC đây đang active
 *    nhưng giờ đã chuyển sang unlock (CANCELLED/REJECTED/FAILED).
 *
 * Trả về unlockReason tương ứng, hoặc null nếu không có.
 */
export function canUnlockRevenue(
  subject: OrderRuleInput,
  previouslyActiveSibling: OrderRuleInput
): RevenueUnlockReason | null {
  if (isNonRevenueType(subject.orderType)) return null;
  if (isNonRevenueType(previouslyActiveSibling.orderType)) return null;

  // Chỉ unlock khi sibling thực sự đã chuyển sang unlock.
  if (!isRevenueUnlockStatus(previouslyActiveSibling.status)) return null;

  const ownerType = getRevenueOwner(subject, previouslyActiveSibling);
  if (ownerType !== RevenueOwnerType.SAME_PRODUCT_FAMILY) return null;

  return RevenueUnlockReason.PREVIOUS_ORDER_CANCELLED;
}

/**
 * Có nên TRANSFER revenue slot từ `from` sang `to` không?
 *
 * Case duy nhất: `to` PREPAID trong khi `from` vẫn active.
 *   → `from` nhường slot, `to` giành slot.
 *
 * Rule:
 *  - Cùng family.
 *  - Cùng customer.
 *  - `to` PREPAID.
 *  - `from` đang active (chưa cancel, chưa complete).
 */
export function shouldTransferRevenue(
  from: OrderRuleInput,
  to: OrderRuleInput
): boolean {
  if (!to.isPrepaid) return false;
  if (!isRevenueActiveStatus(to.status)) return false;
  if (!isRevenueActiveStatus(from.status)) return false;
  if (isNonRevenueType(from.orderType) || isNonRevenueType(to.orderType)) {
    return false;
  }
  return getRevenueOwner(from, to) === RevenueOwnerType.SAME_PRODUCT_FAMILY;
}

/**
 * Lấy priority của Order.
 *
 * COMPLETED > PREPAID > NORMAL > NONE.
 */
export function getRevenuePriority(input: OrderRuleInput): RevenuePriority {
  return getPriority(input);
}

/**
 * Phân loại state của Order (nhanh, dựa trên status + orderType).
 * Dùng khi chưa cần sibling list (vd: snapshot ban đầu).
 */
export function getRevenueState(input: OrderRuleInput): RevenueState {
  if (isNonRevenueType(input.orderType)) return RevenueState.EXEMPTED;
  if (isRevenueUnlockStatus(input.status)) return RevenueState.UNLOCKED;
  if (isRevenueActiveStatus(input.status)) return RevenueState.ELIGIBLE;
  return RevenueState.ELIGIBLE; // default
}

/**
 * So sánh 2 Order cùng family, Order nào có priority cao hơn?
 *
 * Trả về:
 *  -  1: a cao hơn b
 *  - -1: b cao hơn a
 *  -  0: ngang nhau
 *
 * Tie-break: createdAt ASC (đơn tạo trước ưu tiên hơn nếu priority bằng nhau).
 */
export function compareRevenuePriority(
  a: OrderRuleInput,
  b: OrderRuleInput
): number {
  const pa = getPriority(a);
  const pb = getPriority(b);

  const orderRank: Record<RevenuePriority, number> = {
    [RevenuePriority.NONE]: 0,
    [RevenuePriority.NORMAL]: 1,
    [RevenuePriority.PREPAID]: 2,
    [RevenuePriority.COMPLETED]: 3,
  };

  const ra = orderRank[pa];
  const rb = orderRank[pb];
  if (ra !== rb) return ra > rb ? 1 : -1;

  // Tie-break: createdAt ASC
  const at = a.createdAt?.getTime() ?? 0;
  const bt = b.createdAt?.getTime() ?? 0;
  if (at !== bt) return at < bt ? 1 : -1;

  // Cuối cùng: id để stable sort.
  return a._id < b._id ? 1 : a._id > b._id ? -1 : 0;
}

// ==================================================
// Core: decideForOrder
// ==================================================
//
// Hàm tổng hợp — kết hợp tất cả rule trên để ra 1 decision duy nhất
// cho 1 Order, dựa trên danh sách sibling (cùng customer) đã sort
// createdAt ASC.
//
// Algorithm:
//   1. Nếu subject là non-revenue → EXEMPTED, reason=NON_REVENUE_ORDER.
//   2. Nếu subject status đã unlock → UNLOCKED, reason=ORDER_CANCELLED.
//   3. Nếu có sibling EARLIER (createdAt < subject) cùng family +
//      đang active VÀ cùng priority hoặc cao hơn subject:
//        - Nếu subject PREPAID → subject chiếm slot, sibling bị lock
//          (PREPAID_PRIORITY). Nhưng sibling cũng đang PREPAID/COMPLETED
//          thì không transfer.
//        - Ngược lại subject → LOCKED, reason=WAITING_PREVIOUS_ORDER.
//   4. Mặc định → ELIGIBLE, reason=NONE.
//

/**
 * Quyết định revenue cho 1 Order dựa trên danh sách sibling đã sort
 * createdAt ASC.
 *
 * @param subject Order đang cần quyết định
 * @param siblings Mọi Order khác cùng customer (đã sort createdAt ASC)
 */
export function decideForOrder(
  subject: OrderRuleInput,
  siblings: OrderRuleInput[]
): RevenueDecision {
  // 1. Non-revenue → EXEMPTED
  if (isNonRevenueType(subject.orderType)) {
    return {
      state: RevenueState.EXEMPTED,
      reason: RevenueLockReason.NON_REVENUE_ORDER,
      priority: RevenuePriority.NONE,
      ownerOrderId: null,
      unlockReason: null,
    };
  }

  // 2. Status đã unlock → UNLOCKED
  if (isRevenueUnlockStatus(subject.status)) {
    return {
      state: RevenueState.UNLOCKED,
      reason: RevenueLockReason.ORDER_CANCELLED,
      priority: getPriority(subject),
      ownerOrderId: null,
      unlockReason: RevenueUnlockReason.ORDER_STATUS_UNLOCKED,
    };
  }

  // 3. Tìm sibling EARLIER (createdAt <= subject) cùng family, active
  const earlierActive = siblings
    .filter((s) => s._id !== subject._id)
    .filter((s) => {
      const st = s.createdAt?.getTime() ?? 0;
      const tt = subject.createdAt?.getTime() ?? 0;
      return st <= tt;
    })
    .filter((s) => isRevenueActiveStatus(s.status))
    .filter((s) =>
      getRevenueOwner(subject, s) === RevenueOwnerType.SAME_PRODUCT_FAMILY
    );

  if (earlierActive.length === 0) {
    // 4a. Không có đơn trước → ELIGIBLE
    return {
      state: RevenueState.ELIGIBLE,
      reason: RevenueLockReason.NONE,
      priority: getPriority(subject),
      ownerOrderId: subject._id,
      unlockReason: null,
    };
  }

  // 4b. Có đơn trước. Subject PREPAID và đơn trước KHÔNG phải COMPLETED → takeover
  const earlierTop = earlierActive.reduce((best, cur) =>
    compareRevenuePriority(cur, best) > 0 ? cur : best
  );

  if (
    subject.isPrepaid &&
    earlierTop.status !== OrderStatus.COMPLETED &&
    earlierTop.isPrepaid === false
  ) {
    return {
      state: RevenueState.ELIGIBLE,
      reason: RevenueLockReason.PREPAID_PRIORITY,
      priority: RevenuePriority.PREPAID,
      ownerOrderId: subject._id,
      unlockReason: RevenueUnlockReason.NEXT_ORDER_PREPAID,
    };
  }

  // 4c. Đơn trước cùng priority hoặc cao hơn → subject LOCKED
  return {
    state: RevenueState.LOCKED,
    reason: RevenueLockReason.WAITING_PREVIOUS_ORDER,
    priority: getPriority(subject),
    ownerOrderId: earlierTop._id,
    unlockReason: null,
  };
}

// ==================================================
// Bulk: decideForAll
// ==================================================
//
// Tính decision cho TẤT CẢ Order trong 1 customer.
// Trả về Map<orderId, RevenueDecision>.
//
// Engine layer sẽ iterate map này và persist vào DB.
//
export function decideForAll(
  orders: OrderRuleInput[]
): Map<string, RevenueDecision> {
  const sorted = [...orders].sort((a, b) => {
    const at = a.createdAt?.getTime() ?? 0;
    const bt = b.createdAt?.getTime() ?? 0;
    return at - bt;
  });

  const result = new Map<string, RevenueDecision>();

  for (const subject of sorted) {
    result.set(subject._id, decideForOrder(subject, sorted));
  }

  return result;
}
