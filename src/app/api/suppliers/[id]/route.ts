import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Supplier from "@/models/Supplier";
import Area from "@/models/Area";

import {
  mapSupplier,
} from "@/mappers/supplier.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  updateSupplierSchema,
} from "@/utils/validator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "supplier.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem nhà cung cấp",
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

    const supplier = await Supplier.findById(id)
      .populate("areaId", "_id code name")
      .lean();

    if (!supplier) {
      return errorResponse(
        "Nhà cung cấp không tồn tại",
        404
      );
    }

    return success(mapSupplier(supplier));

  } catch (error) {
    console.error(
      "Supplier Detail Error:",
      error
    );

    return errorResponse(
      "Không thể lấy nhà cung cấp",
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
        "supplier.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật nhà cung cấp",
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

    const existedSupplier =
      await Supplier.findById(id);

    if (!existedSupplier) {
      return errorResponse(
        "Nhà cung cấp không tồn tại",
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
      updateSupplierSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedCode = await Supplier.findOne({
      code: data.code.toUpperCase(),
      _id: { $ne: id },
    });

    if (existedCode) {
      return errorResponse(
        "Mã nhà cung cấp đã tồn tại",
        400
      );
    }

    const existedPhone = await Supplier.findOne({
      phone: data.phone,
      _id: { $ne: id },
    });

    if (existedPhone) {
      return errorResponse(
        "Số điện thoại đã tồn tại",
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
        400
      );
    }

    await Supplier.updateOne(
      { _id: id },
      {
        $set: {
          code: data.code.toUpperCase(),
          name: data.name,
          phone: data.phone,
          email: data.email ?? "",
          contactPerson: data.contactPerson ?? "",
          address: data.address ?? "",
          areaId: data.areaId,
          note: data.note ?? "",
          isActive: data.isActive,
        },
      }
    );

    const updatedSupplier = await Supplier.findById(id)
      .populate("areaId", "_id code name")
      .lean();

    return success(
      mapSupplier(updatedSupplier!),
      "Cập nhật nhà cung cấp thành công"
    );

  } catch (error) {
    console.error(
      "Update Supplier Error:",
      error
    );

    return errorResponse(
      "Không thể cập nhật nhà cung cấp",
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
        "supplier.delete"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xóa nhà cung cấp",
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

    const supplier = await Supplier.findById(id);

    if (!supplier) {
      return errorResponse(
        "Nhà cung cấp không tồn tại",
        404
      );
    }

    await Supplier.deleteOne({ _id: id });

    return success(
      null,
      "Xóa nhà cung cấp thành công"
    );

  } catch (error) {
    console.error(
      "Delete Supplier Error:",
      error
    );

    return errorResponse(
      "Không thể xóa nhà cung cấp",
      500
    );
  }
}
