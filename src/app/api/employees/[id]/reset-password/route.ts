import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Employee from "@/models/Employee";

import { hashPassword } from "@/utils/bcrypt";
import { resetPasswordSchema } from "@/utils/validator";
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
        if (currentUser.role.code === "LEADER" || currentUser.role.code === "EMPLOYEE") {
            return errorResponse("Hãy sử dụng API quản lý tài khoản theo phạm vi", 403);
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
            resetPasswordSchema.safeParse(body);

        if (!parsedBody.success) {
            return errorResponse(
                parsedBody.error.issues[0]?.message ??
                "Dữ liệu không hợp lệ",
                400
            );
        }

        const { newPassword } = parsedBody.data;

        const hashedPassword =
            await hashPassword(newPassword);

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