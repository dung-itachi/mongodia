/**
 * Marketing Dashboard Ranking API Route (Sprint 7.2 — Charts & Analytics)
 *
 * GET /api/marketing/dashboard/ranking
 *
 * Returns ranking data for marketing dashboard.
 */

import { connectDB } from "@/lib/mongodb";
import { marketingDashboardService } from "@/services/marketing-dashboard.service";
import { success, error as errorResponse } from "@/utils/response";

export async function GET() {
  try {
    await connectDB();

    const data = await marketingDashboardService.getRankingData();

    return success(data);
  } catch (err) {
    console.error("Marketing Dashboard Ranking Error:", err);
    return errorResponse("Không thể lấy dữ liệu xếp hạng", 500);
  }
}
