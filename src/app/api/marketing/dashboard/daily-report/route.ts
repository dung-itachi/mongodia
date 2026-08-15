/**
 * Daily Report API Route
 *
 * GET /api/marketing/dashboard/daily-report
 *
 * Trả về dữ liệu chi tiết theo từng ngày:
 * - 📈 Doanh số theo ngày (từ Order)
 * - 📊 Báo cáo Ads theo ngày (từ MarketingExpenseReport)
 *
 * Scope (Sprint 7.4 — fix "Doanh số theo ngày" theo tài khoản đăng nhập):
 * - MKT (non-admin): chỉ thấy đơn của chính mình (filter `marketingEmployeeId`).
 * - ADMIN / GLOBAL: thấy tất cả MKT, có thể chọn riêng 1 MKT qua query `marketingEmployeeId`.
 * - Báo cáo Ads cũng filter theo cùng scope.
 */

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { MarketingExpenseReport } from "@/models/MarketingExpenseReport";
import { OrderStatus } from "@/constants/orderStatus";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const dateStr = searchParams.get("date"); // Optional: filter by specific date
    const marketingEmployeeIdParam = searchParams.get("marketingEmployeeId");

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
    // - Non-GLOBAL user bị khoá cứng theo chính mình.
    // - GLOBAL user: nếu truyền marketingEmployeeId thì lọc theo; không truyền = tất cả.
    let effectiveMarketingEmployeeId: string | null = null;
    if (!isGlobal) {
      effectiveMarketingEmployeeId = currentUser.employee._id.toString();
    } else if (marketingEmployeeIdParam && marketingEmployeeIdParam.trim()) {
      effectiveMarketingEmployeeId = marketingEmployeeIdParam.trim();
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (dateStr) {
      // Filter by specific date
      startDate = new Date(dateStr);
      endDate = new Date(dateStr);
      endDate.setUTCHours(23, 59, 59, 999);
    } else {
      // Calculate based on period
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
    }

    // Build match stages applying scope
    const orderMatch: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: true,
      status: { $nin: [OrderStatus.CANCELLED, OrderStatus.RETURNED] },
    };
    if (effectiveMarketingEmployeeId) {
      orderMatch.marketingEmployeeId = effectiveMarketingEmployeeId;
    }

    const adsMatch: Record<string, unknown> = {
      reportDate: { $gte: startDate, $lte: endDate },
      isActive: { $ne: false },
    };
    if (effectiveMarketingEmployeeId) {
      adsMatch.marketingEmployeeId = effectiveMarketingEmployeeId;
    }

    // Fetch Revenue Data (Orders) by day
    const revenueByDay = await Order.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", totalOrders: 1, totalRevenue: 1, avgOrderValue: 1 } },
    ]);

    // Fetch Ads Expense Data by day
    const adsByDay = await MarketingExpenseReport.aggregate([
      { $match: adsMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$reportDate" } },
          totalSpent: {
            $sum: {
              $add: [
                { $ifNull: ["$spentBudget.morning", 0] },
                { $ifNull: ["$spentBudget.afternoon", 0] },
                { $ifNull: ["$spentBudget.emergency", 0] },
              ],
            },
          },
          totalRevenue: { $sum: "$totalRevenue" },
          totalLeads: { $sum: "$totalLeads" },
          closedLeads: { $sum: "$closedLeads" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalSpent: 1,
          totalRevenue: 1,
          totalLeads: 1,
          closedLeads: 1,
          roas: {
            $cond: [
              { $gt: ["$totalSpent", 0] },
              { $round: [{ $divide: ["$totalRevenue", "$totalSpent"] }, 2] },
              0,
            ],
          },
        },
      },
      { $sort: { date: 1 } },
    ]);

    // Merge data by date
    const dateMap = new Map<string, { date: string; revenue: number; orders: number; avgOrder: number; adsSpent: number; adsRevenue: number; leads: number; closedLeads: number; roas: number }>();

    // Initialize all dates in range
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateKey = cursor.toISOString().slice(0, 10);
      dateMap.set(dateKey, {
        date: dateKey,
        revenue: 0,
        orders: 0,
        avgOrder: 0,
        adsSpent: 0,
        adsRevenue: 0,
        leads: 0,
        closedLeads: 0,
        roas: 0,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    // Fill in revenue data
    for (const item of revenueByDay) {
      const existing = dateMap.get(item.date);
      if (existing) {
        existing.revenue = item.totalRevenue;
        existing.orders = item.totalOrders;
        existing.avgOrder = Math.round(item.avgOrderValue);
      }
    }

    // Fill in ads data
    for (const item of adsByDay) {
      const existing = dateMap.get(item.date);
      if (existing) {
        existing.adsSpent = item.totalSpent;
        existing.adsRevenue = item.totalRevenue;
        existing.leads = item.totalLeads;
        existing.closedLeads = item.closedLeads;
        existing.roas = item.roas;
      }
    }

    // Convert to array and calculate totals
    const dailyData = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const totals = dailyData.reduce(
      (acc, day) => ({
        totalRevenue: acc.totalRevenue + day.revenue,
        totalOrders: acc.totalOrders + day.orders,
        totalAdsSpent: acc.totalAdsSpent + day.adsSpent,
        totalAdsRevenue: acc.totalAdsRevenue + day.adsRevenue,
        totalLeads: acc.totalLeads + day.leads,
        totalClosedLeads: acc.totalClosedLeads + day.closedLeads,
      }),
      { totalRevenue: 0, totalOrders: 0, totalAdsSpent: 0, totalAdsRevenue: 0, totalLeads: 0, totalClosedLeads: 0 }
    );

    return success({
      period,
      scope: isGlobal ? "GLOBAL" : "SELF",
      effectiveMarketingEmployeeId,
      dateRange: {
        start: startDate.toISOString().slice(0, 10),
        end: endDate.toISOString().slice(0, 10),
      },
      data: dailyData,
      summary: {
        totalDays: dailyData.length,
        totalRevenue: totals.totalRevenue,
        totalOrders: totals.totalOrders,
        avgDailyRevenue: Math.round(totals.totalRevenue / dailyData.length) || 0,
        totalAdsSpent: totals.totalAdsSpent,
        totalAdsRevenue: totals.totalAdsRevenue,
        totalLeads: totals.totalLeads,
        totalClosedLeads: totals.totalClosedLeads,
        overallROAS: totals.totalAdsSpent > 0
          ? Math.round((totals.totalAdsRevenue / totals.totalAdsSpent) * 100) / 100
          : 0,
      },
    });
  } catch (err) {
    if (err instanceof ForbiddenError) return errorResponse(err.message, 403);
    console.error("Daily Report API Error:", err);
    return errorResponse("Không thể lấy dữ liệu báo cáo theo ngày", 500);
  }
}
