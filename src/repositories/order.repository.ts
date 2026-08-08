/**
 * Order Repository (Sprint 6.0 — Order Module Foundation)
 *
 * Clean Architecture: Repository layer cho Order.
 * Chỉ làm việc với MongoDB - không có business logic.
 * KHÔNG biết Counter, KHÔNG generate code.
 */

import mongoose, { type SortOrder } from "mongoose";
import { Order, type IOrder } from "@/models/Order";
import type { Types } from "mongoose";
import type { OrderFilter } from "@/types/order";

// ============================================================================
// Types
// ============================================================================

export interface CreateOrderData {
  orderCode: string;
  customerId: Types.ObjectId;
  customerName: string;
  customerPhone?: string;
  leadId?: Types.ObjectId;
  productId?: Types.ObjectId;
  comboId?: Types.ObjectId;
  productSnapshot?: { code: string; name: string };
  comboSnapshot?: { code: string; name: string };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: "VND" | "MNT" | "USD";
  estimatedWeight?: number;
  marketingEmployeeId?: Types.ObjectId;
  saleEmployeeId?: Types.ObjectId;
  orderSource: string;
  note?: string;
  // Sprint 6.1: Order items and summary
  orderItems?: Array<Record<string, unknown>>;
  summary?: {
    subtotal: number;
    discount: number;
    shippingFee: number;
    grandTotal: number;
    currency: string;
  };
}

export interface UpdateOrderData {
  customerId?: Types.ObjectId;
  customerName?: string;
  customerPhone?: string;
  productId?: Types.ObjectId;
  comboId?: Types.ObjectId;
  productVariantId?: Types.ObjectId;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  currency?: "VND" | "MNT" | "USD";
  estimatedWeight?: number;
  actualWeight?: number;
  warehouseId?: Types.ObjectId;
  marketingEmployeeId?: Types.ObjectId;
  saleEmployeeId?: Types.ObjectId;
  status?: string;
  isPrepaid?: boolean;
  orderItems?: Array<Record<string, unknown>>;
  summary?: {
    subtotal: number;
    discount: number;
    shippingFee: number;
    grandTotal: number;
    currency: string;
  };
  orderType?: string;
  orderSource?: string;
  payments?: Array<{
    method: string;
    amount: number;
    currency: string;
    paidAt?: Date;
    transactionId?: string;
    note?: string;
  }>;
  totalPaid?: number;
  shipping?: {
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
    shippingFeeCurrency: string;
  };
  note?: string;
  isActive?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function mapToOrder(doc: IOrder) {
  return {
    _id: doc._id.toString(),
    orderCode: doc.orderCode,
    customerId: doc.customerId.toString(),
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    leadId: doc.leadId?.toString(),
    productId: doc.productId?.toString(),
    comboId: doc.comboId?.toString(),
    productVariantId: doc.productVariantId?.toString(),
    productSnapshot: doc.productSnapshot,
    comboSnapshot: doc.comboSnapshot,
    quantity: doc.quantity,
    unitPrice: doc.unitPrice,
    totalAmount: doc.totalAmount,
    currency: doc.currency,
    estimatedWeight: doc.estimatedWeight,
    actualWeight: doc.actualWeight,
    warehouseId: doc.warehouseId?.toString(),
    stockReservedAt: doc.stockReservedAt?.toISOString(),
    marketingEmployeeId: doc.marketingEmployeeId?.toString(),
    saleEmployeeId: doc.saleEmployeeId?.toString(),
    status: doc.status,
    isPrepaid: doc.isPrepaid,
    orderType: doc.orderType,
    orderSource: doc.orderSource,
    payments: doc.payments,
    totalPaid: doc.totalPaid,
    shipping: doc.shipping,
    revenueLocked: doc.revenueLocked,
    revenueOwnerOrderId: doc.revenueOwnerOrderId?.toString(),
    marketingRevenueRaw: doc.marketingRevenueRaw,
    marketingRevenueFinal: doc.marketingRevenueFinal,
    saleRevenueRaw: doc.saleRevenueRaw,
    saleRevenueFinal: doc.saleRevenueFinal,
    revenueEligible: doc.revenueEligible,
    revenueLockReason: doc.revenueLockReason,
    revenueCalculatedAt: doc.revenueCalculatedAt?.toISOString(),
    note: doc.note,
    isActive: doc.isActive,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function buildFilter(params: OrderFilter): Record<string, unknown> {
  const filter: Record<string, unknown> = { isActive: true };

  if (params.keyword) {
    filter.$or = [
      { orderCode: { $regex: params.keyword, $options: "i" } },
      { customerName: { $regex: params.keyword, $options: "i" } },
    ];
  }

  if (params.status) {
    filter.status = params.status;
  }

  if (params.orderType) {
    filter.orderType = params.orderType;
  }

  if (params.orderSource) {
    filter.orderSource = params.orderSource;
  }

  if (params.saleEmployeeId) {
    filter.saleEmployeeId = new mongoose.Types.ObjectId(params.saleEmployeeId);
  }

  if (params.customerId) {
    filter.customerId = new mongoose.Types.ObjectId(params.customerId);
  }

  if (params.warehouseId) {
    filter.warehouseId = new mongoose.Types.ObjectId(params.warehouseId);
  }

  if (params.revenueLocked !== undefined) {
    filter.revenueLocked = params.revenueLocked;
  }

  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) {
      (filter.createdAt as Record<string, Date>).$gte = new Date(params.dateFrom);
    }
    if (params.dateTo) {
      const endDate = new Date(params.dateTo);
      endDate.setHours(23, 59, 59, 999);
      (filter.createdAt as Record<string, Date>).$lte = endDate;
    }
  }

  return filter;
}

const SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "orderCode",
  "customerName",
  "status",
  "totalAmount",
]);

function buildSort(params: OrderFilter): Record<string, SortOrder> {
  const sortField = params.sort && SORT_FIELDS.has(params.sort) ? params.sort : "createdAt";
  const sortOrder: SortOrder = params.order === "asc" ? 1 : -1;
  return { [sortField]: sortOrder };
}

// ============================================================================
// Order Repository
// ============================================================================

export class OrderRepository {
  /**
   * Create a new order (no transaction here - transaction managed by caller)
   */
  async create(data: CreateOrderData, session?: mongoose.ClientSession): Promise<ReturnType<typeof mapToOrder>> {
    const order = new Order({
      ...data,
      status: "PENDING",
      isPrepaid: false,
      orderType: "NORMAL",
      payments: [],
      totalPaid: 0,
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 0,
      marketingRevenueFinal: 0,
      saleRevenueRaw: 0,
      saleRevenueFinal: 0,
      isActive: true,
    });

    const doc = await order.save({ session });
    return mapToOrder(doc);
  }

  /**
   * Find order by ID
   */
  async findById(id: string): Promise<ReturnType<typeof mapToOrder> | null> {
    const doc = await Order.findById(id).lean();
    if (!doc) return null;
    return mapToOrder(doc as IOrder);
  }

  /**
   * Find order by ID with population
   */
  async findByIdWithPopulate(id: string): Promise<IOrder | null> {
    return Order.findById(id)
      .populate("customerId", "_id code name phone")
      .populate("leadId", "_id leadCode")
      .populate("productId", "_id code name")
      .populate("comboId", "_id code name")
      .populate("orderItems.details.attributes.optionId", "_id name")
      .populate("orderItems.details.attributes.valueId", "_id name")
      .populate("warehouseId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .populate("saleEmployeeId", "_id employeeCode fullName")
      .lean();
  }

  /**
   * Update a order by ID
   */
  async update(id: string, data: UpdateOrderData, session?: mongoose.ClientSession): Promise<ReturnType<typeof mapToOrder> | null> {
    const doc = await Order.findByIdAndUpdate(id, data, { new: true, session }).lean();
    if (!doc) return null;
    return mapToOrder(doc as IOrder);
  }

  /**
   * Soft delete a order by ID
   */
  async softDelete(id: string, session?: mongoose.ClientSession): Promise<boolean> {
    const result = await Order.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true, session }
    );
    return result !== null;
  }

  /**
   * Find all orders with pagination
   */
  async findAll(params: OrderFilter) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;
    const filter = buildFilter(params);

    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "_id code name phone")
        .populate("leadId", "_id leadCode")
        .populate("productId", "_id code name")
        .populate("comboId", "_id code name")
        .populate("warehouseId", "_id code name")
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .populate("saleEmployeeId", "_id employeeCode fullName")
        .sort(buildSort(params))
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return {
      items: items.map((doc) => mapToOrder(doc as IOrder)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Count orders matching filter
   */
  async count(params: Partial<OrderFilter> = {}): Promise<number> {
    const filter = buildFilter(params as OrderFilter);
    return Order.countDocuments(filter);
  }

  /**
   * Check if order exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const count = await Order.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Check if order is active
   */
  async isActive(id: string): Promise<boolean> {
    const count = await Order.countDocuments({ _id: id, isActive: true });
    return count > 0;
  }

  /**
   * Change order status
   * Sprint 6.2: Order Workflow
   */
  async changeStatus(
    id: string,
    status: string,
    session?: mongoose.ClientSession
  ): Promise<ReturnType<typeof mapToOrder> | null> {
    const doc = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, session }
    ).lean();

    if (!doc) return null;
    return mapToOrder(doc as IOrder);
  }
}

// Singleton instance
export const orderRepository = new OrderRepository();
