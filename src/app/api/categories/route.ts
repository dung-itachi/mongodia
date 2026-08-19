import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Category from "@/models/Category";

import {
  mapCategoryList,
} from "@/mappers/category.mapper";

import {
  error as errorResponse,
  success,
} from "@/utils/response";

import {
    createCategorySchema,
  } from "@/utils/validator";
  
  import {
    mapCategory,
  } from "@/mappers/category.mapper";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "category.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem danh mục",
        403
      );
    }

    await connectDB();

    // Build query: ADMIN sees all categories, others see only their accountId categories
    const query: Record<string, unknown> = { isActive: true };
    if (currentUser.role !== "ADMIN") {
      query.accountId = currentUser.accountId ?? null;
    }

    const categories = await Category.find(query)
      .sort({
        sortOrder: 1,
        code: 1,
      })
      .lean();

    return success({
      items: categories.map(mapCategoryList),
      total: categories.length,
    });

  } catch (error) {
    console.error(
      "Category List Error:",
      error
    );

    return errorResponse(
      "Không thể lấy danh sách danh mục",
      500
    );
  }
}

export async function POST(request: Request) {
    try {
      const currentUser = await getCurrentUser(request);
  
      if (
        !currentUser.permissions.includes(
          "category.create"
        )
      ) {
        return errorResponse(
          "Bạn không có quyền tạo danh mục",
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
        createCategorySchema.safeParse(body);
  
      if (!parsedBody.success) {
        return errorResponse(
          parsedBody.error.issues[0]?.message ??
            "Dữ liệu không hợp lệ",
          400
        );
      }
  
      const data = parsedBody.data;
  
      const existedCode =
        await Category.exists({
          code: data.code.toUpperCase(),
        });
  
      if (existedCode) {
        return errorResponse(
          "Mã danh mục đã tồn tại",
          400
        );
      }
  
      const existedName =
        await Category.exists({
          name: data.name,
        });
  
      if (existedName) {
        return errorResponse(
          "Tên danh mục đã tồn tại",
          400
        );
      }
  
      let parent = null;
  
      if (data.parentCode) {
        parent = await Category.findOne({
          code: data.parentCode.toUpperCase(),
        });
  
        if (!parent) {
          return errorResponse(
            "Danh mục cha không tồn tại",
            400
          );
        }
      }
  
      const category =
        await Category.create({
          code: data.code.toUpperCase(),
          name: data.name,
          parentId: parent?._id ?? null,
          description: data.description ?? "",
          sortOrder: data.sortOrder,
          accountId: currentUser.accountId,
        });
  
      const createdCategory =
        await Category.findById(category._id)
          .populate({
            path: "parentId",
            select: "code name",
          })
          .lean();
  
      return success(
        mapCategory(createdCategory!),
        "Tạo danh mục thành công"
      );
  
    } catch (error) {
      console.error(
        "Create Category Error:",
        error
      );
  
      return errorResponse(
        "Không thể tạo danh mục",
        500
      );
    }
  }