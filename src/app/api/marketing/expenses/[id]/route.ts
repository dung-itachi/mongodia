/**
 * ==================================================
 * GET    /api/marketing/expenses/:id   — Detail
 * PATCH  /api/marketing/expenses/:id   — Update
 * DELETE /api/marketing/expenses/:id   — Soft delete
 * ==================================================
 *
 * Sprint 6.7 — Marketing Expense CRUD (Backend).
 *
 * Architecture:
 *   Route  →  MarketingExpenseService  →  MarketingExpenseRepository  →  MongoDB
 *
 * Update / Delete business rules (chỉ DRAFT / REOPENED) đặt trong Service —
 * chỉ truyền status code lỗi cho Route khi không thỏa.
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Employee from "@/models/Employee";
import FacebookPage from "@/models/FacebookPage";

import { success, error as errorResponse } from "@/utils/response";
import { updateMarketingExpenseSchema } from "@/validators/marketing-expense.validator";

import { marketingExpenseService } from "@/services/marketing-expense.service";
import type { IMarketingExpenseReport } from "@/models/MarketingExpenseReport";

import {
  mapMarketingExpense,
  mapMarketingExpenseFromDto,
} from "@/mappers/marketing-expense.mapper";

// ============================================================================
// Helpers
// ============================================================================

function badRequest(message: string) {
  return errorResponse(message, 400);
}

function forbidden(message: string) {
  return errorResponse(message, 403);
}

function notFound(message: string) {
  return errorResponse(message, 404);
}

function conflict(message: string) {
  return errorResponse(message, 409);
}

function serverError(message: string) {
  return errorResponse(message, 500);
}

async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function normalizeFacebookPageId(
  raw: string | null | undefined
): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

/**
 * Một số câu lỗi Service trả về ứng với các tình huống:
 *   - "Báo cáo không tồn tại" → 404
 *   - "Không thể sửa / xóa báo cáo ở trạng thái ..." → 409
 *   - còn lại → 400
 */
function statusFromError(message: string): number {
  if (/không tồn tại/i.test(message)) return 404;
  if (/không thể (sửa|xóa)/i.test(message)) return 409;
  return 400;
}

// ============================================================================
// GET /api/marketing/expenses/:id
// ============================================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("marketing-expense.view")) {
      return forbidden("Bạn không có quyền xem báo cáo marketing expense");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID không hợp lệ");
    }

    const doc = await marketingExpenseService.getById(id);
    if (!doc) {
      return notFound("Báo cáo không tồn tại");
    }

    return success(mapMarketingExpense(doc as IMarketingExpenseReport));
  } catch (error) {
    console.error("Marketing Expense Detail Error:", error);
    return serverError("Không thể lấy báo cáo marketing expense");
  }
}

// ============================================================================
// PATCH /api/marketing/expenses/:id
// ============================================================================

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("marketing-expense.update")) {
      return forbidden("Bạn không có quyền cập nhật báo cáo marketing expense");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID không hợp lệ");
    }

    const body = await parseBody<Record<string, unknown>>(request);
    if (!body) {
      return badRequest("Dữ liệu không hợp lệ");
    }

    const parsed = updateMarketingExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ"
      );
    }

    const data = parsed.data;

    // ---- Reference existence (chỉ khi client gửi) -------------------
    const existenceChecks: Promise<unknown>[] = [];

    if (data.marketingEmployeeId) {
      existenceChecks.push(
        Employee.exists({
          _id: data.marketingEmployeeId,
          isActive: true,
        })
      );
    }
    if (data.facebookPageId !== undefined && data.facebookPageId !== null) {
      const fbId = normalizeFacebookPageId(data.facebookPageId);
      if (fbId) {
        existenceChecks.push(
          FacebookPage.exists({ _id: fbId, isActive: true })
        );
      }
    }

    const existenceResults = await Promise.all(existenceChecks);
    let idx = 0;
    if (data.marketingEmployeeId) {
      if (!existenceResults[idx++]) {
        return badRequest("Nhân viên marketing không tồn tại");
      }
    }
    if (data.facebookPageId !== undefined && data.facebookPageId !== null) {
      const fbId = normalizeFacebookPageId(data.facebookPageId);
      if (fbId && !existenceResults[idx++]) {
        return badRequest("Facebook page không tồn tại");
      }
    }

    // ---- Build update input -----------------------------------------
    const updateInput: Record<string, unknown> = {};

    if (data.marketingEmployeeId !== undefined) {
      updateInput.marketingEmployeeId = data.marketingEmployeeId;
    }
    if (data.facebookPageId !== undefined) {
      updateInput.facebookPageId = normalizeFacebookPageId(
        data.facebookPageId
      );
    }
    if (data.requestedBudget !== undefined) {
      updateInput.requestedBudget = data.requestedBudget;
    }
    if (data.spentBudget !== undefined) {
      updateInput.spentBudget = data.spentBudget;
    }
    if (data.totalRevenue !== undefined) {
      updateInput.totalRevenue = data.totalRevenue;
    }
    if (data.totalLeads !== undefined) {
      updateInput.totalLeads = data.totalLeads;
    }
    if (data.closedLeads !== undefined) {
      updateInput.closedLeads = data.closedLeads;
    }
    if (data.note !== undefined) {
      updateInput.note = data.note;
    }
    if (data.updatedBy !== undefined) {
      updateInput.updatedBy = data.updatedBy;
    }

    const result = await marketingExpenseService.update(
      id,
      updateInput as never
    );

    if (!result.success) {
      return errorResponse(
        result.error,
        statusFromError(result.error)
      );
    }

    return success(
      mapMarketingExpenseFromDto(result.data as never),
      "Cập nhật báo cáo marketing expense thành công"
    );
  } catch (error) {
    console.error("Marketing Expense Update Error:", error);
    return serverError("Không thể cập nhật báo cáo marketing expense");
  }
}

// ============================================================================
// DELETE /api/marketing/expenses/:id — Soft delete
// ============================================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("marketing-expense.delete")) {
      return forbidden("Bạn không có quyền xóa báo cáo marketing expense");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID không hợp lệ");
    }

    const result = await marketingExpenseService.delete(id);

    if (!result.success) {
      const status = statusFromError(result.error);
      // statusFromError trả 404 khi không tồn tại; dùng conflict đúng ngữ nghĩa hơn
      return status === 404
        ? notFound(result.error)
        : status === 409
        ? conflict(result.error)
        : badRequest(result.error);
    }

    return success(null, "Xóa báo cáo marketing expense thành công");
  } catch (error) {
    console.error("Marketing Expense Delete Error:", error);
    return serverError("Không thể xóa báo cáo marketing expense");
  }
}