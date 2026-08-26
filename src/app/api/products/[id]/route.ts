import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Product from "@/models/Product";

import "@/models/Category";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  mapProduct,
} from "@/mappers/product.mapper";

import Category from "@/models/Category";

import {
  updateProductSchema,
} from "@/utils/validator";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
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
  
      const { id } = await params;
  
      const product =
        await Product.findById(id)
          .populate({
            path: "categoryId",
            select: "code name",
          })
          .lean();
  
      if (!product) {
        return errorResponse(
          "Sản phẩm không tồn tại",
          404
        );
      }
  
      return success(
        mapProduct(product)
      );
  
    } catch (error) {
      console.error(
        "Product Detail Error:",
        error
      );
  
      return errorResponse(
        "Không thể lấy sản phẩm",
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
          "product.update"
        )
      ) {
        return errorResponse(
          "Bạn không có quyền cập nhật sản phẩm",
          403
        );
      }
  
      await connectDB();
  
      const { id } = await params;
  
      const product =
        await Product.findById(id);
  
      if (!product) {
        return errorResponse(
          "Sản phẩm không tồn tại",
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
        updateProductSchema.safeParse(body);
  
      if (!parsedBody.success) {
        return errorResponse(
          parsedBody.error.issues[0]?.message ??
            "Dữ liệu không hợp lệ",
          400
        );
      }
  
      const data = parsedBody.data;
  
      const existedCode =
        await Product.findOne({
          code: (data.code ?? "").toUpperCase(),
          _id: { $ne: id },
        });
  
      if (existedCode) {
        return errorResponse(
          "Mã sản phẩm đã tồn tại",
          400
        );
      }
  
      const existedName =
        await Product.findOne({
          name: data.name,
          _id: { $ne: id },
        });
  
      if (existedName) {
        return errorResponse(
          "Tên sản phẩm đã tồn tại",
          400
        );
      }
  
      const category =
        await Category.findOne({
          code: data.categoryCode.toUpperCase(),
        });
  
      if (!category) {
        return errorResponse(
          "Danh mục không tồn tại",
          400
        );
      }
  
      await Product.updateOne(
        { _id: id },
        {
          code: (data.code ?? "").toUpperCase(),

          name: data.name,
  
          categoryId: category._id,
  
          image: data.image,
  
          description: data.description,
  
          isActive: data.isActive,
        }
      );
  
      const updatedProduct =
        await Product.findById(id)
          .populate({
            path: "categoryId",
            select: "code name",
          })
          .lean();
  
      return success(
        mapProduct(updatedProduct),
        "Cập nhật sản phẩm thành công"
      );
  
    } catch (error) {
      console.error(
        "Update Product Error:",
        error
      );
  
      return errorResponse(
        "Không thể cập nhật sản phẩm",
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
  
      if (!currentUser.permissions.includes("product.delete")) {
        return errorResponse(
          "Bạn không có quyền xóa sản phẩm",
          403
        );
      }
  
      await connectDB();
  
      const { id } = await params;
  
      const product = await Product.findById(id);
  
      if (!product) {
        return errorResponse(
          "Sản phẩm không tồn tại",
          404
        );
      }
  
      // Sau này sẽ kiểm tra ProductVariant tại đây
      // Nếu còn Variant thì không cho xóa
  
      if (!product.isActive) {
        return errorResponse(
          "Sản phẩm đã được xóa trước đó",
          400
        );
      }
  
      product.isActive = false;
  
      await product.save();
  
      return success(
        null,
        "Xóa sản phẩm thành công"
      );
  
    } catch (error) {
      console.error(
        "Delete Product Error:",
        error
      );
  
      return errorResponse(
        "Không thể xóa sản phẩm",
        500
      );
    }
  }