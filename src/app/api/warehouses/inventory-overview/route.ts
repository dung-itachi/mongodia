/**
 * ==================================================
 * WAREHOUSE INVENTORY OVERVIEW API
 * ==================================================
 *
 * GET /api/warehouses/inventory-overview
 *
 * Trả về dữ liệu cho trang "Quản lý kho" (Sprint X.Y — UI theo
 * `mongolia-crm (7).html`):
 *
 *  - Tổng (6 stats):
 *      số SP có tồn kho · tồn kho · đang giao · đang hoàn về ·
 *      đã giao TC · đã hoàn kho
 *
 *  - Per-Product (mỗi SP = 1 card):
 *      tên SP · tồn kho · đang giao · đang hoàn về · đã giao TC ·
 *      đã hoàn kho · tổng nhập
 *
 * Công thức:
 *  - Tồn kho (stk)        = sum(Inventory.quantity − Inventory.reservedQuantity)
 *                            (grouped by productId)
 *  - Tổng nhập (imp)       = sum(InventoryHistory.changeQuantity WHERE INBOUND)
 *  - Đang giao (shipping)  = count(Order WHERE status = SHIPPING AND productId)
 *  - Đang hoàn về (ret)    = count(Order WHERE status = RETURNED AND whReturned = false)
 *  - Đã giao TC (delivered) = count(Order WHERE status IN (DELIVERED, RECONCILED))
 *  - Đã hoàn kho (returned) = count(Order WHERE status = RETURNED AND whReturned = true)
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { Order } from "@/models/Order";
import { OrderStatus } from "@/constants/orderStatus";
import Product from "@/models/Product";
import Inventory from "@/models/Inventory";
import { InventoryHistory } from "@/models/InventoryHistory";
import ProductVariant from "@/models/ProductVariant";
import { success, error as errorResponse } from "@/utils/response";

export type WarehouseOverviewItem = {
  productId: string;
  productCode: string;
  productName: string;
  stock: number;
  shipping: number;
  returning: number;
  delivered: number;
  returned: number;
  imported: number;
};

export type WarehouseOverviewResponse = {
  totals: {
    productCount: number;
    stock: number;
    shipping: number;
    returning: number;
    delivered: number;
    returned: number;
  };
  items: WarehouseOverviewItem[];
};

export async function GET(request: Request) {
  try {
    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return errorResponse(err.message, 401);
      }
      throw err;
    }

    if (!currentUser.permissions.includes("warehouse.view")) {
      return errorResponse("Bạn không có quyền xem kho", 403);
    }

    await connectDB();

    // ---- Filter theo kho (optional) ----
    const { searchParams } = new URL(request.url);
    const warehouseIdParam = searchParams.get("warehouseId")?.trim() || "";

    // ---- Lấy tất cả Product (active) ----
    const products = await Product.find({ isActive: { $ne: false } })
      .select("_id code name")
      .sort({ createdAt: 1 })
      .lean();

    if (products.length === 0) {
      return success({
        totals: {
          productCount: 0,
          stock: 0,
          shipping: 0,
          returning: 0,
          delivered: 0,
          returned: 0,
        },
        items: [],
      } satisfies WarehouseOverviewResponse);
    }

    const productIds = products.map((p) => p._id);

    // ---- Map productId → set of variantId (để filter Inventory/History) ----
    const variants = await ProductVariant.find({
      productId: { $in: productIds },
      isActive: { $ne: false },
    })
      .select("_id productId")
      .lean();
    const variantsByProduct = new Map<string, string[]>();
    for (const v of variants) {
      const arr = variantsByProduct.get(String(v.productId)) ?? [];
      arr.push(String(v._id));
      variantsByProduct.set(String(v.productId), arr);
    }
    // Include cả productId "ảo" trong Inventory/History (một số entry có
      // thể được lưu với productVariantId === productId cho combo).
    for (const pid of productIds) {
      const arr = variantsByProduct.get(String(pid)) ?? [];
      if (!arr.includes(String(pid))) arr.push(String(pid));
      variantsByProduct.set(String(pid), arr);
    }

    const allVariantIds = Array.from(
      new Set(Array.from(variantsByProduct.values()).flat())
    );

    // ---- Tồn kho theo product (quantity − reservedQuantity) ----
    const stockByProduct = new Map<string, number>();
    if (allVariantIds.length > 0) {
      const inventoryMatch: Record<string, unknown> = {
        productVariantId: { $in: allVariantIds },
        isActive: { $ne: false },
      };
      if (warehouseIdParam) {
        inventoryMatch.warehouseId = warehouseIdParam;
      }
      const invAgg = (await Inventory.aggregate([
        {
          $match: inventoryMatch,
        },
        {
          $group: {
            _id: "$productVariantId",
            stock: {
              $sum: {
                $subtract: [
                  { $ifNull: ["$quantity", 0] },
                  { $ifNull: ["$reservedQuantity", 0] },
                ],
              },
            },
          },
        },
      ])) as Array<{ _id: unknown; stock: number }>;

      const stockByVariant = new Map<string, number>();
      for (const r of invAgg) {
        stockByVariant.set(String(r._id), r.stock ?? 0);
      }

      for (const pid of productIds) {
        const vIds = variantsByProduct.get(String(pid)) ?? [];
        let total = 0;
        for (const vId of vIds) {
          total += stockByVariant.get(vId) ?? 0;
        }
        stockByProduct.set(String(pid), total);
      }
    }

    // ---- Tổng nhập từ InventoryHistory (INBOUND) ----
    const importedByProduct = new Map<string, number>();
    if (allVariantIds.length > 0) {
      try {
        const histMatch: Record<string, unknown> = {
          productVariantId: { $in: allVariantIds },
          transactionType: "INBOUND",
          isActive: { $ne: false },
        };
        if (warehouseIdParam) {
          histMatch.warehouseId = warehouseIdParam;
        }
        const histAgg = (await InventoryHistory.aggregate([
          {
            $match: histMatch,
          },
          {
            $group: {
              _id: "$productVariantId",
              imported: { $sum: { $ifNull: ["$changeQuantity", 0] } },
            },
          },
        ])) as Array<{ _id: unknown; imported: number }>;
        const impByVariant = new Map<string, number>();
        for (const r of histAgg) {
          impByVariant.set(String(r._id), Math.max(0, r.imported ?? 0));
        }
        for (const pid of productIds) {
          const vIds = variantsByProduct.get(String(pid)) ?? [];
          let total = 0;
          for (const vId of vIds) {
            total += impByVariant.get(vId) ?? 0;
          }
          importedByProduct.set(String(pid), total);
        }
      } catch {
        // ignore
      }
    }

    // ---- Đếm Orders theo trạng thái × productId ----
    const orderMatch: Record<string, unknown> = {
      productId: { $in: productIds },
      isActive: true,
    };
    if (warehouseIdParam) {
      orderMatch.warehouseId = warehouseIdParam;
    }
    const orderAgg = (await Order.aggregate([
      {
        $match: orderMatch,
      },
      {
        $project: {
          productId: 1,
          status: 1,
          whReturned: 1,
          bucket: {
            $switch: {
              branches: [
                {
                  case: { $eq: ["$status", OrderStatus.SHIPPING] },
                  then: "shipping",
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$status", OrderStatus.RETURNED] },
                      { $eq: [{ $ifNull: ["$whReturned", false] }, false] },
                    ],
                  },
                  then: "returning",
                },
                {
                  case: {
                    $and: [
                      { $eq: ["$status", OrderStatus.RETURNED] },
                      { $eq: [{ $ifNull: ["$whReturned", false] }, true] },
                    ],
                  },
                  then: "returned",
                },
                {
                  case: {
                    $in: [
                      "$status",
                      [OrderStatus.DELIVERED, OrderStatus.RECONCILED],
                    ],
                  },
                  then: "delivered",
                },
              ],
              default: null,
            },
          },
        },
      },
      { $match: { bucket: { $ne: null } } },
      {
        $group: {
          _id: { productId: "$productId", bucket: "$bucket" },
          count: { $sum: 1 },
        },
      },
    ])) as Array<{
      _id: { productId: unknown; bucket: string };
      count: number;
    }>;

    const countByProduct = new Map<
      string,
      { shipping: number; returning: number; delivered: number; returned: number }
    >();
    for (const r of orderAgg) {
      const pid = String(r._id.productId);
      const bucket = r._id.bucket;
      const prev = countByProduct.get(pid) ?? {
        shipping: 0,
        returning: 0,
        delivered: 0,
        returned: 0,
      };
      if (
        bucket === "shipping" ||
        bucket === "returning" ||
        bucket === "delivered" ||
        bucket === "returned"
      ) {
        prev[bucket] = r.count ?? 0;
      }
      countByProduct.set(pid, prev);
    }

    // ---- Gộp kết quả theo Product ----
    const items: WarehouseOverviewItem[] = products.map((p) => {
      const pid = String(p._id);
      const counts = countByProduct.get(pid) ?? {
        shipping: 0,
        returning: 0,
        delivered: 0,
        returned: 0,
      };
      return {
        productId: pid,
        productCode: p.code,
        productName: p.name,
        stock: stockByProduct.get(pid) ?? 0,
        imported: importedByProduct.get(pid) ?? 0,
        shipping: counts.shipping,
        returning: counts.returning,
        delivered: counts.delivered,
        returned: counts.returned,
      };
    });

    // Lọc bỏ sản phẩm chưa có hoạt động gì (không tồn, không nhập, không đơn)
    const visibleItems = items.filter(
      (i) =>
        i.stock !== 0 ||
        i.imported !== 0 ||
        i.shipping !== 0 ||
        i.returning !== 0 ||
        i.delivered !== 0 ||
        i.returned !== 0
    );

    const totals = visibleItems.reduce(
      (acc, w) => ({
        productCount: acc.productCount + 1,
        stock: acc.stock + w.stock,
        shipping: acc.shipping + w.shipping,
        returning: acc.returning + w.returning,
        delivered: acc.delivered + w.delivered,
        returned: acc.returned + w.returned,
      }),
      { productCount: 0, stock: 0, shipping: 0, returning: 0, delivered: 0, returned: 0 }
    );

    return success({
      totals,
      items: visibleItems,
    } satisfies WarehouseOverviewResponse);
  } catch (err) {
    console.error("Warehouse Overview Error:", err);
    return errorResponse("Không thể tải tổng quan kho", 500);
  }
}