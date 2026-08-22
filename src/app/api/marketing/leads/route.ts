import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";
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
    combo?: { _id: string; code: string; name: string; sellingPrice?: number };
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
    const currentUser = await getCurrentUser(request);
    await connectDB();

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";
    const permissions = currentUser.permissions ?? [];
    const canViewAll = permissions.includes("*") ||
      permissions.includes("account.manageAll") ||
      permissions.includes("marketing-order.viewAll");

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || undefined;
    const status = searchParams.get("status") || undefined;
    const source = searchParams.get("source") || undefined;
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Math.max(Number(searchParams.get("pageSize") ?? searchParams.get("limit")) || 20, 1), 100);
    const sort = getSortField(searchParams.get("sort"));
    const order = getSortOrder(searchParams.get("order"));
    const teamId = searchParams.get("team") || undefined;
    const marketingEmployeeId = searchParams.get("marketingEmployeeId") || undefined;
    const areaId = searchParams.get("areaId") || undefined;

    // Sprint 8.x: Non-admin users can only see their own leads
    const effectiveMarketingEmployeeId = canViewAll ? marketingEmployeeId : currentUser.employee._id.toString();

    const result = await leadService.search({
      keyword,
      status: status as LeadStatus | undefined,
      sourceType: source as unknown as LeadSource | undefined,
      page,
      limit,
      sort,
      order,
      isActive: true,
      teamId,
      marketingEmployeeId: effectiveMarketingEmployeeId,
      areaId,
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

    // Sprint 8.X: Auto-set marketingEmployeeId from current user
    // This ensures leads created from MarketingInputSection have the correct employee
    const currentUserId = await getActorId(request);

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
      // Sprint 8.X: Auto-assign marketingEmployeeId from current user if not provided
      marketingEmployeeId: parsed.data.marketingEmployeeId ?? currentUserId,
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
      // Sprint 8.x: leadDate từ Landing page (VN timezone +07:00)
      leadDate: parsed.data.leadDate
        ? new Date(`${parsed.data.leadDate}+07:00`)
        : undefined,
      // Sprint 8.x: Thời gian đơn hàng
      orderDate: parsed.data.orderDate
        ? new Date(`${parsed.data.orderDate}+07:00`)
        : undefined,
      // Sprint 8.x: Thời gian nhận đơn
      receivedDate: parsed.data.receivedDate
        ? new Date(`${parsed.data.receivedDate}+07:00`)
        : undefined,
    };

    const created = await leadService.create(createInput, actorId);

    // Sprint 8.x: Auto-assign Sale nếu setting = AUTO.
    // Lưu ý: KHÔNG fail cả request nếu auto-assign lỗi — Lead vẫn được tạo,
    // chỉ là chưa được phân công. Sale sẽ tự assign thủ công.
    try {
      const { getLeadAssignmentMode } = await import("@/lib/system-settings");
      const { pickNextSaleForLead } = await import("@/services/lead-assignment.helper");

      const modeSetting = await getLeadAssignmentMode();
      if (modeSetting.mode === "AUTO") {
        const pickedSaleId = await pickNextSaleForLead();
        if (pickedSaleId) {
          const assignResult = await leadService.assign(
            created._id,
            { saleEmployeeId: pickedSaleId, assignmentType: "AUTO" },
            actorId
          );
          if (assignResult.success) {
            return success(
              mapMarketingLead(assignResult.lead),
              "Tạo lead thành công và đã tự động phân công Sale"
            );
          }
          // Nếu assign thất bại → vẫn trả về lead mới tạo
          console.warn("Auto-assign Sale failed:", assignResult.error);
        } else {
          console.warn("Auto-assign: không tìm thấy Sale active nào");
        }
      }
    } catch (autoAssignError) {
      // Không để lỗi auto-assign làm hỏng response tạo lead
      console.error("Auto-assign Sale error (non-fatal):", autoAssignError);
    }

    return success(mapMarketingLead(created), "Tạo lead thành công");
  } catch (error) {
    console.error("Marketing Lead Create Error:", error);
    return errorResponse("Không thể tạo lead", 500);
  }
}
