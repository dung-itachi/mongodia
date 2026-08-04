/**
 * Marketing Dashboard API Route (Sprint 5.4 — Marketing Dashboard Mongo Aggregation)
 *
 * GET /api/marketing/dashboard
 *
 * Returns marketing dashboard summary, charts and top performers.
 *
 * Luồng dữ liệu:
 * React Query → API Route → MarketingDashboardService → Lead Collection (MongoDB Aggregation)
 */

import { connectDB } from "@/lib/mongodb";
import { marketingDashboardService } from "@/services/marketing-dashboard.service";
import { success, error as errorResponse } from "@/utils/response";

export async function GET() {
  try {
    await connectDB();

    const data = await marketingDashboardService.getDashboard();

    return success(data);
  } catch (error) {
    console.error("Marketing Dashboard Error:", error);
    return errorResponse("Không thể lấy dữ liệu dashboard", 500);
  }
}
