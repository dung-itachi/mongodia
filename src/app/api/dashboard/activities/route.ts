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
 */

import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { Lead } from "@/models/Lead";
import Employee from "@/models/Employee";
import { InventoryHistory } from "@/models/InventoryHistory";
import Notification from "@/models/Notification";

import { OrderStatus } from "@/constants/orderStatus";
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
    const userObjectId = new Types.ObjectId(
      currentUser.employee._id.toString()
    );

    // ===== Build scope filter cho Lead/Order =====
    const leadMatch: Record<string, unknown> = { isActive: true };
    const orderMatch: Record<string, unknown> = { isActive: true };
    if (!isGlobal) {
      if (roleCode === "MKT") {
        leadMatch.marketingEmployeeId = userObjectId;
        orderMatch.marketingEmployeeId = userObjectId;
      } else if (roleCode === "SALE") {
        leadMatch.saleEmployeeId = userObjectId;
        orderMatch.saleEmployeeId = userObjectId;
      } else {
        leadMatch.saleEmployeeId = userObjectId;
        orderMatch.saleEmployeeId = userObjectId;
      }
    }

    // ===== Recent Orders =====
    const recentOrdersDocs = await Order.find(orderMatch)
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .select("_id orderCode customerName status totalAmount createdAt")
      .lean();

    const recentOrders: RecentOrder[] = recentOrdersDocs.map((o) => ({
      id: o._id.toString(),
      code: o.orderCode,
      customer: o.customerName,
      status: o.status,
      total: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
    }));

    // ===== Recent Leads (lookup sale name) =====
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
    const recentLeadsDocs = (await Lead.find(leadMatch)
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .select(
        "_id customerName sourceType saleEmployeeId marketingEmployeeId status createdAt"
      )
      .lean()) as unknown as LeadLean[];

    const saleIds = Array.from(
      new Set(
        recentLeadsDocs
          .map((l: LeadLean) => l.saleEmployeeId?.toString())
          .filter((id: string | undefined): id is string => Boolean(id))
      )
    );
    const marketingIds = Array.from(
      new Set(
        recentLeadsDocs
          .map((l: LeadLean) => l.marketingEmployeeId?.toString())
          .filter((id: string | undefined): id is string => Boolean(id))
      )
    );
    const allEmpIds = Array.from(new Set([...saleIds, ...marketingIds]));

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

    const SOURCE_LABEL: Record<string, string> = {
      LANDING_PAGE: "Landing Page",
      FACEBOOK_COMMENT: "Facebook Comment",
      FACEBOOK_INBOX: "Facebook Inbox",
      OTHER: "Khác",
    };

    const recentLeads: RecentLead[] = recentLeadsDocs.map((l: LeadLean) => ({
      id: l._id.toString(),
      name: l.customerName,
      source: SOURCE_LABEL[l.sourceType] ?? l.sourceType,
      sale: l.saleEmployeeId
        ? employeeMap.get(l.saleEmployeeId.toString()) ?? "—"
        : "—",
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    }));

    // ===== Recent Inventory (lookup product/combo name) =====
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
    const recentInvDocs = (await InventoryHistory.find({})
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .select(
        "_id action changeQuantity productVariantId comboId createdAt referenceCode"
      )
      .lean()) as unknown as InvLean[];

    // Lookup tên productVariant hoặc combo
    const variantIds = recentInvDocs
      .map((h: InvLean) => h.productVariantId)
      .filter((id): id is Types.ObjectId => Boolean(id));
    const comboIds = recentInvDocs
      .map((h: InvLean) => h.comboId)
      .filter((id): id is Types.ObjectId => Boolean(id));

    const [ProductVariant, Combo] = await Promise.all([
      variantIds.length
        ? (
            await import("@/models/ProductVariant")
          ).default
            .find({ _id: { $in: variantIds } })
            .select("_id sku name")
            .lean()
        : Promise.resolve([]),
      comboIds.length
        ? (await import("@/models/Combo")).default
            .find({ _id: { $in: comboIds } })
            .select("_id code name")
            .lean()
        : Promise.resolve([]),
    ]);

    const variantMap = new Map<string, string>();
    for (const v of ProductVariant as Array<{
      _id: Types.ObjectId;
      sku?: string;
      name?: string;
    }>) {
      variantMap.set(v._id.toString(), v.name || v.sku || "Sản phẩm");
    }
    const comboMap = new Map<string, string>();
    for (const c of Combo as Array<{
      _id: Types.ObjectId;
      code?: string;
      name?: string;
    }>) {
      comboMap.set(c._id.toString(), c.name || c.code || "Combo");
    }

    const recentInventory: RecentInventory[] = recentInvDocs.map((h: InvLean) => {
      const product =
        (h.productVariantId &&
          variantMap.get(h.productVariantId.toString())) ||
        (h.comboId && comboMap.get(h.comboId.toString())) ||
        "Kho";

      // Quy đổi action → IN / OUT cho UI.
      // IN : INBOUND / RETURN / TRANSFER_IN / ADJUST dương / UNRESERVE
      // OUT: OUT / RESERVE / TRANSFER_OUT / ADJUST âm
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

    // ===== Notifications — gửi cho currentUser (recipients) =====
    type NotifLean = {
      _id: Types.ObjectId;
      title: string;
      message: string;
      createdAt: Date;
    };
    const notifDocs = (await Notification.find({
      isActive: true,
      $or: [
        { recipients: userObjectId },
        { recipients: { $size: 0 } }, // broadcast
      ],
    })
      .sort({ createdAt: -1 })
      .limit(ACTIVITY_LIMIT)
      .select("_id title message createdAt")
      .lean()) as unknown as NotifLean[];

    const notifications: NotificationItem[] = notifDocs.map((n: NotifLean) => {
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

    // ===== Compose response =====
    const data: DashboardActivityData = {
      recentOrders,
      recentLeads,
      recentInventory,
      notifications,
    };

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