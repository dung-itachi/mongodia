/**
 * API Route: Count Orders by Marketing Employee (Sprint 8.X)
 *
 * GET /api/marketing/orders/count
 *
 * Returns count of orders associated with the current marketing employee's account.
 * Used for the "Đã đẩy" stat on /marketing/input page.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { getCurrentUser } from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    await connectDB();

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";

    const filter: Record<string, unknown> = {
      isActive: true,
    };

    if (!isGlobal) {
      // Non-GLOBAL user: chỉ đếm orders của chính mình
      filter.marketingEmployeeId = currentUser.employee._id;
    }
    // GLOBAL: đếm tất cả orders

    const count = await Order.countDocuments(filter);

    return success({ orderCount: count });
  } catch (err) {
    console.error("Get Marketing Orders Count Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy số liệu",
      500
    );
  }
}
