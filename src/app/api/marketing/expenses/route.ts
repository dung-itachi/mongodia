/**
 * ==================================================
 * GET /api/marketing/expenses    — List reports
 * POST /api/marketing/expenses   — Create new report (DRAFT)
 * ==================================================
 *
 * Sprint 6.7 — Marketing Expense CRUD (Backend).
 *
 * Architecture:
 *   Route  →  MarketingExpenseService  →  MarketingExpenseRepository  →  MongoDB
 *
 *   - Route CHỉ:
 *       • auth (getCurrentUser)
 *       • permission gate
 *       • parse + validate body/query bằng Zod
 *       • map filter cho Service
 *       • shape response từ Service bằng mapper
 *
 *   - Business logic (status transition, duplicate check, calculator) thuộc Service.
 *   - Mongo queries thuộc Repository.
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Employee from "@/models/Employee";
import FacebookPage from "@/models/FacebookPage";

import { success, error as errorResponse } from "@/utils/response";
import {
  createMarketingExpenseSchema,
  listMarketingExpenseSchema,
} from "@/validators/marketing-expense.validator";

import { marketingExpenseService } from "@/services/marketing-expense.service";
import { MarketingExpenseReportStatus } from "@/constants/marketing-expense";

import { mapMarketingExpenseFromDto } from "@/mappers/marketing-expense.mapper";

// ============================================================================
// Helpers
// ============================================================================

function badRequest(message: string) {
  return errorResponse(message, 400);
}

function forbidden(message: string) {
  return errorResponse(message, 403);
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

/**
 * Coerce `facebookPageId` từ client về dạng Service hiểu:
 *   - "" / null / undefined → null (report toàn team)
 *   - string hợp lệ       → string
 */
function normalizeFacebookPageId(
  raw: string | null | undefined
): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed;
}

// ============================================================================
// GET /api/marketing/expenses
// ============================================================================

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("marketing-expense.view")) {
      return forbidden("Bạn không có quyền xem báo cáo marketing expense");
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const parsed = listMarketingExpenseSchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!parsed.success) {
      return badRequest(
        parsed.error.issues[0]?.message ?? "Query params không hợp lệ"
      );
    }

    const query = parsed.data;

    const filter = {
      keyword: query.keyword,
      status: query.status as MarketingExpenseReportStatus | undefined,
      marketingEmployeeId: query.marketingEmployeeId,
      facebookPageId: query.facebookPageId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      page: query.page,
      pageSize: query.pageSize,
      sortField: query.sortField,
      sortOrder: query.sortOrder,
    };

    const result = await marketingExpenseService.getList(filter);

    return success({
      items: result.items.map(mapMarketingExpenseFromDto),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (error) {
    console.error("Marketing Expense List Error:", error);
    return serverError("Không thể lấy danh sách báo cáo marketing expense");
  }
}

// ============================================================================
// POST /api/marketing/expenses
// ============================================================================

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("marketing-expense.create")) {
      return forbidden("Bạn không có quyền tạo báo cáo marketing expense");
    }

    await connectDB();

    const body = await parseBody<Record<string, unknown>>(request);
    if (!body) {
      return badRequest("Dữ liệu không hợp lệ");
    }

    const parsed = createMarketingExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ"
      );
    }

    const data = parsed.data;

    // ---- Reference existence -----------------------------------------
    const [marketingExists, facebookPageId] = await Promise.all([
      Employee.exists({
        _id: data.marketingEmployeeId,
        isActive: true,
      }),
      Promise.resolve(
        normalizeFacebookPageId(
          (data.facebookPageId as string | null | undefined) ?? null
        )
      ),
    ]);

    if (!marketingExists) {
      return badRequest("Nhân viên marketing không tồn tại");
    }

    if (facebookPageId) {
      const fbExists = await FacebookPage.exists({
        _id: facebookPageId,
        isActive: true,
      });
      if (!fbExists) {
        return badRequest("Facebook page không tồn tại");
      }
    }

    // ---- Call Service ------------------------------------------------
    const result = await marketingExpenseService.create({
      reportDate: data.reportDate,
      marketingEmployeeId: data.marketingEmployeeId,
      facebookPageId,
      requestedBudget: data.requestedBudget,
      spentBudget: data.spentBudget ?? {
        morning: 0,
        afternoon: 0,
        emergency: 0,
      },
      totalRevenue: data.totalRevenue,
      totalLeads: data.totalLeads,
      closedLeads: data.closedLeads,
      note: data.note ?? "",
      createdBy: currentUser.employee._id.toString(),
    });

    if (!result.success) {
      // Conflict (duplicate) → 409. Other → 400.
      const status = /tồn tại/i.test(result.error) ? 409 : 400;
      return errorResponse(result.error, status);
    }

    return success(
      mapMarketingExpenseFromDto(result.data as never),
      "Tạo báo cáo marketing expense thành công"
    );
  } catch (error) {
    console.error("Marketing Expense Create Error:", error);
    return serverError("Không thể tạo báo cáo marketing expense");
  }
}