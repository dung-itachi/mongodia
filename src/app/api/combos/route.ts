import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";

import Combo from "@/models/Combo";
import Category from "@/models/Category";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";

import {
  mapCombo,
  mapComboList,
} from "@/mappers/combo.mapper";

import {
  createComboSchema,
} from "@/utils/validator";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

export async function GET(request: Request) {
  try {
    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return errorResponse(error.message, 401);
      }
      if (error instanceof ForbiddenError) {
        return errorResponse(error.message, 403);
      }
      return errorResponse("Unauthorized", 401);
    }

    if (
      !currentUser.permissions.includes(
        "combo.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem combo",
        403
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const categoryId = searchParams.get("categoryId") ?? "";
    const productId = searchParams.get("productId") ?? "";
    const isActive = searchParams.get("isActive");
    const keyword = searchParams.get("keyword") ?? "";

    const filter: Record<string, unknown> = {
      isActive: true
    };

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (productId) {
      filter.productId = productId;
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    if (keyword) {
      const regex = { $regex: keyword, $options: "i" };
      filter.$or = [
        { code: regex },
        { name: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Combo.find(filter)
        .populate({
          path: "categoryId",
          select: "code name",
        })
        .populate({
          path: "productId",
          select: "code name",
        })
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Combo.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapComboList),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Combo List Error:", error);

    return errorResponse(
      "Không thể lấy danh sách combo",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    let currentUser;
    try {
      currentUser = await getCurrentUser(request);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return errorResponse(error.message, 401);
      }
      if (error instanceof ForbiddenError) {
        return errorResponse(error.message, 403);
      }
      return errorResponse("Unauthorized", 401);
    }

    if (
      !currentUser.permissions.includes(
        "combo.create"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền tạo combo",
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

    const parsedBody = createComboSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    // Rule: Check duplicate code
    const existedCode = await Combo.exists({
      code: data.code.toUpperCase(),
    });

    if (existedCode) {
      return errorResponse(
        "Mã combo đã tồn tại",
        400
      );
    }

    // Rule: Category must exist and be active
    const category = await Category.findOne({
      code: data.categoryCode.toUpperCase(),
      isActive: true,
    });

    if (!category) {
      return errorResponse(
        "Danh mục không tồn tại",
        400
      );
    }

    // Rule: Product must exist, active, and belong to this category
    const product = await Product.findOne({
      code: data.productCode.toUpperCase(),
      isActive: true,
    });

    if (!product) {
      return errorResponse(
        "Sản phẩm không tồn tại",
        400
      );
    }

    if (product.categoryId.toString() !== category._id.toString()) {
      return errorResponse(
        "Sản phẩm không thuộc danh mục đã chọn",
        400
      );
    }

    // Rule: Check duplicate name within same product
    const existedName = await Combo.findOne({
      productId: product._id,
      name: data.name,
    });

    if (existedName) {
      return errorResponse(
        "Tên combo đã tồn tại trong sản phẩm này",
        400
      );
    }

    // Rule: All variants must exist, active, and belong to this product
    const variantIds = data.comboItems.map((item) => item.productVariantId);
    const variants = await ProductVariant.find({
      _id: { $in: variantIds },
      isActive: true,
      productId: product._id,
    });

    if (variants.length !== variantIds.length) {
      return errorResponse(
        "Biến thể không thuộc sản phẩm đã chọn",
        400
      );
    }

    const combo = await Combo.create({
      code: data.code.toUpperCase(),
      name: data.name,
      productId: product._id,
      categoryId: category._id,
      comboItems: data.comboItems.map((item) => ({
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        isGift: item.isGift,
      })),
      sellingPrice: data.sellingPrice,
      packageSize: data.packageSize,
      displayOrder: data.displayOrder ?? 0,
      image: data.image ?? "",
      description: data.description ?? "",
    });

    const createdCombo = await Combo.findById(combo._id)
      .populate({
        path: "categoryId",
        select: "code name",
      })
      .populate({
        path: "productId",
        select: "code name",
      })
      .populate({
        path: "comboItems.productVariantId",
        select: "sku price productId",
        populate: {
          path: "productId",
          select: "code name categoryId",
          populate: {
            path: "categoryId",
            select: "code name",
          },
        },
      })
      .lean();

    return success(
      mapCombo(createdCombo),
      "Tạo combo thành công"
    );
  } catch (error) {
    console.error("Create Combo Error:", error);

    return errorResponse(
      "Không thể tạo combo",
      500
    );
  }
}
