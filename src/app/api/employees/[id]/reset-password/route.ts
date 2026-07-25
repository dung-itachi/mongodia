import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Employee from "@/models/Employee";

import { hashPassword } from "@/utils/bcrypt";
import { error as errorResponse, success } from "@/utils/response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("employee.update")) {
      return errorResponse(
        "Bạn không có quyền đặt lại mật khẩu",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID nhân viên không hợp lệ",
        400
      );
    }

    const employee = await Employee.findById(id);

    if (!employee) {
      return errorResponse(
        "Không tìm thấy nhân viên",
        404
      );
    }

    const body = await request.json();

    if (
      typeof body.newPassword !== "string" ||
      body.newPassword.trim().length < 6
    ) {
      return errorResponse(
        "Mật khẩu tối thiểu 6 ký tự",
        400
      );
    }

    const hashedPassword = await hashPassword(
      body.newPassword
    );

    employee.password = hashedPassword;

    await employee.save();

    return success(
      null,
      "Đặt lại mật khẩu thành công"
    );

  } catch (error) {
    console.error("Reset Password Error:", error);

    return errorResponse(
      "Không thể đặt lại mật khẩu",
      500
    );
  }
}