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
 *  - (Optional) Per-Variant breakdown (khi `includeVariants=true`):
 *      Danh sách variants kèm stock/shipping/... — đính kèm trong
 *      cùng 1 request để loại bỏ N+1 pattern (trước đây FE phải
 *      gọi /variants lặp N lần theo từng product).
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

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { Order } from "@/models/Order";
import { OrderStatus } from "@/constants/orderStatus";
import Product from "@/models/Product";
import WarehouseInventory from "@/models/WarehouseInventory";
import { InventoryHistory } from "@/models/InventoryHistory";
import ProductVariant from "@/models/ProductVariant";
import Warehouse from "@/models/Warehouse";
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
  transferredOut: number;
};

/**
 * Variant breakdown trong overview — chỉ giữ các field cần cho UI card
 * (đủ để render breakdown SKU trên card mà không cần gọi thêm API).
 */
export type WarehouseOverviewVariantItem = {
  productVariantId: string;
  sku: string;
  stock: number;
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
    imported: number;
    transferredOut: number;
  };
  items: (WarehouseOverviewItem & {
    /** Chỉ có khi request `includeVariants=true`. */
    variants?: WarehouseOverviewVariantItem[];
  })[];
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
    const warehouseCodeParam = searchParams.get("warehouseCode")?.trim().toUpperCase() || "";
    /**
     * includeVariants=true: đính kèm breakdown variants cho tất cả products
     * trong cùng response. Mặc định false để giữ payload nhỏ cho những
     * chỗ chỉ cần overview totals + items. FE /warehouses sẽ set true.
     */
    const includeVariants = searchParams.get("includeVariants") === "true";

    // Resolve scoped warehouse IDs.
    // - warehouseId wins if both supplied.
    // - warehouseCode resolves to the matching KHO1 / KHO2.
    //   (Warehouses are hard-coded by code — KHÔNG dùng Area để filter.)
    let scopedWarehouseIds: mongoose.Types.ObjectId[] | null = null;
    if (warehouseIdParam && mongoose.Types.ObjectId.isValid(warehouseIdParam)) {
      scopedWarehouseIds = [new mongoose.Types.ObjectId(warehouseIdParam)];
    } else if (warehouseCodeParam) {
      const ws = await Warehouse.find({
        code: warehouseCodeParam,
        isActive: true,
      })
        .select("_id")
        .lean();
      scopedWarehouseIds = ws.map((w) => w._id as mongoose.Types.ObjectId);
      if (scopedWarehouseIds.length === 0) {
        // No warehouses match — short-circuit with empty result.
        return success({
          totals: {
            productCount: 0,
            stock: 0,
            shipping: 0,
            returning: 0,
            delivered: 0,
            returned: 0,
            imported: 0,
            transferredOut: 0,
          },
          items: [],
        } satisfies WarehouseOverviewResponse);
      }
    }

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
          imported: 0,
          transferredOut: 0,
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
      .select("_id productId sku")
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
    // Convert all variantIds to ObjectId so aggregation $match matches
    // even when the same id is stored as a string "null" or as a raw
    // hex string in WarehouseInventory.
    const allVariantIdsAsOid = allVariantIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const productIdsAsOid = productIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    // ---- Tồn kho theo product (availableQuantity) ----
    const stockByProduct = new Map<string, number>();
    if (allVariantIdsAsOid.length > 0) {
      const inventoryMatch: Record<string, unknown> = {
        // Match either by variantId or by productId (fallback for legacy data
        // where variantId was stored as null/string but productId was kept).
        $and: [
          {
            $or: [
              { variantId: { $in: allVariantIdsAsOid } },
              { productId: { $in: productIdsAsOid } },
            ],
          },
          { itemType: "PRODUCT" },
          { isActive: { $ne: false } },
        ],
      };
      if (scopedWarehouseIds) {
        (inventoryMatch.$and as unknown[]).push({
          warehouseId: { $in: scopedWarehouseIds },
        });
      }
      const invAgg = (await WarehouseInventory.aggregate([
        {
          $match: inventoryMatch,
        },
        {
          $group: {
            _id: { variantId: "$variantId", productId: "$productId" },
            stock: {
              $sum: { $ifNull: ["$availableQuantity", 0] },
            },
          },
        },
      ])) as Array<{
        _id: { variantId: unknown; productId: unknown };
        stock: number;
      }>;

      const stockByVariant = new Map<string, number>();
      const stockByProductDirect = new Map<string, number>();
      for (const r of invAgg) {
        const vKey = r._id?.variantId ? String(r._id.variantId) : "";
        const pKey = r._id?.productId ? String(r._id.productId) : "";
        if (vKey && vKey !== "null") {
          stockByVariant.set(vKey, r.stock ?? 0);
        } else if (pKey && pKey !== "null") {
          // Legacy record: stock stored under productId (variantId was null).
          stockByProductDirect.set(pKey, r.stock ?? 0);
        }
      }

      for (const pid of productIds) {
        const vIds = variantsByProduct.get(String(pid)) ?? [];
        let total = 0;
        for (const vId of vIds) {
          total += stockByVariant.get(vId) ?? 0;
        }
        // Add legacy fallback stock recorded directly against productId.
        total += stockByProductDirect.get(String(pid)) ?? 0;
        stockByProduct.set(String(pid), total);
      }
    }

    // ---- Tổng nhập từ InventoryHistory (INBOUND) ----
    const importedByProduct = new Map<string, number>();
    // ---- Tổng chuyển đi (TRANSFER, action TRANSFER_OUT) ----
    const transferredOutByProduct = new Map<string, number>();
    if (allVariantIdsAsOid.length > 0) {
      try {
        const histMatch: Record<string, unknown> = {
          $and: [
            {
              $or: [
                { productVariantId: { $in: allVariantIdsAsOid } },
                { productId: { $in: productIdsAsOid } },
              ],
            },
            { transactionType: "INBOUND" },
            { isActive: { $ne: false } },
          ],
        };
        if (scopedWarehouseIds) {
          (histMatch.$and as unknown[]).push({
            warehouseId: { $in: scopedWarehouseIds },
          });
        }
        const histAgg = (await InventoryHistory.aggregate([
          {
            $match: histMatch,
          },
          {
            $group: {
              _id: { variantId: "$productVariantId", productId: "$productId" },
              imported: { $sum: { $ifNull: ["$changeQuantity", 0] } },
            },
          },
        ])) as Array<{
          _id: { variantId: unknown; productId: unknown };
          imported: number;
        }>;
        const impByVariant = new Map<string, number>();
        const impByProduct = new Map<string, number>();
        for (const r of histAgg) {
          const vKey = r._id?.variantId ? String(r._id.variantId) : "";
          const pKey = r._id?.productId ? String(r._id.productId) : "";
          if (vKey && vKey !== "null") {
            impByVariant.set(vKey, Math.max(0, r.imported ?? 0));
          } else if (pKey && pKey !== "null") {
            impByProduct.set(pKey, Math.max(0, r.imported ?? 0));
          }
        }
        for (const pid of productIds) {
          const vIds = variantsByProduct.get(String(pid)) ?? [];
          let total = 0;
          for (const vId of vIds) {
            total += impByVariant.get(vId) ?? 0;
          }
          total += impByProduct.get(String(pid)) ?? 0;
          importedByProduct.set(String(pid), total);
        }
      } catch {
        // ignore
      }

      // ---- Tổng chuyển đi (TRANSFER) — chỉ count action TRANSFER_OUT ----
      try {
        const transferMatch: Record<string, unknown> = {
          $and: [
            {
              $or: [
                { productVariantId: { $in: allVariantIdsAsOid } },
                { productId: { $in: productIdsAsOid } },
              ],
            },
            { transactionType: "TRANSFER" },
            { action: "TRANSFER_OUT" },
            { isActive: { $ne: false } },
          ],
        };
        if (scopedWarehouseIds) {
          (transferMatch.$and as unknown[]).push({
            warehouseId: { $in: scopedWarehouseIds },
          });
        }
        const transferAgg = (await InventoryHistory.aggregate([
          { $match: transferMatch },
          {
            $group: {
              _id: { variantId: "$productVariantId", productId: "$productId" },
              qty: { $sum: { $ifNull: ["$changeQuantity", 0] } },
            },
          },
        ])) as Array<{
          _id: { variantId: unknown; productId: unknown };
          qty: number;
        }>;
        const tByVariant = new Map<string, number>();
        const tByProduct = new Map<string, number>();
        for (const r of transferAgg) {
          const vKey = r._id?.variantId ? String(r._id.variantId) : "";
          const pKey = r._id?.productId ? String(r._id.productId) : "";
          if (vKey && vKey !== "null") {
            tByVariant.set(vKey, Math.max(0, r.qty ?? 0));
          } else if (pKey && pKey !== "null") {
            tByProduct.set(pKey, Math.max(0, r.qty ?? 0));
          }
        }
        for (const pid of productIds) {
          const vIds = variantsByProduct.get(String(pid)) ?? [];
          let total = 0;
          for (const vId of vIds) {
            total += tByVariant.get(vId) ?? 0;
          }
          total += tByProduct.get(String(pid)) ?? 0;
          transferredOutByProduct.set(String(pid), total);
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
    if (scopedWarehouseIds) {
      orderMatch.warehouseId = { $in: scopedWarehouseIds };
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
    // Khi includeVariants=true, chạy thêm 1 aggregation duy nhất cho tất
    // cả variants trong cùng request để loại bỏ N+1 (trước đây FE phải
    // gọi /variants lặp N lần). Variant-level stock + imported được tính
    // ngay tại đây từ cùng tập allVariantIdsAsOid đã aggregate ở trên.
    let variantsByProductMap: Map<string, WarehouseOverviewVariantItem[]> | null = null;
    if (includeVariants) {
      variantsByProductMap = await buildVariantBreakdown({
        allVariantIdsAsOid,
        variantsByProduct,
        variants, // [{ _id, productId, sku }]
        scopedWarehouseIds,
      });
    }

    const items: WarehouseOverviewResponse["items"] = products.map((p) => {
      const pid = String(p._id);
      const counts = countByProduct.get(pid) ?? {
        shipping: 0,
        returning: 0,
        delivered: 0,
        returned: 0,
      };
      const baseItem = {
        productId: pid,
        productCode: p.code,
        productName: p.name,
        stock: stockByProduct.get(pid) ?? 0,
        imported: importedByProduct.get(pid) ?? 0,
        transferredOut: transferredOutByProduct.get(pid) ?? 0,
        shipping: counts.shipping,
        returning: counts.returning,
        delivered: counts.delivered,
        returned: counts.returned,
      } satisfies WarehouseOverviewItem;
      if (variantsByProductMap) {
        return { ...baseItem, variants: variantsByProductMap.get(pid) ?? [] };
      }
      return baseItem;
    });

    // Lọc bỏ sản phẩm chưa có hoạt động gì
    const visibleItems = items.filter(
      (i) =>
        i.stock !== 0 ||
        i.imported !== 0 ||
        i.transferredOut !== 0 ||
        i.shipping !== 0 ||
        i.returning !== 0 ||
        i.delivered !== 0 ||
        i.returned !== 0
    );

    const totals = visibleItems.reduce(
      (acc, w) => ({
        productCount: acc.productCount + 1,
        stock: acc.stock + w.stock,
        imported: acc.imported + w.imported,
        transferredOut: acc.transferredOut + w.transferredOut,
        shipping: acc.shipping + w.shipping,
        returning: acc.returning + w.returning,
        delivered: acc.delivered + w.delivered,
        returned: acc.returned + w.returned,
      }),
      {
        productCount: 0,
        stock: 0,
        imported: 0,
        transferredOut: 0,
        shipping: 0,
        returning: 0,
        delivered: 0,
        returned: 0,
      }
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

/**
 * Tính per-variant stock + imported cho toàn bộ variants trong 1 lượt
 * aggregation, rồi group theo productId.
 *
 * - Chỉ trả về variants có `stock > 0` hoặc `imported > 0` để giữ payload
 *   nhỏ (FE /warehouses chỉ cần show SKU có hàng / có phát sinh nhập).
 *
 * - 2 aggregation queries duy nhất (WarehouseInventory + InventoryHistory)
 *   thay vì 2 × N queries nếu FE gọi /variants cho từng product.
 */
async function buildVariantBreakdown(args: {
  allVariantIdsAsOid: mongoose.Types.ObjectId[];
  variantsByProduct: Map<string, string[]>;
  variants: Array<{ _id: unknown; productId: unknown; sku: string }>;
  scopedWarehouseIds: mongoose.Types.ObjectId[] | null;
}): Promise<Map<string, WarehouseOverviewVariantItem[]>> {
  const { allVariantIdsAsOid, variantsByProduct, variants, scopedWarehouseIds } = args;
  const result = new Map<string, WarehouseOverviewVariantItem[]>();

  if (allVariantIdsAsOid.length === 0) {
    return result;
  }

  const variantSkuById = new Map<string, string>();
  for (const v of variants) {
    variantSkuById.set(String(v._id), v.sku);
  }

  // 1) Stock per variantId
  const inventoryMatch: Record<string, unknown> = {
    variantId: { $in: allVariantIdsAsOid },
    itemType: "PRODUCT",
    isActive: { $ne: false },
  };
  if (scopedWarehouseIds) {
    inventoryMatch.warehouseId = { $in: scopedWarehouseIds };
  }
  const invAgg = (await WarehouseInventory.aggregate([
    { $match: inventoryMatch },
    {
      $group: {
        _id: "$variantId",
        stock: { $sum: { $ifNull: ["$availableQuantity", 0] } },
      },
    },
  ])) as Array<{ _id: unknown; stock: number }>;
  const stockByVariant = new Map<string, number>();
  for (const r of invAgg) stockByVariant.set(String(r._id), r.stock ?? 0);

  // 2) Imported (INBOUND) per variantId
  const importedByVariant = new Map<string, number>();
  try {
    const histMatch: Record<string, unknown> = {
      productVariantId: { $in: allVariantIdsAsOid },
      transactionType: "INBOUND",
      isActive: { $ne: false },
    };
    if (scopedWarehouseIds) {
      histMatch.warehouseId = { $in: scopedWarehouseIds };
    }
    const histAgg = (await InventoryHistory.aggregate([
      { $match: histMatch },
      {
        $group: {
          _id: "$productVariantId",
          imported: { $sum: { $ifNull: ["$changeQuantity", 0] } },
        },
      },
    ])) as Array<{ _id: unknown; imported: number }>;
    for (const r of histAgg) {
      importedByVariant.set(String(r._id), Math.max(0, r.imported ?? 0));
    }
  } catch {
    // ignore — giữ stock, fallback imported=0
  }

  // Group by productId, chỉ giữ variant có stock > 0 hoặc imported > 0
  for (const [pid, vIds] of variantsByProduct.entries()) {
    const rows: WarehouseOverviewVariantItem[] = [];
    for (const vId of vIds) {
      const stock = stockByVariant.get(vId) ?? 0;
      const imported = importedByVariant.get(vId) ?? 0;
      if (stock <= 0 && imported <= 0) continue;
      rows.push({
        productVariantId: vId,
        sku: variantSkuById.get(vId) ?? vId,
        stock,
        imported,
      });
    }
    if (rows.length > 0) result.set(pid, rows);
  }
  return result;
}