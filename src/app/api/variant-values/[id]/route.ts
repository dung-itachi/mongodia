import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import VariantValue from "@/models/VariantValue";
import VariantOption from "@/models/VariantOption";
import mongoose from "mongoose";

import {
  mapVariantValue,
} from "@/mappers/variant-value.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  updateVariantValueSchema,
} from "@/utils/validator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "variant-value.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem giá trị biến thể",
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

    const variantValue = await VariantValue.findById(
      id
    )
      .populate("variantOptionId", "_id code name")
      .lean();

    if (!variantValue) {
      return errorResponse(
        "Giá trị biến thể không tồn tại",
        404
      );
    }

    return success(mapVariantValue(variantValue));

  } catch (error) {
    console.error(
      "Variant Value Detail Error:",
      error
    );

    return errorResponse(
      "Không thể lấy giá trị biến thể",
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
        "variant-value.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật giá trị biến thể",
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
      updateVariantValueSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedOption =
      await VariantOption.exists({
        _id: data.variantOptionId,
      });

    if (!existedOption) {
      return errorResponse(
        "Thuộc tính biến thể không tồn tại",
        400
      );
    }

    const existedCode =
      await VariantValue.findOne({
        variantOptionId: data.variantOptionId,
        code: data.code.toUpperCase(),
        _id: { $ne: id },
      });

    if (existedCode) {
      return errorResponse(
        "Mã giá trị đã tồn tại trong thuộc tính này",
        400
      );
    }

    const existedName =
      await VariantValue.findOne({
        variantOptionId: data.variantOptionId,
        name: data.name,
        _id: { $ne: id },
      });

    if (existedName) {
      return errorResponse(
        "Tên giá trị đã tồn tại trong thuộc tính này",
        400
      );
    }

    await VariantValue.updateOne(
      { _id: id },
      {
        $set: {
          code: data.code.toUpperCase(),
          name: data.name,
          variantOptionId: data.variantOptionId,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
      }
    );

    const updatedVariantValue =
      await VariantValue.findById(id)
        .populate("variantOptionId", "_id code name")
        .lean();

    return success(
      mapVariantValue(updatedVariantValue!),
      "Cập nhật giá trị biến thể thành công"
    );

  } catch (error) {
    console.error(
      "Update Variant Value Error:",
      error
    );

    return errorResponse(
      "Không thể cập nhật giá trị biến thể",
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
        "variant-value.delete"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xóa giá trị biến thể",
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

    const variantValue =
      await VariantValue.findById(id);

    if (!variantValue) {
      return errorResponse(
        "Giá trị biến thể không tồn tại",
        404
      );
    }

    await VariantValue.deleteOne({ _id: id });

    return success(
      null,
      "Xóa giá trị biến thể thành công"
    );

  } catch (error) {
    console.error(
      "Delete Variant Value Error:",
      error
    );

    return errorResponse(
      "Không thể xóa giá trị biến thể",
      500
    );
  }
}
