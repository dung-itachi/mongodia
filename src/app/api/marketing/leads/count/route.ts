/**
 * API Route: Count Leads for Marketing Employee (Sprint 8.X)
 *
 * GET /api/marketing/leads/count
 *
 * Returns count of leads matching the same filter logic as /marketing/orders page.
 * - Users with "marketing-order.viewAll" or wildcard permissions: count all leads
 * - Other users: count only leads with marketingEmployeeId = current user
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);

    await connectDB();

    // Sprint 8.x: Check permission for viewing all orders
    const permissions = currentUser.permissions ?? [];
    const canViewAll = permissions.includes("*") ||
      permissions.includes("account.manageAll") ||
      permissions.includes("marketing-order.viewAll");

    const filter: Record<string, unknown> = {};

    // Same filter logic as /marketing/orders:
    // - Users with permission: see all leads (no filter)
    // - Other users: only their own leads
    if (!canViewAll) {
      filter.marketingEmployeeId = currentUser.employee._id;
    }

    const count = await Lead.countDocuments(filter);

    return success({ leadCount: count });
  } catch (err) {
    console.error("Get Marketing Leads Count Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy số liệu",
      500
    );
  }
}
