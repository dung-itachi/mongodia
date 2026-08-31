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
import { Lead } from "@/models/Lead";
import { LeadHistory } from "@/models/LeadHistory";
import { orderRepository } from "@/repositories/order.repository";
import { orderHistoryService } from "@/services/order-history.service";
import { OrderSource, OrderStatus, ORDER_STATUS_LABELS, OrderAction } from "@/constants/orderStatus";
import { LeadStatus, LEAD_STATUS_LABELS } from "@/constants/leadStatus";
import { LeadAction } from "@/constants/leadAction";
import {
  isStatusTransitionAllowed,
  getAllowedNextStatuses,
  ALLOWED_STATUS_TRANSITIONS,
} from "@/configs/order-status.config";
import Employee from "@/models/Employee";
import Customer, { ICustomer } from "@/models/Customer";
// Sprint 6.3: Warehouse Integration
import { warehouseService } from "@/services/warehouse.service";
import { getKho2Id } from "@/config/warehouse-topology.config";
// Stock Engine (Phase 4.5) — reserve stock khi tạo đơn
import { reserveStock } from "@/services/warehouse/stockEngine.service";
import { StockEngineError } from "@/services/warehouse/stockEngine.errors";
import {
  orderItemsToDemands,
  type NormalizedOrderItemShape,
} from "@/services/warehouse/orderDemand";
import { buildStockWiringPlanForCreate, type OrderStockSnapshot } from "@/services/order/orderStockWiring.helper";
import { InventoryReferenceType } from "@/constants/inventoryStatus";
// Revenue Lock Engine — tính lại doanh thu khi đổi status
import { resolveCustomerRevenue } from "@/services/order/revenueEngine.service";
import { Order as OrderModel } from "@/models/Order";

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
  warehouseId?: string;
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
  // Sprint 8.x: thời gian đơn hàng
  orderDate?: Date;
  receivedDate?: Date;
  convertedAt?: Date;
  confirmedAt?: Date;
  // Sprint 8.x: địa chỉ giao hàng từ Lead
  address?: string;
}

export interface CreateCustomerFromLeadData {
  customerName: string;
  phone: string;
  email?: string;
  address?: string;
  marketingEmployeeId?: string;
  saleEmployeeId?: string;
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
        comboName: item.comboName || "",
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
        productName: item.productName || "",
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
   * Sprint 8.x: Sync Lead.status ngược lại khi Order chạm trạng thái đầu cuối
   * (CONFIRMED/CANCELLED/RETURNED) để /leads và /marketing/orders phản ánh đúng.
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
      const updatedOrder = await orderRepository.changeStatus(
        orderId,
        newStatus,
        session,
        newStatus === OrderStatus.DELIVERED ? new Date() : undefined
      );

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

      // ─────────────────────────────────────────────────────────────────────
      // Revenue Lock Engine wiring (Sprint Revenue Feature)
      // ─────────────────────────────────────────────────────────────────────
      // Logic:
      //   - WAIT_CONFIRM → CONFIRMED: SET marketingRevenueRaw / saleRevenueRaw
      //     = grandTotal - shippingFee. MKT/Sale được tính doanh thu từ đây.
      //   - * → CANCELLED: SET revenue Raw/Final = 0, ghi ORDER_CANCELLED reason.
      //     Engine sẽ unlock slot cho đơn sau cùng customer+product/combo.
      //   - * → RETURNED: SET revenue Raw/Final = 0, ghi ORDER_CANCELLED reason.
      //   - Sau cùng gọi resolveCustomerRevenue để engine tính lại Final cho
      //     cả customer (đơn trước cancel → đơn sau được unlock + được tính).
      // ─────────────────────────────────────────────────────────────────────
      const revenueUpdate: Record<string, unknown> = {};
      const oldSummary = (existingOrder as { summary?: { grandTotal?: number; shippingFee?: number } }).summary;
      const oldShipping = (existingOrder as { shipping?: { shippingFee?: number } }).shipping;
      const grandTotal =
        oldSummary?.grandTotal
        ?? (existingOrder as { totalAmount?: number }).totalAmount
        ?? 0;
      const shippingFee =
        oldSummary?.shippingFee
        ?? oldShipping?.shippingFee
        ?? 0;
      const netRevenue = Math.max(0, grandTotal - shippingFee);

      // CONFIRMED: set Raw → engine sẽ tính Final = Raw (nếu không bị lock).
      if (
        currentStatus === OrderStatus.WAIT_CONFIRM &&
        newStatus === OrderStatus.CONFIRMED
      ) {
        revenueUpdate.marketingRevenueRaw = netRevenue;
        revenueUpdate.saleRevenueRaw = netRevenue;
        revenueUpdate.confirmedAt = new Date();
      }

      // CANCELLED / RETURNED: xóa doanh thu.
      if (
        (newStatus === OrderStatus.CANCELLED || newStatus === OrderStatus.RETURNED) &&
        currentStatus !== OrderStatus.CANCELLED &&
        currentStatus !== OrderStatus.RETURNED
      ) {
        revenueUpdate.marketingRevenueRaw = 0;
        revenueUpdate.saleRevenueRaw = 0;
        revenueUpdate.marketingRevenueFinal = 0;
        revenueUpdate.saleRevenueFinal = 0;
        revenueUpdate.revenueEligible = false;
        revenueUpdate.revenueLockReason = "ORDER_CANCELLED";
        revenueUpdate.revenueCalculatedAt = new Date();
      }

      if (Object.keys(revenueUpdate).length > 0) {
        await OrderModel.updateOne(
          { _id: orderId },
          { $set: revenueUpdate },
          { session }
        );
      }

      // Recalc revenue engine cho customer (chỉ khi status thay đổi ảnh hưởng slot).
      if (
        (currentStatus === OrderStatus.WAIT_CONFIRM && newStatus === OrderStatus.CONFIRMED) ||
        newStatus === OrderStatus.CANCELLED ||
        newStatus === OrderStatus.RETURNED ||
        newStatus === OrderStatus.DELIVERED ||
        newStatus === OrderStatus.SHIPPING
      ) {
        await resolveCustomerRevenue(
          (existingOrder as { customerId: { toString(): string } }).customerId.toString(),
          {
            session,
            actorEmployeeId: new mongoose.Types.ObjectId(employeeId),
          }
        );
      }

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

      // Sprint 8.x: Sync Lead.status khi Order chuyển trạng thái quan trọng
      // để /leads và /marketing/orders phản ánh đúng tiến độ đơn.
      if (existingOrder.leadId) {
        await syncLeadStatusFromOrder({
          leadId: existingOrder.leadId.toString(),
          orderStatus: newStatus as OrderStatus,
          orderId,
          actorEmployeeId: employeeId,
          session,
        });
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

    const counter = await Counter.findOneAndUpdate(
      { key: `order_${year}${month}${day}` },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true, session }
    ).lean() as unknown as { seq: number };

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

    const netRevenue = Math.max(0, summary.grandTotal - (data.shipping?.shippingFee ?? 0));
    const isConfirmedOrLater =
      data.status !== undefined &&
      data.status !== OrderStatus.WAIT_CONFIRM &&
      data.status !== OrderStatus.CANCELLED &&
      data.status !== OrderStatus.RETURNED;
    const rawRevenue = isConfirmedOrLater ? netRevenue : 0;

    // Sprint Settings: snapshot exchange rate (1 USD → MNT) at creation time.
    // Existing orders are NEVER recalculated when this rate later changes.
    const exchangeRateSnap = await getCurrentExchangeRate();

    // ── Auto-assign KHO2 when warehouseId is missing ───────────────────────
    // Every order that will eventually ship must belong to KHO2 (kho chính
    // bán hàng). If the caller does not supply a warehouseId, resolve KHO2
    // as the single source of truth. This covers:
    //   - Manual order creation (form without warehouse picker)
    //   - Any future flow that calls orderService.create() without warehouseId
    //   - Orders from Lead Convert / Quick Import that already pass warehouseId
    //     are NOT affected (they keep the explicit value).
    let warehouseId: mongoose.Types.ObjectId | undefined;
    if (data.warehouseId) {
      warehouseId = new mongoose.Types.ObjectId(data.warehouseId);
    } else {
      try {
        warehouseId = await getKho2Id();
      } catch {
        // KHO2 not seeded yet — create order without warehouseId.
        // The UI should warn users they need to assign a warehouse before shipping.
      }
    }

    // Wrap insert + reserve trong transaction để rollback nếu reserve fail.
    // Trước đây hàm này KHÔNG gọi reserveStock (chỉ /api/orders route làm).
    // Khi user tạo đơn qua Quick Import / Lead Convert (gọi thẳng service),
    // reservedQuantity vẫn =0 → ship fail "Đang giữ: 0". Bug này được fix
    // bằng cách gọi reserveStock ở đây (Phase 4.5 contract).
    const session = await mongoose.startSession();
    let order: Awaited<ReturnType<typeof orderRepository.create>> | undefined;
    try {
      await session.withTransaction(async () => {
        const created = await orderRepository.create(
          {
            orderCode,
            customerId: new mongoose.Types.ObjectId(data.customerId),
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            leadId: data.leadId ? new mongoose.Types.ObjectId(data.leadId) : undefined,
            productId: data.productId ? new mongoose.Types.ObjectId(data.productId) : undefined,
            comboId: data.comboId ? new mongoose.Types.ObjectId(data.comboId) : undefined,
            warehouseId,
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
            marketingRevenueRaw: rawRevenue,
            saleRevenueRaw: rawRevenue,
            confirmedAt: isConfirmedOrLater ? new Date() : undefined,
          },
          session
        );
        order = created;

        // ── Reserve stock (Phase 4.5) ─────────────────────────────────────
        // Source of truth cho inventory là `orderItems[].details[]`. Nếu thiếu
        // details → không reserve (giống logic ở /api/orders POST route).
        if (warehouseId && processedOrderItems.length > 0) {
          const demands = orderItemsToDemands(
            processedOrderItems as unknown as NormalizedOrderItemShape[]
          );
          const stockSnapshot: OrderStockSnapshot = {
            warehouseId: warehouseId.toString(),
            orderType: "NORMAL" as never,
            demands,
          };
          const stockPlan = buildStockWiringPlanForCreate(stockSnapshot);
          if (stockPlan.reserve.length > 0) {
            await reserveStock(
              warehouseId.toString(),
              stockPlan.reserve,
              {
                actorEmployeeId: new mongoose.Types.ObjectId(createdBy),
                referenceType: InventoryReferenceType.ORDER,
                referenceCode: orderCode,
                orderId: created._id,
                note: `Tạo đơn ${orderCode}`,
              },
              { session }
            );
            await OrderHistory.create(
              [
                {
                  orderId: created._id,
                  employeeId: new mongoose.Types.ObjectId(createdBy),
                  action: OrderAction.STOCK_RESERVED,
                  fieldName: "stockReservedAt",
                  oldValue: null,
                  newValue: new Date(),
                  note: `Tự động reserve khi tạo đơn ${orderCode}`,
                },
              ],
              { session }
            );
          }

          // ---- Revenue Lock Engine (cùng transaction) ---------------------
          if (isConfirmedOrLater) {
            await resolveCustomerRevenue(created.customerId.toString(), {
              session,
              actorEmployeeId: new mongoose.Types.ObjectId(createdBy),
            });
          }
        }
      });
    } finally {
      await session.endSession();
    }

    return order!;
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
    // Check if customer already exists by phone (only if phone is not empty)
    if (data.phone && data.phone.trim()) {
      const existingCustomer = await Customer.findOne({ phone: data.phone.trim(), isActive: true }).lean();
      if (existingCustomer) {
        console.log("[createCustomerFromLead] Found existing customer by phone:", existingCustomer._id);
        return existingCustomer as ICustomer & { _id: mongoose.Types.ObjectId };
      }
    }
    console.log("[createCustomerFromLead] No existing customer, creating new. Phone:", data.phone);

    let areaId: mongoose.Types.ObjectId | undefined;
    let teamId: mongoose.Types.ObjectId | undefined;
    let mkEmployeeId: mongoose.Types.ObjectId | undefined;

    // Try to get areaId/teamId from marketing employee first
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

    // Fallback: try to get areaId/teamId from saleEmployee
    if (!areaId || !teamId) {
      const saleEmployeeId = data.saleEmployeeId;
      if (saleEmployeeId) {
        const saleEmployee = await Employee.findById(saleEmployeeId)
          .select("_id areaId teamId")
          .lean();

        if (saleEmployee) {
          if (!areaId) areaId = (saleEmployee as unknown as { areaId?: mongoose.Types.ObjectId }).areaId;
          if (!teamId) teamId = (saleEmployee as unknown as { teamId?: mongoose.Types.ObjectId }).teamId;
        }
      }
    }

    // Final fallback: try to get from settings
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
    console.log("[createCustomerFromLead] Generated customerCode:", customerCode, "seq:", seq);

    const customer = new Customer({
      customerCode,
      fullName: data.customerName.trim(),
      phone: (data.phone ?? "").trim(),
      email: data.email ?? "",
      areaId,
      teamId,
      marketingEmployeeId: mkEmployeeId,
      saleEmployeeId: data.saleEmployeeId ? new mongoose.Types.ObjectId(data.saleEmployeeId) : undefined,
      gender: "other",
      birthday: null,
      address: { street: data.address ?? "" },
      note: "",
      isActive: true,
      status: "ACTIVE" as const,
    });

    return customer.save({ session }) as Promise<ICustomer & { _id: mongoose.Types.ObjectId }>;
  }

  /**
   * Create order from lead (Sprint 5.7)
   */
  async createFromLead(data: CreateFromLeadData, session?: mongoose.ClientSession) {
    // DEBUG: log gift values being persisted to DB
    console.log("[createFromLead] orderItem.giftMode:", data.orderItem?.giftMode);
    console.log("[createFromLead] orderItem.giftSelections:", JSON.stringify(data.orderItem?.giftSelections));

    const orderCode = await this.generateOrderCode(session);

    // Sprint Settings: snapshot exchange rate at the moment the lead
    // is converted. Existing orders keep their snapshot — only new
    // orders see the latest rate.
    const exchangeRateSnap = await getCurrentExchangeRate();

    // Auto-assign KHO2 when warehouseId is not provided.
    // This mirrors the logic in create() so Lead Convert flow also
    // guarantees every order is associated with KHO2 (kho chính bán hàng).
    let warehouseId: mongoose.Types.ObjectId | undefined;
    if (data.warehouseId) {
      warehouseId = new mongoose.Types.ObjectId(data.warehouseId);
    } else {
      try {
        warehouseId = await getKho2Id(session);
      } catch {
        // KHO2 not seeded yet — create order without warehouseId.
      }
    }

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
        warehouseId,
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
              optionName: attribute.optionName,
              valueName: attribute.valueName,
            })),
          })),
          sku: "",
          productName: data.orderItem.comboName,
          quantity: data.orderItem.comboQuantity,
          unitPrice: data.orderItem.sellingPrice,
        }] : [],
        // Sprint 8.x: thời gian đơn hàng từ Lead
        orderDate: data.orderDate,
        receivedDate: data.receivedDate,
        convertedAt: data.convertedAt,
        confirmedAt: data.confirmedAt,
        // Sprint 8.x: convert từ lead = đơn mới, cần xác nhận
        status: OrderStatus.WAIT_CONFIRM,
        // Sprint 8.x: địa chỉ giao hàng từ Lead
        shipping: data.address
          ? {
              receiverName: data.customerName,
              receiverPhone: data.customerPhone ?? "",
              address: data.address,
              shippingFee: 0,
              shippingFeeCurrency: data.currency,
            }
          : undefined,
      },
      session
    );
  }
}

// ============================================================================
// Sprint 8.x — Sync Lead.status từ Order.status
// ============================================================================

/**
 * Map Order.status (terminal/snapshot) sang Lead.status tương ứng.
 * Trả về null nếu không cần sync (giữ nguyên Lead.status hiện tại).
 *
 * - Lead đã được Sale chốt (CLOSED) ngay khi convert, nên CONFIRMED không
 *   cần chuyển gì thêm (Sale chốt = đã chốt, Admin xác nhận là bước riêng).
 * - CANCELLED → CANCELLED ("Hủy")
 * - RETURNED  → LOST ("Không mua" — khách không nhận hàng)
 * - PACKING/SHIPPING/DELIVERED/RECONCILED → null (giữ CLOSED, đơn vẫn đang xử lý)
 */
function mapOrderStatusToLeadStatus(orderStatus: OrderStatus): LeadStatus | null {
  switch (orderStatus) {
    case OrderStatus.CANCELLED:
      return LeadStatus.CANCELLED;
    case OrderStatus.RETURNED:
      return LeadStatus.LOST;
    default:
      return null;
  }
}

interface SyncLeadStatusInput {
  leadId: string;
  orderId: string;
  orderStatus: OrderStatus;
  actorEmployeeId: string;
  session: mongoose.ClientSession;
}

/**
 * Sync Lead.status theo Order.status khi Order chuyển trạng thái đầu cuối.
 * Ghi LeadHistory để audit. An toàn để gọi trong transaction của Order.
 */
async function syncLeadStatusFromOrder(input: SyncLeadStatusInput): Promise<void> {
  const newLeadStatus = mapOrderStatusToLeadStatus(input.orderStatus);
  if (!newLeadStatus) return;

  // Chỉ sync khi Lead đã được convert (có convertedOrderId trỏ về order này)
  // tránh ghi đè trạng thái Lead không liên quan.
  const lead = await Lead.findOneAndUpdate(
    {
      _id: input.leadId,
      convertedOrderId: new mongoose.Types.ObjectId(input.orderId),
    },
    { $set: { status: newLeadStatus, updatedAt: new Date() } },
    { returnDocument: "after", session: input.session },
  );
  if (!lead) return;

  await LeadHistory.create(
    [
      {
        leadId: lead._id,
        employeeId: new mongoose.Types.ObjectId(input.actorEmployeeId),
        action: LeadAction.STATUS_CHANGED,
        oldValue: LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status,
        newValue: LEAD_STATUS_LABELS[newLeadStatus],
        note: `Đồng bộ từ Order: ${ORDER_STATUS_LABELS[input.orderStatus]} (${input.orderStatus})`,
      },
    ],
    { session: input.session },
  );
}

// Singleton instance
export const orderService = new OrderService();
