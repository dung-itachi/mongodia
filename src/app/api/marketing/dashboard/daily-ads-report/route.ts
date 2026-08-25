/**
 * Daily Ads Report API
 *
 * GET - Lấy dữ liệu báo cáo Ads theo ngày
 * POST - Tạo báo cáo Ads nhanh
 *
 * Scope (Sprint 7.4 — fix "Báo cáo Ads theo ngày" theo tài khoản đăng nhập):
 * - MKT (non-GLOBAL): chỉ thấy báo cáo của chính mình (filter `marketingEmployeeId`).
 * - ADMIN/GLOBAL: thấy tất cả MKT, có thể chọn riêng 1 MKT qua query `employeeId`.
 * - Order revenue cũng được filter theo cùng scope.
 *
 * Sprint 8.X — Additional filters:
 * - `areaId`: lọc theo khu vực (được resolve thành danh sách employeeId trong area đó).
 * - `teamId`: lọc theo team (được resolve thành danh sách employeeId trong team đó).
 * - Priority: marketingEmployeeId > teamId > areaId (mỗi param override previous).
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import {
  getCurrentUser,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";
import { success, error as errorResponse } from "@/utils/response";
import { MarketingExpenseReport } from "@/models/MarketingExpenseReport";
import { Order } from "@/models/Order";
import { MarketingExpenseReportStatus } from "@/constants/marketing-expense";
import Employee from "@/models/Employee";
import Team from "@/models/Team";
import Area from "@/models/Area";

/**
 * Resolve an areaId or teamId into a list of marketing employee ObjectIds.
 * Returns undefined when no such filter should be applied.
 * NOTE: areaId/teamId values are CODE strings (e.g., "PVD"), not ObjectIds.
 */
async function resolveMarketingEmployeeIds(params: {
  areaId?: string | null;
  teamId?: string | null;
  marketingEmployeeId?: string | null;
}): Promise<string[] | undefined> {
  if (params.marketingEmployeeId) {
    return [params.marketingEmployeeId];
  }

  const { areaId, teamId } = params;

  if (teamId && teamId !== "__all__") {
    // Query by code (string) since Team uses code as identifier
    const team = await Team.findOne({ code: teamId }).select("leaderId managerId").lean();
    if (!team) return [];
    const ids = new Set<string>();
    if (team.leaderId) ids.add(team.leaderId.toString());
    if (team.managerId) ids.add(team.managerId.toString());
    const members = await Employee.find({ teamId: team._id })
      .select("_id")
      .lean();
    members.forEach((e) => ids.add(e._id.toString()));
    return ids.size > 0 ? Array.from(ids) : undefined;
  }

  if (areaId && areaId !== "__all__") {
    // Query by code (string) since Area uses code as identifier (e.g., "PVD")
    const area = await Area.findOne({ code: areaId }).select("teamIds").lean();
    if (!area || !area.teamIds || area.teamIds.length === 0) return [];
    const employeeIds = new Set<string>();
    for (const teamId2 of area.teamIds) {
      const members = await Employee.find({ teamId: teamId2 })
        .select("_id")
        .lean();
      members.forEach((e) => employeeIds.add(e._id.toString()));
    }
    return employeeIds.size > 0 ? Array.from(employeeIds) : undefined;
  }

  return undefined;
}

// ============================================================================
// GET /api/marketing/dashboard/daily-ads-report
// ============================================================================

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const employeeIdParam = searchParams.get("employeeId");
    const areaIdParam = searchParams.get("areaId");
    const teamIdParam = searchParams.get("teamId");

    // ----------------------------------------------------------------
    // Auth & scope
    // ----------------------------------------------------------------
    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return errorResponse(err.message, 401);
      }
      throw err;
    }

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";

    // Resolve effective marketingEmployeeId filter:
    // - Non-GLOBAL: khoá cứng theo chính mình.
    // - GLOBAL: nếu truyền employeeId thì lọc theo; không truyền = tất cả.
    // Priority: marketingEmployeeId > teamId > areaId.
    let effectiveMarketingEmployeeId: string | null = null;
    if (!isGlobal) {
      effectiveMarketingEmployeeId = currentUser.employee._id.toString();
    } else if (employeeIdParam && employeeIdParam.trim()) {
      effectiveMarketingEmployeeId = employeeIdParam.trim();
    }

    // Resolve area/team into a list of marketing employee IDs for $in queries.
    const resolvedEmployeeIds = await resolveMarketingEmployeeIds({
      marketingEmployeeId: effectiveMarketingEmployeeId,
      areaId: areaIdParam,
      teamId: teamIdParam,
    });

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    const endDate: Date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    switch (period) {
      case "7d":
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));
        break;
      case "30d":
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29, 0, 0, 0, 0));
        break;
      case "90d":
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89, 0, 0, 0, 0));
        break;
      default:
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0));
    }

    // Build match filter applying scope
    const matchFilter: Record<string, unknown> = {
      reportDate: { $gte: startDate, $lte: endDate },
      isActive: { $ne: false },
    };

    if (resolvedEmployeeIds && resolvedEmployeeIds.length > 0) {
      matchFilter.marketingEmployeeId = { $in: resolvedEmployeeIds };
    }

    // Get ads report data grouped by date
    const adsReportData = await MarketingExpenseReport.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
          firstReportId: { $first: "$_id" },
          reportStatus: { $first: "$status" },
          xinSang: { $sum: "$requestedBudget.morning" },
          xinChieu: { $sum: "$requestedBudget.afternoon" },
          xinGap: { $sum: "$requestedBudget.emergency" },
          tongTieu: {
            $sum: {
              $add: [
                { $ifNull: ["$spentBudget.morning", 0] },
                { $ifNull: ["$spentBudget.afternoon", 0] },
                { $ifNull: ["$spentBudget.emergency", 0] },
              ],
            },
          },
          tienDu: {
            $sum: {
              $add: [
                { $ifNull: ["$remainingBudget.morning", 0] },
                { $ifNull: ["$remainingBudget.afternoon", 0] },
                { $ifNull: ["$remainingBudget.emergency", 0] },
              ],
            },
          },
          totalLeads: { $sum: "$totalLeads" },
          closedLeads: { $sum: "$closedLeads" },
        },
      },
    ]);

    // Get revenue from Order table for each date
    // Uses totalAmount for non-CANCELLED orders (consistent revenue logic across all endpoints).
    // revenueEligible filter removed — totalAmount is always populated for active orders.
    const orderMatch: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: true,
      status: { $nin: ["CANCELLED"] },
      marketingEmployeeId: { $exists: true, $ne: null },
    };
    if (resolvedEmployeeIds && resolvedEmployeeIds.length > 0) {
      orderMatch.marketingEmployeeId = { $in: resolvedEmployeeIds };
    }

    const orderRevenueData = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalRevenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    // Create a map of date -> order revenue
    const orderRevenueMap = new Map(
      orderRevenueData.map((item) => [item._id, { totalRevenue: item.totalRevenue, orderCount: item.orderCount }])
    );

    // Combine ads report data with order revenue
    const dailyAdsData = adsReportData.map((report) => {
      const orderRevenue = orderRevenueMap.get(report._id) || { totalRevenue: 0, orderCount: 0 };
      const tongXin = report.xinSang + report.xinChieu + report.xinGap;
      return {
        date: report._id,
        firstReportId: report.firstReportId,
        reportStatus: report.reportStatus,
        xinSang: report.xinSang,
        xinChieu: report.xinChieu,
        xinGap: report.xinGap,
        tongTieu: report.tongTieu,
        tienDu: report.tienDu,
        totalRevenue: orderRevenue.totalRevenue,
        totalLeads: report.totalLeads,
        closedLeads: report.closedLeads,
        percentAds: orderRevenue.totalRevenue > 0
          ? Math.round((tongXin / orderRevenue.totalRevenue) * 10000) / 100
          : 0,
      };
    });

    // Sort by date descending
    dailyAdsData.sort((a, b) => b.date.localeCompare(a.date));

    // Calculate totals
    const totals = dailyAdsData.reduce(
      (acc, day) => ({
        xinSang: acc.xinSang + day.xinSang,
        xinChieu: acc.xinChieu + day.xinChieu,
        xinGap: acc.xinGap + day.xinGap,
        tongTieu: acc.tongTieu + day.tongTieu,
        tienDu: acc.tienDu + day.tienDu,
        totalRevenue: acc.totalRevenue + day.totalRevenue,
        totalLeads: acc.totalLeads + day.totalLeads,
        closedLeads: acc.closedLeads + day.closedLeads,
      }),
      {
        xinSang: 0, xinChieu: 0, xinGap: 0,
        tongTieu: 0, tienDu: 0,
        totalRevenue: 0, totalLeads: 0, closedLeads: 0,
      }
    );

    return success({
      period,
      scope: isGlobal ? "GLOBAL" : "SELF",
      effectiveMarketingEmployeeId,
      dateRange: {
        start: startDate.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
      },
      data: dailyAdsData,
      summary: {
        totalDays: dailyAdsData.length,
        tongXin: totals.xinSang + totals.xinChieu + totals.xinGap,
        tongTieu: totals.tongTieu,
        tienDu: totals.tienDu,
        totalRevenue: totals.totalRevenue,
        totalLeads: totals.totalLeads,
        closedLeads: totals.closedLeads,
        percentAds: totals.totalRevenue > 0
          ? Math.round(((totals.xinSang + totals.xinChieu + totals.xinGap) / totals.totalRevenue) * 10000) / 100
          : 0,
      },
    });
  } catch (err) {
    if (err instanceof ForbiddenError) return errorResponse(err.message, 403);
    console.error("Daily Ads Report API Error:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return errorResponse(`Không thể lấy dữ liệu báo cáo Ads theo ngày: ${errMsg}`, 500);
  }
}

// ============================================================================
// POST /api/marketing/dashboard/daily-ads-report
// ============================================================================

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("marketing-expense.create")) {
      return errorResponse("Bạn không có quyền tạo báo cáo", 403);
    }

    await connectDB();

    const body = await request.json();
    const { reportDate, xinSang = 0, xinChieu = 0, xinGap = 0 } = body;

    if (!reportDate) {
      return errorResponse("Vui lòng chọn ngày báo cáo", 400);
    }

    // Parse date
    const reportDateObj = new Date(reportDate);
    const startOfDay = new Date(Date.UTC(
      reportDateObj.getUTCFullYear(),
      reportDateObj.getUTCMonth(),
      reportDateObj.getUTCDate(),
      0, 0, 0, 0
    ));
    const endOfDay = new Date(Date.UTC(
      reportDateObj.getUTCFullYear(),
      reportDateObj.getUTCMonth(),
      reportDateObj.getUTCDate(),
      23, 59, 59, 999
    ));

    // Check duplicate
    const existing = await MarketingExpenseReport.findOne({
      reportDate: { $gte: startOfDay, $lte: endOfDay },
      marketingEmployeeId: currentUser.employee._id,
    });

    if (existing) {
      return errorResponse(
        `Đã tồn tại báo cáo cho ngày này. Vui lòng chỉnh sửa báo cáo hiện có.`,
        409
      );
    }

    // Create new report with DRAFT status
    const newReport = await MarketingExpenseReport.create({
      reportDate: startOfDay,
      marketingEmployeeId: currentUser.employee._id,
      requestedBudget: {
        morning: Number(xinSang) || 0,
        afternoon: Number(xinChieu) || 0,
        emergency: Number(xinGap) || 0,
      },
      spentBudget: {
        morning: 0,
        afternoon: 0,
        emergency: 0,
      },
      remainingBudget: {
        morning: Number(xinSang) || 0,
        afternoon: Number(xinChieu) || 0,
        emergency: Number(xinGap) || 0,
      },
      totalRevenue: 0,
      totalLeads: 0,
      closedLeads: 0,
      conversionRate: 0,
      roas: 0,
      cpa: 0,
      status: MarketingExpenseReportStatus.DRAFT,
      createdBy: currentUser.employee._id,
    });

    return success(
      {
        _id: newReport._id,
        reportDate: newReport.reportDate,
        requestedBudget: newReport.requestedBudget,
      },
      "Đã thêm báo cáo thành công"
    );
  } catch (error) {
    console.error("Daily Ads Report Create Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return errorResponse(`Không thể tạo báo cáo: ${errMsg}`, 500);
  }
}
