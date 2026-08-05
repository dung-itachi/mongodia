/**
 * ==================================================
 * CAMPAIGNS API ROUTES
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * GET    /api/campaigns         — List campaigns
 * POST   /api/campaigns         — Create campaign
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { campaignService } from "@/services/campaign.service";
import { success, error as errorResponse } from "@/utils/response";

// ============================================================================
// GET /api/campaigns — List campaigns
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const keyword = searchParams.get("keyword")?.trim() ?? "";
    const facebookPageId = searchParams.get("facebookPageId")?.trim() ?? "";
    const marketingEmployeeId = searchParams.get("marketingEmployeeId")?.trim() ?? "";
    const status = searchParams.get("status") as "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" | null;
    const isActive = searchParams.get("isActive");

    const result = await campaignService.getList({
      page,
      pageSize,
      keyword: keyword || undefined,
      facebookPageId: facebookPageId || undefined,
      marketingEmployeeId: marketingEmployeeId || undefined,
      status: status ?? undefined,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
    });

    return success(result);
  } catch (error) {
    console.error("Campaigns API Error:", error);
    return errorResponse("Không thể lấy danh sách Campaigns", 500);
  }
}

// ============================================================================
// POST /api/campaigns — Create campaign
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    const result = await campaignService.create({
      code: body.code,
      name: body.name,
      facebookPageId: body.facebookPageId,
      objective: body.objective,
      startDate: body.startDate,
      endDate: body.endDate,
      dailyBudget: body.dailyBudget,
      lifetimeBudget: body.lifetimeBudget,
      status: body.status,
      marketingEmployeeId: body.marketingEmployeeId,
      note: body.note,
    });

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.data, "Tạo Campaign thành công");
  } catch (error) {
    console.error("Campaigns API Error:", error);
    return errorResponse("Không thể tạo Campaign", 500);
  }
}
