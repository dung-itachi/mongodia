/**
 * Daily Ads Report API
 * 
 * GET - Lấy dữ liệu báo cáo Ads theo ngày
 * POST - Tạo báo cáo Ads nhanh
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { MarketingExpenseReport } from "@/models/MarketingExpenseReport";
import { Order } from "@/models/Order";

// ============================================================================
// GET /api/marketing/dashboard/daily-ads-report
// ============================================================================

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const employeeId = searchParams.get("employeeId");

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    
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

    // Build match filter
    const matchFilter: Record<string, unknown> = {
      reportDate: { $gte: startDate, $lte: endDate },
      isActive: { $ne: false },
    };
    
    if (employeeId) {
      matchFilter.marketingEmployeeId = employeeId;
    }

    // First, get ads report data grouped by date
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
    const orderRevenueData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isActive: true,
          revenueEligible: true,
          status: "DELIVERED",
          marketingEmployeeId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalRevenue: { $sum: "$marketingRevenueFinal" },
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
      status: "DRAFT",
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
