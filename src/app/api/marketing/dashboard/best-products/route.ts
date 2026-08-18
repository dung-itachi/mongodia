/**
 * Marketing Best-Selling Products API Route
 *
 * GET /api/marketing/dashboard/best-products
 *
 * Trả về top sản phẩm/combo được đẩy sang Sale nhiều nhất trong khoảng thời gian.
 * Sử dụng để hiển thị card "🏆 Top sản phẩm bán chạy" trên dashboard.
 *
 * Scope (Sprint 7.4):
 * - MKT (non-admin): chỉ thấy đơn của chính mình (filter `marketingEmployeeId`).
 * - ADMIN / GLOBAL: thấy tất cả MKT, có thể chọn riêng 1 MKT qua query `marketingEmployeeId`.
 *
 * Sprint 8.X — Additional filters:
 * - `areaId`: lọc theo khu vực.
 * - `teamId`: lọc theo team.
 * - Priority: marketingEmployeeId > teamId > areaId.
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { Product } from "@/models/Product";
import Employee from "@/models/Employee";
import Team from "@/models/Team";
import Area from "@/models/Area";
import { OrderStatus } from "@/constants/orderStatus";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";
import { getAccountScope } from "@/lib/account-scope";
import { success, error as errorResponse } from "@/utils/response";

/**
 * Resolve an areaId or teamId into a list of marketing employee ObjectIds.
 * NOTE: areaId/teamId values are CODE strings (e.g., "PVD"), not ObjectIds.
 */
async function resolveMarketingEmployeeIds(params: {
  areaId?: string | null;
  teamId?: string | null;
  marketingEmployeeId?: string | null;
}): Promise<string[] | undefined> {
  if (params.marketingEmployeeId) {
    return [params.marketingEmployeeId];
  }
  const { areaId, teamId } = params;
  if (teamId && teamId !== "__all__") {
    // Query by code (string) since Team uses code as identifier
    const team = await Team.findOne({ code: teamId }).select("leaderId managerId").lean();
    if (!team) return [];
    const ids = new Set<string>();
    if (team.leaderId) ids.add(team.leaderId.toString());
    if (team.managerId) ids.add(team.managerId.toString());
    const members = await Employee.find({ teamId: team._id })
      .select("_id").lean();
    members.forEach((e) => ids.add(e._id.toString()));
    return ids.size > 0 ? Array.from(ids) : undefined;
  }
  if (areaId && areaId !== "__all__") {
    // Query by code (string) since Area uses code as identifier (e.g., "PVD")
    const area = await Area.findOne({ code: areaId }).select("teamIds").lean();
    if (!area || !area.teamIds || area.teamIds.length === 0) return [];
    const employeeIds = new Set<string>();
    for (const tId of area.teamIds) {
      const members = await Employee.find({ teamId: tId }).select("_id").lean();
      members.forEach((e) => employeeIds.add(e._id.toString()));
    }
    return employeeIds.size > 0 ? Array.from(employeeIds) : undefined;
  }
  return undefined;
}

type Period = "7d" | "30d" | "90d";

function getDateRange(period: Period): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
  );
  let startDate: Date;
  switch (period) {
    case "30d":
      startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29, 0, 0, 0, 0)
      );
      break;
    case "90d":
      startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 89, 0, 0, 0, 0)
      );
      break;
    default:
      startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6, 0, 0, 0, 0)
      );
  }
  return { startDate, endDate };
}

export async function GET(request: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "7d") as Period;
    const marketingEmployeeIdParam = searchParams.get("marketingEmployeeId");
    const areaIdParam = searchParams.get("areaId");
    const teamIdParam = searchParams.get("teamId");
    const limitParam = parseInt(searchParams.get("limit") || "8", 10);

    // Auth & scope
    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return errorResponse(err.message, 401);
      }
      throw err;
    }

    const scope = getAccountScope(currentUser);
    const isGlobal = scope === "GLOBAL";

    let effectiveMarketingEmployeeId: string | null = null;
    if (!isGlobal) {
      effectiveMarketingEmployeeId = currentUser.employee._id.toString();
    } else if (marketingEmployeeIdParam && marketingEmployeeIdParam.trim()) {
      effectiveMarketingEmployeeId = marketingEmployeeIdParam.trim();
    }

    // Resolve area/team into a list of marketing employee IDs.
    const resolvedEmployeeIds = await resolveMarketingEmployeeIds({
      marketingEmployeeId: effectiveMarketingEmployeeId,
      areaId: areaIdParam,
      teamId: teamIdParam,
    });

    const { startDate, endDate } = getDateRange(period);

    const orderMatch: Record<string, unknown> = {
      createdAt: { $gte: startDate, $lte: endDate },
      isActive: true,
      status: {
        $nin: [OrderStatus.CANCELLED, OrderStatus.RETURNED],
      },
      // Chỉ lấy đơn có productId (không bao gồm combo)
      productId: { $exists: true, $ne: null },
    };
    if (resolvedEmployeeIds && resolvedEmployeeIds.length > 0) {
      orderMatch.marketingEmployeeId = { $in: resolvedEmployeeIds };
    }

    // Aggregate by productId + use $lookup to get product name
    const bestAgg = await Order.aggregate([
      { $match: orderMatch },
      // Lookup product info
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $project: {
          productName: {
            $cond: [
              // Ưu tiên productSnapshot.name
              { $and: [
                { $ifNull: ["$productSnapshot.name", false] },
                { $ne: ["$productSnapshot.name", ""] }
              ]},
              "$productSnapshot.name",
              {
                $cond: [
                  // Rồi tên từ product lookup
                  { $and: [
                    { $gt: [{ $size: { $ifNull: ["$productInfo", []] } }, 0] },
                    { $ne: [{ $arrayElemAt: ["$productInfo.name", 0] }, null] }
                  ]},
                  { $arrayElemAt: ["$productInfo.name", 0] },
                  // Fallback cuối cùng
                  "Sản phẩm khác"
                ],
              },
            ],
          },
        },
      },
      { $match: { productName: { $nin: [null, ""] } } },
      { $group: { _id: "$productName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Math.min(limitParam, 20) },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);

    return success({
      scope: isGlobal ? "GLOBAL" : "SELF",
      effectiveMarketingEmployeeId,
      dateRange: { start: startDate.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) },
      data: bestAgg,
      total: bestAgg.reduce((s: number, x: { count: number }) => s + x.count, 0),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) return errorResponse(err.message, 403);
    console.error("Best Products API Error:", err);
    return errorResponse("Không thể lấy dữ liệu sản phẩm bán chạy", 500);
  }
}
