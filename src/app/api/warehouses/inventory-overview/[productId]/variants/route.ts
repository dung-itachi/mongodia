/**
 * ==================================================
 * GET /api/warehouses/inventory-overview/[productId]/variants
 * ==================================================
 *
 * Trả về breakdown theo từng ProductVariant của 1 Product:
 *   sku · tồn kho · đang giao · đang hoàn về · đã giao TC · đã hoàn kho · tổng nhập
 *
 * Phục vụ cho Drawer "Chi tiết" của card sản phẩm trong trang `/warehouses`.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { Order } from "@/models/Order";
import { OrderStatus } from "@/constants/orderStatus";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Inventory from "@/models/Inventory";
import { InventoryHistory } from "@/models/InventoryHistory";
import { success, error as errorResponse } from "@/utils/response";

export type WarehouseVariantOverviewItem = {
  productVariantId: string;
  sku: string;
  stock: number;
  shipping: number;
  returning: number;
  delivered: number;
  returned: number;
  imported: number;
};

export type WarehouseProductVariantsResponse = {
  product: {
    _id: string;
    code: string;
    name: string;
  };
  items: WarehouseVariantOverviewItem[];
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
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

    const { productId } = await params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return errorResponse("productId không hợp lệ", 400);
    }

    await connectDB();

    const product = await Product.findById(productId)
      .select("_id code name")
      .lean();
    if (!product) {
      return errorResponse("Sản phẩm không tồn tại", 404);
    }

    const variants = await ProductVariant.find({
      productId: product._id,
      isActive: { $ne: false },
    })
      .select("_id sku")
      .sort({ sku: 1 })
      .lean();

    const variantIds = variants.map((v) => String(v._id));

    if (variantIds.length === 0) {
      return success({
        product: {
          _id: String(product._id),
          code: product.code,
          name: product.name,
        },
        items: [],
      } satisfies WarehouseProductVariantsResponse);
    }

    // ---- Tồn kho theo variant ----
    const invAgg = (await Inventory.aggregate([
      {
        $match: {
          productVariantId: {
            $in: variantIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          isActive: { $ne: false },
        },
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
    for (const r of invAgg) stockByVariant.set(String(r._id), r.stock ?? 0);

    // ---- Tổng nhập từ InventoryHistory (INBOUND) ----
    const importedByVariant = new Map<string, number>();
    try {
      const histAgg = (await InventoryHistory.aggregate([
        {
          $match: {
            productVariantId: {
              $in: variantIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
            transactionType: "INBOUND",
            isActive: { $ne: false },
          },
        },
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
      // ignore
    }

    // ---- Đếm Orders theo trạng thái × productVariantId ----
    const orderAgg = (await Order.aggregate([
      {
        $match: {
          productId: product._id,
          productVariantId: {
            $in: variantIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
          isActive: true,
        },
      },
      {
        $project: {
          productVariantId: 1,
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
          _id: { productVariantId: "$productVariantId", bucket: "$bucket" },
          count: { $sum: 1 },
        },
      },
    ])) as Array<{
      _id: { productVariantId: unknown; bucket: string };
      count: number;
    }>;

    const countByVariant = new Map<
      string,
      { shipping: number; returning: number; delivered: number; returned: number }
    >();
    for (const r of orderAgg) {
      const vid = String(r._id.productVariantId);
      const bucket = r._id.bucket;
      const prev = countByVariant.get(vid) ?? {
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
      countByVariant.set(vid, prev);
    }

    const items: WarehouseVariantOverviewItem[] = variants.map((v) => {
      const vid = String(v._id);
      const counts = countByVariant.get(vid) ?? {
        shipping: 0,
        returning: 0,
        delivered: 0,
        returned: 0,
      };
      return {
        productVariantId: vid,
        sku: v.sku,
        stock: stockByVariant.get(vid) ?? 0,
        imported: importedByVariant.get(vid) ?? 0,
        shipping: counts.shipping,
        returning: counts.returning,
        delivered: counts.delivered,
        returned: counts.returned,
      };
    });

    return success({
      product: {
        _id: String(product._id),
        code: product.code,
        name: product.name,
      },
      items,
    } satisfies WarehouseProductVariantsResponse);
  } catch (err) {
    console.error("Warehouse Product Variants Error:", err);
    return errorResponse("Không thể tải chi tiết sản phẩm", 500);
  }
}