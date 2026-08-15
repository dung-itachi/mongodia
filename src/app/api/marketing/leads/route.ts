import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { leadService } from "@/services/lead.service";
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS } from "@/constants/marketing";
import { LeadSource } from "@/constants/leadSource";
import { LeadStatus } from "@/constants/leadStatus";
import { success, error as errorResponse } from "@/utils/response";
import { createLeadSchema } from "@/utils/validator";
import type { CreateLeadInput, Lead } from "@/types/lead";
import type { MarketingLead, MarketingLeadListResponse } from "@/types/marketing-lead";

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
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

function mapMarketingLeadList(result: Awaited<ReturnType<typeof leadService.searchLeads>>): MarketingLeadListResponse {
  return {
    items: result.items.map((lead) => mapMarketingLead(lead)),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}

function getSortOrder(value: string | null): "asc" | "desc" | undefined {
  if (value === "asc" || value === "desc") {
    return value;
  }

  return undefined;
}

function getSortField(value: string | null): string | undefined {
  const allowed = new Set(["createdAt", "updatedAt", "leadCode", "customerName", "status", "sourceType"]);
  return value && allowed.has(value) ? value : undefined;
}

async function getActorId(request: Request): Promise<string> {
  const currentUser = await getCurrentUser(request);
  return currentUser.employee._id.toString();
}

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || undefined;
    const status = searchParams.get("status") || undefined;
    const source = searchParams.get("source") || undefined;
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get("pageSize") ?? searchParams.get("limit")) || 20, 1), 100);
    const sort = getSortField(searchParams.get("sort"));
    const order = getSortOrder(searchParams.get("order"));

    const result = await leadService.search({
      keyword,
      status: status as LeadStatus | undefined,
      sourceType: source as unknown as LeadSource | undefined,
      page,
      limit,
      sort,
      order,
      isActive: true,
    });

    return success(mapMarketingLeadList(result));
  } catch (error) {
    console.error("Marketing Lead List Error:", error);
    return errorResponse("Không thể lấy danh sách lead", 500);
  }
}

export async function POST(request: Request) {
  try {
    const actorId = await getActorId(request);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const normalizedBody = body && typeof body === "object"
      ? {
          ...(body as Record<string, unknown>),
          sourceType: (body as Record<string, unknown>).sourceType ?? (body as Record<string, unknown>).source,
        }
      : body;

    const parsed = createLeadSchema.safeParse(normalizedBody);
    if (!parsed.success) {
      console.error("Lead validation error - full details:", JSON.stringify(normalizedBody, null, 2));
      console.error("Lead validation error - zod issues:", parsed.error.issues);
      return errorResponse(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", 400);
    }

    const sourceTypeValue = parsed.data.sourceType as LeadSource;
    const statusValue = parsed.data.status as LeadStatus | undefined;

    const createInput: CreateLeadInput = {
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
      status: statusValue,
      note: parsed.data.note ?? undefined,
      isDuplicate: parsed.data.isDuplicate ?? undefined,
    };

    const created = await leadService.create(createInput, actorId);
    return success(mapMarketingLead(created), "Tạo lead thành công");
  } catch (error) {
    console.error("Marketing Lead Create Error:", error);
    return errorResponse("Không thể tạo lead", 500);
  }
}
