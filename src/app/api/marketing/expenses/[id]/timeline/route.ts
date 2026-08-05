/**
 * ==================================================
 * GET /api/marketing/expenses/:id/timeline — Timeline
 * ==================================================
 *
 * Sprint 6.12 — Marketing Expense Timeline
 *
 * Architecture:
 *   Route  →  MarketingExpenseHistoryService  →  MongoDB
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { success, error as errorResponse } from "@/utils/response";

import { marketingExpenseHistoryService } from "@/services/marketing-expense-history.service";

// ============================================================================
// GET /api/marketing/expenses/:id/timeline
// ============================================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("marketing-expense.view")) {
      return errorResponse("Bạn không có quyền xem báo cáo marketing expense", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const history = await marketingExpenseHistoryService.getTimelineByReport(id);

    return success(history);
  } catch (error) {
    console.error("Marketing Expense Timeline Error:", error);
    return errorResponse("Không thể lấy timeline báo cáo marketing expense", 500);
  }
}
