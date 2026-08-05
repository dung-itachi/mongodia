/**
 * ==================================================
 * POST /api/marketing/expenses/:id/reopen — Reopen report
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Reopen report (LOCKED → REOPENED).
 * Admin mở lại khi có sai sót để Marketing sửa.
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { success, error as errorResponse } from "@/utils/response";
import { marketingExpenseService } from "@/services/marketing-expense.service";
import { mapMarketingExpenseFromDto } from "@/mappers/marketing-expense.mapper";

function forbidden(message: string) {
  return errorResponse(message, 403);
}

function serverError(message: string) {
  return errorResponse(message, 500);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("marketing-expense.reopen")) {
      return forbidden("Bạn không có quyền mở lại báo cáo marketing expense");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const result = await marketingExpenseService.reopen(
      id,
      currentUser.employee._id.toString()
    );

    if (!result.success) {
      const status = /không tồn tại/i.test(result.error) ? 404 : 409;
      return errorResponse(result.error, status);
    }

    return success(
      mapMarketingExpenseFromDto(result.data as never),
      "Mở lại báo cáo thành công"
    );
  } catch (error) {
    console.error("Marketing Expense Reopen Error:", error);
    return serverError("Không thể mở lại báo cáo marketing expense");
  }
}
