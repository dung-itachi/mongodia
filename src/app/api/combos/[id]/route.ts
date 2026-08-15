import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";

import Combo from "@/models/Combo";
import Order from "@/models/Order";
import Product from "@/models/Product";

import {
  mapCombo,
} from "@/mappers/combo.mapper";

import {
  updateComboSchema,
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID combo không hợp lệ", 400);
    }

    const combo = await Combo.findById(id)
      .populate({
        path: "productId",
        select: "code name categoryId",
        populate: { path: "categoryId", select: "code name" },
      })
      .lean();

    if (!combo) {
      return errorResponse("Không tìm thấy combo", 404);
    }

    return success(mapCombo(combo as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Get Combo Error:", error);
    return errorResponse("Không thể lấy thông tin combo", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!currentUser.permissions.includes("combo.update")) {
      return errorResponse("Bạn không có quyền cập nhật combo", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID combo không hợp lệ", 400);
    }

    const existedCombo = await Combo.findById(id);
    if (!existedCombo) {
      return errorResponse("Không tìm thấy combo", 404);
    }
    if (!existedCombo.isActive) {
      return errorResponse("Không thể cập nhật combo đã bị xóa", 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsedBody = updateComboSchema.safeParse(body);
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
      return errorResponse("Không thể cập nhật combo cho sản phẩm đã ngừng hoạt động", 400);
    }

    // Rule: Check duplicate code (exclude current)
    const existedCode = await Combo.findOne({
      code: data.code.toUpperCase(),
      _id: { $ne: id },
    });
    if (existedCode) {
      return errorResponse("Mã combo đã tồn tại", 400);
    }

    // Rule: Check duplicate name within same product (exclude current)
    const existedName = await Combo.findOne({
      productId: product._id,
      name: data.name,
      _id: { $ne: id },
    });
    if (existedName) {
      return errorResponse("Tên combo đã tồn tại trong sản phẩm này", 400);
    }

    await Combo.updateOne(
      { _id: id },
      {
        $set: {
          code: data.code.toUpperCase(),
          name: data.name,
          productId: product._id,
          packageQuantity: data.packageQuantity,
          sellingPrice: data.sellingPrice,
          giftQuantity: data.giftQuantity ?? 0,
          displayOrder: data.displayOrder ?? 0,
          image: data.image ?? "",
          description: data.description ?? "",
          isActive: data.isActive,
        },
      }
    );

    const updatedCombo = await Combo.findById(id)
      .populate({
        path: "productId",
        select: "code name categoryId",
        populate: { path: "categoryId", select: "code name" },
      })
      .lean();

    return success(mapCombo(updatedCombo as unknown as Record<string, unknown>), "Cập nhật combo thành công");
  } catch (error) {
    console.error("Update Combo Error:", error);
    return errorResponse("Không thể cập nhật combo", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    if (!currentUser.permissions.includes("combo.delete")) {
      return errorResponse("Bạn không có quyền xóa combo", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID combo không hợp lệ", 400);
    }

    const combo = await Combo.findById(id);
    if (!combo) {
      return errorResponse("Không tìm thấy combo", 404);
    }

    if (!combo.isActive) {
      return errorResponse("Combo đã được xóa trước đó", 400);
    }

    // Đếm số đơn đang tham chiếu combo (cả ở orderItems[] lẫn comboId top-level)
    // để client hiển thị confirm dialog trước khi xóa.
    const affectedOrdersCount = await Order.countDocuments({
      isActive: true,
      $or: [{ comboId: combo._id }, { "orderItems.comboId": combo._id }],
    });

    // Soft delete
    await Combo.updateOne({ _id: id }, { $set: { isActive: false } });

    return success(
      {
        affectedOrdersCount,
      },
      affectedOrdersCount > 0
        ? `Đã xóa combo. ${affectedOrdersCount} đơn hàng cũ vẫn giữ nguyên tên combo này và không thể tạo đơn mới với combo đã xóa.`
        : "Xóa combo thành công"
    );
  } catch (error) {
    console.error("Delete Combo Error:", error);
    return errorResponse("Không thể xóa combo", 500);
  }
}