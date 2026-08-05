/**
 * Marketing Dashboard Chart API Route (Sprint 7.2 — Charts & Analytics)
 *
 * GET /api/marketing/dashboard/chart?period=7d|30d|90d
 *
 * Returns chart trend data for marketing dashboard.
 */

import { connectDB } from "@/lib/mongodb";
import { marketingDashboardService } from "@/services/marketing-dashboard.service";
import { success, error as errorResponse } from "@/utils/response";
import type { ChartPeriod } from "@/types/marketing-dashboard";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "7d") as ChartPeriod;

    if (!["7d", "30d", "90d"].includes(period)) {
      return errorResponse("Invalid period. Use 7d, 30d, or 90d.", 400);
    }

    const data = await marketingDashboardService.getChartData(period);

    return success(data);
  } catch (err) {
    console.error("Marketing Dashboard Chart Error:", err);
    return errorResponse("Không thể lấy dữ liệu biểu đồ", 500);
  }
}
