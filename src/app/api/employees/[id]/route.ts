import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { mapEmployeeDetail } from "@/mappers/employee.mapper";

import Employee from "@/models/Employee";
import Role from "@/models/Role";
import Team from "@/models/Team";
import "@/models/Role";
import "@/models/Team";
import mongoose from "mongoose";

import { updateEmployeeSchema } from "@/utils/validator";
import { error as errorResponse, success } from "@/utils/response";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("employee.view")) {
            return errorResponse(
                "Bạn không có quyền xem nhân viên",
                403
            );
        }
        if (currentUser.role.code === "LEADER" || currentUser.role.code === "EMPLOYEE") {
            return errorResponse("Hãy sử dụng API quản lý tài khoản theo phạm vi", 403);
        }

        await connectDB();

        const { id } = await params;

        const employee = await Employee.findById(id)
            .populate({
                path: "roleId",
                select: "code name",
            })
            .populate({
                path: "teamId",
                select: "code name",
            })
            .select("-password")
            .lean();

        if (!employee) {
            return errorResponse(
                "Không tìm thấy nhân viên",
                404
            );
        }

        return success(mapEmployeeDetail(employee));
    } catch (error) {
        console.error("Employee Detail Error:", error);

        return errorResponse(
            "Không thể lấy thông tin nhân viên",
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

        if (!currentUser.permissions.includes("employee.update")) {
            return errorResponse(
                "Bạn không có quyền cập nhật nhân viên",
                403
            );
        }
        if (currentUser.role.code === "LEADER" || currentUser.role.code === "EMPLOYEE") {
            return errorResponse("Hãy sử dụng API quản lý tài khoản theo phạm vi", 403);
        }

        await connectDB();

        const { id } = await params;

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return errorResponse("Dữ liệu không hợp lệ", 400);
        }

        const parsedBody = updateEmployeeSchema.safeParse(body);

        if (!parsedBody.success) {
            return errorResponse(
                parsedBody.error.issues[0]?.message ??
                "Dữ liệu không hợp lệ",
                400
            );
        }

        const data = parsedBody.data;

        const employee = await Employee.findById(id);

        if (!employee) {
            return errorResponse(
                "Không tìm thấy nhân viên",
                404
            );
        }
        const existedUsername = await Employee.findOne({
            username: data.username.toLowerCase(),
            _id: { $ne: id },
        });

        if (existedUsername) {
            return errorResponse(
                "Tên đăng nhập đã tồn tại",
                400
            );
        }
        const existedEmail = await Employee.findOne({
            email: data.email.toLowerCase(),
            _id: { $ne: id },
        });

        if (existedEmail) {
            return errorResponse(
                "Email đã tồn tại",
                400
            );
        }
        const role = await Role.findOne({
            code: data.roleCode.toUpperCase(),
        });

        if (!role) {
            return errorResponse(
                "Vai trò không tồn tại",
                400
            );
        }
        let team = null;

        if (data.teamCode) {
            team = await Team.findOne({
                code: data.teamCode.toUpperCase(),
            });

            if (!team) {
                return errorResponse(
                    "Nhóm không tồn tại",
                    400
                );
            }
        }
        employee.username = data.username.toLowerCase();

        employee.fullName = data.fullName;

        employee.email = data.email.toLowerCase();

        employee.phone = data.phone ?? "";

        employee.avatar = data.avatar ?? "";

        employee.roleId = role._id;

        employee.teamId = team?._id ?? null;

        employee.bankName = data.bankName ?? "";

        employee.bankAccountNumber =
            data.bankAccountNumber ?? "";

        employee.bankAccountHolder =
            data.bankAccountHolder ?? "";

        employee.isActive = data.isActive;
        await employee.save();
        const updatedEmployee = await Employee.findById(employee._id)
            .populate({
                path: "roleId",
                select: "code name",
            })
            .populate({
                path: "teamId",
                select: "code name",
            })
            .select("-password")
            .lean();
        return success(
            mapEmployeeDetail(updatedEmployee),
            "Cập nhật nhân viên thành công"
        );

    } catch (error) {
        console.error("Update Employee Error:", error);

        return errorResponse(
            "Không thể cập nhật nhân viên",
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

        if (!currentUser.permissions.includes("employee.delete")) {
            return errorResponse(
                "Bạn không có quyền xóa nhân viên",
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
        if (!employee.isActive) {
            return errorResponse(
                "Nhân viên đã bị vô hiệu hóa",
                400
            );
        }

        employee.isActive = false;
        await employee.save();

        return success(null, "Xóa nhân viên thành công");

    } catch (error) {
        console.error("Delete Employee Error:", error);

        return errorResponse(
            "Không thể xóa nhân viên",
            500
        );
    }
}