/**
 * ==================================================
 * FACEBOOK PAGES API ROUTES
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * GET    /api/facebook-pages        — List pages
 * GET    /api/facebook-pages/:id   — Get page by ID
 * POST   /api/facebook-pages        — Create page
 * PATCH  /api/facebook-pages/:id   — Update page
 * DELETE /api/facebook-pages/:id    — Soft delete page
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { facebookPageService } from "@/services/facebook-page.service";
import { success, error as errorResponse } from "@/utils/response";

// ============================================================================
// GET /api/facebook-pages — List pages
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const keyword = searchParams.get("keyword")?.trim() ?? "";
    const status = searchParams.get("status") as "ACTIVE" | "INACTIVE" | null;
    const isActive = searchParams.get("isActive");

    // Get current user for account filtering
    const currentUser = await getCurrentUser(request);

    const result = await facebookPageService.getList({
      page,
      pageSize,
      keyword: keyword || undefined,
      status: status ?? undefined,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      accountId: currentUser.role !== "ADMIN" ? currentUser.accountId : undefined,
    });

    return success(result);
  } catch (error) {
    console.error("Facebook Pages API Error:", error);
    return errorResponse("Không thể lấy danh sách Facebook Pages", 500);
  }
}

// ============================================================================
// POST /api/facebook-pages — Create page
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const currentUser = await getCurrentUser(request);

    const body = await request.json();

    const result = await facebookPageService.create({
      code: body.code,
      name: body.name,
      pageUrl: body.pageUrl,
      facebookPageId: body.facebookPageId,
      avatarUrl: body.avatarUrl,
      description: body.description,
      businessManager: body.businessManager,
      currency: body.currency,
      timezone: body.timezone,
      status: body.status,
      note: body.note,
      accountId: currentUser.accountId,
    });

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.data, "Tạo Facebook Page thành công");
  } catch (error) {
    console.error("Facebook Pages API Error:", error);
    return errorResponse("Không thể tạo Facebook Page", 500);
  }
}
