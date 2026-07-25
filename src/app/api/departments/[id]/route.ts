import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Department from "@/models/Department";

import { mapDepartment } from "@/mappers/department.mapper";

import {
  updateDepartmentSchema,
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
  
      if (!currentUser.permissions.includes("department.view")) {
        return errorResponse(
          "Bạn không có quyền xem phòng ban",
          403
        );
      }
  
      await connectDB();
  
      const { id } = await params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(
          "ID phòng ban không hợp lệ",
          400
        );
      }
  
      const department = await Department.findById(id).lean();
  
      if (!department) {
        return errorResponse(
          "Không tìm thấy phòng ban",
          404
        );
      }
  
      return success(
        mapDepartment(department)
      );
  
    } catch (error) {
      console.error(
        "Department Detail Error:",
        error
      );
  
      return errorResponse(
        "Không thể lấy phòng ban",
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
  
      if (!currentUser.permissions.includes("department.update")) {
        return errorResponse(
          "Bạn không có quyền cập nhật phòng ban",
          403
        );
      }
  
      await connectDB();
  
      const { id } = await params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(
          "ID phòng ban không hợp lệ",
          400
        );
      }
  
      let body: unknown;
  
      try {
        body = await request.json();
      } catch {
        return errorResponse("Dữ liệu không hợp lệ", 400);
      }
  
      const parsedBody = updateDepartmentSchema.safeParse(body);
  
      if (!parsedBody.success) {
        return errorResponse(
          parsedBody.error.issues[0]?.message ??
            "Dữ liệu không hợp lệ",
          400
        );
      }
  
      const data = parsedBody.data;
  
      const department = await Department.findById(id);
  
      if (!department) {
        return errorResponse(
          "Không tìm thấy phòng ban",
          404
        );
      }
  
      const existedCode = await Department.findOne({
        code: data.code.toUpperCase(),
        _id: { $ne: id },
      });
  
      if (existedCode) {
        return errorResponse(
          "Mã phòng ban đã tồn tại",
          400
        );
      }
  
      const existedName = await Department.findOne({
        name: data.name,
        _id: { $ne: id },
      });
  
      if (existedName) {
        return errorResponse(
          "Tên phòng ban đã tồn tại",
          400
        );
      }
  
      department.code = data.code.toUpperCase();
      department.name = data.name;
      department.isActive = data.isActive;
  
      await department.save();
  
      return success(
        mapDepartment(department),
        "Cập nhật phòng ban thành công"
      );
  
    } catch (error) {
      console.error(
        "Update Department Error:",
        error
      );
  
      return errorResponse(
        "Không thể cập nhật phòng ban",
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
          "department.delete"
        )
      ) {
        return errorResponse(
          "Bạn không có quyền xóa phòng ban",
          403
        );
      }
  
      await connectDB();
  
      const { id } = await params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(
          "ID phòng ban không hợp lệ",
          400
        );
      }
  
      const department = await Department.findById(id);
  
      if (!department) {
        return errorResponse(
          "Không tìm thấy phòng ban",
          404
        );
      }
  
      department.isActive = false;
  
      await department.save();
  
      return success(
        null,
        "Xóa phòng ban thành công"
      );
  
    } catch (error) {
      console.error(
        "Delete Department Error:",
        error
      );
  
      return errorResponse(
        "Không thể xóa phòng ban",
        500
      );
    }
  }