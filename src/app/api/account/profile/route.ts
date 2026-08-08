import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { writeAccountAudit } from "@/lib/account-audit";
import { error as errorResponse, success } from "@/utils/response";
import { updateMyProfileSchema } from "@/validators/account.validator";
import Employee from "@/models/Employee";
import { hasAccountPermission } from "@/lib/account-scope";

function mapProfile(employee: any, role: any, permissions: string[]) {
  return { _id: employee._id, employeeCode: employee.employeeCode, username: employee.username, fullName: employee.fullName, email: employee.email, phone: employee.phone, avatar: employee.avatar, isActive: employee.isActive, role: { code: role.code, name: role.name }, permissions, createdAt: employee.createdAt, updatedAt: employee.updatedAt };
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!hasAccountPermission(currentUser, "self-account.view")) {
      return errorResponse("Bạn không có quyền xem hồ sơ", 403);
    }
    return success(mapProfile(currentUser.employee, currentUser.role, currentUser.permissions));
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    return errorResponse("Không thể lấy hồ sơ", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!hasAccountPermission(currentUser, "self-account.update")) {
      return errorResponse("Bạn không có quyền cập nhật hồ sơ", 403);
    }
    await connectDB();
    const parsed = updateMyProfileSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorResponse("Dữ liệu hồ sơ không hợp lệ", 400);

    // Reject các field không được phép nếu lỡ client gửi (Zod schema đã strict nhưng
    // đây là lớp bảo vệ thứ 2 để đảm bảo không ai có thể bypass).
    const allowedFields = new Set(["fullName", "email", "phone", "avatar"]);
    const body = parsed.data as Record<string, unknown>;
    for (const key of Object.keys(body)) {
      if (!allowedFields.has(key)) {
        return errorResponse(`Trường '${key}' không được phép cập nhật qua hồ sơ`, 400);
      }
    }

    const duplicateEmail = await Employee.exists({ email: parsed.data.email.toLowerCase(), _id: { $ne: currentUser.employee._id } });
    if (duplicateEmail) return errorResponse("Email đã tồn tại", 400);
    const employee = await Employee.findByIdAndUpdate(currentUser.employee._id, { $set: { ...parsed.data, email: parsed.data.email.toLowerCase() } }, { new: true }).select("-password").lean();
    await writeAccountAudit({ actorId: currentUser.employee._id, targetId: currentUser.employee._id, action: "UPDATE_PROFILE", newData: { fullName: parsed.data.fullName, email: parsed.data.email }, request });
    return success(mapProfile(employee, currentUser.role, currentUser.permissions), "Cập nhật hồ sơ thành công");
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    return errorResponse("Không thể cập nhật hồ sơ", 500);
  }
}