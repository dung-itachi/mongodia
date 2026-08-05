/**
 * ==================================================
 * FACEBOOK PAGE BY ID API ROUTE
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * GET    /api/facebook-pages/[id]  — Get page by ID
 * PATCH  /api/facebook-pages/[id] — Update page
 * DELETE /api/facebook-pages/[id]  — Soft delete page
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { facebookPageService } from "@/services/facebook-page.service";
import { success, error as errorResponse } from "@/utils/response";

// ============================================================================
// GET /api/facebook-pages/[id]
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const result = await facebookPageService.getById(id);

    if (!result.success) {
      return errorResponse(result.error, 404);
    }

    return success(result.data);
  } catch (error) {
    console.error("Facebook Page Detail API Error:", error);
    return errorResponse("Không thể lấy chi tiết Facebook Page", 500);
  }
}

// ============================================================================
// PATCH /api/facebook-pages/[id]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const result = await facebookPageService.update(id, {
      code: body.code,
      name: body.name,
      pageUrl: body.pageUrl,
      facebookPageId: body.facebookPageId,
      description: body.description,
      businessManager: body.businessManager,
      currency: body.currency,
      timezone: body.timezone,
      status: body.status,
      note: body.note,
      isActive: body.isActive,
    });

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.data, "Cập nhật Facebook Page thành công");
  } catch (error) {
    console.error("Facebook Page Update API Error:", error);
    return errorResponse("Không thể cập nhật Facebook Page", 500);
  }
}

// ============================================================================
// DELETE /api/facebook-pages/[id]
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const result = await facebookPageService.delete(id);

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.data, "Xóa Facebook Page thành công");
  } catch (error) {
    console.error("Facebook Page Delete API Error:", error);
    return errorResponse("Không thể xóa Facebook Page", 500);
  }
}
