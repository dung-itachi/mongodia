/**
 * ==================================================
 * GET /api/products/[id]/variant-options
 * ==================================================
 *
 * Sprint 8.4.1 - Product-Specific Variant Options
 *
 * Get variant options and values that are used by a product's variants.
 * If product has no variants yet, returns all available options and values.
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import VariantOption from "@/models/VariantOption";
import VariantValue from "@/models/VariantValue";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("product.view")) {
      return errorResponse("Bạn không có quyền xem sản phẩm", 403);
    }

    await connectDB();

    const { id } = await params;

    // Fetch product
    const product = await Product.findById(id).lean();

    if (!product) {
      return errorResponse("Sản phẩm không tồn tại", 404);
    }

    // Fetch all variants for this product
    const variants = await ProductVariant.find({
      productId: product._id,
    })
      .select("variantValues")
      .lean();

    // Collect all variant value IDs used by this product
    const variantValueIds = new Set<string>();
    for (const variant of variants) {
      for (const vv of variant.variantValues) {
        variantValueIds.add(vv.toString());
      }
    }

    // If product has variants, get options/values used by these variants
    // If product has no variants, return all available options/values
    let variantOptionsQuery: Record<string, unknown>;
    let variantValuesQuery: Record<string, unknown>;

    if (variantValueIds.size > 0) {
      // Product has variants - get options/values from those variants
      variantValuesQuery = {
        _id: { $in: Array.from(variantValueIds) },
        isActive: true,
      };
    } else {
      // Product has no variants - return all available options/values
      variantValuesQuery = {
        isActive: true,
      };
    }

    // Fetch variant values
    const variantValues = await VariantValue.find(variantValuesQuery)
      .sort({ sortOrder: 1 })
      .lean();

    // Collect option IDs from values
    const optionIds = new Set<string>();
    for (const vv of variantValues) {
      optionIds.add(vv.variantOptionId.toString());
    }

    // Fetch variant options
    variantOptionsQuery = {
      _id: { $in: Array.from(optionIds) },
      isActive: true,
    };

    const variantOptions = await VariantOption.find(variantOptionsQuery)
      .sort({ sortOrder: 1 })
      .lean();

    // Group values by option
    const optionValueMap = new Map<string, typeof variantValues>();
    for (const vv of variantValues) {
      const optId = vv.variantOptionId.toString();
      if (!optionValueMap.has(optId)) {
        optionValueMap.set(optId, []);
      }
      optionValueMap.get(optId)!.push(vv);
    }

    // Build variant options with values response
    const variantOptionsWithValues = variantOptions.map((opt) => ({
      _id: opt._id.toString(),
      code: opt.code,
      name: opt.name,
      sortOrder: opt.sortOrder,
      isActive: opt.isActive,
      values: (optionValueMap.get(opt._id.toString()) || []).map((vv) => ({
        _id: vv._id.toString(),
        code: vv.code,
        name: vv.name,
        variantOptionId: vv.variantOptionId.toString(),
        sortOrder: vv.sortOrder,
        isActive: vv.isActive,
      })),
    }));

    return success({
      productId: product._id.toString(),
      productName: product.name,
      productCode: product.code,
      hasVariants: variantValueIds.size > 0,
      variantOptions: variantOptionsWithValues,
    });
  } catch (error) {
    console.error("Product Variant Options Error:", error);
    return errorResponse("Không thể lấy thuộc tính biến thể của sản phẩm", 500);
  }
}
