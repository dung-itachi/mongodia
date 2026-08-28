import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Category from "@/models/Category";

import {
  mapCategory,
} from "@/mappers/category.mapper";

import {
  createCategorySchema,
  updateCategorySchema,
} from "@/utils/validator";

import {
  error as errorResponse,
  success,
} from "@/utils/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes("category.view") &&
      !currentUser.permissions.includes("product.view")
    ) {
      return errorResponse(
        "Bạn không có quyền xem danh mục",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    const category = await Category.findById(id)
      .populate({
        path: "parentId",
        select: "code name",
      })
      .lean();

    if (!category) {
      return errorResponse(
        "Không tìm thấy danh mục",
        404
      );
    }

    return success(mapCategory(category));

  } catch (error) {
    console.error(
      "Category Detail Error:",
      error
    );

    return errorResponse(
      "Không thể lấy thông tin danh mục",
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
        "category.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật danh mục",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    const category = await Category.findById(id);

    if (!category) {
      return errorResponse(
        "Không tìm thấy danh mục",
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
      updateCategorySchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedCode =
      await Category.findOne({
        code: data.code.toUpperCase(),
        _id: { $ne: id },
      });

    if (existedCode) {
      return errorResponse(
        "Mã danh mục đã tồn tại",
        400
      );
    }

    const existedName =
      await Category.findOne({
        name: data.name,
        _id: { $ne: id },
      });

    if (existedName) {
      return errorResponse(
        "Tên danh mục đã tồn tại",
        400
      );
    }

    await Category.findByIdAndUpdate(id, {
      code: data.code.toUpperCase(),

      name: data.name,

      description:
        data.description ?? "",

      sortOrder: data.sortOrder,

      isActive: data.isActive,

      parentId: null,
    });

    const updatedCategory =
      await Category.findById(id)
        .populate({
          path: "parentId",
          select: "code name",
        })
        .lean();

    return success(
      mapCategory(updatedCategory!),
      "Cập nhật danh mục thành công"
    );

  } catch (error) {
    console.error(
      "Update Category Error:",
      error
    );

    return errorResponse(
      "Không thể cập nhật danh mục",
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
        "category.delete"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xóa danh mục",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    const category =
      await Category.findById(id);

    if (!category) {
      return errorResponse(
        "Không tìm thấy danh mục",
        404
      );
    }

    if (!category.isActive) {
      return errorResponse(
        "Danh mục đã bị xóa",
        400
      );
    }

    category.isActive = false;

    await category.save();

    return success(
      null,
      "Xóa danh mục thành công"
    );

  } catch (error) {
    console.error(
      "Delete Category Error:",
      error
    );

    return errorResponse(
      "Không thể xóa danh mục",
      500
    );
  }
}