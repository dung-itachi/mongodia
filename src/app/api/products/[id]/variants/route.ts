/**
 * ==================================================
 * GET /api/products/:id/variants
 * ==================================================
 *
 * Sprint 8.x - Generic Variant Support
 *
 * Get product with variant options and all variants.
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
      isActive: true,
    })
      .sort({ sortOrder: 1 })
      .lean();

    // Collect all variant value IDs
    const variantValueIds = new Set<string>();
    for (const variant of variants) {
      for (const vv of variant.variantValues) {
        variantValueIds.add(vv.toString());
      }
    }

    // Fetch variant values
    const variantValues = await VariantValue.find({
      _id: { $in: Array.from(variantValueIds) },
      isActive: true,
    })
      .sort({ sortOrder: 1 })
      .lean();

    const variantValueMap = new Map(
      variantValues.map((vv) => [vv._id.toString(), vv])
    );

    // Group values by option
    const optionValueMap = new Map<string, typeof variantValues>();
    for (const vv of variantValues) {
      const optId = vv.variantOptionId.toString();
      if (!optionValueMap.has(optId)) {
        optionValueMap.set(optId, []);
      }
      optionValueMap.get(optId)!.push(vv);
    }

    // Fetch variant options that have values in this product
    const optionIds = Array.from(optionValueMap.keys());
    const variantOptions = await VariantOption.find({
      _id: { $in: optionIds },
      isActive: true,
    })
      .sort({ sortOrder: 1 })
      .lean();

    // Build variant options with values
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

    // Build variants response
    const variantsResponse = variants.map((v) => ({
      _id: v._id.toString(),
      productId: v.productId.toString(),
      sku: v.sku,
      barcode: v.barcode || "",
      image: v.image || "",
      variantValues: v.variantValues.map((vv) => vv.toString()),
      price: v.price,
      cost: v.cost || 0,
      weight: v.weight || 0,
      sortOrder: v.sortOrder || 0,
      isActive: v.isActive,
    }));

    // Build product response
    const productResponse = {
      _id: product._id.toString(),
      code: product.code,
      name: product.name,
      categoryId: product.categoryId?.toString() || "",
      image: product.image || "",
      description: product.description || "",
      isActive: product.isActive,
      variantOptions: variantOptionsWithValues,
      variants: variantsResponse,
    };

    return success({
      product: productResponse,
      variantOptions: variantOptionsWithValues,
      variants: variantsResponse,
    });
  } catch (error) {
    console.error("Product Variants Error:", error);
    return errorResponse("Không thể lấy thông tin variant", 500);
  }
}
