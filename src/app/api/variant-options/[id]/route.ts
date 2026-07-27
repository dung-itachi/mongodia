import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import VariantOption from "@/models/VariantOption";
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
          code: data.code.toUpperCase(),
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
            code: data.code.toUpperCase(),
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