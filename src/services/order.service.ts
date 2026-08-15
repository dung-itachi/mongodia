/**
 * Order Service (Sprint 6.0 — Order Module Foundation)
 * Sprint 6.1 — Order Detail & Product Lines
 * Sprint 6.2 — Order Workflow
 *
 * Clean Architecture: Service layer cho Order.
 * Chứa business logic - được gọi bởi API Routes.
 *
 * Methods:
 *   - create() - Tạo đơn hàng mới
 *   - update() - Cập nhật đơn hàng
 *   - delete() - Xóa mềm đơn hàng
 *   - getById() - Lấy đơn hàng theo ID
 *   - getList() - Lấy danh sách đơn hàng với filter/pagination
 *   - createFromLead() - Tạo đơn từ Lead (Lead Convert flow)
 *   - calculateSubtotal() - Tính tạm tính
 *   - calculateDiscount() - Tính giảm giá
 *   - calculateTotal() - Tính tổng
 *   - calculateGrandTotal() - Tính tổng cộng
 *   - changeStatus() - Đổi trạng thái đơn hàng
 *   - validateStatusTransition() - Kiểm tra chuyển trạng thái hợp lệ
 *   - getAllowedTransitions() - Lấy danh sách trạng thái cho phép
 */

import mongoose from "mongoose";
import Counter from "@/models/Counter";
import Setting from "@/models/Setting";
import Area from "@/models/Area";
import Team from "@/models/Team";
import { OrderHistory } from "@/models/OrderHistory";
import { orderRepository } from "@/repositories/order.repository";
import { orderHistoryService } from "@/services/order-history.service";
import { OrderSource, OrderStatus, ORDER_STATUS_LABELS, OrderAction } from "@/constants/orderStatus";
import {
  isStatusTransitionAllowed,
  getAllowedNextStatuses,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/configs/order-status.config";
import Employee from "@/models/Employee";
import Customer, { ICustomer } from "@/models/Customer";
// Sprint 6.3: Warehouse Integration
import { warehouseService } from "@/services/warehouse.service";

import type { OrderItem as SaleOrderItem } from "@/types/variant";
import type {
  OrderFilter,
  CreateOrderInput,
  UpdateOrderInput,
  CreateOrderItemInput,
  OrderSummaryPrice,
} from "@/types/order";
import { getCurrentExchangeRate } from "@/lib/system-settings";

// ============================================================================
// Types
// ============================================================================

export interface CreateFromLeadData {
  leadId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  productId?: string;
  comboId?: string;
  productSnapshot?: { code: string; name: string };
  comboSnapshot?: { code: string; name: string };
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: "VND" | "MNT" | "USD";
  estimatedWeight?: number;
  marketingEmployeeId?: string;
  saleEmployeeId?: string;
  note?: string;
  orderItem?: SaleOrderItem;
}

export interface CreateCustomerFromLeadData {
  customerName: string;
  phone: string;
  email?: string;
  address?: string;
  marketingEmployeeId?: string;
}

export interface ChangeStatusData {
  orderId: string;
  newStatus: string;
  employeeId: string;
  note?: string;
}

export interface StatusTransitionResult {
  success: true;
  order: unknown;
}
export interface StatusTransitionError {
  success: false;
  error: string;
}

// ============================================================================
// Status Guards
// ============================================================================

const LOCKED_STATUSES = new Set([
  OrderStatus.DELIVERED,
  OrderStatus.RETURNED,
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
  OrderStatus.FAILED,
]);

// ============================================================================
// Order Service
// ============================================================================

export class OrderService {
  // ============================================================================
  // Calculation Methods (Sprint 6.1)
  // ============================================================================

  /**
   * Calculate subtotal from order items
   * subtotal = sum of all (unitPrice * quantity - discount)
   */
  calculateSubtotal(orderItems: Array<{ unitPrice: number; quantity: number; discount: number }>): number {
    return orderItems.reduce((sum, item) => {
      const itemSubtotal = item.unitPrice * item.quantity - item.discount;
      return sum + Math.max(0, itemSubtotal);
    }, 0);
  }

  /**
   * Calculate total discount from order items
   * discount = sum of all item discounts
   */
  calculateDiscount(orderItems: Array<{ discount: number }>): number {
    return orderItems.reduce((sum, item) => sum + Math.max(0, item.discount), 0);
  }

  /**
   * Calculate total = subtotal - itemDiscounts
   * Note: Item-level discounts are already subtracted in subtotal calculation
   */
  calculateTotal(subtotal: number, itemDiscounts: number): number {
    return Math.max(0, subtotal - itemDiscounts);
  }

  /**
   * Calculate grand total = subtotal - itemDiscounts - orderDiscount + shippingFee
   */
  calculateGrandTotal(
    subtotal: number,
    orderDiscount: number,
    shippingFee: number
  ): number {
    return Math.max(0, subtotal - orderDiscount + shippingFee);
  }

  /**
   * Build complete order summary (Sprint 6.1)
   */
  buildOrderSummary(
    orderItems: Array<{ unitPrice: number; quantity: number; discount: number }>,
    orderDiscount: number,
    shippingFee: number,
    currency: "VND" | "MNT" | "USD" = "MNT"
  ): OrderSummaryPrice {
    const subtotal = this.calculateSubtotal(orderItems);
    const grandTotal = this.calculateGrandTotal(subtotal, orderDiscount, shippingFee);

    return {
      subtotal,
      discount: orderDiscount,
      shippingFee,
      grandTotal,
      currency,
    };
  }

  /**
   * Process order items from input (Sprint 6.1)
   * Calculate subtotal for each item
   */
  processOrderItems(orderItems: CreateOrderItemInput[]): Array<Record<string, unknown>> {
    return orderItems.map((item) => {
      const comboQuantity = item.comboQuantity ?? item.quantity ?? 1;
      const packageQuantity = item.packageQuantity ?? 1;
      const sellingPrice = item.sellingPrice ?? item.unitPrice ?? 0;
      const discount = item.discount ?? 0;
      const subtotal = item.subtotal ?? Math.max(0, sellingPrice * comboQuantity - discount);

      return {
        comboId: item.comboId ? new mongoose.Types.ObjectId(item.comboId) : undefined,
        productId: item.productId ? new mongoose.Types.ObjectId(item.productId) : undefined,
        comboName: item.comboName ?? item.productName ?? "",
        comboCode: item.comboCode ?? "",
        comboQuantity,
        packageQuantity,
        giftQuantity: item.giftQuantity ?? 0,
        sellingPrice,
        discount,
        subtotal,
        details: (item.details ?? []).map((detail) => ({
          variantId: detail.variantId ? new mongoose.Types.ObjectId(detail.variantId) : undefined,
          attributes: detail.attributes.map((attribute) => ({
            optionId: new mongoose.Types.ObjectId(attribute.optionId),
            valueId: new mongoose.Types.ObjectId(attribute.valueId),
          })),
          quantity: detail.quantity,
        })),
        giftMode: item.giftMode ?? "RANDOM",
        giftSelections: (item.giftSelections ?? []).map((gift) => ({
          giftProductId: new mongoose.Types.ObjectId(gift.giftProductId),
          giftProductName: gift.giftProductName ?? "",
          quantity: gift.quantity,
        })),
        sku: item.sku ?? "",
        productName: item.productName ?? item.comboName ?? "",
        quantity: comboQuantity,
        unitPrice: sellingPrice,
      };
    });
  }

  // ============================================================================
  // Status Workflow (Sprint 6.2)
  // ============================================================================

  /**
   * Validate if a status transition is allowed
   * Sprint 6.2: Order Workflow
   */
  validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    return isStatusTransitionAllowed(currentStatus, newStatus);
  }

  /**
   * Get allowed next statuses for a given status
   * Sprint 6.2: Order Workflow
   */
  getAllowedTransitions(currentStatus: string): string[] {
    return getAllowedNextStatuses(currentStatus);
  }

  /**
   * Change order status with validation
   * Sprint 6.2: Order Workflow
   */
  async changeStatus(
    data: ChangeStatusData
  ): Promise<StatusTransitionResult | StatusTransitionError> {
    const { orderId, newStatus, employeeId, note } = data;

    // Check order exists
    const existingOrder = await orderRepository.findById(orderId);
    if (!existingOrder) {
      return { success: false, error: "Đơn hàng không tồn tại" };
    }

    // Check order is active
    if (!existingOrder.isActive) {
      return { success: false, error: "Đơn hàng không hoạt động" };
    }

    const currentStatus = existingOrder.status;

    // Check if status is the same
    if (currentStatus === newStatus) {
      return { success: false, error: "Trạng thái không thay đổi" };
    }

    // Validate transition
    if (!this.validateStatusTransition(currentStatus, newStatus)) {
      const allowed = this.getAllowedTransitions(currentStatus);
      const allowedLabels = allowed
        .map((s) => ORDER_STATUS_LABELS[s as OrderStatus] || s)
        .join(", ");
      return {
        success: false,
        error: `Không thể chuyển từ "${ORDER_STATUS_LABELS[currentStatus as OrderStatus]}" sang "${ORDER_STATUS_LABELS[newStatus as OrderStatus] || newStatus}". Các trạng thái cho phép: ${allowedLabels}`,
      };
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Update status in repository
      const updatedOrder = await orderRepository.changeStatus(orderId, newStatus, session);

      if (!updatedOrder) {
        await session.abortTransaction();
        return { success: false, error: "Không thể cập nhật trạng thái" };
      }

      // Create history
      await orderHistoryService.createStatusChangeHistory(
        {
          orderId,
          employeeId,
          oldStatus: ORDER_STATUS_LABELS[currentStatus as OrderStatus] || currentStatus,
          newStatus: ORDER_STATUS_LABELS[newStatus as OrderStatus] || newStatus,
          note: note || "Đổi trạng thái đơn hàng",
        },
        session
      );

      // Sprint 6.3: Auto-create WarehouseTask when Order moves to PACKING
      if (newStatus === OrderStatus.PACKING) {
        await warehouseService.createFromOrder(
          {
            orderId,
            employeeId,
            note: "Tự động tạo task khi đơn chuyển sang PACKING",
          },
          { session }
        );
      }

      await session.commitTransaction();
      return { success: true, order: updatedOrder };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // ============================================================================
  // Business Logic
  // ============================================================================

  /**
   * Generate unique order code
   */
  async generateOrderCode(session?: mongoose.ClientSession): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const counter = await Counter.findByIdAndUpdate(
      `order_${year}${month}${day}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, session }
    ) as unknown as { seq: number };

    const sequence = (counter.seq || 1).toString().padStart(4, "0");
    return `OD${year}${month}${day}${sequence}`;
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Create a new order (Sprint 6.1 - with orderItems support)
   */
  async create(data: CreateOrderInput, createdBy: string) {
    const orderCode = await this.generateOrderCode();

    // Process order items (Sprint 6.1)
    const processedOrderItems = data.orderItems
      ? this.processOrderItems(data.orderItems)
      : [];

    const currency = data.currency ?? "MNT";

    // Build summary (Sprint 6.1)
    const summary = this.buildOrderSummary(
      processedOrderItems.map((item) => ({
        unitPrice: Number(item.sellingPrice ?? item.unitPrice ?? 0),
        quantity: Number(item.comboQuantity ?? item.quantity ?? 1),
        discount: Number(item.discount ?? 0),
      })),
      0, // No order-level discount on create
      data.shipping?.shippingFee ?? 0,
      currency
    );

    // Sprint Settings: snapshot exchange rate (1 USD → MNT) at creation time.
    // Existing orders are NEVER recalculated when this rate later changes.
    const exchangeRateSnap = await getCurrentExchangeRate();

    const order = await orderRepository.create({
      orderCode,
      customerId: new mongoose.Types.ObjectId(data.customerId),
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      leadId: data.leadId ? new mongoose.Types.ObjectId(data.leadId) : undefined,
      productId: data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined,
      comboId: data.comboId ? new mongoose.Types.ObjectId(data.comboId) : undefined,
      productSnapshot: undefined,
      comboSnapshot: undefined,
      quantity: data.quantity ?? 1,
      unitPrice: data.unitPrice ?? 0,
      totalAmount: data.totalAmount ?? summary.grandTotal,
      currency,
      exchangeRate: exchangeRateSnap.rate,
      exchangeRateDate: new Date(),
      estimatedWeight: data.estimatedWeight,
      marketingEmployeeId: data.marketingEmployeeId
        ? new mongoose.Types.ObjectId(data.marketingEmployeeId)
        : undefined,
      saleEmployeeId: data.saleEmployeeId
        ? new mongoose.Types.ObjectId(data.saleEmployeeId)
        : undefined,
      orderSource: data.orderSource ?? OrderSource.MANUAL,
      note: data.note,
      // Sprint 6.1: Order items and summary
      orderItems: processedOrderItems,
      summary,
    });

    return order;
  }

  /**
   * Update an order (Sprint 6.1 - with orderItems and summary support)
   */
  async update(
    id: string,
    data: UpdateOrderInput,
    updatedBy: string
  ): Promise<{ success: true; order: unknown } | { success: false; error: string }> {
    // Check order exists
    const existingOrder = await orderRepository.findById(id);
    if (!existingOrder) {
      return { success: false, error: "Đơn hàng không tồn tại" };
    }

    // Check order is active
    if (!existingOrder.isActive) {
      return { success: false, error: "Đơn hàng không hoạt động" };
    }

    // Check status is not locked
    if (LOCKED_STATUSES.has(existingOrder.status as OrderStatus)) {
      return {
        success: false,
        error: `Không thể sửa đơn ở trạng thái ${ORDER_STATUS_LABELS[existingOrder.status as OrderStatus]}`,
      };
    }

    // Build update payload
    const updateData: Record<string, unknown> = {};

    if (data.customerId !== undefined) updateData.customerId = new mongoose.Types.ObjectId(data.customerId);
    if (data.customerName !== undefined) updateData.customerName = data.customerName;
    if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone;
    if (data.productId !== undefined) updateData.productId = data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined;
    if (data.comboId !== undefined) updateData.comboId = data.comboId ? new mongoose.Types.ObjectId(data.comboId) : undefined;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.estimatedWeight !== undefined) updateData.estimatedWeight = data.estimatedWeight;
    if (data.actualWeight !== undefined) updateData.actualWeight = data.actualWeight;
    if (data.warehouseId !== undefined) updateData.warehouseId = data.warehouseId ? new mongoose.Types.ObjectId(data.warehouseId) : undefined;
    if (data.marketingEmployeeId !== undefined) updateData.marketingEmployeeId = data.marketingEmployeeId ? new mongoose.Types.ObjectId(data.marketingEmployeeId) : undefined;
    if (data.saleEmployeeId !== undefined) updateData.saleEmployeeId = data.saleEmployeeId ? new mongoose.Types.ObjectId(data.saleEmployeeId) : undefined;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isPrepaid !== undefined) updateData.isPrepaid = data.isPrepaid;
    if (data.orderType !== undefined) updateData.orderType = data.orderType;
    if (data.orderSource !== undefined) updateData.orderSource = data.orderSource;
    if (data.payments !== undefined) updateData.payments = data.payments;
    if (data.totalPaid !== undefined) updateData.totalPaid = data.totalPaid;
    if (data.shipping !== undefined) updateData.shipping = data.shipping;
    if (data.note !== undefined) updateData.note = data.note;

    // Sprint 6.1: Process order items if provided
    if (data.orderItems !== undefined) {
      const processedOrderItems = this.processOrderItems(data.orderItems);
      updateData.orderItems = processedOrderItems;

      // Get existing order-level discount or use new one
      const existingSummary = (existingOrder as unknown as { summary?: { discount: number; shippingFee: number } }).summary;
      const orderDiscount = data.summaryDiscount ?? existingSummary?.discount ?? 0;
      const shippingFee = data.shipping?.shippingFee ?? data.summaryShippingFee ?? existingSummary?.shippingFee ?? 0;
      const currency = (data.currency ?? existingOrder.currency ?? "VND") as "VND" | "MNT" | "USD";

      // Recalculate summary
      const summary = this.buildOrderSummary(
        processedOrderItems.map((item) => ({
          unitPrice: Number(item.sellingPrice ?? item.unitPrice ?? 0),
          quantity: Number(item.comboQuantity ?? item.quantity ?? 1),
          discount: Number(item.discount ?? 0),
        })),
        orderDiscount,
        shippingFee,
        currency
      );
      updateData.summary = summary;
      updateData.totalAmount = summary.grandTotal;
    } else if (data.summaryDiscount !== undefined || data.summaryShippingFee !== undefined) {
      // Update summary fields only
      const existingSummary = (existingOrder as unknown as { summary?: { subtotal: number; discount: number; shippingFee: number; currency: "VND" | "MNT" | "USD" } }).summary;

      if (existingSummary) {
        const orderDiscount = data.summaryDiscount ?? existingSummary.discount;
        const shippingFee = data.summaryShippingFee ?? existingSummary.shippingFee;
        const currency = existingSummary.currency;

        const summary = this.buildOrderSummary(
          [{ unitPrice: existingSummary.subtotal, quantity: 1, discount: 0 }], // Dummy item with subtotal
          orderDiscount,
          shippingFee,
          currency
        );
        // Reconstruct with correct subtotal
        summary.subtotal = existingSummary.subtotal;
        summary.grandTotal = Math.max(0, summary.subtotal - orderDiscount + shippingFee);

        updateData.summary = summary;
        updateData.totalAmount = summary.grandTotal;
      }
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const updatedOrder = await orderRepository.update(id, updateData as Parameters<typeof orderRepository.update>[1], session);

      if (!updatedOrder) {
        await session.abortTransaction();
        return { success: false, error: "Không thể cập nhật đơn hàng" };
      }

      // Create history for status change
      if (data.status && data.status !== existingOrder.status) {
        // Map status to workflow action (Sprint 8.5)
        const statusActionMap: Record<string, OrderAction> = {
          [OrderStatus.WAIT_CONFIRM]: OrderAction.WAIT_CONFIRM,
          [OrderStatus.CONFIRMED]: OrderAction.CONFIRMED,
          [OrderStatus.PACKING]: OrderAction.PACKING,
          [OrderStatus.SHIPPING]: OrderAction.SHIPPING,
          [OrderStatus.DELIVERED]: OrderAction.DELIVERED,
          [OrderStatus.RETURNED]: OrderAction.RETURNED,
          [OrderStatus.RECONCILED]: OrderAction.RECONCILED,
          [OrderStatus.CANCELLED]: OrderAction.CANCELLED,
        };
        const action = statusActionMap[data.status] || OrderAction.UPDATED;

        await OrderHistory.create(
          [
            {
              orderId: new mongoose.Types.ObjectId(id),
              employeeId: new mongoose.Types.ObjectId(updatedBy),
              action,
              fieldName: "status",
              oldValue: ORDER_STATUS_LABELS[existingOrder.status as OrderStatus],
              newValue: ORDER_STATUS_LABELS[data.status as OrderStatus],
              note: "Đổi trạng thái",
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();
      return { success: true, order: updatedOrder };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Soft delete an order
   */
  async delete(
    id: string,
    deletedBy: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    // Check order exists
    const existingOrder = await orderRepository.findById(id);
    if (!existingOrder) {
      return { success: false, error: "Đơn hàng không tồn tại" };
    }

    // Check order is active
    if (!existingOrder.isActive) {
      return { success: false, error: "Đơn hàng không hoạt động" };
    }

    // Check status is not completed
    if (existingOrder.status === OrderStatus.DELIVERED) {
      return { success: false, error: "Không thể xóa đơn đã giao" };
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const result = await orderRepository.softDelete(id, session);

      if (!result) {
        await session.abortTransaction();
        return { success: false, error: "Không thể xóa đơn hàng" };
      }

      await OrderHistory.create(
        [
          {
            orderId: new mongoose.Types.ObjectId(id),
            employeeId: new mongoose.Types.ObjectId(deletedBy),
            action: "DELETED",
            note: "Xóa đơn hàng (soft delete)",
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return { success: true };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get order by ID
   */
  async getById(id: string) {
    return orderRepository.findById(id);
  }

  /**
   * Get order with full population
   */
  async getByIdWithPopulate(id: string) {
    return orderRepository.findByIdWithPopulate(id);
  }

  /**
   * Get list of orders with filter/pagination
   */
  async getList(params: OrderFilter) {
    return orderRepository.findAll({
      ...params,
      isActive: true,
    });
  }

  // ============================================================================
  // Lead Convert Flow
  // ============================================================================

  /**
   * Auto-create Customer from Lead if not exists
   */
  async createCustomerFromLead(
    data: CreateCustomerFromLeadData,
    session?: mongoose.ClientSession
  ): Promise<ICustomer & { _id: mongoose.Types.ObjectId }> {
    let areaId: mongoose.Types.ObjectId | undefined;
    let teamId: mongoose.Types.ObjectId | undefined;
    let mkEmployeeId: mongoose.Types.ObjectId | undefined;

    if (data.marketingEmployeeId) {
      const employee = await Employee.findById(data.marketingEmployeeId)
        .select("_id areaId teamId")
        .lean();

      if (employee) {
        areaId = (employee as unknown as { areaId?: mongoose.Types.ObjectId }).areaId;
        teamId = (employee as unknown as { teamId?: mongoose.Types.ObjectId }).teamId;
        mkEmployeeId = (employee as unknown as { _id: mongoose.Types.ObjectId })._id;
      }
    }

    if (!areaId || !teamId) {
      const settings = await Setting.find({ key: { $in: ["DEFAULT_AREA_CODE", "DEFAULT_TEAM_CODE"] } })
        .select("key value")
        .lean();

      const settingsMap: Record<string, string> = {};
      for (const s of settings as Array<{ key: string; value: string }>) {
        settingsMap[s.key] = s.value;
      }

      const [area, team] = await Promise.all([
        areaId ? Promise.resolve(null) : Area.findOne({ code: settingsMap["DEFAULT_AREA_CODE"] }).select("_id").lean(),
        teamId ? Promise.resolve(null) : Team.findOne({ code: settingsMap["DEFAULT_TEAM_CODE"] }).select("_id").lean(),
      ]);

      if (area && !areaId) areaId = (area as unknown as { _id: mongoose.Types.ObjectId })._id;
      if (team && !teamId) teamId = (team as unknown as { _id: mongoose.Types.ObjectId })._id;
    }

    if (!areaId || !teamId) {
      throw new Error(
        "Không thể tạo Customer: không tìm thấy areaId hoặc teamId."
      );
    }

    const COUNTER_KEY = "CUSTOMER";
    const counter = await Counter.findOneAndUpdate(
      { key: COUNTER_KEY },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    ).session(session ?? null);

    const seq = (counter as unknown as { seq?: number }).seq ?? 1;
    const customerCode = `KH${String(seq).padStart(6, "0")}`;

    const customer = new Customer({
      code: customerCode,
      name: data.customerName.trim(),
      phone: (data.phone ?? "").trim(),
      email: data.email ?? "",
      areaId,
      teamId,
      marketingEmployeeId: mkEmployeeId ?? new mongoose.Types.ObjectId(),
      gender: "OTHER",
      birthday: null,
      address: data.address ?? "",
      note: "",
      isActive: true,
    });

    return customer.save({ session }) as Promise<ICustomer & { _id: mongoose.Types.ObjectId }>;
  }

  /**
   * Create order from lead (Sprint 5.7)
   */
  async createFromLead(data: CreateFromLeadData, session?: mongoose.ClientSession) {
    const orderCode = await this.generateOrderCode(session);

    // Sprint Settings: snapshot exchange rate at the moment the lead
    // is converted. Existing orders keep their snapshot — only new
    // orders see the latest rate.
    const exchangeRateSnap = await getCurrentExchangeRate();

    return orderRepository.create(
      {
        orderCode,
        customerId: new mongoose.Types.ObjectId(data.customerId),
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        leadId: new mongoose.Types.ObjectId(data.leadId),
        productId: data.productId
          ? new mongoose.Types.ObjectId(data.productId)
          : undefined,
        comboId: data.comboId
          ? new mongoose.Types.ObjectId(data.comboId)
          : undefined,
        productSnapshot: data.productSnapshot,
        comboSnapshot: data.comboSnapshot,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount: data.totalAmount,
        currency: data.currency,
        exchangeRate: exchangeRateSnap.rate,
        exchangeRateDate: new Date(),
        estimatedWeight: data.estimatedWeight,
        marketingEmployeeId: data.marketingEmployeeId
          ? new mongoose.Types.ObjectId(data.marketingEmployeeId)
          : undefined,
        saleEmployeeId: data.saleEmployeeId
          ? new mongoose.Types.ObjectId(data.saleEmployeeId)
          : undefined,
        orderSource: OrderSource.MANUAL,
        note: data.note,
        summary: data.orderItem
          ? {
              subtotal: data.orderItem.subtotal,
              discount: data.orderItem.discount,
              shippingFee: 0,
              grandTotal: data.orderItem.subtotal,
              currency: data.currency,
            }
          : undefined,
        orderItems: data.orderItem ? [{
          comboId: new mongoose.Types.ObjectId(data.orderItem.comboId),
          productId: new mongoose.Types.ObjectId(data.orderItem.productId),
          comboName: data.orderItem.comboName,
          comboCode: data.orderItem.comboCode,
          comboQuantity: data.orderItem.comboQuantity,
          packageQuantity: data.orderItem.packageQuantity,
          giftQuantity: data.orderItem.giftQuantity,
          sellingPrice: data.orderItem.sellingPrice,
          discount: data.orderItem.discount,
          subtotal: data.orderItem.subtotal,
          giftMode: data.orderItem.giftMode,
          giftSelections: data.orderItem.giftSelections.map((selection) => ({
            giftProductId: new mongoose.Types.ObjectId(selection.giftProductId),
            giftProductName: selection.giftProductName,
            quantity: selection.quantity,
          })),
          details: data.orderItem.details.map((detail) => ({
            quantity: detail.quantity,
            variantId: detail.variantId ? new mongoose.Types.ObjectId(detail.variantId) : undefined,
            attributes: detail.attributes.map((attribute) => ({
              optionId: new mongoose.Types.ObjectId(attribute.optionId),
              valueId: new mongoose.Types.ObjectId(attribute.valueId),
            })),
          })),
          sku: "",
          productName: data.orderItem.comboName,
          quantity: data.orderItem.comboQuantity,
          unitPrice: data.orderItem.sellingPrice,
        }] : [],
      },
      session
    );
  }
}

// Singleton instance
export const orderService = new OrderService();
