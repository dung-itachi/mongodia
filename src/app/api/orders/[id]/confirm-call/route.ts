/**
 * ==================================================
 * ORDER CONFIRM-CALL TOGGLE API
 * ==================================================
 *
 * PATCH /api/orders/:id/confirm-call
 *
 * Toggle (hoặc set) cờ `isCalledForConfirmation` của Order.
 * Đây là bước "đã gọi điện xác nhận với khách" do Sale thực hiện
 * trước khi chuyển đơn sang PACKING.
 *
 * Body (optional):
 *   { "value": true | false }
 * Nếu không truyền `value` → server tự toggle giá trị hiện tại.
 *
 * Không ghi OrderHistory theo yêu cầu nghiệp vụ (audit nhẹ).
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { Order, IOrder } from "@/models/Order";
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

    const existing = await Order.findById(id).select("_id isActive isCalledForConfirmation");
    if (!existing) {
      return errorResponse("�ơn hàng không tồn tại", 404);
    }
    if (!existing.isActive) {
      return errorResponse("Đơn hàng không hoạt động", 409);
    }

    const nextValue =
      typeof parsed.data.value === "boolean"
        ? parsed.data.value
        : !existing.isCalledForConfirmation;

    const updated = await Order.findByIdAndUpdate(
      id,
      { $set: { isCalledForConfirmation: nextValue } },
      { new: true }
    )
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
      nextValue
        ? "Đã đánh dấu đã gọi xác nhận"
        : "Đã bỏ đánh dấu gọi xác nhận"
    );
  } catch (error) {
    console.error("Toggle Confirm Call Error:", error);
    return errorResponse("Không thể cập nhật cờ xác nhận cuộc gọi", 500);
  }
}
