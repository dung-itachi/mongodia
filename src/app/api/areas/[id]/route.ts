import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Area from "@/models/Area";

import { mapArea } from "@/mappers/area.mapper";

import {
  updateAreaSchema,
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

    if (!currentUser.permissions.includes("area.view")) {
      return errorResponse(
        "Bạn không có quyền xem khu vực",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID khu vực không hợp lệ",
        400
      );
    }

    const area = await Area.findById(id).lean();

    if (!area) {
      return errorResponse(
        "Không tìm thấy khu vực",
        404
      );
    }

    return success(mapArea(area));

  } catch (error) {
    console.error("Area Detail Error:", error);

    return errorResponse(
      "Không thể lấy thông tin khu vực",
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

    if (!currentUser.permissions.includes("area.update")) {
      return errorResponse(
        "Bạn không có quyền cập nhật khu vực",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID khu vực không hợp lệ",
        400
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
      updateAreaSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const area = await Area.findById(id);

    if (!area) {
      return errorResponse(
        "Không tìm thấy khu vực",
        404
      );
    }

    const existedCode = await Area.findOne({
      code: data.code.toUpperCase(),
      _id: { $ne: id },
    });

    if (existedCode) {
      return errorResponse(
        "Mã khu vực đã tồn tại",
        400
      );
    }

    const existedName = await Area.findOne({
      name: data.name,
      _id: { $ne: id },
    });

    if (existedName) {
      return errorResponse(
        "Tên khu vực đã tồn tại",
        400
      );
    }

    area.code = data.code.toUpperCase();
    area.name = data.name;
    area.address = data.address ?? "";
    area.countryCode =
      data.countryCode.toUpperCase();
    area.isActive = data.isActive;

    await area.save();

    return success(
      mapArea(area),
      "Cập nhật khu vực thành công"
    );

  } catch (error) {
    console.error("Update Area Error:", error);

    return errorResponse(
      "Không thể cập nhật khu vực",
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

    if (!currentUser.permissions.includes("area.delete")) {
      return errorResponse(
        "Bạn không có quyền xóa khu vực",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID khu vực không hợp lệ",
        400
      );
    }

    const area = await Area.findById(id);

    if (!area) {
      return errorResponse(
        "Không tìm thấy khu vực",
        404
      );
    }

    area.isActive = false;

    await area.save();

    return success(
      null,
      "Xóa khu vực thành công"
    );

  } catch (error) {
    console.error("Delete Area Error:", error);

    return errorResponse(
      "Không thể xóa khu vực",
      500
    );
  }
}