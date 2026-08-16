/**
 * ==================================================
 * GET /api/warehouses/products
 * ==================================================
 *
 * Trả về danh sách Product + variants đang active để dùng trong dropdown
 * chọn sản phẩm nhập kho (modal "+ Thêm SP kho").
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import { success, error as errorResponse } from "@/utils/response";

export type ProductOption = {
  _id: string;
  code: string;
  name: string;
  variants: Array<{
    _id: string;
    sku: string;
    label: string;
  }>;
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

    const products = await Product.find({ isActive: { $ne: false } })
      .select("_id code name")
      .sort({ code: 1 })
      .lean();

    const productIds = products.map((p) => String(p._id));

    const variants = productIds.length
      ? await ProductVariant.find({
          productId: { $in: productIds },
          isActive: { $ne: false },
        })
          .select("_id sku productId")
          .lean()
      : [];

    const variantsByProduct = new Map<string, Array<{ _id: string; sku: string; label: string }>>();
    for (const v of variants) {
      const arr =
        variantsByProduct.get(String(v.productId)) ??
        ([] as Array<{ _id: string; sku: string; label: string }>);
      arr.push({
        _id: String(v._id),
        sku: v.sku,
        label: v.sku,
      });
      variantsByProduct.set(String(v.productId), arr);
    }

    const options: ProductOption[] = products.map((p) => ({
      _id: String(p._id),
      code: p.code,
      name: p.name,
      variants: variantsByProduct.get(String(p._id)) ?? [],
    }));

    return success(options);
  } catch (err) {
    console.error("Warehouse Products Error:", err);
    return errorResponse("Không thể tải danh sách sản phẩm", 500);
  }
}