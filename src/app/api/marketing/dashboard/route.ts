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

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { marketingDashboardService } from "@/services/marketing-dashboard.service";
import { success, error as errorResponse } from "@/utils/response";
import type { MarketingDashboardFilter } from "@/types/marketing-dashboard-filter";
import { ChartPeriod } from "@/types/marketing-dashboard";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const filter: MarketingDashboardFilter = {
      period: (searchParams.get("period") as ChartPeriod) ?? "7d",
    };

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    if (startDate || endDate) {
      filter.dateRange = {
        startDate: startDate ?? "",
        endDate: endDate ?? "",
      };
    }

    const data = await marketingDashboardService.getDashboard(filter);

    return success(data);
  } catch (error) {
    console.error("Marketing Dashboard Error:", error);
    return errorResponse("Không thể lấy dữ liệu dashboard", 500);
  }
}
