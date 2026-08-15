import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import VariantValue from "@/models/VariantValue";

import {
  mapProductVariant,
  mapProductVariantList,
} from "@/mappers/product-variant.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  createProductVariantSchema,
} from "@/utils/validator";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "product-variant.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem biến thể sản phẩm",
        403
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? "";
    const productId = searchParams.get("productId") ?? "";
    const isActive = searchParams.get("isActive");

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    if (productId) {
      filter.productId = productId;
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ProductVariant.find(filter)
        .populate("productId", "_id code name")
        .populate(
          "variantValues",
          "_id code name variantOptionId"
        )
        .sort({
          sortOrder: 1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductVariant.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapProductVariantList),
      total,
      page,
      limit,
      totalPages: Math.max(
        1,
        Math.ceil(total / limit)
      ),
    });
  } catch (error) {
    console.error(
      "Product Variant List Error:",
      error
    );

    return errorResponse(
      "Không thể lấy danh sách biến thể sản phẩm",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "product-variant.create"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền tạo biến thể sản phẩm",
        403
      );
    }

    await connectDB();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu không hợp lệ",
        400
      );
    }

    const parsedBody =
      createProductVariantSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedProduct = await Product.exists({
      _id: data.productId,
    });

    if (!existedProduct) {
      return errorResponse(
        "Sản phẩm không tồn tại",
        400
      );
    }

    const variantValueDocs =
      await VariantValue.find({
        _id: { $in: data.variantValues },
      }).lean();

    if (
      variantValueDocs.length !==
      data.variantValues.length
    ) {
      return errorResponse(
        "Một số giá trị biến thể không tồn tại",
        400
      );
    }

    const variantOptionIds = new Set(
      variantValueDocs.map((v) =>
        v.variantOptionId.toString()
      )
    );

    if (
      variantOptionIds.size !==
      variantValueDocs.length
    ) {
      return errorResponse(
        "Không được chọn 2 giá trị thuộc cùng một thuộc tính biến thể",
        400
      );
    }

    const existedSku = await ProductVariant.exists({
      sku: data.sku.toUpperCase(),
    });

    if (existedSku) {
      return errorResponse(
        "SKU đã tồn tại",
        400
      );
    }

    const existedCombination =
      await ProductVariant.exists({
        productId: data.productId,
        variantValues: { $all: data.variantValues },
      });

    if (existedCombination) {
      return errorResponse(
        "Tổ hợp biến thể đã tồn tại trong sản phẩm này",
        400
      );
    }

    const productVariant = await ProductVariant.create({
      productId: data.productId,
      sku: data.sku.toUpperCase(),
      barcode: data.barcode ?? "",
      image: data.image ?? "",
      variantValues: data.variantValues,
      // Sprint 8.x: Variant KHÔNG có giá — giá nằm ở Combo.
      // Bỏ qua price từ client, luôn set 0 để giữ tương thích schema.
      price: 0,
      cost: data.cost ?? 0,
      weight: data.weight ?? 0,
      sortOrder: data.sortOrder ?? 0,
    });

    return success(
      mapProductVariant(productVariant),
      "Tạo biến thể sản phẩm thành công"
    );
  } catch (error) {
    console.error(
      "Create Product Variant Error:",
      error
    );

    return errorResponse(
      "Không thể tạo biến thể sản phẩm",
      500
    );
  }
}
