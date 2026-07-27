import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Warehouse from "@/models/Warehouse";
import Area from "@/models/Area";
import Employee from "@/models/Employee";

import {
  mapWarehouse,
  mapWarehouseList,
} from "@/mappers/warehouse.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  createWarehouseSchema,
} from "@/utils/validator";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "warehouse.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem kho",
        403
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search") ?? "";
    const areaId = searchParams.get("areaId") ?? "";
    const managerId = searchParams.get("managerId") ?? "";
    const isActive = searchParams.get("isActive");

    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    if (areaId) {
      filter.areaId = areaId;
    }

    if (managerId) {
      filter.managerId = managerId;
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Warehouse.find(filter)
        .populate("areaId", "_id code name")
        .populate("managerId", "_id employeeCode fullName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Warehouse.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapWarehouseList),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Warehouse List Error:", error);

    return errorResponse(
      "Không thể lấy danh sách kho",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "warehouse.create"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền tạo kho",
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
      createWarehouseSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedCode = await Warehouse.exists({
      code: data.code.toUpperCase(),
    });

    if (existedCode) {
      return errorResponse(
        "Mã kho đã tồn tại",
        400
      );
    }

    if (!mongoose.Types.ObjectId.isValid(data.areaId)) {
      return errorResponse(
        "ID khu vực không hợp lệ",
        400
      );
    }

    const existedArea = await Area.exists({
      _id: data.areaId,
    });

    if (!existedArea) {
      return errorResponse(
        "Khu vực không tồn tại",
        404
      );
    }

    if (data.managerId != null) {
      if (!mongoose.Types.ObjectId.isValid(data.managerId)) {
        return errorResponse(
          "ID người quản lý không hợp lệ",
          400
        );
      }

      const existedManager = await Employee.exists({
        _id: data.managerId,
      });

      if (!existedManager) {
        return errorResponse(
          "Người quản lý không tồn tại",
          404
        );
      }
    }

    const warehouse = await Warehouse.create({
      code: data.code.toUpperCase(),
      name: data.name,
      areaId: data.areaId,
      address: data.address ?? "",
      managerId: data.managerId ?? null,
      note: data.note ?? "",
    });

    const populatedWarehouse = await Warehouse.findById(
      warehouse._id
    )
      .populate("areaId", "_id code name")
      .populate("managerId", "_id employeeCode fullName")
      .lean();

    return success(
      mapWarehouse(populatedWarehouse!),
      "Tạo kho thành công"
    );
  } catch (error) {
    console.error("Create Warehouse Error:", error);

    return errorResponse(
      "Không thể tạo kho",
      500
    );
  }
}
