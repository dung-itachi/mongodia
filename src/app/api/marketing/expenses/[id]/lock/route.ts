/**
 * ==================================================
 * POST /api/marketing/expenses/:id/lock — Lock report
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Lock report (DRAFT/REOPENED → LOCKED).
 * Marketing tự lock khi hoàn thành báo cáo ngày.
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { success, error as errorResponse } from "@/utils/response";
import { marketingExpenseService } from "@/services/marketing-expense.service";
import {
  mapMarketingExpense,
  mapMarketingExpenseFromDto,
} from "@/mappers/marketing-expense.mapper";
import type { IMarketingExpenseReport } from "@/models/MarketingExpenseReport";

function forbidden(message: string) {
  return errorResponse(message, 403);
}

function notFound(message: string) {
  return errorResponse(message, 404);
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

    if (!currentUser.permissions.includes("marketing-expense.lock")) {
      return forbidden("Bạn không có quyền khóa báo cáo marketing expense");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const result = await marketingExpenseService.lock(
      id,
      currentUser.employee._id.toString()
    );

    if (!result.success) {
      const status = /không tồn tại/i.test(result.error) ? 404 : 409;
      return errorResponse(result.error, status);
    }

    return success(
      mapMarketingExpenseFromDto(result.data as never),
      "Khóa báo cáo thành công"
    );
  } catch (error) {
    console.error("Marketing Expense Lock Error:", error);
    return serverError("Không thể khóa báo cáo marketing expense");
  }
}
