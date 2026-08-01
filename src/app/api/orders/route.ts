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
import Combo from "@/models/Combo";
import Employee from "@/models/Employee";
import Customer from "@/models/Customer";
import Warehouse from "@/models/Warehouse";
import { Lead } from "@/models/Lead";
import Counter from "@/models/Counter";

import { mapOrderList } from "@/mappers/order.mapper";

import { success, error as errorResponse } from "@/utils/response";
import { createOrderSchema } from "@/utils/validator";

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

  const counter = await Counter.findByIdAndUpdate(
    `order_${year}${month}${day}`,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  ) as unknown as { seq: number };

  const sequence = (counter.seq || 1).toString().padStart(4, "0");
  return `OD${year}${month}${day}${sequence}`;
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
    const revenueLockedParam = searchParams.get("revenueLocked");
    const createdFrom = searchParams.get("createdFrom") ?? "";
    const createdTo = searchParams.get("createdTo") ?? "";

    const filter: Record<string, unknown> = { isActive: true };

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
      filter.status = status;
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
        .populate("customer", "_id code name phone")
        .populate("lead", "_id leadCode")
        .populate("product", "_id code name")
        .populate("combo", "_id code name")
        .populate("warehouse", "_id code name")
        .populate("marketingEmployee", "_id employeeCode fullName")
        .populate("saleEmployee", "_id employeeCode fullName")
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

    // ---- Reference existence checks ------------------------------------
    const [customer, lead, product, combo, warehouse, marketing, sale] =
      await Promise.all([
        Customer.exists({ _id: data.customerId }),
        data.leadId ? Lead.exists({ _id: data.leadId }) : null,
        data.productId ? Product.exists({ _id: data.productId }) : null,
        data.comboId ? Combo.exists({ _id: data.comboId }) : null,
        data.warehouseId ? Warehouse.exists({ _id: data.warehouseId }) : null,
        data.marketingEmployeeId
          ? Employee.exists({ _id: data.marketingEmployeeId })
          : null,
        data.saleEmployeeId
          ? Employee.exists({ _id: data.saleEmployeeId })
          : null,
      ]);

    if (!customer) return errorResponse("Khách hàng không tồn tại", 400);
    if (data.leadId && !lead) return errorResponse("Lead không tồn tại", 400);
    if (data.productId && !product)
      return errorResponse("Sản phẩm không tồn tại", 400);
    if (data.comboId && !combo) return errorResponse("Combo không tồn tại", 400);
    if (data.warehouseId && !warehouse)
      return errorResponse("Kho không tồn tại", 400);
    if (data.marketingEmployeeId && !marketing)
      return errorResponse("Nhân viên marketing không tồn tại", 400);
    if (data.saleEmployeeId && !sale)
      return errorResponse("Nhân viên sale không tồn tại", 400);

    // ---- orderType / orderSource are validated by Zod enum above ------
    const status = (data.status as OrderStatus) || OrderStatus.PENDING;

    session.startTransaction();

    const orderCode = await generateOrderCode(session);

    const [order] = await Order.create(
      [
        {
          orderCode,
          customerId: data.customerId,
          customerName: data.customerName,
          customerPhone: data.customerPhone || undefined,
          leadId: data.leadId || undefined,
          productId: data.productId || undefined,
          comboId: data.comboId || undefined,
          productSnapshot: undefined,
          comboSnapshot: undefined,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          totalAmount: data.totalAmount,
          currency: data.currency || "VND",
          estimatedWeight: data.estimatedWeight || undefined,
          actualWeight: data.actualWeight || undefined,
          warehouseId: data.warehouseId || undefined,
          marketingEmployeeId: data.marketingEmployeeId || undefined,
          saleEmployeeId: data.saleEmployeeId || undefined,
          status,
          isPrepaid: data.isPrepaid ?? false,
          orderType: (data.orderType as OrderType) || OrderType.NORMAL,
          orderSource: (data.orderSource as OrderSource) || OrderSource.MANUAL,
          payments: (data.payments ?? []).map((p) => ({
            method: p.method,
            amount: p.amount,
            currency: p.currency || "VND",
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
                province: data.shipping.province || undefined,
                district: data.shipping.district || undefined,
                ward: data.shipping.ward || undefined,
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
          note: data.note || undefined,
          isActive: true,
        },
      ],
      { session }
    );

    await OrderHistory.create(
      [
        {
          orderId: order._id,
          employeeId: currentUser.employee._id,
          action: OrderAction.CREATED,
          newValue: status,
          note: "Tạo đơn hàng",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    const populatedOrder = await Order.findById(order._id)
      .populate("customer", "_id code name phone")
      .populate("lead", "_id leadCode")
      .populate("product", "_id code name")
      .populate("combo", "_id code name")
      .populate("warehouse", "_id code name")
      .populate("marketingEmployee", "_id employeeCode fullName")
      .populate("saleEmployee", "_id employeeCode fullName")
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
