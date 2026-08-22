import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { leadService } from "@/services/lead.service";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/constants/marketing";
import { LeadSource } from "@/constants/leadSource";
import { LeadStatus } from "@/constants/leadStatus";
import { success, error as errorResponse } from "@/utils/response";
import { updateLeadSchema } from "@/utils/validator";
import type { Lead, UpdateLeadInput } from "@/types/lead";
import type { MarketingLead } from "@/types/marketing-lead";

function mapMarketingLead(lead: Lead): MarketingLead {
  const leadAny = lead as Lead & {
    customerId?: string;
    marketingEmployee?: { _id: string; employeeCode: string; name: string };
    saleEmployee?: { _id: string; employeeCode: string; name: string };
    combo?: { _id: string; code: string; name: string };
    product?: { _id: string; code: string; name: string };
    facebookPage?: { _id: string; code: string; name: string };
    isConverted?: boolean;
    orderId?: string;
    convertedAt?: Date;
  };
  return {
    _id: lead._id,
    leadCode: lead.leadCode,
    customerName: lead.customerName,
    customerId: leadAny.customerId,
    phone: lead.phone,
    phone2: lead.phone2,
    email: lead.email,
    facebookLink: lead.facebookLink,
    address: lead.address,
    source: lead.sourceType as LeadSource,
    sourceLabel: LEAD_SOURCE_LABELS[lead.sourceType as LeadSource],
    status: lead.status,
    statusLabel: LEAD_STATUS_LABELS[lead.status],
    marketingEmployee: leadAny.marketingEmployee,
    saleEmployee: leadAny.saleEmployee,
    combo: leadAny.combo,
    product: leadAny.product,
    facebookPage: leadAny.facebookPage,
    note: lead.note,
    isDuplicate: lead.isDuplicate,
    // Sprint 5.7 — Lead Convert
    isConverted: leadAny.isConverted ?? false,
    orderId: leadAny.orderId,
    convertedAt: leadAny.convertedAt?.toISOString(),
    // Sprint 8.x — leadDate từ Landing page
    leadDate: (lead as Lead & { leadDate?: Date }).leadDate?.toISOString(),
    // Sprint 8.x — Thời gian đơn hàng và nhận đơn
    orderDate: (lead as Lead & { orderDate?: Date }).orderDate?.toISOString(),
    receivedDate: (lead as Lead & { receivedDate?: Date }).receivedDate?.toISOString(),
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

async function getActorId(request: Request): Promise<string> {
  const currentUser = await getCurrentUser(request);
  return currentUser.employee._id.toString();
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;
    const lead = await leadService.getById(id);

    if (!lead) {
      return errorResponse("Lead không tồn tại", 404);
    }

    return success(mapMarketingLead(lead));
  } catch (error) {
    console.error("Marketing Lead Detail Error:", error);
    return errorResponse("Không thể lấy lead", 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const normalizedBody = body && typeof body === "object"
      ? {
          ...(body as Record<string, unknown>),
          sourceType: (body as Record<string, unknown>).sourceType ?? (body as Record<string, unknown>).source,
        }
      : body;

    const parsed = updateLeadSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
    }

    const assignedAtValue =
      typeof parsed.data.assignedAt === "string"
        ? new Date(parsed.data.assignedAt)
        : parsed.data.assignedAt ?? undefined;

    const sourceTypeValue = parsed.data.sourceType as LeadSource | undefined;
    const statusValue = parsed.data.status as LeadStatus | undefined;

    // Sprint 8.x: Parse orderDate and receivedDate
    const orderDateValue =
      typeof parsed.data.orderDate === "string"
        ? new Date(`${parsed.data.orderDate}+07:00`)
        : parsed.data.orderDate ?? undefined;

    const receivedDateValue =
      typeof parsed.data.receivedDate === "string"
        ? new Date(`${parsed.data.receivedDate}+07:00`)
        : parsed.data.receivedDate ?? undefined;

    const updateInput: UpdateLeadInput = {
      ...parsed.data,
      customerId: parsed.data.customerId ?? undefined,
      customerNewName: parsed.data.customerNewName ?? undefined,
      facebookLink: parsed.data.facebookLink ?? undefined,
      phone: parsed.data.phone ?? undefined,
      phone2: parsed.data.phone2 ?? undefined,
      address: parsed.data.address ?? undefined,
      sourceType: sourceTypeValue,
      facebookPageId: parsed.data.facebookPageId ?? undefined,
      facebookPageAssignmentId: parsed.data.facebookPageAssignmentId ?? undefined,
      marketingEmployeeId: parsed.data.marketingEmployeeId ?? undefined,
      saleEmployeeId: parsed.data.saleEmployeeId ?? undefined,
      categoryId: parsed.data.categoryId ?? undefined,
      productId: parsed.data.productId ?? undefined,
      comboId: parsed.data.comboId ?? undefined,
      quantity: parsed.data.quantity ?? undefined,
      unitPriceMNT: parsed.data.unitPriceMNT ?? undefined,
      exchangeRate: parsed.data.exchangeRate ?? undefined,
      estimatedWeight: parsed.data.estimatedWeight ?? undefined,
      assignedAt: assignedAtValue,
      assignmentType: parsed.data.assignmentType as "AUTO" | "MANUAL" | undefined,
      note: parsed.data.note ?? undefined,
      latestRemark: parsed.data.latestRemark ?? undefined,
      isDuplicate: parsed.data.isDuplicate ?? undefined,
      isActive: parsed.data.isActive ?? undefined,
      status: statusValue,
      // Sprint 8.x: Thời gian đơn hàng và nhận đơn
      orderDate: orderDateValue,
      receivedDate: receivedDateValue,
    };

    const updated = await leadService.update(id, updateInput, actorId);
    if (!updated) {
      return errorResponse("Lead không tồn tại", 404);
    }

    return success(mapMarketingLead(updated), "Cập nhật lead thành công");
  } catch (error) {
    console.error("Marketing Lead Update Error:", error);
    return errorResponse("Không thể cập nhật lead", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actorId = await getActorId(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const lead = await leadService.getById(id);
    if (!lead) {
      return errorResponse("Lead không tồn tại", 404);
    }

    const deletedLead = lead;
    const deleted = await leadService.delete(id, actorId);
    if (!deleted) {
      return errorResponse("Không thể xóa lead", 500);
    }

    return success(mapMarketingLead(deletedLead), "Xóa lead thành công");
  } catch (error) {
    console.error("Marketing Lead Delete Error:", error);
    return errorResponse("Không thể xóa lead", 500);
  }
}
