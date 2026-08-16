/**
 * ==================================================
 * GET /api/warehouses/products/[productId]/variants
 * ==================================================
 *
 * Trả về danh sách ProductVariant active của 1 Product.
 * Phục vụ dropdown chọn variant trong modal "Nhập" (1 SP → list variant).
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import ProductVariant from "@/models/ProductVariant";
import { success, error as errorResponse } from "@/utils/response";

export type VariantOption = {
  _id: string;
  sku: string;
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

    const variants = await ProductVariant.find({
      productId,
      isActive: { $ne: false },
    })
      .select("_id sku")
      .sort({ sku: 1 })
      .lean();

    const data: VariantOption[] = variants.map((v) => ({
      _id: String(v._id),
      sku: v.sku,
    }));

    return success(data);
  } catch (err) {
    console.error("Product Variants Error:", err);
    return errorResponse("Không thể tải danh sách variant", 500);
  }
}