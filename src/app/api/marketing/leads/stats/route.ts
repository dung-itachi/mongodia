/**
 * API Route: Marketing Orders Stats (Sprint 8.x+)
 *
 * GET /api/marketing/leads/stats
 *
 * Returns aggregated stats for the /marketing/orders page:
 * - statusCounts:    breakdown of lead count per LeadStatus (for ALL statuses,
 *                    regardless of the active status filter on the table).
 * - totalCount:      grand total of leads matching the current filter scope.
 * - closedCount:     number of leads with status = CLOSED.
 * - closedRevenueMNT: total revenue from CLOSED leads
 *                     (= sum of (combo.sellingPrice - shippingFee) per CLOSED lead,
 *                      clamped at 0 per lead).
 * - shippingFeeMNT:  current shipping fee used to compute revenue.
 *
 * Filters supported: keyword, source, teamId, areaId, marketingEmployeeId.
 * The `status` filter is intentionally NOT applied — stats always show a
 * full breakdown across statuses so the user can see at a glance how many
 * leads sit in each stage.
 *
 * Scope logic mirrors /marketing/orders:
 *  - Users with `marketing-order.viewAll` (or wildcard) see stats for all leads.
 *  - Other users see stats for their own leads only.
 */

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { LeadStatus, LEAD_STATUS_LABELS, LEAD_STATUS_ORDER } from "@/constants/leadStatus";
import { getCurrentShippingFee } from "@/lib/system-settings";

export interface StatusCountItem {
  status: string;
  label: string;
  count: number;
}

export interface MarketingOrdersStats {
  statusCounts: StatusCountItem[];
  totalCount: number;
  closedCount: number;
  closedRevenueMNT: number;
  shippingFeeMNT: number;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildBaseKeywordFilter(keyword: string | undefined) {
  if (!keyword) return {};
  const rx = new RegExp(escapeRegex(keyword), "i");
  return {
    $or: [
      { leadCode: rx },
      { customerName: rx },
      { phone: rx },
      { phone2: rx },
      { email: rx },
      { facebookLink: rx },
    ],
  };
}

/**
 * Resolve employee IDs filtered by team/area (or current user when no admin).
 * Returns null when no extra scope restriction should be applied.
 */
async function resolveEmployeeIds(
  currentUser: Awaited<ReturnType<typeof getCurrentUser>>,
  canViewAll: boolean,
  teamId: string | undefined,
  areaId: string | undefined,
  marketingEmployeeIdParam: string | undefined,
): Promise<{ employeeIds: mongoose.Types.ObjectId[] } | null> {
  const EmployeeModel = mongoose.model("Employee");

  if (areaId && areaId !== "__all__") {
    const areaEmployees = await EmployeeModel.find({ areaId }).select("_id").lean();
    return { employeeIds: areaEmployees.map((e) => e._id as mongoose.Types.ObjectId) };
  }

  if (teamId && teamId !== "__all__") {
    const Team = mongoose.model("Team");
    const team = (await Team.findOne({ code: teamId }).select("_id").lean()) as
      | { _id: mongoose.Types.ObjectId }
      | null;
    if (!team) return { employeeIds: [] };
    const teamEmployees = await EmployeeModel.find({ teamId: team._id }).select("_id").lean();
    return { employeeIds: teamEmployees.map((e) => e._id as mongoose.Types.ObjectId) };
  }

  if (marketingEmployeeIdParam) {
    return { employeeIds: [new mongoose.Types.ObjectId(marketingEmployeeIdParam)] };
  }

  if (!canViewAll) {
    const emp = currentUser.employee as { _id?: unknown };
    const empId = emp && emp._id ? String(emp._id) : "";
    if (!empId) return { employeeIds: [] };
    return { employeeIds: [new mongoose.Types.ObjectId(empId)] };
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    await connectDB();

    const permissions = currentUser.permissions ?? [];
    const canViewAll =
      permissions.includes("*") ||
      permissions.includes("account.manageAll") ||
      permissions.includes("marketing-order.viewAll");

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("keyword")?.trim() || undefined;
    const source = searchParams.get("source") || undefined;
    const teamId = searchParams.get("team") || undefined;
    const areaId = searchParams.get("areaId") || undefined;
    const marketingEmployeeIdParam = searchParams.get("marketingEmployeeId") || undefined;
    const createdFrom = searchParams.get("createdFrom") || undefined;
    const createdTo = searchParams.get("createdTo") || undefined;

    const employeeScope = await resolveEmployeeIds(
      currentUser,
      canViewAll,
      teamId,
      areaId,
      marketingEmployeeIdParam,
    );

    // Build base filter (no `status` — we want all statuses)
    const baseFilter: Record<string, unknown> = {
      isActive: true,
      ...buildBaseKeywordFilter(keyword),
    };

    if (source) {
      baseFilter.sourceType = source;
    }

    if (createdFrom || createdTo) {
      baseFilter.createdAt = {};
      if (createdFrom) {
        (baseFilter.createdAt as Record<string, Date>).$gte = new Date(createdFrom);
      }
      if (createdTo) {
        const endDate = new Date(createdTo);
        endDate.setHours(23, 59, 59, 999);
        (baseFilter.createdAt as Record<string, Date>).$lte = endDate;
      }
    }

    if (employeeScope) {
      if (employeeScope.employeeIds.length === 0) {
        // Scope resolved to empty list → return zeros
        return success(buildEmptyStats(0));
      }
      baseFilter.marketingEmployeeId = { $in: employeeScope.employeeIds };
    }

    // Tỷ giá MNT/VND không cần cho stats; nhưng cần shippingFee để tính doanh thu.
    const shippingSetting = await getCurrentShippingFee();
    const shippingFee = shippingSetting?.fee ?? 0;

    // Đếm theo status qua aggregation
    const aggregationResult = await Lead.aggregate<{ _id: string; count: number }>([
      { $match: baseFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    for (const row of aggregationResult) {
      countMap.set(String(row._id), row.count);
    }

    const statusCounts: StatusCountItem[] = LEAD_STATUS_ORDER.map((s) => ({
      status: s,
      label: LEAD_STATUS_LABELS[s],
      count: countMap.get(s) ?? 0,
    }));

    const totalCount = statusCounts.reduce((sum, s) => sum + s.count, 0);
    const closedCount = countMap.get(LeadStatus.CLOSED) ?? 0;

    // Tính doanh thu từ các đơn CLOSED có combo
    let closedRevenueMNT = 0;
    if (closedCount > 0) {
      const closedLeads = await Lead.find({
        ...baseFilter,
        status: LeadStatus.CLOSED,
        comboId: { $exists: true, $ne: null },
      })
        .populate("comboId", "sellingPrice")
        .select({ comboId: 1 })
        .lean();

      for (const lead of closedLeads) {
        const combo = lead.comboId as unknown as
          | { sellingPrice?: number }
          | null
          | undefined;
        const sellingPrice =
          combo && typeof combo.sellingPrice === "number" ? combo.sellingPrice : null;
        if (sellingPrice === null) continue;
        closedRevenueMNT += Math.max(sellingPrice - shippingFee, 0);
      }
    }

    const payload: MarketingOrdersStats = {
      statusCounts,
      totalCount,
      closedCount,
      closedRevenueMNT,
      shippingFeeMNT: shippingFee,
    };

    return success(payload);
  } catch (err) {
    console.error("Get Marketing Orders Stats Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy thống kê đơn hàng",
      500
    );
  }
}

function buildEmptyStats(totalCount: number): MarketingOrdersStats {
  return {
    statusCounts: LEAD_STATUS_ORDER.map((s) => ({
      status: s,
      label: LEAD_STATUS_LABELS[s],
      count: 0,
    })),
    totalCount,
    closedCount: 0,
    closedRevenueMNT: 0,
    shippingFeeMNT: 0,
  };
}
