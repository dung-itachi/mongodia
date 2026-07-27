import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import VariantValue from "@/models/VariantValue";
import mongoose from "mongoose";

import {
  mapProductVariant,
} from "@/mappers/product-variant.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  updateProductVariantSchema,
} from "@/utils/validator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID không hợp lệ",
        400
      );
    }

    const productVariant = await ProductVariant.findById(
      id
    )
      .populate("productId", "_id code name")
      .populate(
        "variantValues",
        "_id code name variantOptionId"
      )
      .lean();

    if (!productVariant) {
      return errorResponse(
        "Biến thể sản phẩm không tồn tại",
        404
      );
    }

    return success(mapProductVariant(productVariant));

  } catch (error) {
    console.error(
      "Product Variant Detail Error:",
      error
    );

    return errorResponse(
      "Không thể lấy biến thể sản phẩm",
      500
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "product-variant.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật biến thể sản phẩm",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID không hợp lệ",
        400
      );
    }

    const existedVariant =
      await ProductVariant.findById(id);

    if (!existedVariant) {
      return errorResponse(
        "Biến thể sản phẩm không tồn tại",
        404
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

    const parsedBody =
      updateProductVariantSchema.safeParse(body);

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

    const existedSku = await ProductVariant.findOne({
      sku: data.sku.toUpperCase(),
      _id: { $ne: id },
    });

    if (existedSku) {
      return errorResponse(
        "SKU đã tồn tại",
        400
      );
    }

    const existedCombination =
      await ProductVariant.findOne({
        _id: { $ne: id },
        productId: data.productId,
        variantValues: { $all: data.variantValues },
      });

    if (existedCombination) {
      return errorResponse(
        "Tổ hợp biến thể đã tồn tại trong sản phẩm này",
        400
      );
    }

    await ProductVariant.updateOne(
      { _id: id },
      {
        $set: {
          productId: data.productId,
          sku: data.sku.toUpperCase(),
          barcode: data.barcode ?? "",
          image: data.image ?? "",
          variantValues: data.variantValues,
          price: data.price,
          cost: data.cost ?? 0,
          weight: data.weight ?? 0,
          sortOrder: data.sortOrder ?? 0,
          isActive: data.isActive,
        },
      }
    );

    const updatedProductVariant =
      await ProductVariant.findById(id)
        .populate("productId", "_id code name")
        .populate(
          "variantValues",
          "_id code name variantOptionId"
        )
        .lean();

    return success(
      mapProductVariant(updatedProductVariant!),
      "Cập nhật biến thể sản phẩm thành công"
    );

  } catch (error) {
    console.error(
      "Update Product Variant Error:",
      error
    );

    return errorResponse(
      "Không thể cập nhật biến thể sản phẩm",
      500
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "product-variant.delete"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xóa biến thể sản phẩm",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID không hợp lệ",
        400
      );
    }

    const productVariant =
      await ProductVariant.findById(id);

    if (!productVariant) {
      return errorResponse(
        "Biến thể sản phẩm không tồn tại",
        404
      );
    }

    await ProductVariant.deleteOne({ _id: id });

    return success(
      null,
      "Xóa biến thể sản phẩm thành công"
    );

  } catch (error) {
    console.error(
      "Delete Product Variant Error:",
      error
    );

    return errorResponse(
      "Không thể xóa biến thể sản phẩm",
      500
    );
  }
}
