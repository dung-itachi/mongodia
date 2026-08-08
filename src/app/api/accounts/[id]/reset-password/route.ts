import mongoose from "mongoose";

import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { canManageAccount, hasAccountPermission } from "@/lib/account-scope";
import { writeAccountAudit } from "@/lib/account-audit";
import { hashPassword } from "@/utils/bcrypt";
import { error as errorResponse, success } from "@/utils/response";
import { resetAccountPasswordSchema } from "@/validators/account.validator";
import Employee from "@/models/Employee";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!hasAccountPermission(currentUser, "account.resetPassword")) return errorResponse("Bạn không có quyền đặt lại mật khẩu", 403);
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return errorResponse("ID tài khoản không hợp lệ", 400);
    const target = await Employee.findById(id).populate({ path: "roleId", select: "code" });
    if (!target) return errorResponse("Không tìm thấy tài khoản", 404);
    if (!(await canManageAccount(currentUser, target))) return errorResponse("Tài khoản nằm ngoài phạm vi quản lý", 403);
    const parsed = resetAccountPasswordSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorResponse("Mật khẩu mới không hợp lệ", 400);
    target.password = await hashPassword(parsed.data.newPassword);
    await target.save();
    await writeAccountAudit({ actorId: currentUser.employee._id, targetId: target._id, action: "RESET_PASSWORD", request });
    return success(null, "Đặt lại mật khẩu thành công");
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    console.error("Account reset password error:", error);
    return errorResponse("Không thể đặt lại mật khẩu", 500);
  }
}
