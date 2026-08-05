/**
 * Marketing Dashboard Export API Route (Sprint 7.3 — Drill-down & Export)
 *
 * GET /api/marketing/dashboard/export
 *
 * Returns all data needed for Excel/PDF export.
 */

import { connectDB } from "@/lib/mongodb";
import { marketingDashboardService } from "@/services/marketing-dashboard.service";
import { success, error as errorResponse } from "@/utils/response";
import type { ChartPeriod } from "@/types/marketing-dashboard";
import type { MarketingDashboardFilter } from "@/types/marketing-dashboard-filter";

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const filter: MarketingDashboardFilter = {
      period: (searchParams.get("period") || "7d") as ChartPeriod,
    };

    if (searchParams.get("startDate")) {
      filter.dateRange = {
        startDate: searchParams.get("startDate")!,
        endDate: searchParams.get("endDate") || new Date().toISOString().slice(0, 10),
      };
    }
    if (searchParams.get("facebookPageId")) {
      filter.facebookPageId = searchParams.get("facebookPageId")!;
    }
    if (searchParams.get("marketingEmployeeId")) {
      filter.marketingEmployeeId = searchParams.get("marketingEmployeeId")!;
    }
    if (searchParams.get("campaignId")) {
      filter.campaignId = searchParams.get("campaignId")!;
    }
    if (searchParams.get("source")) {
      filter.source = searchParams.get("source") as MarketingDashboardFilter["source"];
    }
    if (searchParams.get("status")) {
      filter.status = searchParams.get("status") as MarketingDashboardFilter["status"];
    }

    const data = await marketingDashboardService.getExportData(filter);

    return success(data);
  } catch (err) {
    console.error("Marketing Dashboard Export Error:", err);
    return errorResponse("Không thể xuất dữ liệu dashboard", 500);
  }
}
