import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { Order, IOrder, IOrderPayment, IOrderShipping } from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";
import {
  OrderStatus,
  OrderAction,
  OrderType,
  ORDER_STATUS_LABELS,
} from "@/constants/orderStatus";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Combo from "@/models/Combo";
import Employee from "@/models/Employee";
import Customer from "@/models/Customer";
import Warehouse from "@/models/Warehouse";
import { Lead } from "@/models/Lead";

import { mapOrder, mapOrderHistoryList } from "@/mappers/order.mapper";

import { success, error as errorResponse } from "@/utils/response";
import { updateOrderSchema } from "@/utils/validator";
import {
  isPaymentChanged,
  isShippingChanged,
} from "@/helpers/orderChange";

import { resolveCustomerRevenue } from "@/services/order/revenueEngine.service";
import {
  releaseReservedStock,
  reserveStock,
} from "@/services/warehouse/stockEngine.service";
import { StockEngineError } from "@/services/warehouse/stockEngine.errors";
import {
  buildStockWiringPlan,
  buildStockWiringPlanForDelete,
  queryNetReserved,
  type OrderStockSnapshot,
} from "@/services/order/orderStockWiring.helper";
import { InventoryReferenceType } from "@/constants/inventoryStatus";

// ==================================================
// Status guards
// ==================================================

/** Status sets that LOCK an order from updates / deletion. */
const LOCKED_STATUSES: ReadonlySet<OrderStatus> = new Set([
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
  OrderStatus.REJECTED,
  OrderStatus.FAILED,
]);

// ==================================================
// GET /api/orders/:id - Detail with all populate
// ==================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("order.view")) {
      return errorResponse("Bạn không có quyền xem đơn hàng", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const order = await Order.findById(id)
      .populate("customerId", "_id code name phone")
      .populate("leadId", "_id leadCode")
      .populate("productId", "_id code name")
      .populate("productVariantId", "_id sku")
      .populate("comboId", "_id code name")
      .populate("warehouseId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .populate("saleEmployeeId", "_id employeeCode fullName")
      .lean();

    if (!order) {
      return errorResponse("Đơn hàng không tồn tại", 404);
    }

    const histories = await OrderHistory.find({ orderId: id })
      .populate("employeeId", "_id employeeCode fullName")
      .sort({ createdAt: -1 })
      .lean();

    return success({
      ...mapOrder(order as unknown as IOrder),
      histories: mapOrderHistoryList(histories),
    });
  } catch (error) {
    console.error("Order Detail Error:", error);
    return errorResponse("Không thể lấy đơn hàng", 500);
  }
}

// ==================================================
// PATCH /api/orders/:id - Update with change-tracking
// ==================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await mongoose.startSession();

  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("order.update")) {
      return errorResponse("Bạn không có quyền cập nhật đơn hàng", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const existedOrder = await Order.findById(id);

    if (!existedOrder) {
      return errorResponse("Đơn hàng không tồn tại", 404);
    }

    // Business Rule: không cho sửa khi đã khóa
    if (LOCKED_STATUSES.has(existedOrder.status as OrderStatus)) {
      return errorResponse(
        `Không thể sửa đơn ở trạng thái ${ORDER_STATUS_LABELS[existedOrder.status as OrderStatus]}.`,
        409
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsedBody = updateOrderSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    // ---- Reference existence (only when provided) ----------------------
    const checks: Promise<unknown>[] = [];
    if (data.customerId !== undefined) checks.push(Customer.exists({ _id: data.customerId }));
    if (data.leadId !== undefined) checks.push(Lead.exists({ _id: data.leadId }));
    if (data.productId !== undefined) checks.push(Product.exists({ _id: data.productId }));
    if (data.productVariantId !== undefined)
      checks.push(ProductVariant.exists({ _id: data.productVariantId }));
    if (data.comboId !== undefined) checks.push(Combo.exists({ _id: data.comboId }));
    if (data.warehouseId !== undefined)
      checks.push(Warehouse.exists({ _id: data.warehouseId }));
    if (data.marketingEmployeeId !== undefined)
      checks.push(Employee.exists({ _id: data.marketingEmployeeId }));
    if (data.saleEmployeeId !== undefined)
      checks.push(Employee.exists({ _id: data.saleEmployeeId }));

    const existsResults = await Promise.all(checks);
    let idx = 0;
    if (data.customerId !== undefined) {
      if (!existsResults[idx++])
        return errorResponse("Khách hàng không tồn tại", 400);
    }
    if (data.leadId !== undefined) {
      if (!existsResults[idx++])
        return errorResponse("Lead không tồn tại", 400);
    }
    if (data.productId !== undefined) {
      if (!existsResults[idx++])
        return errorResponse("Sản phẩm không tồn tại", 400);
    }
    if (data.productVariantId !== undefined) {
      if (!existsResults[idx++])
        return errorResponse("Biến thể sản phẩm không tồn tại", 400);
    }
    if (data.comboId !== undefined) {
      if (!existsResults[idx++])
        return errorResponse("Combo không tồn tại", 400);
    }
    if (data.warehouseId !== undefined) {
      if (!existsResults[idx++])
        return errorResponse("Kho không tồn tại", 400);
    }
    if (data.marketingEmployeeId !== undefined) {
      if (!existsResults[idx++])
        return errorResponse("Nhân viên marketing không tồn tại", 400);
    }
    if (data.saleEmployeeId !== undefined) {
      if (!existsResults[idx++])
        return errorResponse("Nhân viên sale không tồn tại", 400);
    }

    // ---- Build update payload + history entries ------------------------
    const updateData: Record<string, unknown> = {};
    const historyEntries: Array<{
      orderId: mongoose.Types.ObjectId;
      employeeId: mongoose.Types.ObjectId;
      action: OrderAction;
      fieldName?: string;
      oldValue?: string;
      newValue?: string;
      note?: string;
    }> = [];

    const pushHistory = (
      action: OrderAction,
      opts: {
        fieldName?: string;
        oldValue?: string;
        newValue?: string;
        note?: string;
      } = {}
    ) => {
      historyEntries.push({
        orderId: existedOrder._id as mongoose.Types.ObjectId,
        employeeId: currentUser.employee._id as mongoose.Types.ObjectId,
        action,
        fieldName: opts.fieldName,
        oldValue: opts.oldValue,
        newValue: opts.newValue,
        note: opts.note,
      });
    };

    // customerId
    if (data.customerId !== undefined) {
      const oldV = existedOrder.customerId.toString();
      const newV = data.customerId;
      if (oldV !== newV) {
        pushHistory(OrderAction.UPDATED, {
          fieldName: "customerId",
          oldValue: oldV,
          newValue: newV,
          note: "Đổi khách hàng",
        });
      }
      updateData.customerId = newV;
    }

    if (data.customerName !== undefined) {
      if (existedOrder.customerName !== data.customerName) {
        pushHistory(OrderAction.UPDATED, {
          fieldName: "customerName",
          oldValue: existedOrder.customerName,
          newValue: data.customerName,
          note: "Đổi tên khách hàng",
        });
      }
      updateData.customerName = data.customerName;
    }

    if (data.customerPhone !== undefined) {
      updateData.customerPhone = data.customerPhone || undefined;
    }

    // product
    if (data.productId !== undefined) {
      const oldV = existedOrder.productId?.toString() || "";
      const newV = data.productId || "";
      if (oldV !== newV) {
        pushHistory(OrderAction.UPDATED, {
          fieldName: "productId",
          oldValue: oldV,
          newValue: newV,
          note: "Đổi sản phẩm",
        });
      }
      updateData.productId = data.productId || undefined;
    }

    // productVariant
    if (data.productVariantId !== undefined) {
      const oldV = existedOrder.productVariantId?.toString() || "";
      const newV = data.productVariantId || "";
      if (oldV !== newV) {
        pushHistory(OrderAction.UPDATED, {
          fieldName: "productVariantId",
          oldValue: oldV,
          newValue: newV,
          note: "Đổi biến thể sản phẩm",
        });
      }
      updateData.productVariantId = data.productVariantId || undefined;
    }

    // combo
    if (data.comboId !== undefined) {
      const oldV = existedOrder.comboId?.toString() || "";
      const newV = data.comboId || "";
      if (oldV !== newV) {
        pushHistory(OrderAction.UPDATED, {
          fieldName: "comboId",
          oldValue: oldV,
          newValue: newV,
          note: "Đổi combo",
        });
      }
      updateData.comboId = data.comboId || undefined;
    }

    // warehouse
    if (data.warehouseId !== undefined) {
      const oldV = existedOrder.warehouseId?.toString() || "";
      const newV = data.warehouseId || "";
      if (oldV !== newV) {
        pushHistory(OrderAction.SHIPPING_UPDATED, {
          fieldName: "warehouseId",
          oldValue: oldV,
          newValue: newV,
          note: "Đổi kho",
        });
      }
      updateData.warehouseId = data.warehouseId || undefined;
    }

    // status
    if (data.status !== undefined && data.status !== existedOrder.status) {
      pushHistory(OrderAction.STATUS_CHANGED, {
        fieldName: "status",
        oldValue:
          ORDER_STATUS_LABELS[existedOrder.status as OrderStatus],
        newValue:
          ORDER_STATUS_LABELS[data.status as OrderStatus],
        note: "Đổi trạng thái",
      });
      updateData.status = data.status;
    }

    // payments — dùng helper isPaymentChanged()
    if (data.payments !== undefined) {
      const diff = isPaymentChanged(
        existedOrder.payments as IOrderPayment[],
        data.payments
      );

      const newPayments = data.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        currency: p.currency || "VND",
        paidAt: p.paidAt ? new Date(p.paidAt) : undefined,
        transactionId: p.transactionId || undefined,
        note: p.note || undefined,
      }));

      if (diff.changed) {
        pushHistory(OrderAction.PAYMENT_ADDED, {
          fieldName: "payments",
          oldValue: String(diff.oldTotal),
          newValue: String(diff.newTotal),
          note: "Cập nhật thanh toán",
        });
      }

      updateData.payments = newPayments;
      updateData.totalPaid = diff.newTotal;
    } else if (data.totalPaid !== undefined) {
      updateData.totalPaid = data.totalPaid;
    }

    // shipping — dùng helper isShippingChanged()
    if (data.shipping !== undefined) {
      const oldShipping = existedOrder.shipping as IOrderShipping | undefined;
      const newShippingPayload =
        data.shipping === null ? null : data.shipping;
      const diff = isShippingChanged(oldShipping, newShippingPayload);

      const newShipping = data.shipping
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
            shippingFeeCurrency: data.shipping.shippingFeeCurrency || "VND",
          }
        : undefined;

      if (diff.changed) {
        pushHistory(OrderAction.SHIPPING_UPDATED, {
          fieldName: "shipping",
          note: "Cập nhật vận chuyển",
        });
      }

      updateData.shipping = newShipping;
    }

    // Các field còn lại (numeric / simple)
    const passthrough: Array<keyof typeof data> = [
      "quantity",
      "unitPrice",
      "totalAmount",
      "currency",
      "estimatedWeight",
      "actualWeight",
      "marketingEmployeeId",
      "saleEmployeeId",
      "isPrepaid",
      "orderType",
      "orderSource",
      "leadId",
      "note",
      "isActive",
    ];
    for (const key of passthrough) {
      const v = data[key];
      if (v !== undefined) {
        updateData[key] = v === null ? undefined : v;
      }
    }

    // ---- Stock wiring (Phase 4.3) ------------------------------------
    // Tính diff giữa oldOrder ↔ newOrder. Stock Engine chỉ quan tâm
    // warehouse / productVariantId / comboId / quantity.
    //
    // - Nếu KHÔNG thay đổi các field trên → plan = skip (không đụng Stock).
    // - Nếu có thay đổi → release reserved (nếu đang thực sự giữ) + reserve lại (nếu đủ điều kiện).
    //
    // Source of truth cho "Order đang giữ chỗ hay không" là
    // `Σ reservedChange` trên InventoryHistory (append-only log).
    const oldStockSnapshot: OrderStockSnapshot = {
      warehouseId: existedOrder.warehouseId?.toString() ?? null,
      productVariantId: existedOrder.productVariantId?.toString() ?? null,
      comboId: existedOrder.comboId?.toString() ?? null,
      quantity: existedOrder.quantity,
      orderType: existedOrder.orderType as OrderType,
    };
    const newStockSnapshot: OrderStockSnapshot = {
      warehouseId:
        updateData.warehouseId !== undefined
          ? ((updateData.warehouseId as string | undefined) ?? null)
          : oldStockSnapshot.warehouseId,
      productVariantId:
        updateData.productVariantId !== undefined
          ? ((updateData.productVariantId as string | undefined) ?? null)
          : oldStockSnapshot.productVariantId,
      comboId:
        updateData.comboId !== undefined
          ? ((updateData.comboId as string | undefined) ?? null)
          : oldStockSnapshot.comboId,
      quantity:
        updateData.quantity !== undefined
          ? (updateData.quantity as number)
          : oldStockSnapshot.quantity,
      orderType:
        updateData.orderType !== undefined
          ? (updateData.orderType as OrderType)
          : oldStockSnapshot.orderType,
    };

    session.startTransaction();

    // Query netReserved TRONG transaction (đảm bảo nhất quán).
    const netMap = await queryNetReserved(existedOrder._id, session);
    const stockPlan = buildStockWiringPlan(
      oldStockSnapshot,
      newStockSnapshot,
      netMap
    );

    // ---- 1) Stock Engine: release reserved (nếu cần) ----------------
    if (stockPlan.release) {
      try {
        await releaseReservedStock(
          oldStockSnapshot.warehouseId as string,
          [stockPlan.release],
          {
            actorEmployeeId: currentUser.employee._id,
            referenceType: InventoryReferenceType.ORDER,
            referenceCode: existedOrder.orderCode,
            orderId: existedOrder._id,
            note: `Cập nhật đơn ${existedOrder.orderCode} - trả chỗ giữ`,
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

      pushHistory(OrderAction.STOCK_RELEASED, {
        note: `Trả chỗ tồn kho (${stockPlan.release.quantity})`,
      });
    }

    // ---- 2) Stock Engine: reserve mới (nếu cần) ---------------------
    if (stockPlan.reserve) {
      try {
        await reserveStock(
          newStockSnapshot.warehouseId as string,
          [stockPlan.reserve],
          {
            actorEmployeeId: currentUser.employee._id,
            referenceType: InventoryReferenceType.ORDER,
            referenceCode: existedOrder.orderCode,
            orderId: existedOrder._id,
            note: `Cập nhật đơn ${existedOrder.orderCode} - giữ chỗ mới`,
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

      pushHistory(OrderAction.STOCK_RESERVED, {
        note: `Giữ chỗ tồn kho (${stockPlan.reserve.quantity})`,
      });

      // Audit timestamp — KHÔNG set cờ `stockReserved` (đã bỏ).
      updateData.stockReservedAt = new Date();
    }

    // ---- 3) Order update ---------------------------------------------
    if (Object.keys(updateData).length > 0) {
      await Order.updateOne({ _id: id }, { $set: updateData }, { session });
    }

    // ---- 4) Revenue Lock Engine (cùng transaction) -------------------
    // Recalc nếu đổi customerId / productId / comboId / status / isPrepaid.
    const needsRevenueRecalc =
      data.customerId !== undefined ||
      data.productId !== undefined ||
      data.productVariantId !== undefined ||
      data.comboId !== undefined ||
      data.status !== undefined ||
      data.isPrepaid !== undefined;

    if (needsRevenueRecalc) {
      await resolveCustomerRevenue(
        // customerId có thể đã đổi trong updateData — dùng customerId mới nếu có.
        (updateData.customerId as string | undefined) ??
          existedOrder.customerId.toString(),
        {
          session,
          actorEmployeeId: currentUser.employee._id,
        }
      );
    }

    // ---- 5) OrderHistory ---------------------------------------------
    if (historyEntries.length > 0) {
      await OrderHistory.insertMany(historyEntries, { session });
    }

    await session.commitTransaction();

    const updatedOrder = await Order.findById(id)
      .populate("customerId", "_id code name phone")
      .populate("leadId", "_id leadCode")
      .populate("productId", "_id code name")
      .populate("productVariantId", "_id sku")
      .populate("comboId", "_id code name")
      .populate("warehouseId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .populate("saleEmployeeId", "_id employeeCode fullName")
      .lean();

    return success(
      mapOrder(updatedOrder as unknown as IOrder),
      "Cập nhật đơn hàng thành công"
    );
  } catch (error) {
    await session.abortTransaction();
    console.error("Update Order Error:", error);
    return errorResponse("Không thể cập nhật đơn hàng", 500);
  } finally {
    session.endSession();
  }
}

// ==================================================
// DELETE /api/orders/:id - Soft delete
// ==================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await mongoose.startSession();

  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("order.delete")) {
      return errorResponse("Bạn không có quyền xóa đơn hàng", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const existedOrder = await Order.findById(id);

    if (!existedOrder) {
      return errorResponse("Đơn hàng không tồn tại", 404);
    }

    // Business Rule: không cho xóa khi DELIVERED
    if (existedOrder.status === OrderStatus.DELIVERED) {
      return errorResponse(
        "Không thể xóa đơn đã giao (DELIVERED).",
        409
      );
    }

    session.startTransaction();

    // ---- Stock wiring (Phase 4.3) ------------------------------------
    // Nếu đơn đang thực sự giữ reserved stock → release trước.
    // Source of truth = `Σ reservedChange` từ InventoryHistory (cùng session).
    const oldStockSnapshot: OrderStockSnapshot = {
      warehouseId: existedOrder.warehouseId?.toString() ?? null,
      productVariantId: existedOrder.productVariantId?.toString() ?? null,
      comboId: existedOrder.comboId?.toString() ?? null,
      quantity: existedOrder.quantity,
      orderType: existedOrder.orderType as OrderType,
    };

    session.startTransaction();

    const netMap = await queryNetReserved(existedOrder._id, session);
    const deleteStockPlan = buildStockWiringPlanForDelete(
      oldStockSnapshot,
      netMap
    );

    let stockReleased = false;
    let stockReleasedQty = 0;

    if (deleteStockPlan.release) {
      try {
        await releaseReservedStock(
          oldStockSnapshot.warehouseId as string,
          [deleteStockPlan.release],
          {
            actorEmployeeId: currentUser.employee._id,
            referenceType: InventoryReferenceType.ORDER,
            referenceCode: existedOrder.orderCode,
            orderId: existedOrder._id,
            note: `Xóa đơn ${existedOrder.orderCode} - trả chỗ giữ`,
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
      stockReleased = true;
      stockReleasedQty = deleteStockPlan.release.quantity;
    }

    // ---- Soft delete --------------------------------------------------
    await Order.updateOne(
      { _id: id },
      {
        $set: {
          isActive: false,
          stockReservedAt: undefined,
        },
      },
      { session }
    );

    // ---- Revenue Lock Engine (mở khóa slot cho đơn sau) -------------
    await resolveCustomerRevenue(existedOrder.customerId, {
      session,
      actorEmployeeId: currentUser.employee._id,
    });

    // ---- OrderHistory -----------------------------------------------
    // Tách 2 entry (DELETED + STOCK_RELEASED) để Timeline dễ đọc.
    const historyDocs: Array<Record<string, unknown>> = [
      {
        orderId: existedOrder._id,
        employeeId: currentUser.employee._id,
        action: OrderAction.DELETED,
        note: "Xóa đơn hàng (soft delete)",
      },
    ];
    if (stockReleased) {
      historyDocs.push({
        orderId: existedOrder._id,
        employeeId: currentUser.employee._id,
        action: OrderAction.STOCK_RELEASED,
        note: `Trả chỗ tồn kho (${stockReleasedQty})`,
      });
    }
    await OrderHistory.create(historyDocs, { session });

    await session.commitTransaction();

    return success(null, "Xóa đơn hàng thành công");
  } catch (error) {
    await session.abortTransaction();
    console.error("Delete Order Error:", error);
    return errorResponse("Không thể xóa đơn hàng", 500);
  } finally {
    session.endSession();
  }
}
