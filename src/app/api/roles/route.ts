import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import {
    mapRole,
    mapRoleList,
  } from "@/mappers/role.mapper";
import { createRoleSchema } from "@/utils/validator";

import Role from "@/models/Role";

import { error as errorResponse, success } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("role.view")) {
      return errorResponse(
        "Bạn không có quyền xem vai trò",
        403
      );
    }

    await connectDB();

    const roles = await Role.find({
        isActive: true,
      })
        .sort({
          name: 1,
        })
        .select("code name description isActive")
        .lean();
      
        const items = mapRoleList(roles);

        return success({
          items,
          total: items.length,
        });

  } catch (error) {
    console.error("Roles API Error:", error);

    return errorResponse(
      "Không thể lấy danh sách vai trò",
      500
    );
  }
}

export async function POST(request: Request) {
    try {
      const currentUser = await getCurrentUser(request);
  
      if (!currentUser.permissions.includes("role.create")) {
        return errorResponse(
          "Bạn không có quyền tạo vai trò",
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
        createRoleSchema.safeParse(body);
  
      if (!parsedBody.success) {
        return errorResponse(
          parsedBody.error.issues[0]?.message ??
            "Dữ liệu không hợp lệ",
          400
        );
      }
  
      const data = parsedBody.data;

      const existedCode = await Role.exists({
        code: data.code.toUpperCase(),
      });
      
      if (existedCode) {
        return errorResponse(
          "Mã vai trò đã tồn tại",
          400
        );
      }

      const existedName = await Role.exists({
        name: data.name,
      });
      
      if (existedName) {
        return errorResponse(
          "Tên vai trò đã tồn tại",
          400
        );
      }

      const role = await Role.create({
        code: data.code.toUpperCase(),
        name: data.name,
        description: data.description ?? "",
      });
  
      return success(
        mapRole(role.toObject()),
        "Tạo vai trò thành công"
      );
  
    } catch (error) {
      console.error("Create Role Error:", error);
  
      return errorResponse(
        "Không thể tạo vai trò",
        500
      );
    }
  }