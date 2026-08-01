/**
 * ==================================================
 * ORDER CHANGE-DETECTION HELPERS
 * ==================================================
 *
 * So sánh nội dung payments[] / shipping{} giữa 2 trạng thái Order,
 * trả về:
 *   - changed: boolean
 *   - oldTotal / newTotal (cho payments)
 *
 * Mục đích: route PUT so sánh object qua JSON.stringify là dễ vỡ
 * (key order, undefined vs null, Date → string). Helper này:
 *   - Normalise dữ liệu (Date → ISO string, strip undefined)
 *   - So sánh theo field quan trọng (không quan tâm key order)
 *   - Tính sẵn total cho payments
 *
 * Dùng được cho cả Phase 2 (PUT /api/orders/:id) và Phase tiếp theo
 * (Payment service, Shipping service).
 * ==================================================
 */

import type { IOrderPayment, IOrderShipping } from "@/models/Order";

// ==================================================
// Types
// ==================================================

/** Payload từ request body (Zod schema output). */
export interface OrderPaymentPayload {
  method: IOrderPayment["method"];
  amount: number;
  currency: "VND" | "MNT" | "USD";
  paidAt?: string | null;
  transactionId?: string;
  note?: string;
}

export interface OrderShippingPayload {
  receiverName: string;
  receiverPhone: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string | null;
  actualDelivery?: string | null;
  shippingFee: number;
  shippingFeeCurrency: "VND" | "MNT" | "USD";
}

export interface PaymentDiff {
  changed: boolean;
  oldTotal: number;
  newTotal: number;
}

export interface ShippingDiff {
  changed: boolean;
}

// ==================================================
// Internal: normalise
// ==================================================

function normaliseDate(value: Date | string | null | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function normaliseString(value: string | null | undefined): string {
  return value ?? "";
}

function normaliseNumber(value: number | null | undefined): number {
  return typeof value === "number" ? value : 0;
}

/** Normalise Payment object thành canonical shape để so sánh. */
function canonicalPayment(p: IOrderPayment | OrderPaymentPayload): string {
  return JSON.stringify({
    method: p.method,
    amount: normaliseNumber(p.amount),
    currency: p.currency,
    paidAt: normaliseDate(p.paidAt as unknown as Date),
    transactionId: normaliseString(p.transactionId),
    note: normaliseString(p.note),
  });
}

/** Normalise Shipping object thành canonical shape để so sánh. */
function canonicalShipping(
  s: IOrderShipping | (OrderShippingPayload | null | undefined)
): string | null {
  if (!s) return null;
  const obj = {
    receiverName: normaliseString(s.receiverName),
    receiverPhone: normaliseString(s.receiverPhone),
    address: normaliseString(s.address),
    province: normaliseString(s.province),
    district: normaliseString(s.district),
    ward: normaliseString(s.ward),
    trackingNumber: normaliseString(s.trackingNumber),
    carrier: normaliseString(s.carrier),
    estimatedDelivery: normaliseDate(
      s.estimatedDelivery as unknown as Date
    ),
    actualDelivery: normaliseDate(s.actualDelivery as unknown as Date),
    shippingFee: normaliseNumber(s.shippingFee),
    shippingFeeCurrency: s.shippingFeeCurrency,
  };
  return JSON.stringify(obj);
}

/** Tính tổng amount từ danh sách payment. */
function sumPayments(payments: Array<{ amount?: number }> | undefined): number {
  if (!payments || payments.length === 0) return 0;
  return payments.reduce(
    (sum, p) => sum + (normaliseNumber(p.amount)),
    0
  );
}

// ==================================================
// Public helpers
// ==================================================

/**
 * So sánh payments[] hiện tại với payload mới.
 * Trả về `changed`, `oldTotal`, `newTotal` để caller quyết định ghi history.
 */
export function isPaymentChanged(
  oldPayments: IOrderPayment[] | undefined,
  newPayments: OrderPaymentPayload[] | undefined
): PaymentDiff {
  const oldList = oldPayments ?? [];
  const newList = newPayments ?? [];

  const oldTotal = sumPayments(oldList);
  const newTotal = sumPayments(newList);

  // Fast path: khác số lượng → đã khác.
  if (oldList.length !== newList.length) {
    return { changed: true, oldTotal, newTotal };
  }

  // So sánh canonical từng entry.
  for (let i = 0; i < oldList.length; i++) {
    if (canonicalPayment(oldList[i]) !== canonicalPayment(newList[i])) {
      return { changed: true, oldTotal, newTotal };
    }
  }

  return { changed: false, oldTotal, newTotal };
}

/**
 * So sánh shipping{} hiện tại với payload mới.
 * `null/undefined` payload = "xóa shipping" → so với undefined cũ.
 */
export function isShippingChanged(
  oldShipping: IOrderShipping | undefined,
  newShipping: OrderShippingPayload | null | undefined
): ShippingDiff {
  const oldCanonical = canonicalShipping(oldShipping);
  const newCanonical = canonicalShipping(newShipping ?? null);
  return { changed: oldCanonical !== newCanonical };
}
