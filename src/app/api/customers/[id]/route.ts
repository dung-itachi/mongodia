import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Customer from "@/models/Customer";
import Area from "@/models/Area";
import Team from "@/models/Team";
import Employee from "@/models/Employee";
import mongoose from "mongoose";

import {
  mapCustomer,
} from "@/mappers/customer.mapper";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

import {
  updateCustomerSchema,
} from "@/utils/validator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "customer.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem khách hàng",
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

    const customer = await Customer.findById(id)
      .populate("areaId", "_id code name")
      .populate("teamId", "_id code name")
      .populate("employeeId", "_id employeeCode fullName")
      .lean();

    if (!customer) {
      return errorResponse(
        "Khách hàng không tồn tại",
        404
      );
    }

    return success(mapCustomer(customer));

  } catch (error) {
    console.error(
      "Customer Detail Error:",
      error
    );

    return errorResponse(
      "Không thể lấy khách hàng",
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
        "customer.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật khách hàng",
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

    const existedCustomer =
      await Customer.findById(id);

    if (!existedCustomer) {
      return errorResponse(
        "Khách hàng không tồn tại",
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
      updateCustomerSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedCode = await Customer.findOne({
      code: data.code.toUpperCase(),
      _id: { $ne: id },
    });

    if (existedCode) {
      return errorResponse(
        "Mã khách hàng đã tồn tại",
        400
      );
    }

    const existedPhone = await Customer.findOne({
      phone: data.phone,
      _id: { $ne: id },
    });

    if (existedPhone) {
      return errorResponse(
        "Số điện thoại đã tồn tại",
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

    const existedTeam = await Team.exists({
      _id: data.teamId,
    });

    if (!existedTeam) {
      return errorResponse(
        "Nhóm không tồn tại",
        400
      );
    }

    const existedEmployee = await Employee.exists({
      _id: data.employeeId,
    });

    if (!existedEmployee) {
      return errorResponse(
        "Nhân viên không tồn tại",
        400
      );
    }

    await Customer.updateOne(
      { _id: id },
      {
        $set: {
          code: data.code.toUpperCase(),
          name: data.name,
          phone: data.phone,
          email: data.email ?? "",
          gender: data.gender,
          birthday: data.birthday
            ? new Date(data.birthday)
            : null,
          address: data.address ?? "",
          areaId: data.areaId,
          teamId: data.teamId,
          employeeId: data.employeeId,
          note: data.note ?? "",
          isActive: data.isActive,
        },
      }
    );

    const updatedCustomer = await Customer.findById(id)
      .populate("areaId", "_id code name")
      .populate("teamId", "_id code name")
      .populate("employeeId", "_id employeeCode fullName")
      .lean();

    return success(
      mapCustomer(updatedCustomer!),
      "Cập nhật khách hàng thành công"
    );

  } catch (error) {
    console.error(
      "Update Customer Error:",
      error
    );

    return errorResponse(
      "Không thể cập nhật khách hàng",
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
        "customer.delete"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xóa khách hàng",
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

    const customer = await Customer.findById(id);

    if (!customer) {
      return errorResponse(
        "Khách hàng không tồn tại",
        404
      );
    }

    await Customer.deleteOne({ _id: id });

    return success(
      null,
      "Xóa khách hàng thành công"
    );

  } catch (error) {
    console.error(
      "Delete Customer Error:",
      error
    );

    return errorResponse(
      "Không thể xóa khách hàng",
      500
    );
  }
}
