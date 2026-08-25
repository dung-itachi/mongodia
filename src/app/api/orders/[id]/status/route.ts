/**
 * ==================================================
 * ORDER STATUS API ROUTE
 * ==================================================
 *
 * Sprint 6.2 — Order Workflow
 *
 * PATCH /api/orders/:id/status
 * Change order status with workflow validation.
 * When transitioning to SHIPPING, delegates to the shared atomic shipOrder service
 * to ensure consistent inventory deduction, stock movement recording, and
 * WarehouseTask status updates.
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { orderService } from "@/services/order.service";
import { orderShipmentService, getTerminalMessage } from "@/services/warehouse/orderShipment.service";
import { success, error as errorResponse } from "@/utils/response";
import { OrderStatus } from "@/constants/orderStatus";
import { z } from "zod";

// ============================================================================
// Validation Schema
// ============================================================================

const changeStatusSchema = z.object({
  status: z.string().min(1, "Status is required"),
  note: z.string().optional(),
});

// ============================================================================
// PATCH /api/orders/:id/status - Change order status
// ============================================================================

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

    const parsedBody = changeStatusSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const { status, note } = parsedBody.data;
    const employeeId = currentUser.employee._id.toString();

    // ── Special path: SHIPPING ────────────────────────────────────────────────
    // Both entry points ("Giao hàng" on /orders and "Xác nhận xuất kho" on
    // /warehouse/shipments) converge here. The unified shipOrder service handles
    // all side effects atomically:
    //   1. Inventory deduction
    //   2. Stock movement recording
    //   3. Order.status → SHIPPING
    //   4. WarehouseTask.warehouseStatus → SHIPPED (if applicable)
    //   5. Idempotency guard (terminal-status check)
    if (status === OrderStatus.SHIPPING) {
      const result = await orderShipmentService.shipOrder({
        orderId: id,
        employeeId,
        note,
      });

      if (!result.success) {
        return errorResponse(result.error, 400);
      }

      if (result.alreadyShipped) {
        // Idempotent — the order is already shipped or in a terminal state.
        const message = result.terminalStatus
          ? getTerminalMessage(result.terminalStatus)
          : "Đơn đã được xuất kho trước đó.";
        return success(null, message);
      }

      return success(result.shipments, "Xuất kho thành công");
    }

    // ── All other status transitions ─────────────────────────────────────────
    const result = await orderService.changeStatus({
      orderId: id,
      newStatus: status,
      employeeId,
      note,
    });

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.order, "Đổi trạng thái thành công");
  } catch (err) {
    console.error("Change Order Status Error:", err);
    return errorResponse("Không thể đổi trạng thái đơn hàng", 500);
  }
}
