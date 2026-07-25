import { getCurrentUser } from "@/lib/auth";
import { error as errorResponse, success } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    return success({
      _id: currentUser.employee._id.toString(),
      employeeCode: currentUser.employee.employeeCode,
      username: currentUser.employee.username,
      fullName: currentUser.employee.fullName,
      email: currentUser.employee.email,
      avatar: currentUser.employee.avatar,
      role: currentUser.role.code,
      permissions: currentUser.permissions,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "UNAUTHORIZED":
          return errorResponse("Chưa đăng nhập", 401);

        case "USER_NOT_FOUND":
          return errorResponse("Không tìm thấy người dùng", 404);

        case "ROLE_NOT_FOUND":
          return errorResponse("Vai trò không hợp lệ", 403);
      }
    }

    console.error(error);

    return errorResponse("Không thể lấy thông tin người dùng", 500);
  }
}