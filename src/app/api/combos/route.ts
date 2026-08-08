import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";

import Combo from "@/models/Combo";
import Product from "@/models/Product";

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

const PRODUCT_OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

async function resolveProductId(input: { productId?: string; productCode?: string }) {
  if (input.productId && PRODUCT_OBJECT_ID_REGEX.test(input.productId)) {
    const product = await Product.findById(input.productId);
    return product;
  }
  if (input.productCode) {
    const product = await Product.findOne({ code: input.productCode.toUpperCase() });
    return product;
  }
  return null;
}

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

    if (!currentUser.permissions.includes("combo.view")) {
      return errorResponse("Bạn không có quyền xem combo", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const productId = searchParams.get("productId") ?? "";
    const isActive = searchParams.get("isActive");
    const keyword = searchParams.get("keyword") ?? "";

    const filter: Record<string, unknown> = {};

    if (productId) {
      if (PRODUCT_OBJECT_ID_REGEX.test(productId)) {
        filter.productId = new mongoose.Types.ObjectId(productId);
      } else {
        // Nếu truyền code, resolve ra ObjectId
        const product = await Product.findOne({ code: productId.toUpperCase() }).select("_id").lean();
        if (!product) {
          return success({ items: [], total: 0, page, limit, totalPages: 1 });
        }
        filter.productId = product._id;
      }
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    if (keyword) {
      const regex = { $regex: keyword, $options: "i" };
      filter.$or = [{ code: regex }, { name: regex }];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Combo.find(filter)
        .populate({
          path: "productId",
          select: "code name categoryId",
          populate: {
            path: "categoryId",
            select: "code name",
          },
        })
        .sort({ displayOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Combo.countDocuments(filter),
    ]);

    return success({
      items: items.map((item) => mapComboList(item as unknown as Record<string, unknown>)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Combo List Error:", error);
    return errorResponse("Không thể lấy danh sách combo", 500);
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

    if (!currentUser.permissions.includes("combo.create")) {
      return errorResponse("Bạn không có quyền tạo combo", 403);
    }

    await connectDB();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsedBody = createComboSchema.safeParse(body);
    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    // Product phải tồn tại và đang active
    const product = await resolveProductId({
      productId: data.productId,
      productCode: data.productCode,
    });

    if (!product) {
      return errorResponse("Sản phẩm không tồn tại", 400);
    }
    if (!product.isActive) {
      return errorResponse("Không thể tạo combo cho sản phẩm đã ngừng hoạt động", 400);
    }

    // Rule: Check duplicate code
    const existedCode = await Combo.exists({
      code: data.code.toUpperCase(),
    });
    if (existedCode) {
      return errorResponse("Mã combo đã tồn tại", 400);
    }

    // Rule: Check duplicate name within same product
    const existedName = await Combo.findOne({
      productId: product._id,
      name: data.name,
    });
    if (existedName) {
      return errorResponse("Tên combo đã tồn tại trong sản phẩm này", 400);
    }

    const combo = await Combo.create({
      code: data.code.toUpperCase(),
      name: data.name,
      productId: product._id,
      packageQuantity: data.packageQuantity,
      sellingPrice: data.sellingPrice,
      giftQuantity: data.giftQuantity ?? 0,
      displayOrder: data.displayOrder ?? 0,
      image: data.image ?? "",
      description: data.description ?? "",
      isActive: true,
    });

    const createdCombo = await Combo.findById(combo._id)
      .populate({
        path: "productId",
        select: "code name categoryId",
        populate: { path: "categoryId", select: "code name" },
      })
      .lean();

    return success(mapCombo(createdCombo as unknown as Record<string, unknown>), "Tạo combo thành công");
  } catch (error) {
    console.error("Create Combo Error:", error);
    return errorResponse("Không thể tạo combo", 500);
  }
}