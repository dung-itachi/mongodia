import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import VariantOption from "@/models/VariantOption";
import VariantValue from "@/models/VariantValue";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import mongoose from "mongoose";
import {
  mapVariantOption,
} from "@/mappers/variant-option.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  updateVariantOptionSchema,
} from "@/utils/validator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "variant-option.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem thuộc tính biến thể",
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

    const option = await VariantOption.findById(
      id
    ).lean();

    if (!option) {
      return errorResponse(
        "Thuộc tính biến thể không tồn tại",
        404
      );
    }

    return success(mapVariantOption(option));

  } catch (error) {
    console.error(
      "Variant Option Detail Error:",
      error
    );

    return errorResponse(
      "Không thể lấy thuộc tính biến thể",
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
        "variant-option.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật thuộc tính biến thể",
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
      updateVariantOptionSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const option = await VariantOption.findById(id);

    if (!option) {
      return errorResponse(
        "Thuộc tính biến thể không tồn tại",
        404
      );
    }

    const existedCode =
      await VariantOption.findOne({
        code: (data.code ?? "").toUpperCase(),
        _id: { $ne: id },
      });

    if (existedCode) {
      return errorResponse(
        "Mã thuộc tính đã tồn tại",
        400
      );
    }

    const existedName =
      await VariantOption.findOne({
        name: data.name,
        _id: { $ne: id },
      });

    if (existedName) {
      return errorResponse(
        "Tên thuộc tính đã tồn tại",
        400
      );
    }

    await VariantOption.updateOne(
      { _id: id },
      {
        $set: {
          code: (data.code ?? "").toUpperCase(),
          name: data.name,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
      }
    );

    const updatedOption =
      await VariantOption.findById(id).lean();

    return success(
      mapVariantOption(updatedOption!),
      "Cập nhật thuộc tính biến thể thành công"
    );

  } catch (error) {
    console.error(
      "Update Variant Option Error:",
      error
    );

    return errorResponse(
      "Không thể cập nhật thuộc tính biến thể",
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

    if (!currentUser.permissions.includes("variant-option.delete")) {
      return errorResponse("Bạn không có quyền xóa thuộc tính biến thể", 403);
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const option = await VariantOption.findById(id);

    if (!option) {
      return errorResponse("Thuộc tính biến thể không tồn tại", 404);
    }

    // Find all value IDs of this option
    const valueIds = await VariantValue.find({ variantOptionId: id })
      .select("_id")
      .lean();
    const valueObjectIds = valueIds.map((v) => v._id);

    // Dependency check 1: any ProductVariant using these values?
    if (valueObjectIds.length > 0) {
      const usedByVariant = await ProductVariant.findOne({
        variantValues: { $in: valueObjectIds },
      }).lean();
      if (usedByVariant) {
        return errorResponse(
          "Không thể xóa thuộc tính vì có giá trị đang được sử dụng bởi biến thể sản phẩm",
          400
        );
      }
    }

    // Dependency check 2: any Product referencing this option?
    const usedByProduct = await Product.findOne({
      variantOptionIds: id,
    }).lean();
    if (usedByProduct) {
      return errorResponse(
        "Không thể xóa thuộc tính vì đang được gán cho sản phẩm",
        400
      );
    }

    // Cascade: delete all values belonging to this option
    if (valueObjectIds.length > 0) {
      await VariantValue.deleteMany({ variantOptionId: id });
    }

    await VariantOption.deleteOne({ _id: id });

    return success(
      {
        deletedOptionId: id,
        deletedValueIds: valueObjectIds.map((v) => v.toString()),
      },
      "Xóa thuộc tính biến thể thành công"
    );
  } catch (error) {
    console.error("Delete Variant Option Error:", error);
    return errorResponse("Không thể xóa thuộc tính biến thể", 500);
  }
}
