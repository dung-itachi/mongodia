/**
 * ==================================================
 * LEAD CONVERT API
 * ==================================================
 *
 * Sprint 8.4 — Tách Lead và Order
 *
 * POST /api/leads/:id/convert
 * Chỉ API này được tạo Order từ Lead.
 */

import { NextResponse } from "next/server";
import { leadService } from "@/services/lead.service";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import type { OrderItem } from "@/types/variant";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/leads/:id/convert
 * Convert a lead to an order.
 *
 * Business Rules (Sprint 8.4):
 * - Chỉ Sale mới được convert lead
 * - Lead phải ở trạng thái QUALIFIED hoặc POTENTIAL
 * - Lead chưa được convert trước đó
 * - Sau khi convert: Lead.isConverted = true, Lead.convertedOrderId = orderId
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser) {
      return unauthorized();
    }

    // Check permission: lead.update để convert (hoặc Sale có thể convert)
    const hasPermission = currentUser.permissions.includes("lead.update") ||
                          currentUser.permissions.includes("order.create");
    if (!hasPermission) {
      return forbidden("Bạn không có quyền chốt đơn từ Lead");
    }

    await connectDB();

    const { id } = await params;
    let orderItem: OrderItem;
    try {
      const body: unknown = await request.json();
      orderItem = (body as { orderItem?: OrderItem }).orderItem as OrderItem;
    } catch {
      return errorResponse("Dữ liệu đơn hàng không hợp lệ");
    }

    const result = await leadService.convertLead(id, currentUser.employee?._id?.toString() ?? "", orderItem);

    if (!result.success) {
      console.log("[LEAD CONVERT API] Validation error:", result.error);
      return errorResponse(result.error, 400);
    }

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      message: "Chốt đơn thành công"
    }, { status: 201 });
  } catch (error) {
    console.error("[LEAD CONVERT API]", error);
    return NextResponse.json(
      { error: "Không thể chốt đơn từ Lead" },
      { status: 500 }
    );
  }
}
