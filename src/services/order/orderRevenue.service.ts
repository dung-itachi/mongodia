/**
 * ==================================================
 * ORDER REVENUE LOCK ENGINE
 * ==================================================
 *
 * Business-rule layer for Order revenue eligibility.
 * KHÔNG phải API, KHÔNG phải Dashboard, KHÔNG tính KPI/Commission.
 *
 * Luật chính:
 *
 *   1. Một Customer có nhiều Order.
 *      Nếu trùng Product HOẶC trùng Combo với đơn trước (cùng khách):
 *        - Đơn đầu tiên (active)        → revenueEligible = true
 *        - Các đơn sau (đang chờ)       → revenueEligible = false
 *                                         marketingRevenueFinal = 0
 *                                         saleRevenueFinal = 0
 *                                         reason = WAITING_PREVIOUS_ORDER
 *
 *   2. Unlock:
 *      Nếu đơn trước chuyển sang CANCELLED / REJECTED / FAILED
 *      thì đơn sau đang chờ tự động được tính doanh thu:
 *        - revenueEligible = true
 *        - *_Final = *_Raw
 *        - reason = NONE
 *
 *   3. Prepaid Priority:
 *      Nếu đơn sau đã `isPrepaid = true`, đơn sau được ưu tiên slot
 *      revenue của đơn trước (kể cả khi đơn trước đang active):
 *        - Đơn trước → revenueEligible = false, reason = PREPAID_PRIORITY
 *        - Đơn sau   → revenueEligible = true,  reason = NONE
 *
 *   4. Khác Product / khác Combo:
 *      Không khóa, cả hai đơn đều được tính doanh thu bình thường.
 *
 *   5. Đơn ở trạng thái unlock (CANCELLED / REJECTED / FAILED):
 *      Không tính doanh thu, reason = ORDER_CANCELLED.
 *
 * Flow sử dụng:
 *   - createOrder()  → evaluateAndLock({ order, customerOrders })
 *   - updateOrder()  → recalculateForOrder(orderId)
 *   - cancelOrder()  → unlockNextOrders(orderId)
 *   - refundOrder()  → unlockNextOrders(orderId)
 *   - cron / trigger → recalculateCustomer(customerId)
 * ==================================================
 */

import Order, {
  IOrder,
  REVENUE_LOCKING_STATUSES,
} from "@/models/Order";
import {
  OrderStatus,
  OrderType,
  NON_REVENUE_ORDER_TYPES,
  REVENUE_UNLOCK_STATUSES,
  RevenueLockReason,
} from "@/constants/orderStatus";

// ==================================================
// Public types
// ==================================================

/** Snapshot used by the lock engine to reason about an order without re-querying. */
export interface OrderLockInput {
  /** Mongoose document hoặc plain object đủ field. */
  order: Pick<
    IOrder,
    | "_id"
    | "orderCode"
    | "customerId"
    | "productId"
    | "comboId"
    | "status"
    | "isPrepaid"
    | "orderType"
    | "marketingRevenueRaw"
    | "saleRevenueRaw"
    | "createdAt"
  > & { _id: unknown };
}

/**
 * Result returned by the engine for a single order.
 * Caller persists this into the Order document.
 */
export interface OrderLockResult {
  marketingRevenueFinal: number;
  saleRevenueFinal: number;
  revenueEligible: boolean;
  revenueLockReason: RevenueLockReason;
}

// ==================================================
// Helpers
// ==================================================

function isLockingStatus(status: OrderStatus): boolean {
  return REVENUE_LOCKING_STATUSES.has(status);
}

function isUnlockedStatus(status: OrderStatus): boolean {
  return REVENUE_UNLOCK_STATUSES.has(status);
}

function toObjectIdString(id: unknown): string {
  if (!id) return "";
  if (typeof id === "string") return id;
  if (typeof id === "object" && "toString" in (id as Record<string, unknown>)) {
    return (id as { toString: () => string }).toString();
  }
  return String(id);
}

/**
 * Two orders are considered "same product family" nếu cùng productId hoặc cùng comboId.
 *
 * Đơn NON_REVENUE (GIFT / EXCHANGE / REPLACEMENT) KHÔNG BAO GIỜ chiếm slot,
 * nên chúng không bao giờ là "earlier sibling" của bất kỳ đơn nào khác.
 * Nếu một trong hai đơn là non-revenue → trả về false.
 */
function isSameProductFamily(a: OrderLockInput["order"], b: OrderLockInput["order"]): boolean {
  if (
    NON_REVENUE_ORDER_TYPES.has(a.orderType as OrderType) ||
    NON_REVENUE_ORDER_TYPES.has(b.orderType as OrderType)
  ) {
    return false;
  }

  const aProduct = toObjectIdString(a.productId);
  const bProduct = toObjectIdString(b.productId);
  if (aProduct && bProduct && aProduct === bProduct) return true;

  const aCombo = toObjectIdString(a.comboId);
  const bCombo = toObjectIdString(b.comboId);
  if (aCombo && bCombo && aCombo === bCombo) return true;

  return false;
}

// ==================================================
// Core evaluation (pure function)
// ==================================================

/**
 * Pure evaluator: decides revenue eligibility for `subject` given
 * the full sibling list of `customerOrders` (already sorted by
 * `createdAt` ASC).
 *
 * KHÔNG ghi DB. Trả về `OrderLockResult` để caller persist.
 */
export function evaluateAndLock(
  subject: OrderLockInput["order"],
  customerOrders: OrderLockInput["order"][]
): OrderLockResult {
  // (a-0) Đơn NON_REVENUE (GIFT / EXCHANGE / REPLACEMENT):
  //       không chiếm slot, không lock ai → eligible = false,
  //       *_Final = 0, reason = NONE (đánh dấu "không tính vì bản chất").
  if (NON_REVENUE_ORDER_TYPES.has(subject.orderType as OrderType)) {
    return {
      marketingRevenueFinal: 0,
      saleRevenueFinal: 0,
      revenueEligible: false,
      revenueLockReason: RevenueLockReason.NONE,
    };
  }

  // (a) Đơn bị hủy / từ chối / thất bại → không tính, lý do ORDER_CANCELLED.
  if (isUnlockedStatus(subject.status as OrderStatus)) {
    return {
      marketingRevenueFinal: 0,
      saleRevenueFinal: 0,
      revenueEligible: false,
      revenueLockReason: RevenueLockReason.ORDER_CANCELLED,
    };
  }

  // (b) Tìm các đơn trước đó cùng Customer + cùng Product/Combo, đang ở
  //     locking status. Sắp theo createdAt ASC.
  const earlierSameFamily = customerOrders
    .filter(o => toObjectIdString(o._id) !== toObjectIdString(subject._id))
    .filter(o => o.createdAt && subject.createdAt && o.createdAt <= subject.createdAt)
    .filter(o => isLockingStatus(o.status as OrderStatus))
    .filter(o => isSameProductFamily(o, subject))
    .sort((a, b) => {
      const at = a.createdAt ? a.createdAt.getTime() : 0;
      const bt = b.createdAt ? b.createdAt.getTime() : 0;
      return at - bt;
    });

  // (c) Nếu không có đơn trước cùng family → đơn này được tính.
  if (earlierSameFamily.length === 0) {
    return {
      marketingRevenueFinal: subject.marketingRevenueRaw,
      saleRevenueFinal: subject.saleRevenueRaw,
      revenueEligible: true,
      revenueLockReason: RevenueLockReason.NONE,
    };
  }

  // (d) Prepaid Priority: đơn subject đã trả trước → đẩy đơn trước ra,
  //     subject chiếm slot đầu tiên của family.
  if (subject.isPrepaid) {
    // Đơn trước cùng family đầu tiên (theo createdAt) bị mất slot.
    // Tất cả các đơn sau đơn trước (cùng family) vẫn chờ.
    const head = earlierSameFamily[0];

    // Recurse: nếu head là chính subject (không xảy ra vì đã filter),
    // hoặc head cũng đã prepaid → coi như subject là đầu chuỗi.
    const headIsAlsoPrepaid = !!head.isPrepaid;
    if (headIsAlsoPrepaid) {
      return {
        marketingRevenueFinal: subject.marketingRevenueRaw,
        saleRevenueFinal: subject.saleRevenueRaw,
        revenueEligible: true,
        revenueLockReason: RevenueLockReason.NONE,
      };
    }
    return {
      marketingRevenueFinal: subject.marketingRevenueRaw,
      saleRevenueFinal: subject.saleRevenueRaw,
      revenueEligible: true,
      revenueLockReason: RevenueLockReason.PREPAID_PRIORITY,
    };
  }

  // (e) Mặc định: có đơn trước cùng family đang active → subject bị khóa.
  return {
    marketingRevenueFinal: 0,
    saleRevenueFinal: 0,
    revenueEligible: false,
    revenueLockReason: RevenueLockReason.WAITING_PREVIOUS_ORDER,
  };
}

// ==================================================
// Persistence helpers
// ==================================================

/**
 * Load toàn bộ orders ACTIVE của một customer.
 * Sắp xếp theo createdAt ASC để evaluator chạy đúng.
 *
 * Đây là query duy nhất phục vụ recalculate cho customer.
 */
export async function loadActiveOrdersForCustomer(
  customerId: string
): Promise<IOrder[]> {
  return Order.find({
    customerId,
    isActive: true,
  })
    .sort({ createdAt: 1 })
    .lean()
    .exec();
}

/**
 * Đánh dấu "không eligible" cho một đơn khi nó chuyển sang
 * CANCELLED / REJECTED / FAILED. Đơn vẫn được lưu lại lý do.
 */
export function buildCancelledLockResult(): OrderLockResult {
  return {
    marketingRevenueFinal: 0,
    saleRevenueFinal: 0,
    revenueEligible: false,
    revenueLockReason: RevenueLockReason.ORDER_CANCELLED,
  };
}

// ==================================================
// Public service entry points
// ==================================================

/**
 * Recalculate revenue eligibility cho TẤT CẢ orders của một customer.
 *
 * - Load orders một lần (1 query).
 * - Chạy `evaluateAndLock` cho từng order trong bộ nhớ.
 * - Bulk update về DB (1 write query).
 *
 * Trả về số đơn đã cập nhật.
 *
 * Sử dụng:
 *   - Sau createOrder
 *   - Sau updateOrder (đổi status / đổi isPrepaid / đổi productId|comboId)
 *   - Sau cancelOrder / refundOrder
 *   - Cron job đồng bộ
 */
export async function recalculateForCustomer(
  customerId: string
): Promise<{ updated: number; results: Array<{ orderId: string; result: OrderLockResult }> }> {
  const orders = await loadActiveOrdersForCustomer(customerId);

  const computed = orders.map(o => ({
    orderId: toObjectIdString(o._id),
    result: evaluateAndLock(o as unknown as OrderLockInput["order"], orders as unknown as OrderLockInput["order"][]),
  }));

  // Persist tuần tự bằng bulk write - 1 round-trip.
  if (computed.length === 0) return { updated: 0, results: [] };

  const ops = computed.map(c => ({
    updateOne: {
      filter: { _id: c.orderId },
      update: {
        $set: {
          marketingRevenueFinal: c.result.marketingRevenueFinal,
          saleRevenueFinal: c.result.saleRevenueFinal,
          revenueEligible: c.result.revenueEligible,
          revenueLockReason: c.result.revenueLockReason,
          revenueCalculatedAt: new Date(),
        },
      },
    },
  }));

  await Order.bulkWrite(ops, { ordered: false });

  return { updated: computed.length, results: computed };
}

/**
 * Recalculate cho MỘT order. Load các đơn khác của customer,
 * chạy evaluator với order đó nằm trong list, ghi lại kết quả.
 *
 * Thường dùng khi KHÔNG CẦN tính lại toàn bộ customer
 * (vd: chỉ đổi isPrepaid của đơn hiện tại).
 */
export async function recalculateForOrder(
  orderId: string
): Promise<OrderLockResult | null> {
  const order = await Order.findById(orderId).lean().exec();
  if (!order) return null;

  return recalculateForCustomer(toObjectIdString(order.customerId))
    .then(res => res.results.find(r => r.orderId === orderId)?.result ?? null);
}

/**
 * Khi một đơn chuyển sang CANCELLED / REJECTED / FAILED,
 * recalculate toàn bộ customer để "mở khóa" cho đơn sau.
 */
export async function unlockNextOrdersForCustomer(
  customerId: string
): Promise<{ updated: number }> {
  const res = await recalculateForCustomer(customerId);
  return { updated: res.updated };
}

/**
 * Convenience: cập nhật status của đơn (vd: cancel), rồi
 * tự động mở khóa các đơn sau của cùng customer.
 */
export async function transitionStatusAndRecalculate(
  orderId: string,
  nextStatus: OrderStatus
): Promise<{ updated: number }> {
  await Order.updateOne(
    { _id: orderId },
    { $set: { status: nextStatus } }
  ).exec();
  const order = await Order.findById(orderId).lean().exec();
  if (!order) return { updated: 0 };
  return unlockNextOrdersForCustomer(toObjectIdString(order.customerId));
}

// ==================================================
// Future hooks (Phase 3.6+) - signature only
// ==================================================

/**
 * Hook dành cho Phase Order Update / Cancel / Completed / Refund.
 *
 * API layer chỉ cần gọi `transitionStatusAndRecalculate(...)`.
 * Commission / KPI / Dashboard đọc trực tiếp từ các field Final
 * trên Order document (không qua service này).
 */
export const OrderRevenueService = {
  evaluateAndLock,
  recalculateForCustomer,
  recalculateForOrder,
  unlockNextOrdersForCustomer,
  transitionStatusAndRecalculate,
  buildCancelledLockResult,
};

export default OrderRevenueService;