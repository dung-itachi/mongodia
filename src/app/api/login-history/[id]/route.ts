import mongoose from "mongoose";

import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { error as errorResponse, success } from "@/utils/response";
import LoginHistory from "@/models/LoginHistory";

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    await connectDB();

    const params = new URL(request.url).searchParams;
    const loginId = params.get("id");

    if (!loginId || !mongoose.isValidObjectId(loginId)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const body = await request.json().catch(() => ({}));
    const { isTrusted } = body;

    // Find the login history
    const loginHistory = await LoginHistory.findById(loginId);

    if (!loginHistory) {
      return errorResponse("Không tìm thấy lịch sử đăng nhập", 404);
    }

    // Users can only confirm their own login history
    // Admins can confirm any
    const hasViewAll =
      currentUser.permissions.includes("*") ||
      currentUser.permissions.includes("login-history.viewAll");

    if (!hasViewAll && loginHistory.employeeId.toString() !== currentUser.employee._id.toString()) {
      return errorResponse("Bạn không có quyền xác nhận lịch sử này", 403);
    }

    // Update the login history
    loginHistory.isTrusted = isTrusted ?? true;
    await loginHistory.save();

    return success({
      message: isTrusted ? "Đã xác nhận đăng nhập tin cậy" : "Đã bỏ xác nhận",
      item: {
        _id: loginHistory._id.toString(),
        isTrusted: loginHistory.isTrusted,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return errorResponse(err.message, 401);
    }
    console.error("LoginHistory PUT error:", err);
    return errorResponse("Không thể cập nhật lịch sử đăng nhập", 500);
  }
}
