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

/**
 * Tạo mã sản phẩm tự động dựa trên tên sản phẩm.
 * Format: 2 ký tự đầu của tên (viết hoa) + số thứ tự 3 chữ số.
 * Ví dụ: "Bánh Oreo" -> "BO001", "BO002", ...
 */
async function generateProductCode(productName: string): Promise<string> {
  // Lấy 2 ký tự đầu của tên, viết hoa, loại bỏ ký tự đặc biệt
  const prefix = productName
    .replace(/[^a-zA-ZÀ-ỹ]/g, "")
    .substring(0, 2)
    .toUpperCase();

  if (!prefix || prefix.length < 2) {
    // Fallback: SP + số
    const spPrefix = "SP";
    const existingCodes = await Product.find({ code: { $regex: `^${spPrefix}` } })
      .select("code")
      .sort({ code: -1 })
      .limit(1)
      .lean();

    if (existingCodes.length === 0) {
      return `${spPrefix}001`;
    }

    const lastCode = existingCodes[0].code;
    const match = lastCode.match(/^SP(\d+)$/);
    const nextNumber = match ? parseInt(match[1], 10) + 1 : 1;
    return `${spPrefix}${nextNumber.toString().padStart(3, "0")}`;
  }

  // Tìm các mã có prefix này
  const existingCodes = await Product.find({ code: { $regex: `^${prefix}` } })
    .select("code")
    .sort({ code: -1 })
    .limit(1)
    .lean();

  if (existingCodes.length === 0) {
    return `${prefix}001`;
  }

  // Trích số từ mã cuối cùng
  const lastCode = existingCodes[0].code;
  const match = lastCode.match(/^([A-Z]+)(\d+)$/);
  if (match) {
    const nextNumber = parseInt(match[2], 10) + 1;
    return `${prefix}${nextNumber.toString().padStart(3, "0")}`;
  }

  return `${prefix}001`;
}

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

      // Build query: ADMIN sees all products, others see only their accountId products
      const query: Record<string, unknown> = { isActive: true };
      if (currentUser.role !== "ADMIN") {
        query.accountId = currentUser.accountId ?? null;
      }

      const products = await Product.find(query)
        .sort({
          code: 1,
        })
        .populate({
          path: "categoryId",
          select: "code name accountId",
        })
        .lean();

      // Filter categories by accountId if not admin
      const filteredProducts = currentUser.role !== "ADMIN"
        ? products.filter(p => {
            const cat = p.categoryId as unknown as { accountId?: string } | null;
            return !cat || !cat.accountId || cat.accountId === String(currentUser.accountId);
          })
        : products;

      return success({
        items: filteredProducts.map(mapProductList),
        total: filteredProducts.length,
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

      // Tạo mã sản phẩm tự động nếu không được cung cấp
      let productCode = data.code?.trim() || "";
      if (!productCode) {
        productCode = await generateProductCode(data.name);
      } else {
        // Nếu có mã, kiểm tra trùng lặp
        productCode = productCode.toUpperCase();
        const existedCode = await Product.exists({
          code: productCode,
        });

        if (existedCode) {
          return errorResponse(
            "Mã sản phẩm đã tồn tại",
            400
          );
        }
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
        code: productCode,

        name: data.name,

        categoryId: category._id,

        image: data.image,

        description: data.description,

        accountId: currentUser.accountId,
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