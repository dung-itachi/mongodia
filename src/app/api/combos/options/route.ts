/**
 * ==================================================
 * GET /api/combos/options
 * ==================================================
 *
 * Trả danh sách Combo đang active để hiển thị trong dropdown
 * của modal "Nhập kho" trên trang /warehouses.
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import Combo from "@/models/Combo";
import Product from "@/models/Product";
import { success, error as errorResponse } from "@/utils/response";

export type ComboOption = {
  _id: string;
  code: string;
  name: string;
  productId: string;
  productName: string;
  packageQuantity: number;
  sellingPrice: number;
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

    const combos = await Combo.find({ isActive: true })
      .select("_id code name productId packageQuantity sellingPrice")
      .sort({ code: 1 })
      .lean();

    const productIds = Array.from(
      new Set(combos.map((c) => String(c.productId)))
    );
    const products = productIds.length
      ? await Product.find({ _id: { $in: productIds } })
          .select("_id code name")
          .lean()
      : [];
    const productMap = new Map(
      products.map((p) => [String(p._id), p])
    );

    const options: ComboOption[] = combos.map((c) => {
      const product = productMap.get(String(c.productId));
      return {
        _id: String(c._id),
        code: c.code,
        name: c.name,
        productId: String(c.productId),
        productName: product?.name ?? "",
        packageQuantity: c.packageQuantity,
        sellingPrice: c.sellingPrice,
      };
    });

    return success(options);
  } catch (err) {
    console.error("Combo Options Error:", err);
    return errorResponse("Không thể tải danh sách combo", 500);
  }
}