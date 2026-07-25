import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { updateRoleSchema } from "@/utils/validator";

import Role from "@/models/Role";

import { mapRole } from "@/mappers/role.mapper";
import { error as errorResponse, success } from "@/utils/response";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("role.view")) {
            return errorResponse(
                "Bạn không có quyền xem vai trò",
                403
            );
        }

        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(
                "ID vai trò không hợp lệ",
                400
            );
        }

        const role = await Role.findById(id).lean();

        if (!role) {
            return errorResponse(
                "Không tìm thấy vai trò",
                404
            );
        }

        return success(mapRole(role));

    } catch (error) {
        console.error("Role Detail Error:", error);

        return errorResponse(
            "Không thể lấy thông tin vai trò",
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

        if (!currentUser.permissions.includes("role.update")) {
            return errorResponse(
                "Bạn không có quyền cập nhật vai trò",
                403
            );
        }

        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(
                "ID vai trò không hợp lệ",
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
            updateRoleSchema.safeParse(body);

        if (!parsedBody.success) {
            return errorResponse(
                parsedBody.error.issues[0]?.message ??
                "Dữ liệu không hợp lệ",
                400
            );
        }

        const data = parsedBody.data;

        const role = await Role.findById(id);

        if (!role) {
            return errorResponse(
                "Không tìm thấy vai trò",
                404
            );
        }

        const existedCode = await Role.findOne({
            code: data.code.toUpperCase(),
            _id: { $ne: id },
          });
          
          if (existedCode) {
            return errorResponse(
              "Mã vai trò đã tồn tại",
              400
            );
          }

          const existedName = await Role.findOne({
            name: data.name,
            _id: { $ne: id },
          });
          
          if (existedName) {
            return errorResponse(
              "Tên vai trò đã tồn tại",
              400
            );
          }

          role.code = data.code.toUpperCase();
          role.name = data.name;
          role.description = data.description ?? "";
          role.isActive = data.isActive;
          
          await role.save();
          
          return success(
            mapRole(role.toObject()),
            "Cập nhật vai trò thành công"
          );

    } catch (error) {
        console.error("Update Role Error:", error);

        return errorResponse(
            "Không thể cập nhật vai trò",
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
  
      if (!currentUser.permissions.includes("role.delete")) {
        return errorResponse(
          "Bạn không có quyền xóa vai trò",
          403
        );
      }
  
      await connectDB();
  
      const { id } = await params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(
          "ID vai trò không hợp lệ",
          400
        );
      }
  
      const role = await Role.findById(id);
  
      if (!role) {
        return errorResponse(
          "Không tìm thấy vai trò",
          404
        );
      }
  
      role.isActive = false;
  
      await role.save();
  
      return success(
        null,
        "Xóa vai trò thành công"
      );
  
    } catch (error) {
      console.error("Delete Role Error:", error);
  
      return errorResponse(
        "Không thể xóa vai trò",
        500
      );
    }
  }