/**
 * ==================================================
 * ORDER MODEL
 * ==================================================
 *
 * Đơn hàng được tạo từ Lead (hoặc import thủ công).
 *
 * Phase tiếp theo sẽ thêm: OrderItem, Payment, Shipping, ...
 *
 * Revenue Lock Engine (Phase 3.5) chỉ đọc các field:
 *   - customerId, productId, comboId
 *   - status, isPrepaid
 *   - marketingRevenueRaw, saleRevenueRaw
 *   - marketingRevenueFinal, saleRevenueFinal
 *   - revenueEligible, revenueLockReason, revenueOwnerOrderId
 *
 * Các field revenue KHÔNG BAO GIỜ được set thủ công ở API layer -
 * chúng được tính bởi `orderRevenue.service.ts`.
 *
 * Phase 1.1 extensions:
 *   - Weight (estimatedWeight, actualWeight)
 *   - Payment (method, amount, paidAt, transactionId)
 *   - Shipping (address, trackingNumber, carrier, estimatedDelivery, actualDelivery, shippingFee)
 *   - Warehouse (warehouseId)
 *   - Revenue Lock: revenueLocked, revenueOwnerOrderId
 *
 * Sprint 6.1 extensions:
 *   - orderItems[]: Danh sách sản phẩm trong đơn hàng
 *   - summary: Tổng tiền (subtotal, discount, shippingFee, grandTotal)
 */

import mongoose, { Schema, type Document, Types } from "mongoose";
import {
  OrderStatus,
  OrderType,
  OrderSource,
  RevenueLockReason,
  REVENUE_UNLOCK_STATUSES,
} from "../constants/orderStatus";

/** Set of statuses that an Order treats as "occupied revenue slot". */
export const REVENUE_LOCKING_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPAID,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
]);

export { REVENUE_UNLOCK_STATUSES };

// ==================================================
// Sub-document types
// ==================================================

/** Variant attribute selected by Sale for one OrderItem detail. */
export interface IOrderProductAttribute {
  optionId: Types.ObjectId;
  valueId: Types.ObjectId;
}

export interface IOrderVariantDetail {
  variantId?: Types.ObjectId;
  attributes: IOrderProductAttribute[];
  quantity: number;
}

export interface IOrderGiftSelection {
  giftProductId: Types.ObjectId;
  giftProductName?: string;
  quantity: number;
}

/** Order Item - one purchased Combo (Sprint 6.1 / 8.x). */
export interface IOrderItem {
  comboId?: Types.ObjectId;
  productId?: Types.ObjectId;
  comboName: string;
  comboCode?: string;
  comboQuantity: number;
  packageQuantity: number;
  giftQuantity: number;
  sellingPrice: number;
  discount: number;
  subtotal: number;
  details: IOrderVariantDetail[];
  giftMode: "RANDOM" | "CUSTOMER_SELECTED";
  giftSelections: IOrderGiftSelection[];
  /** Legacy fields retained for existing orders and consumers. */
  sku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

/** Payment details attached to an Order. */
export interface IOrderPayment {
  method: "CASH" | "BANK_TRANSFER" | "MOMO" | "ZALO_PAY" | "VNPAY" | "OTHER";
  amount: number;
  currency: "VND" | "MNT" | "USD";
  paidAt?: Date;
  transactionId?: string;
  note?: string;
}

/** Shipping details attached to an Order. */
export interface IOrderShipping {
  receiverName: string;
  receiverPhone: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippingFee: number;
  shippingFeeCurrency: "VND" | "MNT" | "USD";
}

/** Order Summary - tổng tiền (Sprint 6.1) */
export interface IOrderSummary {
  /** Tạm tính = sum(orderItems[].subtotal) */
  subtotal: number;
  /** Giảm giá tổng (trên toàn đơn) */
  discount: number;
  /** Phí ship */
  shippingFee: number;
  /** Tổng cộng = subtotal - discount + shippingFee */
  grandTotal: number;
  /** Loại tiền tệ */
  currency: "VND" | "MNT" | "USD";
}

// ==================================================
// Main interface
// ==================================================

export interface IOrder extends Document {
  orderCode: string;

  // ---- Customer ----------------------------------------------------
  /** Customer đặt đơn (mirror từ Lead.customerId hoặc nhập tay). */
  customerId: Types.ObjectId;
  customerName: string;
  customerPhone?: string;

  // ---- Lead ---------------------------------------------------------
  /** Lead gốc (nếu đơn được tạo từ pipeline Lead → Order). */
  leadId?: Types.ObjectId;

  // ---- Product / Combo -----------------------------------------------
  /** Sản phẩm / combo của đơn - key để Revenue Lock Engine so khớp. */
  productId?: Types.ObjectId;
  comboId?: Types.ObjectId;
  /**
   * Biến thể sản phẩm cụ thể (sku/color/size).
   * Phase 4.3: là key Stock Engine dùng để reserve / release.
   * Có thể null nếu đơn gắn với combo (stock combo sẽ handle ở Phase sau).
   */
  productVariantId?: Types.ObjectId;
  productSnapshot?: { code: string; name: string };
  comboSnapshot?: { code: string; name: string };

  // ---- Pricing -------------------------------------------------------
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: "VND" | "MNT" | "USD";

  // ---- Sprint Settings: Exchange Rate snapshot (Sprint Settings) ------
  /**
   * Tỷ giá (1 USD → MNT) tại thời điểm tạo Order.
   * KHÔNG BAO GIỜ thay đổi sau khi Order được tạo.
   * Nếu Admin đổi exchange rate → Order cũ vẫn giữ rate cũ.
   */
  exchangeRate?: number;
  /** Thời điểm snapshot tỷ giá. */
  exchangeRateDate?: Date;

  // ---- Weight --------------------------------------------------------
  estimatedWeight?: number;
  actualWeight?: number;

  // ---- Warehouse -----------------------------------------------------
  warehouseId?: Types.ObjectId;

  // ---- Stock Reservation (Phase 4.3 — audit-only) ---------------------
  /**
   * Phase 4.3 (refactor): KHÔNG dùng cờ này làm source of truth cho "đang giữ
   * chỗ hay không". Cờ boolean dễ lệch sau chuỗi Reserve ↓ Release ↓ Reserve.
   *
   * Source of truth là `Inventory.reservedQuantity` (cộng dồn qua InventoryHistory).
   * Wire layer đọc trực tiếp Inventory.reservedQuantity (cùng session) để quyết
   * định có nên gọi `releaseReservedStock()` hay không.
   *
   * Field này hiện giữ lại cho mục đích **audit** — biết "lần cuối Order này
   * chạm vào Stock Engine là khi nào". Phase sau (Shipment / Audit / Dashboard)
   * có thể dựa vào đây để xác định Order đã từng tương tác kho.
   *
   * KHÔNG dùng để:
   *   - Check idempotency reserve / release.
   *   - Đoán "đơn có giữ kho hay không".
   */
  stockReservedAt?: Date;

  // ---- Employees -----------------------------------------------------
  marketingEmployeeId?: Types.ObjectId;
  saleEmployeeId?: Types.ObjectId;

  // ---- Status --------------------------------------------------------
  status: OrderStatus;
  /** Khách đã chuyển khoản trước hay chưa (PREPAID_PRIORITY rule). */
  isPrepaid: boolean;

  // ---- Classification -------------------------------------------------
  /**
   * Bản chất đơn (NORMAL/COMBO/GIFT/EXCHANGE/REPLACEMENT).
   * Revenue Lock Engine dùng để bỏ qua GIFT/EXCHANGE/REPLACEMENT.
   * Default NORMAL.
   */
  orderType: OrderType;
  /**
   * Kênh Sale chốt đơn (FACEBOOK/IMPORT/PHONE/WEBSITE/MANUAL).
   * KHÁC `Lead.sourceType` (nguồn khách). Default MANUAL.
   */
  orderSource: OrderSource;

  // ---- Order Items (Sprint 6.1) ----------------------------------------
  /** Danh sách sản phẩm trong đơn hàng */
  orderItems: IOrderItem[];
  /** Tổng tiền (subtotal, discount, shippingFee, grandTotal) */
  summary: IOrderSummary;

  // ---- Payment -------------------------------------------------------
  payments: IOrderPayment[];
  /**
   * Tổng tiền đã thanh toán (cache sum(payments[].amount)).
   * Phục vụ Dashboard / List — không phải sum payments[] mỗi lần đọc.
   * Được cập nhật nguyên tử khi thêm/xóa payment.
   */
  totalPaid: number;

  // ---- Shipping ------------------------------------------------------
  shipping?: IOrderShipping;

  // ==================================================
  // Revenue Lock Engine fields (Phase 3.5)
  // ==================================================
  /**
   * Đơn đã bị Revenue Lock Engine khóa chưa.
   * Phase tiếp theo: khi revenueOwnerOrderId được set bởi engine
   * → revenueLocked = true.
   */
  revenueLocked: boolean;
  /**
   * ID của đơn đang chiếm slot revenue. Nếu đơn này là đơn giữ slot
   * → revenueOwnerOrderId = this._id. Nếu đơn này bị khóa
   * → revenueOwnerOrderId = _id của đơn chiếm slot.
   */
  revenueOwnerOrderId?: Types.ObjectId;

  /** Doanh thu marketing thô (chưa qua revenue lock). */
  marketingRevenueRaw: number;
  /** Doanh thu marketing cuối cùng (sau khi áp rule). */
  marketingRevenueFinal: number;
  /** Doanh thu sale thô. */
  saleRevenueRaw: number;
  /** Doanh thu sale cuối cùng (sau khi áp rule). */
  saleRevenueFinal: number;
  /** Đơn này có được tính vào revenue hay không. */
  revenueEligible: boolean;
  /** Lý do khóa/mở khóa revenue (xem RevenueLockReason). */
  revenueLockReason: RevenueLockReason;
  /** Thời điểm revenue cuối cùng được tính toán lại. */
  revenueCalculatedAt?: Date;

  // ---- Audit ---------------------------------------------------------
  note?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true, default: "" },

    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      index: true,
    },
    comboId: {
      type: Schema.Types.ObjectId,
      ref: "Combo",
      index: true,
    },
    productVariantId: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      index: true,
    },
    productSnapshot: {
      code: { type: String, default: "" },
      name: { type: String, default: "" },
    },
    comboSnapshot: {
      code: { type: String, default: "" },
      name: { type: String, default: "" },
    },

    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0, default: 0 },
    currency: {
      type: String,
      enum: ["VND", "MNT", "USD"],
      default: "MNT",
    },

    // ---- Sprint Settings: Exchange Rate snapshot (Sprint Settings) ------
    /**
     * Tỷ giá (1 USD → MNT) tại thời điểm tạo Order.
     * KHÔNG BAO GIỜ thay đổi sau khi Order được tạo.
     * Nếu Admin đổi exchange rate → Order cũ vẫn giữ rate cũ.
     */
    exchangeRate: { type: Number, min: 0 },
    /** Thời điểm snapshot tỷ giá. */
    exchangeRateDate: { type: Date },

    // ---- Weight -------------------------------------------------------
    estimatedWeight: { type: Number, min: 0 },
    actualWeight: { type: Number, min: 0 },

    // ---- Warehouse ----------------------------------------------------
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      index: true,
    },

    // ---- Stock Reservation (Phase 4.3 — audit only) ------------------
    // Bỏ `stockReserved` boolean flag (dễ lệch). Chỉ giữ `stockReservedAt`
    // để audit — biết lần cuối Stock Engine được gọi cho Order này.
    // Source of truth cho "đang giữ chỗ hay không" là
    // `Inventory.reservedQuantity` (xem orderStockWiring.helper).
    stockReservedAt: { type: Date },

    marketingEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      index: true,
    },
    saleEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(OrderStatus),
      required: true,
      default: OrderStatus.PENDING,
      index: true,
    },

    isPrepaid: { type: Boolean, default: false },

    orderType: {
      type: String,
      enum: Object.values(OrderType),
      default: OrderType.NORMAL,
      index: true,
    },

    orderSource: {
      type: String,
      enum: Object.values(OrderSource),
      default: OrderSource.MANUAL,
      index: true,
    },

    // ---- Order Items (Sprint 6.1) ----------------------------------------
    orderItems: {
      type: [
        new Schema<IOrderItem>(
          {
            comboId: { type: Schema.Types.ObjectId, ref: "Combo" },
            productId: { type: Schema.Types.ObjectId, ref: "Product" },
            comboName: { type: String, default: "" },
            comboCode: { type: String, default: "" },
            comboQuantity: { type: Number, min: 1, default: 1 },
            packageQuantity: { type: Number, min: 1, default: 1 },
            giftQuantity: { type: Number, min: 0, default: 0 },
            sellingPrice: { type: Number, min: 0, default: 0 },
            discount: { type: Number, default: 0, min: 0 },
            subtotal: { type: Number, min: 0, default: 0 },
            details: {
              type: [{
                variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant" },
                attributes: [{
                  optionId: { type: Schema.Types.ObjectId, ref: "VariantOption", required: true },
                  valueId: { type: Schema.Types.ObjectId, ref: "VariantValue", required: true },
                }],
                quantity: { type: Number, required: true, min: 1 },
              }],
              default: [],
            },
            giftMode: { type: String, enum: ["RANDOM", "CUSTOMER_SELECTED"], default: "RANDOM" },
            giftSelections: [{
              giftProductId: { type: Schema.Types.ObjectId, ref: "Gift", required: true },
              giftProductName: { type: String, default: "" },
              quantity: { type: Number, required: true, min: 1 },
            }],
            // Legacy fields retained for old order documents.
            sku: { type: String, default: "" },
            productName: { type: String, default: "" },
            quantity: { type: Number, min: 1, default: 1 },
            unitPrice: { type: Number, min: 0, default: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    summary: {
      subtotal: { type: Number, default: 0, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      shippingFee: { type: Number, default: 0, min: 0 },
      grandTotal: { type: Number, default: 0, min: 0 },
      currency: {
        type: String,
        enum: ["VND", "MNT", "USD"],
        default: "VND",
      },
    },

    // ---- Payment ------------------------------------------------------
    payments: {
      type: [
        new Schema<IOrderPayment>(
          {
            method: {
              type: String,
              enum: ["CASH", "BANK_TRANSFER", "MOMO", "ZALO_PAY", "VNPAY", "OTHER"],
              default: "CASH",
            },
            amount: { type: Number, default: 0, min: 0 },
            currency: {
              type: String,
              enum: ["VND", "MNT", "USD"],
              default: "VND",
            },
            paidAt: { type: Date },
            transactionId: { type: String, default: "" },
            note: { type: String, default: "" },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    totalPaid: { type: Number, default: 0, min: 0 },

    // ---- Shipping -----------------------------------------------------
    shipping: {
      receiverName: { type: String, default: "" },
      receiverPhone: { type: String, default: "" },
      address: { type: String, default: "" },
      province: { type: String, default: "" },
      district: { type: String, default: "" },
      ward: { type: String, default: "" },
      trackingNumber: { type: String, default: "" },
      carrier: { type: String, default: "" },
      estimatedDelivery: { type: Date },
      actualDelivery: { type: Date },
      shippingFee: { type: Number, default: 0, min: 0 },
      shippingFeeCurrency: {
        type: String,
        enum: ["VND", "MNT", "USD"],
        default: "VND",
      },
    },

    // ---- Revenue Lock -------------------------------------------------
    revenueLocked: { type: Boolean, default: false },
    revenueOwnerOrderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
    marketingRevenueRaw: { type: Number, default: 0, min: 0 },
    marketingRevenueFinal: { type: Number, default: 0, min: 0 },
    saleRevenueRaw: { type: Number, default: 0, min: 0 },
    saleRevenueFinal: { type: Number, default: 0, min: 0 },
    revenueEligible: { type: Boolean, default: false, index: true },
    revenueLockReason: {
      type: String,
      enum: Object.values(RevenueLockReason),
      default: RevenueLockReason.NONE,
      index: true,
    },
    revenueCalculatedAt: { type: Date },

    note: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
  }
);

// ----- Indexes phục vụ Revenue Lock Engine -------------------------------
// Một truy vấn duy nhất tìm các đơn active của (customer, product|combo).
OrderSchema.index({ customerId: 1, productId: 1, status: 1, createdAt: 1 });
OrderSchema.index({ customerId: 1, comboId: 1, status: 1, createdAt: 1 });
// Phục vụ recalculate khi một đơn chuyển trạng thái.
OrderSchema.index({ status: 1, isPrepaid: 1 });
// Phục vụ Revenue Lock: tìm đơn đang chiếm slot.
OrderSchema.index({ customerId: 1, productId: 1, revenueLocked: 1, createdAt: 1 });
OrderSchema.index({ customerId: 1, comboId: 1, revenueLocked: 1, createdAt: 1 });
// Phục vụ Warehouse & Lead lookups.
OrderSchema.index({ warehouseId: 1, isActive: 1 });
// Phục vụ Dashboard: lọc theo orderType + status.
OrderSchema.index({ orderType: 1, status: 1, createdAt: -1 });
OrderSchema.index({ orderSource: 1, createdAt: -1 });
// A lead can be converted to exactly one order, including concurrent requests.
OrderSchema.index({ leadId: 1 }, { unique: true, sparse: true });

export const Order =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
export default Order;