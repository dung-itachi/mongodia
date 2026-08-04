/**
 * Marketing Lead Assign Route (Sprint 5.5.2 — Lead Assignment)
 *
 * PATCH /api/marketing/leads/:id/assign
 *
 * Business Flow:
 * API Route → LeadService.assignLead() → LeadRepository.assignSale() → MongoDB → LeadHistory
 */

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { leadService } from "@/services/lead.service";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/constants/marketing";
import { LeadSource } from "@/constants/leadSource";
import { success, error as errorResponse } from "@/utils/response";
import type { Lead } from "@/types/lead";
import type { MarketingLead } from "@/types/marketing-lead";

function mapMarketingLead(lead: Lead): MarketingLead {
  const leadAny = lead as Lead & {
    customerId?: string;
    marketingEmployee?: { _id: string; employeeCode: string; name: string };
    saleEmployee?: { _id: string; employeeCode: string; name: string };
    isConverted?: boolean;
    orderId?: string;
    convertedAt?: Date;
  };
  return {
    _id: lead._id,
    leadCode: lead.leadCode,
    customerName: lead.customerName,
    phone: lead.phone,
    phone2: lead.phone2,
    email: lead.email,
    facebookLink: lead.facebookLink,
    source: lead.sourceType as LeadSource,
    sourceLabel: LEAD_SOURCE_LABELS[lead.sourceType as LeadSource],
    status: lead.status,
    statusLabel: LEAD_STATUS_LABELS[lead.status],
    marketingEmployee: leadAny.marketingEmployee,
    saleEmployee: leadAny.saleEmployee,
    note: lead.note,
    isDuplicate: lead.isDuplicate,
    // Sprint 5.7 — Lead Convert
    isConverted: leadAny.isConverted ?? false,
    orderId: leadAny.orderId,
    convertedAt: leadAny.convertedAt?.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

async function getActorId(request: Request): Promise<string> {
  const currentUser = await getCurrentUser(request);
  return currentUser.employee._id.toString();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actorId = await getActorId(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const data = body as Record<string, unknown>;

    if (!data.saleEmployeeId || typeof data.saleEmployeeId !== "string") {
      return errorResponse("saleEmployeeId là bắt buộc", 400);
    }

    if (!mongoose.Types.ObjectId.isValid(data.saleEmployeeId as string)) {
      return errorResponse("saleEmployeeId không hợp lệ", 400);
    }

    const result = await leadService.assign(
      id,
      {
        saleEmployeeId: data.saleEmployeeId as string,
        assignmentType: (data.assignmentType as "AUTO" | "MANUAL") ?? "MANUAL",
      },
      actorId
    );

    if (!result.success) {
      return errorResponse(result.error, 400);
    }

    return success(mapMarketingLead(result.lead), "Phân công Sale thành công");
  } catch (error) {
    console.error("Marketing Lead Assign Error:", error);
    return errorResponse("Không thể phân công lead", 500);
  }
}
