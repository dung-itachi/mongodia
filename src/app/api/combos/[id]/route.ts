import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";

import Combo from "@/models/Combo";
import Category from "@/models/Category";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";

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

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID combo không hợp lệ",
        400
      );
    }

    const combo = await Combo.findById(id)
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

    if (!combo) {
      return errorResponse(
        "Không tìm thấy combo",
        404
      );
    }

    return success(mapCombo(combo));
  } catch (error) {
    console.error("Get Combo Error:", error);

    return errorResponse(
      "Không thể lấy thông tin combo",
      500
    );
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

    if (
      !currentUser.permissions.includes(
        "combo.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật combo",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID combo không hợp lệ",
        400
      );
    }

    const existedCombo = await Combo.findById(id);

    if (!existedCombo) {
      return errorResponse(
        "Không tìm thấy combo",
        404
      );
    }

    // Rule: Cannot update inactive combo
    if (!existedCombo.isActive) {
      return errorResponse(
        "Không thể cập nhật combo đã bị xóa",
        400
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu không hợp lệ",
        400
      );
    }

    const parsedBody = updateComboSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    // Rule: Check duplicate code (exclude current)
    const existedCode = await Combo.findOne({
      code: data.code.toUpperCase(),
      _id: { $ne: id },
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

    // Rule: Check duplicate name within same product (exclude current)
    const existedName = await Combo.findOne({
      productId: product._id,
      name: data.name,
      _id: { $ne: id },
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

    await Combo.updateOne(
      { _id: id },
      {
        $set: {
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
          isActive: data.isActive,
        },
      }
    );

    const updatedCombo = await Combo.findById(id)
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
      mapCombo(updatedCombo),
      "Cập nhật combo thành công"
    );
  } catch (error) {
    console.error("Update Combo Error:", error);

    return errorResponse(
      "Không thể cập nhật combo",
      500
    );
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

    if (
      !currentUser.permissions.includes(
        "combo.delete"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xóa combo",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID combo không hợp lệ",
        400
      );
    }

    const combo = await Combo.findById(id);

    if (!combo) {
      return errorResponse(
        "Không tìm thấy combo",
        404
      );
    }

    // Soft delete
    await Combo.updateOne(
      { _id: id },
      { $set: { isActive: false } }
    );

    return success(
      null,
      "Xóa combo thành công"
    );
  } catch (error) {
    console.error("Delete Combo Error:", error);

    return errorResponse(
      "Không thể xóa combo",
      500
    );
  }
}
