import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import VariantOption from "@/models/VariantOption";

import {
  mapVariantOption,
  mapVariantOptionList,
} from "@/mappers/variant-option.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  createVariantOptionSchema,
} from "@/utils/validator";

export async function GET(request: Request) {
    try {
      const currentUser =
        await getCurrentUser(request);
  
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
  
      const options =
        await VariantOption.find({
          isActive: true,
        })
          .sort({
            sortOrder: 1,
            code: 1,
          })
          .lean();
  
      return success({
        items: options.map(
          mapVariantOptionList
        ),
        total: options.length,
      });
  
    } catch (error) {
      console.error(
        "Variant Option List Error:",
        error
      );
  
      return errorResponse(
        "Không thể lấy danh sách thuộc tính biến thể",
        500
      );
    }
  }

  export async function POST(request: Request) {
    try {
      const currentUser = await getCurrentUser(request);
  
      if (
        !currentUser.permissions.includes(
          "variant-option.create"
        )
      ) {
        return errorResponse(
          "Bạn không có quyền tạo thuộc tính biến thể",
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
        createVariantOptionSchema.safeParse(body);
  
      if (!parsedBody.success) {
        return errorResponse(
          parsedBody.error.issues[0]?.message ??
            "Dữ liệu không hợp lệ",
          400
        );
      }
  
      const data = parsedBody.data;
  
      const existedCode =
        await VariantOption.exists({
          code: data.code.toUpperCase(),
        });
  
      if (existedCode) {
        return errorResponse(
          "Mã thuộc tính đã tồn tại",
          400
        );
      }
  
      const existedName =
        await VariantOption.exists({
          name: data.name,
        });
  
      if (existedName) {
        return errorResponse(
          "Tên thuộc tính đã tồn tại",
          400
        );
      }
  
      const option =
        await VariantOption.create({
          code: data.code.toUpperCase(),
  
          name: data.name,
  
          sortOrder: data.sortOrder,
        });
  
      return success(
        mapVariantOption(option),
        "Tạo thuộc tính biến thể thành công"
      );
  
    } catch (error) {
      console.error(
        "Create Variant Option Error:",
        error
      );
  
      return errorResponse(
        "Không thể tạo thuộc tính biến thể",
        500
      );
    }
  }