/**
 * Dashboard Activities API Route
 *
 * GET /api/dashboard/activities
 *
 * Trả về các hoạt động gần nhất trên hệ thống:
 *   - recentOrders: 5 đơn hàng mới nhất
 *   - recentLeads: 5 lead mới nhất
 *   - recentInventory: 5 thay đổi kho gần nhất
 *   - notifications: 5 thông báo gần nhất (từ collection Notification,
 *                    filter theo recipients = currentUser hoặc wildcard)
 *
 * Toàn bộ dữ liệu query từ MongoDB — không mock.
 *
 * Scope:
 *   - ADMIN / GLOBAL: xem tất cả.
 *   - Non-GLOBAL: filter các entity theo scope của user (MKT / SALE / ...).
 *
 * Performance:
 *   - 4 main fetches chạy song song (Promise.all).
 *   - Top-level import cho ProductVariant / Combo (bỏ dynamic await import).
 *   - Notifications query dùng recipientMode="broadcast" thay vì $size: 0.
 *   - unstable_cache 30s.
 */

import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { unstable_cache } from "next/cache";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { Lead } from "@/models/Lead";
import Employee from "@/models/Employee";
import { InventoryHistory } from "@/models/InventoryHistory";
import Notification from "@/models/Notification";
import ProductVariant from "@/models/ProductVariant";
import Combo from "@/models/Combo";

import { InventoryAction } from "@/constants/inventoryStatus";
import type { ILead } from "@/models/Lead";
import type { IInventoryHistory } from "@/models/InventoryHistory";

import {
  getCurrentUser,
  UnauthorizedError,
  ForbiddenError,
} from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";

import type {
  DashboardActivityData,
  NotificationItem,
  RecentInventory,
  RecentLead,
  RecentOrder,
} from "@/types/dashboard-activity";

const ACTIVITY_LIMIT = 5;

const SOURCE_LABEL: Record<string, string> = {
  LANDING_PAGE: "Landing Page",
  FACEBOOK_COMMENT: "Facebook Comment",
  FACEBOOK_INBOX: "Facebook Inbox",
  OTHER: "Khác",
};

interface ActivitiesQueryArgs {
  scope: "GLOBAL" | "SELF";
  roleCode: string;
  userObjectId: string;
}

async function fetchActivitiesData(
  args: ActivitiesQueryArgs,
): Promise<DashboardActivityData> {
  const { scope, roleCode, userObjectId } = args;
  const userOid = new Types.ObjectId(userObjectId);

  const leadMatch: Record<string, unknown> = { isActive: true };
  const orderMatch: Record<string, unknown> = { isActive: true };
  if (scope !== "GLOBAL") {
    if (roleCode === "MKT") {
      leadMatch.marketingEmployeeId = userOid;
      orderMatch.marketingEmployeeId = userOid;
    } else if (roleCode === "SALE") {
      leadMatch.saleEmployeeId = userOid;
      orderMatch.saleEmployeeId = userOid;
    } else {
      leadMatch.saleEmployeeId = userOid;
      orderMatch.saleEmployeeId = userOid;
    }
  }

  // ===== 4 main fetches song song =====
  type LeadLean = Pick<
    ILead,
    | "_id"
    | "customerName"
    | "sourceType"
    | "saleEmployeeId"
    | "marketingEmployeeId"
    | "status"
    | "createdAt"
  >;
  type InvLean = Pick<
    IInventoryHistory,
    | "_id"
    | "action"
    | "changeQuantity"
    | "productVariantId"
    | "comboId"
    | "createdAt"
    | "referenceCode"
  >;

  const [recentOrdersDocs, recentLeadsDocs, recentInvDocs, notifDocs] =
    await Promise.all([
      Order.find(orderMatch)
        .sort({ createdAt: -1 })
        .limit(ACTIVITY_LIMIT)
        .select("_id orderCode customerName status totalAmount createdAt")
        .lean(),
      Lead.find(leadMatch)
        .sort({ createdAt: -1 })
        .limit(ACTIVITY_LIMIT)
        .select(
          "_id customerName sourceType saleEmployeeId marketingEmployeeId status createdAt"
        )
        .lean() as unknown as Promise<LeadLean[]>,
      InventoryHistory.aggregate<InvLean>([
        { $sort: { createdAt: -1 } },
        { $limit: ACTIVITY_LIMIT },
        {
          $project: {
            _id: 1,
            action: 1,
            changeQuantity: 1,
            productVariantId: 1,
            comboId: 1,
            createdAt: 1,
            referenceCode: 1,
          },
        },
      ]),
      Notification.find({
        isActive: true,
        $or: [
          { recipients: userOid },
          // Dùng recipientMode flag thay cho $size: 0 để có thể index.
          { recipientMode: "broadcast" },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(ACTIVITY_LIMIT)
        .select("_id title message createdAt")
        .lean(),
    ]);

  // ===== Lookup employee cho leads =====
  const allEmpIds = Array.from(
    new Set(
      recentLeadsDocs.flatMap((l) =>
        [l.saleEmployeeId, l.marketingEmployeeId]
          .map((id) => id?.toString())
          .filter((id): id is string => Boolean(id))
      )
    )
  );
  const employeeDocs = allEmpIds.length
    ? await Employee.find({ _id: { $in: allEmpIds.map((id) => new Types.ObjectId(id)) } })
        .select("_id fullName username")
        .lean()
    : [];
  const employeeMap = new Map<string, string>();
  for (const emp of employeeDocs) {
    employeeMap.set(
      emp._id.toString(),
      emp.fullName || emp.username || "Unknown"
    );
  }

  // ===== Lookup variant/combo cho inventory =====
  const variantIds = recentInvDocs
    .map((h) => h.productVariantId)
    .filter((id): id is Types.ObjectId => Boolean(id));
  const comboIds = recentInvDocs
    .map((h) => h.comboId)
    .filter((id): id is Types.ObjectId => Boolean(id));

  const [variantDocs, comboDocs] = await Promise.all([
    variantIds.length
      ? ProductVariant.find({ _id: { $in: variantIds } })
          .select("_id sku name")
          .lean()
      : Promise.resolve([]),
    comboIds.length
      ? Combo.find({ _id: { $in: comboIds } }).select("_id code name").lean()
      : Promise.resolve([]),
  ]);

  const variantMap = new Map<string, string>();
  for (const v of variantDocs as Array<{
    _id: Types.ObjectId;
    sku?: string;
    name?: string;
  }>) {
    variantMap.set(v._id.toString(), v.name || v.sku || "Sản phẩm");
  }
  const comboMap = new Map<string, string>();
  for (const c of comboDocs as Array<{
    _id: Types.ObjectId;
    code?: string;
    name?: string;
  }>) {
    comboMap.set(c._id.toString(), c.name || c.code || "Combo");
  }

  // ===== Build response =====
  const recentOrders: RecentOrder[] = recentOrdersDocs.map((o) => ({
    id: o._id.toString(),
    code: o.orderCode,
    customer: o.customerName,
    status: o.status,
    total: o.totalAmount,
    createdAt: o.createdAt.toISOString(),
  }));

  const recentLeads: RecentLead[] = recentLeadsDocs.map((l) => ({
    id: l._id.toString(),
    name: l.customerName,
    source: SOURCE_LABEL[l.sourceType] ?? l.sourceType,
    sale: l.saleEmployeeId
      ? employeeMap.get(l.saleEmployeeId.toString()) ?? "—"
      : "—",
    status: l.status,
    createdAt: l.createdAt.toISOString(),
  }));

  const recentInventory: RecentInventory[] = recentInvDocs.map((h) => {
    const product =
      (h.productVariantId &&
        variantMap.get(h.productVariantId.toString())) ||
      (h.comboId && comboMap.get(h.comboId.toString())) ||
      "Kho";

    const isIn = (() => {
      if (h.action === InventoryAction.INBOUND) return true;
      if (h.action === InventoryAction.RETURN) return true;
      if (h.action === InventoryAction.TRANSFER_IN) return true;
      if (h.action === InventoryAction.UNRESERVE) return true;
      if (
        h.action === InventoryAction.ADJUST &&
        (h.changeQuantity ?? 0) > 0
      )
        return true;
      return false;
    })();

    return {
      id: h._id.toString(),
      product,
      type: isIn ? "IN" : "OUT",
      quantity: Math.abs(h.changeQuantity ?? 0),
      createdAt: h.createdAt.toISOString(),
    };
  });

  const notifications: NotificationItem[] = notifDocs.map((n) => {
    const ageMs = Date.now() - new Date(n.createdAt).getTime();
    const type: NotificationItem["type"] =
      ageMs < 60 * 60 * 1000
        ? "info"
        : ageMs < 24 * 60 * 60 * 1000
          ? "success"
          : "warning";

    return {
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      type,
      createdAt: n.createdAt.toISOString(),
    };
  });

  return {
    recentOrders,
    recentLeads,
    recentInventory,
    notifications,
  };
}

export async function GET(request: Request) {
  try {
    await connectDB();

    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return NextResponse.json(
          { success: false, message: err.message },
          { status: 401 }
        );
      }
      throw err;
    }

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";
    const roleCode = currentUser.role.code;
    const userObjectId = currentUser.employee._id.toString();

    const cachedFetch = unstable_cache(
      async () =>
        fetchActivitiesData({
          scope: isGlobal ? "GLOBAL" : "SELF",
          roleCode,
          userObjectId,
        }),
      [`dashboard:activities:${isGlobal ? "GLOBAL" : "SELF"}:${roleCode}:${userObjectId}`],
      { revalidate: 30, tags: [`dashboard:${userObjectId}`] }
    );

    const data = await cachedFetch();

    return NextResponse.json({
      success: true,
      data,
      message: "Dashboard activity data fetched successfully",
    });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: 403 }
      );
    }
    console.error("Dashboard activities API error:", err);
    return NextResponse.json(
      { success: false, message: "Không thể tải hoạt động gần đây" },
      { status: 500 }
    );
  }
}
