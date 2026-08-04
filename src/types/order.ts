/**
 * Order Domain Types (Sprint 6.0 — Order Module Foundation)
 * Sprint 6.1 — Order Detail & Product Lines
 *
 * Clean Architecture: Domain types cho Order entity.
 * Sử dụng chung cho tất cả các module cần Order data.
 */

import type { OrderStatus, OrderType, OrderSource, RevenueLockReason } from "@/constants/orderStatus";

// ============================================================================
// Order Item (Sprint 6.1)
// ============================================================================

export interface OrderItem {
  /** Product ID - key để Revenue Lock Engine so khớp */
  productId?: string;
  /** SKU sản phẩm */
  sku?: string;
  /** Tên sản phẩm */
  productName: string;
  /** Số lượng */
  quantity: number;
  /** Đơn giá */
  unitPrice: number;
  /** Giảm giá (số tiền) */
  discount: number;
  /** Thành tiền = (unitPrice * quantity) - discount */
  subtotal: number;
}

export interface CreateOrderItemInput {
  productId?: string;
  sku?: string;
  productName: string;
  quantity?: number;
  unitPrice?: number;
  discount?: number;
}

// ============================================================================
// Order Summary (for pricing - Sprint 6.1)
// ============================================================================

export interface OrderSummaryPrice {
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

// ============================================================================
// Order List Item (for table display)
// ============================================================================

export interface OrderListItem {
  _id: string;
  orderCode: string;

  // Customer
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customer?: {
    _id: string;
    code: string;
    name: string;
    phone?: string;
  };

  // Lead
  leadId?: string;
  lead?: {
    _id: string;
    leadCode: string;
  };

  // Product / Combo
  productId?: string;
  comboId?: string;
  productVariantId?: string;
  productSnapshot?: { code: string; name: string };
  comboSnapshot?: { code: string; name: string };
  product?: {
    _id: string;
    code: string;
    name: string;
  };
  combo?: {
    _id: string;
    code: string;
    name: string;
  };

  // Pricing
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: "VND" | "MNT" | "USD";

  // Weight
  estimatedWeight?: number;
  actualWeight?: number;

  // Warehouse
  warehouseId?: string;
  warehouse?: {
    _id: string;
    code: string;
    name: string;
  };

  // Employees
  marketingEmployeeId?: string;
  saleEmployeeId?: string;
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

  // Status
  status: OrderStatus;
  statusLabel: string;
  isPrepaid: boolean;

  // Classification
  orderType: OrderType;
  orderTypeLabel: string;
  orderSource: OrderSource;
  orderSourceLabel: string;

  // Order Items (Sprint 6.1)
  orderItems: OrderItem[];
  summary: OrderSummaryPrice;

  // Payment
  payments: OrderPayment[];
  totalPaid: number;

  // Shipping
  shipping?: OrderShipping;

  // Revenue
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

  // Audit
  note?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Order Detail (full detail with history) - Sprint 6.1
// ============================================================================

export interface OrderDetail extends OrderListItem {
  /** Danh sách sản phẩm trong đơn */
  orderItems: OrderItem[];
  /** Tổng tiền */
  summary: OrderSummaryPrice;
  /** Lịch sử thay đổi */
  histories: OrderHistoryItem[];
}

// ============================================================================
// Order Summary (for dashboard/stats)
// ============================================================================

export interface OrderSummary {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  totalPaid: number;
}

// ============================================================================
// Order Filter Params
// ============================================================================

export interface OrderFilter {
  keyword?: string;
  status?: OrderStatus;
  orderType?: OrderType;
  orderSource?: OrderSource;
  saleEmployeeId?: string;
  customerId?: string;
  warehouseId?: string;
  revenueLocked?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  /** Internal: force isActive filter */
  isActive?: boolean;
}

// ============================================================================
// Order List Response
// ============================================================================

export interface OrderListResponse {
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// Order Detail Response (Sprint 6.1)
// ============================================================================

export interface OrderDetailResponse {
  order: OrderDetail;
  summary: OrderSummaryPrice;
}

// ============================================================================
// Create Order Input
// ============================================================================

export interface CreateOrderInput {
  customerId: string;
  customerName: string;
  customerPhone?: string;
  leadId?: string;
  productId?: string;
  comboId?: string;
  productVariantId?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  currency?: "VND" | "MNT" | "USD";
  estimatedWeight?: number;
  warehouseId?: string;
  marketingEmployeeId?: string;
  saleEmployeeId?: string;
  status?: OrderStatus;
  isPrepaid?: boolean;
  orderType?: OrderType;
  orderSource?: OrderSource;
  orderItems?: CreateOrderItemInput[];
  payments?: CreatePaymentInput[];
  shipping?: CreateShippingInput;
  note?: string;
}

// ============================================================================
// Update Order Input
// ============================================================================

export interface UpdateOrderInput {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  leadId?: string;
  productId?: string;
  comboId?: string;
  productVariantId?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  currency?: "VND" | "MNT" | "USD";
  estimatedWeight?: number;
  actualWeight?: number;
  warehouseId?: string;
  marketingEmployeeId?: string;
  saleEmployeeId?: string;
  status?: OrderStatus;
  isPrepaid?: boolean;
  orderType?: OrderType;
  orderSource?: OrderSource;
  orderItems?: CreateOrderItemInput[];
  payments?: CreatePaymentInput[];
  totalPaid?: number;
  shipping?: CreateShippingInput | null;
  summaryDiscount?: number;
  summaryShippingFee?: number;
  note?: string;
}

// ============================================================================
// Payment
// ============================================================================

export interface CreatePaymentInput {
  method: "CASH" | "BANK_TRANSFER" | "MOMO" | "ZALO_PAY" | "VNPAY" | "OTHER";
  amount: number;
  currency?: "VND" | "MNT" | "USD";
  paidAt?: string;
  transactionId?: string;
  note?: string;
}

export interface OrderPayment {
  method: "CASH" | "BANK_TRANSFER" | "MOMO" | "ZALO_PAY" | "VNPAY" | "OTHER";
  amount: number;
  currency: "VND" | "MNT" | "USD";
  paidAt?: string;
  transactionId?: string;
  note?: string;
}

// ============================================================================
// Shipping
// ============================================================================

export interface CreateShippingInput {
  receiverName?: string;
  receiverPhone?: string;
  address?: string;
  province?: string;
  district?: string;
  ward?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  shippingFee?: number;
  shippingFeeCurrency?: "VND" | "MNT" | "USD";
}

export interface OrderShipping {
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
  shippingFeeCurrency: "VND" | "MNT" | "USD";
}

// ============================================================================
// Order History (Timeline)
// ============================================================================

export interface OrderHistoryItem {
  _id: string;
  orderId: string;
  employeeId: string;
  employee?: {
    _id: string;
    employeeCode: string;
    fullName: string;
  };
  action: string;
  actionLabel: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt: string;
}
