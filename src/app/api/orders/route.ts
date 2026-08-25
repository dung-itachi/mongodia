import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { Order } from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";
import {
  OrderStatus,
  OrderType,
  OrderSource,
  OrderAction,
} from "@/constants/orderStatus";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Combo from "@/models/Combo";
import Employee from "@/models/Employee";
import Customer from "@/models/Customer";
import Warehouse from "@/models/Warehouse";
import { Lead } from "@/models/Lead";
import Counter from "@/models/Counter";

import { mapOrderList } from "@/mappers/order.mapper";

import { success, error as errorResponse } from "@/utils/response";
import { createOrderSchema } from "@/utils/validator";
import { saleOrderService } from "@/services/sale-order.service";
import type { OrderItem } from "@/types/variant";
import { getCurrentExchangeRate } from "@/lib/system-settings";

import { resolveCustomerRevenue } from "@/services/order/revenueEngine.service";
import {
  reserveStock,
} from "@/services/warehouse/stockEngine.service";
import { StockEngineError } from "@/services/warehouse/stockEngine.errors";
import {
  buildStockWiringPlanForCreate,
  type OrderStockSnapshot,
} from "@/services/order/orderStockWiring.helper";
import { InventoryReferenceType } from "@/constants/inventoryStatus";
import { validateOrderWarehouse } from "@/config/warehouse-topology.config";
import {
  orderItemsToDemands,
  type NormalizedOrderItemShape,
} from "@/services/warehouse/orderDemand";

// ==================================================
// Helpers
// ==================================================

async function generateOrderCode(
  session: mongoose.ClientSession
): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  const counter = await Counter.findOneAndUpdate(
    { key: `order_${year}${month}${day}` },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, session }
  ) as unknown as { seq: number };

  const sequence = (counter.seq || 1).toString().padStart(4, "0");
  return `OD${year}${month}${day}${sequence}`;
}

async function generateCustomerCode(
  session: mongoose.ClientSession
): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  const counter = await Counter.findOneAndUpdate(
    { key: `customer_${year}${month}${day}` },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, session }
  ) as unknown as { seq: number };

  const sequence = (counter.seq || 1).toString().padStart(5, "0");
  return `KH${year}${month}${day}${sequence}`;
}

// ==================================================
// GET /api/orders - List with search/filter/sort
// ==================================================

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("order.view")) {
      return errorResponse("Bạn không có quyền xem đơn hàng", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const keyword = searchParams.get("keyword") ?? "";
    const status = searchParams.get("status") ?? "";
    const orderType = searchParams.get("orderType") ?? "";
    const orderSource = searchParams.get("orderSource") ?? "";
    const warehouseId = searchParams.get("warehouseId") ?? "";
    const customerId = searchParams.get("customerId") ?? "";
    const saleEmployeeIdParam = searchParams.get("saleEmployeeId") ?? "";
    const marketingEmployeeIdParam = searchParams.get("marketingEmployeeId") ?? "";
    const revenueLockedParam = searchParams.get("revenueLocked");
    const createdFrom = searchParams.get("createdFrom") ?? "";
    const createdTo = searchParams.get("createdTo") ?? "";

    const filter: Record<string, unknown> = { isActive: true };

    // ---- Filter by customerId -----------------------------------------
    if (customerId) {
      if (mongoose.Types.ObjectId.isValid(customerId)) {
        filter.customerId = new mongoose.Types.ObjectId(customerId);
      } else {
        // Bad id → return empty list early
        return success({ items: [], total: 0, page, limit, totalPages: 1 });
      }
    }

    if (saleEmployeeIdParam) {
      if (mongoose.Types.ObjectId.isValid(saleEmployeeIdParam)) {
        filter.saleEmployeeId = new mongoose.Types.ObjectId(saleEmployeeIdParam);
      }
    }

    if (marketingEmployeeIdParam) {
      if (mongoose.Types.ObjectId.isValid(marketingEmployeeIdParam)) {
        filter.marketingEmployeeId = new mongoose.Types.ObjectId(marketingEmployeeIdParam);
      }
    }

    // ---- Search: orderCode / customerName / phone ---------------------
    if (keyword) {
      // phone có thể nằm trên Customer → lookup Customer ids trước
      // (1 query duy nhất), sau đó add customerId vào $or.
      const customers = await Customer.find({ phone: { $regex: keyword, $options: "i" } })
        .select("_id")
        .lean();
      const customerIds = customers.map((c) => c._id);

      const orClauses: Record<string, unknown>[] = [
        { orderCode: { $regex: keyword, $options: "i" } },
        { customerName: { $regex: keyword, $options: "i" } },
      ];

      if (customerIds.length > 0) {
        orClauses.push({ customerId: { $in: customerIds } });
      }

      filter.$or = orClauses;
    }

    if (status) {
      // Sprint 8.5: CONFIRMED tab = hiển thị cả WAIT_CONFIRM và CONFIRMED
      if (status === "CONFIRMED") {
        filter.status = { $in: [OrderStatus.WAIT_CONFIRM, OrderStatus.CONFIRMED] };
      } else {
        filter.status = status;
      }
    }

    // isReconciled filter: ?isReconciled=true hoặc ?isReconciled=false
    // Khi có param này, lọc đơn DELIVERED theo flag isReconciled
    const isReconciledParam = searchParams.get("isReconciled");
    if (isReconciledParam !== null) {
      filter.status = OrderStatus.DELIVERED;
      filter.isReconciled = isReconciledParam === "true";
    }

    if (orderType) {
      filter.orderType = orderType;
    }

    if (orderSource) {
      filter.orderSource = orderSource;
    }

    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    if (revenueLockedParam !== null && revenueLockedParam !== "") {
      filter.revenueLocked = revenueLockedParam === "true";
    }

    if (createdFrom || createdTo) {
      filter.createdAt = {};
      if (createdFrom) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(createdFrom);
      }
      if (createdTo) {
        const endDate = new Date(createdTo);
        endDate.setHours(23, 59, 59, 999);
        (filter.createdAt as Record<string, Date>).$lte = endDate;
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Order.find(filter)
        .populate("customerId", "_id code name phone")
        .populate("leadId", "_id leadCode")
        .populate("productId", "_id code name")
        .populate("comboId", "_id code name")
        .populate("warehouseId", "_id code name")
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .populate("saleEmployeeId", "_id employeeCode fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return success({
      items: mapOrderList(items),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Order List Error:", error);
    return errorResponse("Không thể lấy danh sách đơn hàng", 500);
  }
}

// ==================================================
// POST /api/orders - Create new order
// ==================================================

export async function POST(request: Request) {
  const session = await mongoose.startSession();

  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("order.create")) {
      return errorResponse("Bạn không có quyền tạo đơn hàng", 403);
    }

    await connectDB();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsedBody = createOrderSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    let validatedOrderItems: Awaited<ReturnType<typeof saleOrderService.validateItem>>[] = [];
    if (data.orderItems?.length) {
      try {
        validatedOrderItems = await Promise.all(
          data.orderItems.map((item) => saleOrderService.validateItem(item as OrderItem))
        );
      } catch (validationError) {
        return errorResponse(
          validationError instanceof Error ? validationError.message : "Thông tin combo không hợp lệ",
          400
        );
      }
    }

    // ---- Reference existence checks ------------------------------------
    // Auto-create customer nếu thiếu customerId (kèm customerName + customerPhone)
    let resolvedCustomerId: mongoose.Types.ObjectId | null = data.customerId
      ? new mongoose.Types.ObjectId(data.customerId)
      : null;

    const [customer, lead, product, productVariant, combo, warehouse, marketing, sale] =
      await Promise.all([
        resolvedCustomerId
          ? Customer.exists({ _id: resolvedCustomerId })
          : Promise.resolve(null),
        data.leadId ? Lead.exists({ _id: data.leadId }) : null,
        data.productId ? Product.exists({ _id: data.productId }) : null,
        data.productVariantId
          ? ProductVariant.exists({ _id: data.productVariantId })
          : null,
        data.comboId ? Combo.exists({ _id: data.comboId }) : null,
        data.warehouseId ? Warehouse.exists({ _id: data.warehouseId }) : null,
        data.marketingEmployeeId
          ? Employee.exists({ _id: data.marketingEmployeeId })
          : null,
        data.saleEmployeeId
          ? Employee.exists({ _id: data.saleEmployeeId })
          : null,
      ]);

    if (resolvedCustomerId && !customer)
      return errorResponse("Khách hàng không tồn tại", 400);
    if (data.leadId && !lead) return errorResponse("Lead không tồn tại", 400);
    if (data.productId && !product)
      return errorResponse("Sản phẩm không tồn tại", 400);
    if (data.productVariantId && !productVariant)
      return errorResponse("Biến thể sản phẩm không tồn tại", 400);
    if (data.comboId && !combo) return errorResponse("Combo không tồn tại", 400);
    if (data.warehouseId && !warehouse)
      return errorResponse("Kho không tồn tại", 400);
    if (data.marketingEmployeeId && !marketing)
      return errorResponse("Nhân viên marketing không tồn tại", 400);
    if (data.saleEmployeeId && !sale)
      return errorResponse("Nhân viên sale không tồn tại", 400);

    // ---- Topology guard: Order.warehouseId chỉ được dùng KHO2 --------
    // Validate trước khi start transaction để fail-fast, tránh session
    // rỗng nếu vi phạm business rule. Trả 400 với thông điệp rõ ràng.
    if (data.warehouseId) {
      try {
        await validateOrderWarehouse(data.warehouseId);
      } catch (topologyError) {
        const err = topologyError as Error & { code?: string };
        return errorResponse(
          err.message ?? "Kho không hợp lệ theo topology",
          400
        );
      }
    }

    // ---- orderType / orderSource are validated by Zod enum above ------
    const status = (data.status as OrderStatus) || OrderStatus.WAIT_CONFIRM;
    const orderType = (data.orderType as OrderType) || OrderType.NORMAL;
    const orderSource = (data.orderSource as OrderSource) || OrderSource.MANUAL;

    session.startTransaction();

    // Auto-create customer nếu thiếu customerId
    if (!resolvedCustomerId) {
      if (!data.customerName) {
        await session.abortTransaction();
        return errorResponse("Tên khách hàng là bắt buộc khi không có mã khách", 400);
      }
      if (!data.customerPhone) {
        await session.abortTransaction();
        return errorResponse("Số điện thoại khách hàng là bắt buộc khi không có mã khách", 400);
      }
      const newCustomerCode = await generateCustomerCode(session);
      const employee = currentUser.employee as unknown as {
        _id: mongoose.Types.ObjectId;
        teamId?: mongoose.Types.ObjectId | null;
      };
      // Lấy marketingEmployeeId từ payload nếu có, ngược lại fallback về currentUser
      const marketingEmployeeId = data.marketingEmployeeId
        ? new mongoose.Types.ObjectId(data.marketingEmployeeId)
        : employee._id;
      const docInput: Record<string, unknown> = {
        customerCode: newCustomerCode,
        fullName: data.customerName,
        phone: data.customerPhone as string,
        marketingEmployeeId,
        saleEmployeeId: data.saleEmployeeId
          ? new mongoose.Types.ObjectId(data.saleEmployeeId)
          : undefined,
        teamId: employee.teamId ?? undefined,
        status: "ACTIVE",
        createdBy: employee._id,
        isActive: true,
      };
      const [createdCustomer] = await Customer.create([docInput], { session });
      resolvedCustomerId = createdCustomer._id as mongoose.Types.ObjectId;
    }

    const orderCode = await generateOrderCode(session);

    // Sprint Settings: snapshot exchange rate (1 USD → MNT) at order
    // creation time. Existing orders keep their original rate forever.
    const exchangeRateSnap = await getCurrentExchangeRate();

    const [order] = await Order.create(
      [
        {
          orderCode,
          customerId: resolvedCustomerId,
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          leadId: data.leadId || undefined,
          productId: data.productId || undefined,
          productVariantId: data.productVariantId || undefined,
          comboId: data.comboId || undefined,
          productSnapshot: undefined,
          comboSnapshot: undefined,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          totalAmount: validatedOrderItems.length > 0
            ? Math.max(0, validatedOrderItems.reduce((sum, item) => sum + item.subtotal - item.discount, 0) + (data.shipping?.shippingFee ?? 0))
            : data.totalAmount,
          currency: data.currency || "MNT",
          exchangeRate: exchangeRateSnap.rate,
          exchangeRateDate: new Date(),
          estimatedWeight: data.estimatedWeight || undefined,
          actualWeight: data.actualWeight || undefined,
          warehouseId: data.warehouseId || undefined,
          marketingEmployeeId: data.marketingEmployeeId || undefined,
          saleEmployeeId: data.saleEmployeeId || undefined,
          status,
          isPrepaid: data.isPrepaid ?? false,
          orderType,
          orderSource,
          orderItems: validatedOrderItems,
          summary: validatedOrderItems.length > 0
            ? {
                subtotal: validatedOrderItems.reduce((sum, item) => sum + item.subtotal, 0),
                discount: validatedOrderItems.reduce((sum, item) => sum + item.discount, 0),
                shippingFee: data.shipping?.shippingFee ?? 0,
                grandTotal:
                  Math.max(0, validatedOrderItems.reduce((sum, item) => sum + item.subtotal - item.discount, 0) + (data.shipping?.shippingFee ?? 0)),
                currency: data.currency || "MNT",
              }
            : undefined,
          payments: (data.payments ?? []).map((p) => ({
            method: p.method,
            amount: p.amount,
            currency: p.currency || "MNT",
            paidAt: p.paidAt ? new Date(p.paidAt) : undefined,
            transactionId: p.transactionId || undefined,
            note: p.note || undefined,
          })),
          totalPaid: data.totalPaid ?? 0,
          shipping: data.shipping
            ? {
                receiverName: data.shipping.receiverName,
                receiverPhone: data.shipping.receiverPhone,
                address: data.shipping.address,
                trackingNumber: data.shipping.trackingNumber || undefined,
                carrier: data.shipping.carrier || undefined,
                estimatedDelivery: data.shipping.estimatedDelivery
                  ? new Date(data.shipping.estimatedDelivery)
                  : undefined,
                actualDelivery: data.shipping.actualDelivery
                  ? new Date(data.shipping.actualDelivery)
                  : undefined,
                shippingFee: data.shipping.shippingFee ?? 0,
                shippingFeeCurrency:
                  data.shipping.shippingFeeCurrency || "VND",
              }
            : undefined,
          // ---- Revenue defaults (NOT computed by engine at this stage) --
          revenueLocked: false,
          revenueOwnerOrderId: null,
          marketingRevenueRaw: 0,
          marketingRevenueFinal: 0,
          saleRevenueRaw: 0,
          saleRevenueFinal: 0,
          revenueEligible: false,
          revenueLockReason: "NONE",
          revenueCalculatedAt: undefined,
          // ---- Stock wiring (Phase 4.3) --------------------------------
          // KHÔNG set `stockReserved` boolean flag (đã bỏ). Chỉ giữ
          // `stockReservedAt` cho audit. Source of truth cho "đang giữ
          // chỗ" là `Σ reservedChange` trên InventoryHistory (aggregate
          // từ orderStockWiring.helper.queryNetReserved).
          stockReservedAt: undefined,
          note: data.note || undefined,
          isActive: true,
        },
      ],
      { session }
    );

    // ---- Reserve stock (nếu đủ điều kiện) ---------------------------
    //
    // Phase 4.5 refactor: KHÔNG dùng data.productVariantId / data.comboId /
    // data.quantity cho inventory. Source of truth là `validatedOrderItems[]`
    // (đã resolve variantId + TOTAL gift quantity qua saleOrderService.validateItem).
    //
    // Nếu KHÔNG có validatedOrderItems (vd: backward-compatible legacy order
    // không có orderItems) → KHÔNG reserve từ top-level fields.
    const demands = orderItemsToDemands(
      validatedOrderItems as unknown as NormalizedOrderItemShape[]
    );
    const stockSnapshot: OrderStockSnapshot = {
      warehouseId: data.warehouseId,
      orderType,
      demands,
    };
    const stockPlan = buildStockWiringPlanForCreate(stockSnapshot);

    if (stockPlan.reserve.length > 0) {
      try {
        await reserveStock(
          data.warehouseId as string,
          stockPlan.reserve,
          {
            actorEmployeeId: currentUser.employee._id,
            referenceType: InventoryReferenceType.ORDER,
            referenceCode: orderCode,
            orderId: order._id,
            note: `Tạo đơn ${orderCode}`,
          },
          { session }
        );
      } catch (err) {
        if (err instanceof StockEngineError) {
          await session.abortTransaction();
          return errorResponse(err.message, (err as { statusCode?: number }).statusCode ?? 500);
        }
        throw err;
      }

      // Đánh dấu audit: Order đã chạm vào Stock Engine lần cuối vào lúc này.
      // KHÔNG set cờ `stockReserved` (đã bỏ). Stock Engine đã ghi
      // InventoryHistory.reservedChange = +qty → queryNetReserved sẽ trả về > 0.
      await Order.updateOne(
        { _id: order._id },
        { $set: { stockReservedAt: new Date() } },
        { session }
      );
    }

    // ---- Revenue Lock Engine (cùng transaction) ---------------------
    await resolveCustomerRevenue(order.customerId, {
      session,
      actorEmployeeId: currentUser.employee._id,
    });

    // ---- OrderHistory -----------------------------------------------
    // Tách 2 entry (CREATED + STOCK_RESERVED) để Timeline dễ đọc.
    const historyDocs: Array<Record<string, unknown>> = [
      {
        orderId: order._id,
        employeeId: currentUser.employee._id,
        action: OrderAction.CREATED,
        newValue: status,
        note: "Tạo đơn hàng",
      },
    ];
    if (stockPlan.reserve.length > 0) {
      historyDocs.push({
        orderId: order._id,
        employeeId: currentUser.employee._id,
        action: OrderAction.STOCK_RESERVED,
        note: `Giữ chỗ tồn kho (${stockPlan.reserve.length} mặt hàng)`,
      });
    }
    await OrderHistory.create(historyDocs, { session });

    await session.commitTransaction();

    const populatedOrder = await Order.findById(order._id)
      .populate("customerId", "_id code name phone")
      .populate("leadId", "_id leadCode")
      .populate("productId", "_id code name")
      .populate("productVariantId", "_id sku")
      .populate("comboId", "_id code name")
      .populate("orderItems.details.attributes.optionId", "_id name")
      .populate("orderItems.details.attributes.valueId", "_id name")
      .populate("warehouseId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .populate("saleEmployeeId", "_id employeeCode fullName")
      .lean();

    return success(
      mapOrderList([populatedOrder!])[0],
      "Tạo đơn hàng thành công"
    );
  } catch (error) {
    await session.abortTransaction();
    console.error("Create Order Error:", error);
    return errorResponse("Không thể tạo đơn hàng", 500);
  } finally {
    session.endSession();
  }
}
