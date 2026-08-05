/**
 * ==================================================
 * CAMPAIGN BY ID API ROUTE
 * ==================================================
 *
 * Sprint 7.4 — Facebook Page & Campaign Management
 *
 * GET    /api/campaigns/[id]  — Get campaign by ID
 * PATCH  /api/campaigns/[id] — Update campaign
 * DELETE /api/campaigns/[id]  — Soft delete campaign
 */

import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { campaignService } from "@/services/campaign.service";
import { success, error as errorResponse } from "@/utils/response";

// ============================================================================
// GET /api/campaigns/[id]
// ============================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const result = await campaignService.getByIdWithPopulate(id);

    if (!result.success) {
      return errorResponse(result.error, 404);
    }

    return success(result.data);
  } catch (error) {
    console.error("Campaign Detail API Error:", error);
    return errorResponse("Không thể lấy chi tiết Campaign", 500);
  }
}

// ============================================================================
// PATCH /api/campaigns/[id]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const result = await campaignService.update(id, {
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
      isActive: body.isActive,
    });

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.data, "Cập nhật Campaign thành công");
  } catch (error) {
    console.error("Campaign Update API Error:", error);
    return errorResponse("Không thể cập nhật Campaign", 500);
  }
}

// ============================================================================
// DELETE /api/campaigns/[id]
// ============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const result = await campaignService.delete(id);

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(result.data, "Xóa Campaign thành công");
  } catch (error) {
    console.error("Campaign Delete API Error:", error);
    return errorResponse("Không thể xóa Campaign", 500);
  }
}
