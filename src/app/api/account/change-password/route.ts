import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { writeAccountAudit } from "@/lib/account-audit";
import { comparePassword, hashPassword } from "@/utils/bcrypt";
import { error as errorResponse, success } from "@/utils/response";
import { changeMyPasswordSchema } from "@/validators/account.validator";
import Employee from "@/models/Employee";
import { hasAccountPermission } from "@/lib/account-scope";

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!hasAccountPermission(currentUser, "self-account.changePassword")) {
      return errorResponse("Bạn không có quyền đổi mật khẩu", 403);
    }
    const parsed = changeMyPasswordSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorResponse("Dữ liệu mật khẩu không hợp lệ", 400);
    await connectDB();
    const employee = await Employee.findById(currentUser.employee._id).select("+password");
    if (!employee || !(await comparePassword(parsed.data.currentPassword, employee.password))) return errorResponse("Mật khẩu hiện tại không đúng", 400);
    employee.password = await hashPassword(parsed.data.newPassword);
    await employee.save();
    await writeAccountAudit({ actorId: employee._id, targetId: employee._id, action: "CHANGE_PASSWORD", request });
    return success(null, "Đổi mật khẩu thành công");
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    return errorResponse("Không thể đổi mật khẩu", 500);
  }
}