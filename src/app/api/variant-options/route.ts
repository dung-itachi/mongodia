import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import VariantOption from "@/models/VariantOption";
import Product from "@/models/Product";

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
      
      // Generate code from name if not provided
      let finalCode = data.code;
      if (!finalCode) {
        // Convert Vietnamese name to ASCII code
        const normalized = data.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        const asciiCode = normalized
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .substring(0, 20);
        // Add random suffix for uniqueness
        const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        finalCode = asciiCode.length >= 4 
          ? asciiCode + suffix 
          : `${asciiCode}${suffix}`;
      }
  
      // Only check for duplicate code (code must be unique globally)
      const existedCode =
        await VariantOption.exists({
          code: finalCode.toUpperCase(),
        });
  
      if (existedCode) {
        return errorResponse(
          "Mã thuộc tính đã tồn tại",
          400
        );
      }
  
      // Note: We don't check for duplicate name here because the same attribute name
      // (e.g., "Kích thước") can be used for different products.
      // Name uniqueness is enforced at the product level via the assignment API.
  
const option =
        await VariantOption.create({
          code: finalCode.toUpperCase(),
          name: data.name,
          sortOrder: data.sortOrder,
        });

      // If productId is provided, automatically assign this option to the product
      if (data.productId) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mongoose = require("mongoose");
        await Product.findByIdAndUpdate(data.productId, {
          $addToSet: {
            variantOptionIds: new mongoose.Types.ObjectId(option._id),
          },
        });
      }

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