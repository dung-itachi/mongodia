/**
 * Marketing Lead Timeline Route (Sprint 5.6 — Lead Timeline)
 *
 * GET /api/marketing/leads/:id/timeline
 *
 * Business Flow:
 * LeadRoute → LeadHistoryService.getTimeline() → LeadHistoryRepository.findTimelineByLead() → MongoDB
 */

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { leadHistoryService } from "@/services/leadHistory.service";
import { leadService } from "@/services/lead.service";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const lead = await leadService.getById(id);
    if (!lead) {
      return errorResponse("Lead không tồn tại", 404);
    }

    const timeline = await leadHistoryService.getTimeline(id);

    return success(timeline);
  } catch (error) {
    console.error("Marketing Lead Timeline Error:", error);
    return errorResponse("Không thể lấy timeline", 500);
  }
}
