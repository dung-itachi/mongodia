import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import VariantValue from "@/models/VariantValue";
import VariantOption from "@/models/VariantOption";

import {
  mapVariantValue,
  mapVariantValueList,
} from "@/mappers/variant-value.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  createVariantValueSchema,
} from "@/utils/validator";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? "";
    const variantOptionId = searchParams.get("variantOptionId") ?? "";
    const isActive = searchParams.get("isActive");

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    if (variantOptionId) {
      filter.variantOptionId = variantOptionId;
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      VariantValue.find(filter)
        .populate("variantOptionId", "_id code name")
        .sort({
          sortOrder: 1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),
      VariantValue.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapVariantValueList),
      total,
      page,
      limit,
      totalPages: Math.max(
      1,
      Math.ceil(total / limit)
    ),
    });

  } catch (error) {
    console.error(
      "Variant Value List Error:",
      error
    );

    return errorResponse(
      "Không thể lấy danh sách giá trị biến thể",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "variant-value.create"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền tạo giá trị biến thể",
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
      createVariantValueSchema.safeParse(body);

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
      await VariantValue.exists({
        variantOptionId: data.variantOptionId,
        code: data.code.toUpperCase(),
      });

    if (existedCode) {
      return errorResponse(
        "Mã giá trị đã tồn tại trong thuộc tính này",
        400
      );
    }

    const existedName =
      await VariantValue.exists({
        variantOptionId: data.variantOptionId,
        name: data.name,
      });

    if (existedName) {
      return errorResponse(
        "Tên giá trị đã tồn tại trong thuộc tính này",
        400
      );
    }

    const variantValue =
      await VariantValue.create({
        code: data.code.toUpperCase(),
        name: data.name,
        variantOptionId: data.variantOptionId,
        sortOrder: data.sortOrder,
      });

    return success(
      mapVariantValue(variantValue),
      "Tạo giá trị biến thể thành công"
    );

  } catch (error) {
    console.error(
      "Create Variant Value Error:",
      error
    );

    return errorResponse(
      "Không thể tạo giá trị biến thể",
      500
    );
  }
}
