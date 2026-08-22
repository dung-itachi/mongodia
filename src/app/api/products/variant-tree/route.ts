import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Product from "@/models/Product";
import VariantOption from "@/models/VariantOption";
import VariantValue from "@/models/VariantValue";
import mongoose from "mongoose";
import { success, error as errorResponse } from "@/utils/response";

interface VariantValueWithMeta {
  _id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

interface VariantOptionWithValues {
  _id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  values: VariantValueWithMeta[];
}

interface ProductTreeNode {
  _id: string;
  code: string;
  name: string;
  variantOptions: VariantOptionWithValues[];
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("product.view")) {
      return errorResponse("Bạn không có quyền xem sản phẩm", 403);
    }

    await connectDB();

    // Fetch products that have at least one variant option assigned
    const productsRaw = await Product.find({
      variantOptionIds: { $exists: true, $not: { $size: 0 } },
    })
      .select("_id code name variantOptionIds")
      .sort({ name: 1 })
      .lean();

    // Collect all option ids referenced by these products
    const allOptionIds = new Set<string>();
    const productToOptions = new Map<string, string[]>();
    for (const p of productsRaw) {
      const ids = (p.variantOptionIds || []).map((oid) => oid.toString());
      productToOptions.set(p._id.toString(), ids);
      ids.forEach((id) => allOptionIds.add(id));
    }

    if (allOptionIds.size === 0) {
      return success({
        products: productsRaw.map((p) => ({
          _id: p._id.toString(),
          code: p.code,
          name: p.name,
          variantOptions: [],
        })),
      } as { products: ProductTreeNode[] });
    }

    const optionObjectIds = Array.from(allOptionIds).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const [optionsRaw, valuesRaw] = await Promise.all([
      VariantOption.find({ _id: { $in: optionObjectIds } })
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      VariantValue.find({ variantOptionId: { $in: optionObjectIds } })
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
    ]);

    // Group values by optionId
    const valuesByOption = new Map<string, VariantValueWithMeta[]>();
    for (const v of valuesRaw) {
      const optId = v.variantOptionId.toString();
      if (!valuesByOption.has(optId)) valuesByOption.set(optId, []);
      valuesByOption.get(optId)!.push({
        _id: v._id.toString(),
        code: v.code,
        name: v.name,
        sortOrder: v.sortOrder ?? 0,
        isActive: v.isActive !== false,
      });
    }

    // Build option map
    const optionMap = new Map<string, VariantOptionWithValues>();
    for (const o of optionsRaw) {
      optionMap.set(o._id.toString(), {
        _id: o._id.toString(),
        code: o.code,
        name: o.name,
        sortOrder: o.sortOrder ?? 0,
        isActive: o.isActive !== false,
        values: valuesByOption.get(o._id.toString()) ?? [],
      });
    }

    // Build final product tree
    const products: ProductTreeNode[] = productsRaw.map((p) => {
      const optionIds = productToOptions.get(p._id.toString()) ?? [];
      return {
        _id: p._id.toString(),
        code: p.code,
        name: p.name,
        variantOptions: optionIds
          .map((id) => optionMap.get(id))
          .filter((o): o is VariantOptionWithValues => !!o),
      };
    });

    return success({ products });
  } catch (error) {
    console.error("Products Variant Tree Error:", error);
    return errorResponse("Không thể lấy cây thuộc tính biến thể", 500);
  }
}