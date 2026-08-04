/**
 * ==================================================
 * ORDER MAPPER
 * ==================================================
 *
 * Transforms raw Mongoose Order / OrderHistory documents into
 * clean API response shapes consumed by the frontend.
 *
 * Conventions:
 *   - `mapOrder()`  : single Order → OrderResponse
 *   - `mapOrderList()` : array of Orders → OrderResponse[]
 *   - `mapOrderHistory()` : single history → OrderHistoryResponse
 *   - `mapOrderHistoryList()` : array of histories → OrderHistoryResponse[]
 *
 * Population notes:
 *   - Caller is responsible for calling `.populate(...)` before mapping.
 *   - The mapper handles the `as any` cast for populated nested objects
 *     (safe because `.populate()` injects those fields at runtime).
 * ==================================================
 */

import {
  IOrder,
  IOrderPayment,
  IOrderShipping,
  IOrderItem,
  IOrderSummary,
} from "@/models/Order";
import { IOrderHistory } from "@/models/OrderHistory";
import {
  OrderStatus,
  ORDER_STATUS_LABELS,
  OrderType,
  ORDER_TYPE_LABELS,
  OrderSource,
  ORDER_SOURCE_LABELS,
  RevenueLockReason,
  REVENUE_LOCK_LABELS,
  OrderAction,
  ORDER_ACTION_LABELS,
} from "@/constants/orderStatus";

// ==================================================
// Order Item (Sprint 6.1)
// ==================================================

export interface OrderItemResponse {
  productId?: string;
  sku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

// ==================================================
// Order Summary (Sprint 6.1)
// ==================================================

export interface OrderSummaryResponse {
  subtotal: number;
  discount: number;
  shippingFee: number;
  grandTotal: number;
  currency: string;
}

// ==================================================
// Payment
// ==================================================

export interface OrderPaymentResponse {
  method: IOrderPayment["method"];
  amount: number;
  currency: string;
  paidAt?: string;
  transactionId?: string;
  note?: string;
}

// ==================================================
// Shipping
// ==================================================

export interface OrderShippingResponse {
  receiverName: string;
  receiverPhone: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  shippingFee: number;
  shippingFeeCurrency: string;
}

// ==================================================
// Main response
// ==================================================

export interface OrderResponse {
  _id: string;
  orderCode: string;

  // ---- Customer ----------------------------------------------------
  customerId: string;
  customerName: string;
  customerPhone?: string;

  // ---- Lead --------------------------------------------------------
  leadId?: string;

  // ---- Product / Combo ---------------------------------------------
  productId?: string;
  comboId?: string;
  productVariantId?: string;
  productSnapshot?: { code: string; name: string };
  comboSnapshot?: { code: string; name: string };

  // ---- Pricing -----------------------------------------------------
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;

  // ---- Weight ------------------------------------------------------
  estimatedWeight?: number;
  actualWeight?: number;

  // ---- Warehouse ----------------------------------------------------
  warehouseId?: string;

  // ---- Stock Reservation (Phase 4.3 — audit-only) ---------------
  /**
   * Lần cuối Order chạm vào Stock Engine. KHÔNG phải source of truth cho
   * "đang giữ chỗ hay không" — chỉ phục vụ audit / Timeline.
   */
  stockReservedAt?: string;

  // ---- Employees ---------------------------------------------------
  marketingEmployeeId?: string;
  saleEmployeeId?: string;

  // ---- Status ------------------------------------------------------
  status: OrderStatus;
  statusLabel: string;
  isPrepaid: boolean;

  // ---- Classification ----------------------------------------------
  orderType: OrderType;
  orderTypeLabel: string;
  orderSource: OrderSource;
  orderSourceLabel: string;

  // ---- Order Items (Sprint 6.1) ------------------------------------
  orderItems: OrderItemResponse[];
  summary: OrderSummaryResponse;

  // ---- Payment ------------------------------------------------------
  payments: OrderPaymentResponse[];
  totalPaid: number;

  // ---- Shipping ----------------------------------------------------
  shipping?: OrderShippingResponse;

  // ---- Revenue -----------------------------------------------------
  revenueLocked: boolean;
  revenueOwnerOrderId?: string;
  marketingRevenueRaw: number;
  marketingRevenueFinal: number;
  saleRevenueRaw: number;
  saleRevenueFinal: number;
  revenueEligible: boolean;
  revenueLockReason: RevenueLockReason;
  revenueLockReasonLabel: string;
  revenueCalculatedAt?: string;

  // ---- Audit -------------------------------------------------------
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListItem extends OrderResponse {
  customer?: {
    _id: string;
    code: string;
    name: string;
    phone?: string;
  };
  marketingEmployee?: {
    _id: string;
    employeeCode: string;
    fullName: string;
  };
  saleEmployee?: {
    _id: string;
    employeeCode: string;
    fullName: string;
  };
  warehouse?: {
    _id: string;
    code: string;
    name: string;
  };
}

// ==================================================
// History response
// ==================================================

export interface OrderHistoryResponse {
  _id: string;
  orderId: string;
  employeeId: string;
  employee?: {
    _id: string;
    employeeCode: string;
    fullName: string;
  };
  action: OrderAction;
  actionLabel: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: string;
}

// ==================================================
// Mappers
// ==================================================

function mapPayment(p: IOrderPayment): OrderPaymentResponse {
  return {
    method: p.method,
    amount: p.amount,
    currency: p.currency,
    paidAt: p.paidAt?.toISOString(),
    transactionId: p.transactionId,
    note: p.note,
  };
}

function mapShipping(s: IOrderShipping | undefined): OrderShippingResponse | undefined {
  if (!s) return undefined;
  return {
    receiverName: s.receiverName,
    receiverPhone: s.receiverPhone,
    address: s.address,
    province: s.province,
    district: s.district,
    ward: s.ward,
    trackingNumber: s.trackingNumber,
    carrier: s.carrier,
    estimatedDelivery: s.estimatedDelivery?.toISOString(),
    actualDelivery: s.actualDelivery?.toISOString(),
    shippingFee: s.shippingFee,
    shippingFeeCurrency: s.shippingFeeCurrency,
  };
}

function mapOrderItem(item: IOrderItem): OrderItemResponse {
  return {
    productId: item.productId?.toString(),
    sku: item.sku,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount,
    subtotal: item.subtotal,
  };
}

function mapOrderSummary(summary: IOrderSummary | undefined): OrderSummaryResponse {
  if (!summary) {
    return {
      subtotal: 0,
      discount: 0,
      shippingFee: 0,
      grandTotal: 0,
      currency: "VND",
    };
  }
  return {
    subtotal: summary.subtotal,
    discount: summary.discount,
    shippingFee: summary.shippingFee,
    grandTotal: summary.grandTotal,
    currency: summary.currency,
  };
}

export function mapOrder(order: IOrder): OrderResponse {
  return {
    _id: order._id.toString(),
    orderCode: order.orderCode,
    customerId: order.customerId.toString(),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    leadId: order.leadId?.toString(),
    productId: order.productId?.toString(),
    comboId: order.comboId?.toString(),
    productVariantId: order.productVariantId?.toString(),
    productSnapshot: order.productSnapshot,
    comboSnapshot: order.comboSnapshot,
    quantity: order.quantity,
    unitPrice: order.unitPrice,
    totalAmount: order.totalAmount,
    currency: order.currency,
    estimatedWeight: order.estimatedWeight,
    actualWeight: order.actualWeight,
    warehouseId: order.warehouseId?.toString(),
    stockReservedAt: order.stockReservedAt?.toISOString(),
    marketingEmployeeId: order.marketingEmployeeId?.toString(),
    saleEmployeeId: order.saleEmployeeId?.toString(),
    status: order.status as OrderStatus,
    statusLabel: ORDER_STATUS_LABELS[order.status as OrderStatus],
    isPrepaid: order.isPrepaid,
    orderType: order.orderType as OrderType,
    orderTypeLabel: ORDER_TYPE_LABELS[order.orderType as OrderType],
    orderSource: order.orderSource as OrderSource,
    orderSourceLabel: ORDER_SOURCE_LABELS[order.orderSource as OrderSource],
    // Sprint 6.1: Order items and summary
    orderItems: (order.orderItems ?? []).map(mapOrderItem),
    summary: mapOrderSummary(order.summary),
    payments: (order.payments ?? []).map(mapPayment),
    totalPaid: order.totalPaid,
    shipping: mapShipping(order.shipping),
    revenueLocked: order.revenueLocked,
    revenueOwnerOrderId: order.revenueOwnerOrderId?.toString(),
    marketingRevenueRaw: order.marketingRevenueRaw,
    marketingRevenueFinal: order.marketingRevenueFinal,
    saleRevenueRaw: order.saleRevenueRaw,
    saleRevenueFinal: order.saleRevenueFinal,
    revenueEligible: order.revenueEligible,
    revenueLockReason: order.revenueLockReason as RevenueLockReason,
    revenueLockReasonLabel:
      REVENUE_LOCK_LABELS[order.revenueLockReason as RevenueLockReason],
    revenueCalculatedAt: order.revenueCalculatedAt?.toISOString(),
    note: order.note,
    isActive: order.isActive,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function mapOrderList(
  orders: IOrder[],
  populateFields: string[] = [
    "customer",
    "marketingEmployee",
    "saleEmployee",
    "warehouse",
  ]
): OrderListItem[] {
  return orders.map((order) => {
    const mapped = mapOrder(order) as OrderListItem;

    if (populateFields.includes("customer") && order.customerId) {
      const customer = (order as any).customer;
      if (customer) {
        mapped.customer = {
          _id: customer._id.toString(),
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
        };
      }
    }

    if (
      populateFields.includes("marketingEmployee") &&
      order.marketingEmployeeId
    ) {
      const emp = (order as any).marketingEmployee;
      if (emp) {
        mapped.marketingEmployee = {
          _id: emp._id.toString(),
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
        };
      }
    }

    if (populateFields.includes("saleEmployee") && order.saleEmployeeId) {
      const emp = (order as any).saleEmployee;
      if (emp) {
        mapped.saleEmployee = {
          _id: emp._id.toString(),
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
        };
      }
    }

    if (populateFields.includes("warehouse") && order.warehouseId) {
      const wh = (order as any).warehouse;
      if (wh) {
        mapped.warehouse = {
          _id: wh._id.toString(),
          code: wh.code,
          name: wh.name,
        };
      }
    }

    return mapped;
  });
}

export function mapOrderHistory(history: IOrderHistory): OrderHistoryResponse {
  return {
    _id: history._id.toString(),
    orderId: history.orderId.toString(),
    employeeId: history.employeeId.toString(),
    action: history.action as OrderAction,
    actionLabel: ORDER_ACTION_LABELS[history.action as OrderAction],
    fieldName: history.fieldName,
    oldValue: history.oldValue,
    newValue: history.newValue,
    note: history.note,
    createdAt: history.createdAt.toISOString(),
  };
}

export function mapOrderHistoryList(
  histories: IOrderHistory[],
  populateEmployee: boolean = true
): OrderHistoryResponse[] {
  return histories.map((history) => {
    const mapped = mapOrderHistory(history);

    if (populateEmployee) {
      const emp = (history as any).employee;
      if (emp) {
        mapped.employee = {
          _id: emp._id.toString(),
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
        };
      }
    }

    return mapped;
  });
}
