/**
 * Marketing Lead Convert Route (Sprint 5.7 — Lead Convert → Order)
 *
 * POST /api/marketing/leads/:id/convert
 *
 * Business Flow:
 * API Route → LeadService.convertLead() → OrderService.createFromLead() → MongoDB → LeadHistory
 */

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { leadService } from "@/services/lead.service";
import { success, error as errorResponse } from "@/utils/response";

async function getActorId(request: Request): Promise<string> {
  const currentUser = await getCurrentUser(request);
  return currentUser.employee._id.toString();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = await getActorId(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const result = await leadService.convertLead(id, actorId);

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success({ orderId: result.orderId }, "Convert Lead thành công");
  } catch (error) {
    console.error("Marketing Lead Convert Error:", error);
    return errorResponse("Không thể convert lead", 500);
  }
}
