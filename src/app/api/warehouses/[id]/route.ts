import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Warehouse from "@/models/Warehouse";
import Area from "@/models/Area";
import Employee from "@/models/Employee";

import {
  mapWarehouse,
} from "@/mappers/warehouse.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  updateWarehouseSchema,
} from "@/utils/validator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID không hợp lệ",
        400
      );
    }

    const warehouse = await Warehouse.findById(id)
      .populate("areaId", "_id code name")
      .populate("managerId", "_id employeeCode fullName")
      .lean();

    if (!warehouse) {
      return errorResponse(
        "Kho không tồn tại",
        404
      );
    }

    return success(mapWarehouse(warehouse));

  } catch (error) {
    console.error(
      "Warehouse Detail Error:",
      error
    );

    return errorResponse(
      "Không thể lấy kho",
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
        "warehouse.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật kho",
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

    const existedWarehouse =
      await Warehouse.findById(id);

    if (!existedWarehouse) {
      return errorResponse(
        "Kho không tồn tại",
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
      updateWarehouseSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedCode = await Warehouse.findOne({
      code: data.code.toUpperCase(),
      _id: { $ne: id },
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

    await Warehouse.updateOne(
      { _id: id },
      {
        $set: {
          code: data.code.toUpperCase(),
          name: data.name,
          areaId: data.areaId,
          address: data.address ?? "",
          managerId: data.managerId ?? null,
          note: data.note ?? "",
          isActive: data.isActive,
        },
      }
    );

    const updatedWarehouse = await Warehouse.findById(id)
      .populate("areaId", "_id code name")
      .populate("managerId", "_id employeeCode fullName")
      .lean();

    return success(
      mapWarehouse(updatedWarehouse!),
      "Cập nhật kho thành công"
    );

  } catch (error) {
    console.error(
      "Update Warehouse Error:",
      error
    );

    return errorResponse(
      "Không thể cập nhật kho",
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
        "warehouse.delete"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xóa kho",
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

    const warehouse = await Warehouse.findById(id);

    if (!warehouse) {
      return errorResponse(
        "Kho không tồn tại",
        404
      );
    }

    await Warehouse.deleteOne({ _id: id });

    return success(
      null,
      "Xóa kho thành công"
    );

  } catch (error) {
    console.error(
      "Delete Warehouse Error:",
      error
    );

    return errorResponse(
      "Không thể xóa kho",
      500
    );
  }
}
