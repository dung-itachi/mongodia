/**
 * ==================================================
 * GET /api/products/[id]/variant-options
 * PUT /api/products/[id]/variant-options
 * ==================================================
 *
 * Sprint 8.4.1 - Product-Specific Variant Options
 *
 * GET: Get variant options and values assigned to a specific product.
 * PUT: Assign variant options to a specific product.
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Product from "@/models/Product";
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

    // Validate product ID format
    if (!id || id === "null" || id === "undefined") {
      return errorResponse("ID sản phẩm không hợp lệ", 400);
    }

    // Fetch product with its variant options (use raw collection to bypass schema cache)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mongoose = require("mongoose");
    const productCollection = mongoose.connection.db.collection("products");
    const productRaw = await productCollection.findOne({ _id: new mongoose.Types.ObjectId(id) });

    if (!productRaw) {
      return errorResponse("Sản phẩm không tồn tại", 404);
    }

    // Get variant option IDs from product
    const variantOptionIds = (productRaw.variantOptionIds || []).map(
      (oid: { toString: () => string }) => oid.toString()
    );

    // If product has no assigned options, return empty
    if (variantOptionIds.length === 0) {
      return success({
        productId: id,
        productName: productRaw.name,
        productCode: productRaw.code,
        hasVariants: false,
        variantOptions: [],
      });
    }

    // Fetch variant options
    const variantOptions = await VariantOption.find({
      _id: { $in: variantOptionIds },
      isActive: true,
    })
      .sort({ sortOrder: 1 })
      .lean();

    // Fetch all variant values for these options
    const variantValues = await VariantValue.find({
      variantOptionId: { $in: variantOptionIds },
      isActive: true,
    })
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
      productId: id,
      productName: productRaw.name,
      productCode: productRaw.code,
      hasVariants: variantValues.length > 0,
      variantOptions: variantOptionsWithValues,
    });
  } catch (error) {
    console.error("Product Variant Options Error:", error);
    return errorResponse("Không thể lấy thuộc tính biến thể của sản phẩm", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("product.edit")) {
      return errorResponse("Bạn không có quyền sửa sản phẩm", 403);
    }

    await connectDB();

    const { id } = await params;

    // Validate product ID format
    if (!id || id === "null" || id === "undefined") {
      return errorResponse("ID sản phẩm không hợp lệ", 400);
    }

    // Check product exists
    const product = await Product.findById(id);
    if (!product) {
      return errorResponse("Sản phẩm không tồn tại", 404);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const { variantOptionIds } = body as { variantOptionIds: string[] };

    if (!Array.isArray(variantOptionIds)) {
      return errorResponse("Danh sách thuộc tính không hợp lệ", 400);
    }

    // Validate that all option IDs exist
    const validOptionIds = variantOptionIds.filter((oid) => oid && oid.match(/^[0-9a-fA-F]{24}$/));
    
    const existingOptions = await VariantOption.find({
      _id: { $in: validOptionIds },
      isActive: true,
    }).lean();

    if (existingOptions.length !== validOptionIds.length) {
      return errorResponse("Một số thuộc tính không tồn tại", 400);
    }

    // Update product with variant options - ADD to existing list, not replace
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mongoose = require("mongoose");
    
    // Use direct collection to bypass schema strict mode (cached schema may not have this field yet)
    const productCollection = mongoose.connection.db.collection("products");
    
    // Convert validOptionIds to ObjectId instances
    const newOptionObjectIds = validOptionIds.map((oid: string) => new mongoose.Types.ObjectId(oid));
    
    // Use $addToSet to add option IDs without duplicates (raw MongoDB update)
    await productCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $addToSet: { variantOptionIds: { $each: newOptionObjectIds } } }
    );

    // Verify the save by re-reading the document
    const verify = await productCollection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    console.log("[PUT variant-options] after save, variantOptionIds:", verify?.variantOptionIds);

    return success(
      {
        productId: product._id.toString(),
        variantOptionIds: validOptionIds,
      },
      "Cập nhật thuộc tính biến thể thành công"
    );
  } catch (error) {
    console.error("Assign Variant Options Error:", error);
    return errorResponse("Không thể cập nhật thuộc tính biến thể", 500);
  }
}
