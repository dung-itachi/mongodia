import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Inventory from "@/models/Inventory";
import ProductVariant from "@/models/ProductVariant";

import {
  mapInventoryList,
} from "@/mappers/inventory.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "inventory.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem tồn kho",
        403
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const warehouseId = searchParams.get("warehouseId") ?? "";
    const productVariantId = searchParams.get("productVariantId") ?? "";
    const search = searchParams.get("search") ?? "";

    const filter: Record<string, unknown> = {};

    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    if (productVariantId) {
      filter.productVariantId = productVariantId;
    }

    if (search) {
      const variantFilter: Record<string, unknown> = {
        $or: [
          { sku: { $regex: search, $options: "i" } },
          { barcode: { $regex: search, $options: "i" } },
        ],
      };

      if (!productVariantId) {
        const variants = await ProductVariant.find(variantFilter)
          .select("_id")
          .lean();

        filter.productVariantId = {
          $in: variants.map((v) => v._id),
        };
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Inventory.find(filter)
        .populate({
          path: "productVariantId",
          populate: [
            {
              path: "productId",
              select: "_id code name",
            },
            {
              path: "variantValues",
              select: "_id code name",
            },
          ],
          select: "_id sku barcode productId variantValues",
        })
        .populate("warehouseId", "_id code name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Inventory.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapInventoryList),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Inventory List Error:", error);

    return errorResponse(
      "Không thể lấy danh sách tồn kho",
      500
    );
  }
}
