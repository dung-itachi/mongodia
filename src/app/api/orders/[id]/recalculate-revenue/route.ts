import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { Order } from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";
import { OrderAction } from "@/constants/orderStatus";

import { success, error as errorResponse } from "@/utils/response";
import { resolveCustomerRevenue } from "@/services/order/revenueEngine.service";

/**
 * POST /api/orders/:id/recalculate-revenue
 *
 * Recalculate revenue cho một đơn hàng cụ thể.
 * Tính lại marketingRevenueRaw/saleRevenueRaw nếu đơn đã giao (DELIVERED).
 * Sau đó chạy revenue engine để xác định ELIGIBLE/LOCKED.
 */
export async function POST(
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

    const order = await Order.findById(id).lean();

    if (!order) {
      return errorResponse("Đơn hàng không tồn tại", 404);
    }

    // Check if order is DELIVERED
    const DELIVERED_STATUSES = ["DELIVERED", "RECONCILED"];
    const isDelivered = DELIVERED_STATUSES.includes(order.status);

    if (isDelivered) {
      // Calculate revenue: grandTotal - shippingFee
      const grandTotal = (order.summary as { grandTotal?: number })?.grandTotal ?? order.totalAmount;
      const shippingFee = (order.summary as { shippingFee?: number })?.shippingFee
        ?? (order.shipping as { shippingFee?: number })?.shippingFee
        ?? 0;
      const netRevenue = Math.max(0, grandTotal - shippingFee);

      // Update raw revenue values
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            marketingRevenueRaw: netRevenue,
            saleRevenueRaw: netRevenue,
          },
        }
      );
    }

    // Run revenue engine to determine ELIGIBLE/LOCKED
    const result = await resolveCustomerRevenue(order.customerId, {
      actorEmployeeId: currentUser.employee._id,
    });

    // Get updated order
    const updatedOrder = await Order.findById(id).lean();

    return success(
      {
        orderId: id,
        revenueCalculated: isDelivered,
        marketingRevenueRaw: updatedOrder?.marketingRevenueRaw,
        saleRevenueRaw: updatedOrder?.saleRevenueRaw,
        marketingRevenueFinal: updatedOrder?.marketingRevenueFinal,
        saleRevenueFinal: updatedOrder?.saleRevenueFinal,
        revenueEligible: updatedOrder?.revenueEligible,
        revenueLockReason: updatedOrder?.revenueLockReason,
      },
      "Đã tính lại doanh thu"
    );
  } catch (err) {
    console.error("Recalculate Revenue Error:", err);
    return errorResponse("Không thể tính lại doanh thu", 500);
  }
}
