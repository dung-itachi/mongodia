import mongoose from "mongoose";

import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  assertHierarchyValid,
  canManageAccount,
  getAccountScope,
  hasAccountPermission,
} from "@/lib/account-scope";
import { writeAccountAudit } from "@/lib/account-audit";
import { error as errorResponse, success } from "@/utils/response";
import { updateAccountSchema } from "@/validators/account.validator";
import Employee from "@/models/Employee";
import Role from "@/models/Role";
import Team from "@/models/Team";
import Area from "@/models/Area";

const populate = [
  { path: "roleId", select: "code name" },
  { path: "teamId", select: "code name departmentId managerId leaderId areaId", populate: [
    { path: "departmentId", select: "code name" },
    { path: "managerId", select: "employeeCode fullName username" },
    { path: "leaderId", select: "employeeCode fullName username" },
  ] },
  { path: "leaderId", select: "employeeCode fullName username" },
  { path: "areaId", select: "code name" },
];
const map = (employee: any) => ({ ...employee, password: undefined, role: employee.roleId, team: employee.teamId, department: employee.teamId?.departmentId ?? null, leader: employee.leaderId, area: employee.areaId });

async function resolveTarget(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const target = await Employee.findById(id).populate<{ roleId: { code: string } | null }>({ path: "roleId", select: "code" });
  return target as (Awaited<typeof target> & { _id: mongoose.Types.ObjectId; roleId: { code: string } | null }) | null;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!hasAccountPermission(currentUser, "account.view")) return errorResponse("Bạn không có quyền xem tài khoản", 403);
    await connectDB();
    const target = await resolveTarget((await params).id);
    if (!target) return errorResponse("Không tìm thấy tài khoản", 404);
    if (!(await canManageAccount(currentUser, { _id: target._id.toString(), leaderId: target.leaderId?.toString() ?? null, teamId: target.teamId?.toString() ?? null }))) return errorResponse("Tài khoản nằm ngoài phạm vi quản lý", 403);
    const account = await Employee.findById(target._id).populate(populate).select("-password").lean();
    return success(map(account));
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    if (error instanceof Error && error.name === "ForbiddenError") return errorResponse(error.message, 403);
    console.error("Account detail error:", error);
    return errorResponse("Không thể lấy thông tin tài khoản", 500);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!hasAccountPermission(currentUser, "account.update")) return errorResponse("Bạn không có quyền cập nhật tài khoản", 403);
    await connectDB();
    const target = await resolveTarget((await params).id);
    if (!target) return errorResponse("Không tìm thấy tài khoản", 404);
    if (!(await canManageAccount(currentUser, { _id: target._id.toString(), leaderId: target.leaderId?.toString() ?? null, teamId: target.teamId?.toString() ?? null }))) return errorResponse("Tài khoản nằm ngoài phạm vi quản lý", 403);

    const parsed = updateAccountSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorResponse("Dữ liệu cập nhật không hợp lệ", 400);
    const data = parsed.data;
    const scope = getAccountScope(currentUser);
    const oldRoleCode = target.roleId?.code ?? null;
    let newRole = null;
    if (data.roleCode) {
      newRole = await Role.findOne({ code: data.roleCode.toUpperCase(), isActive: true });
      if (!newRole) return errorResponse("Vai trò không tồn tại", 400);

      // Chặn tự nâng thành ADMIN
      if (newRole.code === "ADMIN") return errorResponse("Không thể thăng cấp thành ADMIN", 403);

      // Hierarchy validation cho role mới
      await assertHierarchyValid({
        user: currentUser,
        targetRoleCode: newRole.code,
        targetTeamId: data.teamId !== undefined ? data.teamId : target.teamId?.toString() ?? null,
        targetLeaderId: data.leaderId !== undefined ? data.leaderId : target.leaderId?.toString() ?? null,
      });
    }

    // Nếu thay đổi team/leader: validate hierarchy
    if (data.teamId !== undefined || data.leaderId !== undefined) {
      await assertHierarchyValid({
        user: currentUser,
        targetRoleCode: newRole?.code ?? oldRoleCode ?? "",
        targetTeamId: data.teamId !== undefined ? data.teamId : target.teamId?.toString() ?? null,
        targetLeaderId: data.leaderId !== undefined ? data.leaderId : target.leaderId?.toString() ?? null,
      });
    }

    if (scope === "TEAM") {
      // Leader chỉ được đổi sang role employee
      if (data.roleCode && data.roleCode.toUpperCase() !== oldRoleCode) {
        const allowed = ["SALE", "MKT", "WAREHOUSE", "EMPLOYEE"];
        if (!allowed.includes(data.roleCode.toUpperCase())) return errorResponse("Leader chỉ được quản lý role nhân viên", 403);
      }
      if (data.leaderId && data.leaderId !== currentUser.employee._id.toString()) return errorResponse("Leader không thể chuyển nhân viên ra ngoài phạm vi", 403);
      if (data.teamId && !(await Team.exists({ _id: data.teamId, leaderId: currentUser.employee._id, isActive: true }))) return errorResponse("Team nằm ngoài phạm vi quản lý", 403);
    }

    if (data.teamId && !(await Team.exists({ _id: data.teamId, isActive: true }))) return errorResponse("Team không tồn tại", 400);
    if (data.leaderId && !(await Employee.exists({ _id: data.leaderId, isActive: true }))) return errorResponse("Leader không tồn tại", 400);
    if (data.areaId && !(await Area.exists({ _id: data.areaId, isActive: true }))) return errorResponse("Khu vực không tồn tại", 400);
    if (data.email && (await Employee.exists({ email: data.email.toLowerCase(), _id: { $ne: target._id } }))) return errorResponse("Email đã tồn tại", 400);
    if (data.isActive === false && target._id.equals(currentUser.employee._id)) return errorResponse("Không thể vô hiệu hóa tài khoản của chính mình", 400);

    const oldData = { roleCode: oldRoleCode, leaderId: target.leaderId?.toString() ?? null, isActive: target.isActive };
    if (data.fullName !== undefined) target.fullName = data.fullName;
    if (data.email !== undefined) target.email = data.email.toLowerCase();
    if (data.phone !== undefined) target.phone = data.phone;
    if (data.avatar !== undefined) target.avatar = data.avatar;
    if (data.bankName !== undefined) target.bankName = data.bankName;
    if (data.bankAccountNumber !== undefined) target.bankAccountNumber = data.bankAccountNumber;
    if (data.bankAccountHolder !== undefined) target.bankAccountHolder = data.bankAccountHolder;
    if (data.teamId !== undefined) target.teamId = data.teamId ? new mongoose.Types.ObjectId(data.teamId) : null;
    if (data.leaderId !== undefined) target.leaderId = data.leaderId ? new mongoose.Types.ObjectId(data.leaderId) : null;
    if (data.areaId !== undefined) target.areaId = data.areaId ? new mongoose.Types.ObjectId(data.areaId) : null;
    if (data.isActive !== undefined) target.isActive = data.isActive;
    if (newRole) target.roleId = newRole._id;
    await target.save();
    const action = data.isActive === false ? "DISABLE_ACCOUNT" : data.isActive === true && oldData.isActive === false ? "ENABLE_ACCOUNT" : newRole && newRole.code !== oldRoleCode ? "CHANGE_ROLE" : data.leaderId !== undefined ? "CHANGE_LEADER" : "UPDATE_ACCOUNT";
    await writeAccountAudit({ actorId: currentUser.employee._id, targetId: target._id, action, oldData, newData: { roleCode: newRole?.code ?? oldRoleCode, leaderId: target.leaderId?.toString() ?? null, isActive: target.isActive }, request });
    const account = await Employee.findById(target._id).populate(populate).select("-password").lean();
    return success(map(account), "Cập nhật tài khoản thành công");
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    if (error instanceof Error && error.name === "ForbiddenError") return errorResponse(error.message, 403);
    console.error("Account update error:", error);
    return errorResponse("Không thể cập nhật tài khoản", 500);
  }
}