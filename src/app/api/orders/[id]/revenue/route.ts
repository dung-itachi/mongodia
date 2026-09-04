/**
 * ==================================================
 * ORDER REVENUE ADJUSTMENT API
 * ==================================================
 *
 * PATCH /api/orders/:id/revenue
 *
 * Cho phép điều chỉnh thủ công Doanh thu Marketing và Doanh thu Sale
 * cho một đơn hàng (ngay cả khi đơn đã DELIVERED / RECONCILED).
 * Tuyệt đối không làm thay đổi tồn kho, biến thể hay thông tin giao hàng.
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { Order, IOrder } from "@/models/Order";
import { OrderStatus, OrderAction } from "@/constants/orderStatus";
import { OrderHistory } from "@/models/OrderHistory";
import { resolveCustomerRevenue } from "@/services/order/revenueEngine.service";
import { mapOrder } from "@/mappers/order.mapper";
import { success, error as errorResponse } from "@/utils/response";
import { z } from "zod";

const adjustRevenueSchema = z
  .object({
    marketingRevenue: z.preprocess(
      (val) => (val === null || val === undefined || val === "" ? 0 : Number(val)),
      z.number().min(0, "Doanh thu Marketing không thể âm")
    ),
    saleRevenue: z.preprocess(
      (val) => (val === null || val === undefined || val === "" ? 0 : Number(val)),
      z.number().min(0, "Doanh thu Sale không thể âm")
    ),
    note: z.string().max(500, "Ghi chú không được vượt quá 500 ký tự").optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsed = adjustRevenueSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const { marketingRevenue, saleRevenue, note } = parsed.data;

    const existing = await Order.findById(id);
    if (!existing) {
      return errorResponse("Đơn hàng không tồn tại", 404);
    }

    if (!existing.isActive) {
      return errorResponse("Đơn hàng không hoạt động", 409);
    }

    // Không cho phép điều chỉnh đơn đã hủy
    if (existing.status === OrderStatus.CANCELLED) {
      return errorResponse("Không thể điều chỉnh doanh thu cho đơn hàng đã hủy", 409);
    }

    const oldMarketing = existing.marketingRevenueRaw ?? 0;
    const oldSale = existing.saleRevenueRaw ?? 0;

    // Cập nhật Order với cờ isManualRevenue = true
    existing.marketingRevenueRaw = marketingRevenue;
    existing.saleRevenueRaw = saleRevenue;
    existing.isManualRevenue = true;
    existing.manualRevenueNote = note?.trim() || undefined;
    existing.manualRevenueEditedBy = currentUser.employee?._id;
    existing.manualRevenueEditedAt = new Date();

    // Nếu đơn hàng đang đủ điều kiện tính doanh thu (không bị lock), cập nhật luôn doanh thu cuối
    if (existing.revenueEligible || !existing.revenueLocked) {
      existing.marketingRevenueFinal = marketingRevenue;
      existing.saleRevenueFinal = saleRevenue;
    }

    await existing.save();

    // Ghi nhận lịch sử OrderHistory
    await OrderHistory.create({
      orderId: existing._id,
      employeeId: currentUser.employee?._id,
      action: OrderAction.REVENUE_UPDATED,
      fieldName: "revenue",
      oldValue: `MKT: ${oldMarketing.toLocaleString()} - Sale: ${oldSale.toLocaleString()}`,
      newValue: `MKT: ${marketingRevenue.toLocaleString()} - Sale: ${saleRevenue.toLocaleString()}`,
      note: note?.trim() || `Điều chỉnh doanh thu (MKT: ${oldMarketing} -> ${marketingRevenue}, Sale: ${oldSale} -> ${saleRevenue})`,
    });

    // Chạy lại revenue lock engine để đồng bộ sang marketingRevenueFinal / saleRevenueFinal
    if (existing.customerId) {
      try {
        await resolveCustomerRevenue(existing.customerId, {
          actorEmployeeId: currentUser.employee?._id,
          force: true,
        });
      } catch (engineError) {
        console.error("resolveCustomerRevenue error after adjust revenue:", engineError);
      }
    }

    // Lấy order mới nhất sau khi engine tính toán
    const updated = await Order.findById(id)
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
      mapOrder(updated as unknown as IOrder),
      "Đã điều chỉnh doanh thu thành công"
    );
  } catch (error) {
    console.error("Adjust Revenue Error:", error);
    return errorResponse("Không thể điều chỉnh doanh thu", 500);
  }
}
