/**
 * ==================================================
 * ORDER RECONCILE TOGGLE API
 * ==================================================
 *
 * PATCH /api/orders/:id/reconcile
 *
 * Toggle (hoặc set) cờ `isReconciled` của Order.
 * Đây là bước "đã đối soát" để kiểm tra lại đơn giao thành công.
 *
 * QUAN TRỌNG: KHÔNG thay đổi status giao hàng (DELIVERED/RETURNED).
 * Chỉ đánh dấu đơn đã được kiểm tra lại.
 *
 * Body (optional):
 *   { "value": true | false }
 * Nếu không truyền `value` → server tự toggle giá trị hiện tại.
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { Order, IOrder } from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";
import { OrderAction } from "@/constants/orderStatus";
import { mapOrder } from "@/mappers/order.mapper";
import { success, error as errorResponse } from "@/utils/response";
import { z } from "zod";

const toggleSchema = z
  .object({
    value: z.boolean().optional(),
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

    let body: unknown = {};
    try {
      const text = await request.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const existing = await Order.findById(id).select("_id isActive isReconciled");
    if (!existing) {
      return errorResponse("Đơn hàng không tồn tại", 404);
    }
    if (!existing.isActive) {
      return errorResponse("Đơn hàng không hoạt động", 409);
    }

    const nextValue =
      typeof parsed.data.value === "boolean"
        ? parsed.data.value
        : !existing.isReconciled;

    const updateData: Record<string, unknown> = {
      isReconciled: nextValue,
    };

    if (nextValue) {
      updateData.reconciledAt = new Date();
      updateData.reconciledBy = currentUser.employee._id;
    } else {
      updateData.reconciledAt = null;
      updateData.reconciledBy = null;
    }

    const [updated] = await Promise.all([
      Order.findByIdAndUpdate(
        id,
        { $set: updateData },
        { returnDocument: "after" }
      )
        .populate("customerId", "_id code name phone")
        .populate("leadId", "_id leadCode")
        .populate("productId", "_id code name")
        .populate("productVariantId", "_id sku")
        .populate("comboId", "_id code name")
        .populate("warehouseId", "_id code name")
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .populate("saleEmployeeId", "_id employeeCode fullName")
        .populate("reconciledBy", "_id employeeCode fullName")
        .lean(),
    ]);

    return success(
      mapOrder(updated as unknown as IOrder),
      nextValue
        ? "Đã đánh dấu đối soát"
        : "Đã bỏ đánh dấu đối soát"
    );
  } catch (error) {
    console.error("Toggle Reconcile Error:", error);
    return errorResponse("Không thể cập nhật trạng thái đối soát", 500);
  }
}
