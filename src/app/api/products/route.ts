import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Product from "@/models/Product";
import Category from "@/models/Category";

import {
  mapProduct,
  mapProductList,
} from "@/mappers/product.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  createProductSchema,
} from "@/utils/validator";

export async function GET(request: Request) {
    try {
      const currentUser =
        await getCurrentUser(request);
  
      if (
        !currentUser.permissions.includes(
          "product.view"
        )
      ) {
        return errorResponse(
          "Bạn không có quyền xem sản phẩm",
          403
        );
      }
  
      await connectDB();
  
      const products = await Product.find({
        isActive: true,
      })
        .sort({
          code: 1,
        })
        .populate({
          path: "categoryId",
          select: "code name",
        })
        .lean();
  
      return success({
        items: products.map(mapProductList),
        total: products.length,
      });
    } catch (error) {
      console.error(
        "Product List Error:",
        error
      );
  
      return errorResponse(
        "Không thể lấy danh sách sản phẩm",
        500
      );
    }
  }

  export async function POST(request: Request) {
    try {
      const currentUser = await getCurrentUser(request);
  
      if (!currentUser.permissions.includes("product.create")) {
        return errorResponse(
          "Bạn không có quyền tạo sản phẩm",
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
        createProductSchema.safeParse(body);
  
      if (!parsedBody.success) {
        return errorResponse(
          parsedBody.error.issues[0]?.message ??
            "Dữ liệu không hợp lệ",
          400
        );
      }
  
      const data = parsedBody.data;
  
      const existedCode = await Product.exists({
        code: data.code.toUpperCase(),
      });
  
      if (existedCode) {
        return errorResponse(
          "Mã sản phẩm đã tồn tại",
          400
        );
      }
  
      const existedName = await Product.exists({
        name: data.name,
      });
  
      if (existedName) {
        return errorResponse(
          "Tên sản phẩm đã tồn tại",
          400
        );
      }
  
      const category = await Category.findOne({
        code: data.categoryCode.toUpperCase(),
      });
  
      if (!category) {
        return errorResponse(
          "Danh mục không tồn tại",
          400
        );
      }
  
      const product = await Product.create({
        code: data.code.toUpperCase(),
  
        name: data.name,
  
        categoryId: category._id,
  
        image: data.image,
  
        description: data.description,
      });
  
      const createdProduct =
        await Product.findById(product._id)
          .populate({
            path: "categoryId",
            select: "code name",
          })
          .lean();
  
      return success(
        mapProduct(createdProduct),
        "Tạo sản phẩm thành công"
      );
  
    } catch (error) {
      console.error(
        "Create Product Error:",
        error
      );
  
      return errorResponse(
        "Không thể tạo sản phẩm",
        500
      );
    }
  }