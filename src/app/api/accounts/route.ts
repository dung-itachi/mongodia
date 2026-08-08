import mongoose from "mongoose";

import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  assertHierarchyValid,
  canManageAccount,
  getAccountListFilter,
  getAccountScope,
  hasAccountPermission,
  listRolesWithScopeForUser,
} from "@/lib/account-scope";
import { writeAccountAudit } from "@/lib/account-audit";
import { hashPassword } from "@/utils/bcrypt";
import { error as errorResponse, success } from "@/utils/response";
import { generateEmployeeCode } from "@/lib/generateEmployeeCode";
import { createAccountSchema } from "@/validators/account.validator";
import Employee, { IEmployee } from "@/models/Employee";
import Role from "@/models/Role";
import Team from "@/models/Team";

const accountPopulate = [
  { path: "roleId", select: "code name" },
  { path: "teamId", select: "code name departmentId managerId leaderId", populate: [
    { path: "departmentId", select: "code name" },
    { path: "managerId", select: "employeeCode fullName username" },
    { path: "leaderId", select: "employeeCode fullName username" },
  ] },
  { path: "leaderId", select: "employeeCode fullName username" },
];

function mapAccount(employee: any) {
  return {
    _id: employee._id,
    employeeCode: employee.employeeCode,
    username: employee.username,
    fullName: employee.fullName,
    email: employee.email,
    phone: employee.phone,
    avatar: employee.avatar,
    isActive: employee.isActive,
    role: employee.roleId,
    team: employee.teamId,
    department: employee.teamId?.departmentId ?? null,
    leader: employee.leaderId,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!hasAccountPermission(currentUser, "account.view")) {
      return errorResponse("Bạn không có quyền xem tài khoản", 403);
    }

    await connectDB();
    const scope = getAccountScope(currentUser);
    if (scope === "SELF") {
      return success({ items: [], total: 0, page: 1, pageSize: 0, totalPages: 1 });
    }

    const scopeFilter = await getAccountListFilter(currentUser);
    if (scopeFilter === null) {
      return errorResponse("Bạn không có quyền quản lý tài khoản", 403);
    }

    const params = new URL(request.url).searchParams;
    const keyword = params.get("search")?.trim() ?? "";
    const roleCode = params.get("role")?.trim().toUpperCase();
    const teamId = params.get("teamId")?.trim();
    const leaderId = params.get("leaderId")?.trim();
    const status = params.get("isActive");
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 20));

    // Đối với MANAGER: cần chuyển department scope thành teamId trực tiếp
    // để có thể filter thêm theo status/role/teamId/keyword.
    const filter: Record<string, unknown> = { ...scopeFilter };
    if (status !== null && status !== "") filter.isActive = status === "true";

    if (scope === "DEPARTMENT") {
      const managedTeams = await Team.find({ managerId: currentUser.employee._id, isActive: true }).select("_id").lean();
      const teamIds = managedTeams.map((t) => t._id);
      delete filter.$or;
      delete filter["team.department.code"];
      if (teamIds.length) {
        filter.$or = [
          { _id: currentUser.employee._id },
          { teamId: { $in: teamIds } },
        ];
      } else {
        filter._id = currentUser.employee._id;
      }
    }

    if (teamId && mongoose.isValidObjectId(teamId)) filter.teamId = teamId;
    if (leaderId && scope === "GLOBAL" && mongoose.isValidObjectId(leaderId)) filter.leaderId = leaderId;

    if (roleCode) {
      const role = await Role.findOne({ code: roleCode, isActive: true }).select("_id").lean();
      filter.roleId = role?._id ?? null;
    }
    if (keyword) {
      filter.$and = [
        ...((filter.$and as Array<Record<string, unknown>>) ?? []),
        { $or: ["employeeCode", "username", "fullName", "email"].map((field) => ({ [field]: { $regex: keyword, $options: "i" } })) },
      ];
    }

    const [items, total] = await Promise.all([
      Employee.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).populate(accountPopulate).select("-password").lean(),
      Employee.countDocuments(filter),
    ]);

    return success({ items: items.map(mapAccount), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    console.error("Accounts GET error:", error);
    return errorResponse("Không thể lấy danh sách tài khoản", 500);
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!hasAccountPermission(currentUser, "account.create")) return errorResponse("Bạn không có quyền tạo tài khoản", 403);
    await connectDB();
    const parsed = createAccountSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorResponse("Dữ liệu tạo tài khoản không hợp lệ", 400);

    const role = await Role.findOne({ code: parsed.data.roleCode.toUpperCase(), isActive: true });
    if (!role) return errorResponse("Vai trò không tồn tại", 400);

    // Validate hierarchy + scope
    await assertHierarchyValid({
      user: currentUser,
      targetRoleCode: role.code,
      targetTeamId: parsed.data.teamId ?? null,
      targetLeaderId: parsed.data.leaderId ?? null,
    });

    let teamId = parsed.data.teamId ?? null;
    let leaderId = parsed.data.leaderId ?? null;

    // Leader tự tạo nhân viên cho team mình quản lý thì leaderId = chính họ
    if (role.code !== "ADMIN" && role.code !== "MANAGER" && currentUser.role.code === "LEADER" && !leaderId) {
      leaderId = currentUser.employee._id.toString();
    }

    if (teamId && !(await Team.exists({ _id: teamId, isActive: true }))) return errorResponse("Team không tồn tại", 400);
    if (leaderId && !(await Employee.exists({ _id: leaderId, isActive: true }))) return errorResponse("Leader không tồn tại", 400);
    if (await Employee.exists({ $or: [{ username: parsed.data.username.toLowerCase() }, { email: parsed.data.email.toLowerCase() }] })) return errorResponse("Username hoặc email đã tồn tại", 400);

    const employee = await Employee.create({
      employeeCode: await generateEmployeeCode(), username: parsed.data.username.toLowerCase(), password: await hashPassword(parsed.data.password),
      fullName: parsed.data.fullName, email: parsed.data.email.toLowerCase(), phone: parsed.data.phone ?? "", avatar: parsed.data.avatar ?? "",
      roleId: role._id, teamId: teamId ? new mongoose.Types.ObjectId(teamId) : null, leaderId: leaderId ? new mongoose.Types.ObjectId(leaderId) : null,
    });
    await writeAccountAudit({ actorId: currentUser.employee._id, targetId: employee._id, action: "CREATE_ACCOUNT", newData: { roleCode: role.code, teamId, leaderId }, request });
    const result = await Employee.findById(employee._id).populate(accountPopulate).select("-password").lean();
    return success(mapAccount(result), "Tạo tài khoản thành công");
  } catch (error) {
    if (error instanceof UnauthorizedError) return errorResponse(error.message, 401);
    if (error instanceof Error && error.name === "ForbiddenError") return errorResponse(error.message, 403);
    console.error("Accounts POST error:", error);
    return errorResponse(`Không thể tạo tài khoản: ${error instanceof Error ? error.message : "unknown"}`, 500);
  }
}

// Export util để UI gọi khi cần list roles
export { listRolesWithScopeForUser };