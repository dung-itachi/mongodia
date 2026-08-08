import { Types } from "mongoose";

import Employee, { IEmployee } from "@/models/Employee";
import Team, { ITeam } from "@/models/Team";
import Role, { Role as RoleDoc } from "@/models/Role";
import Department from "@/models/Department";
import { ForbiddenError } from "./auth";

/**
 * ============================================================
 * ACCOUNT MANAGEMENT SCOPE ENGINE
 * ============================================================
 *
 * Hierarchy:
 *   ADMIN (GLOBAL)
 *     └── MANAGER (DEPARTMENT scope via team.managerId)
 *           └── LEADER (TEAM scope via team.leaderId)
 *                 └── Employee (SELF scope)
 *
 * Scopes:
 *   - GLOBAL     : ADMIN (full quyền, không giới hạn)
 *   - DEPARTMENT : MANAGER (chỉ thấy/sửa account thuộc department mà
 *                  manager quản lý, suy ra từ team.managerId → team.departmentId)
 *   - TEAM       : LEADER  (chỉ thấy/sửa account thuộc team leader quản lý,
 *                  suy ra từ team.leaderId)
 *   - SELF       : các role còn lại (SALE/MKT/WAREHOUSE/EMPLOYEE)
 *
 * Reuse:
 *   - Không tạo permission mới. Scope engine chỉ dựa vào role + department/team.
 *   - Sử dụng các model/field đã có: Employee.teamId/leaderId/roleId,
 *     Team.departmentId/managerId/leaderId, Department.code.
 * ============================================================
 */

export type AccountScope = "GLOBAL" | "DEPARTMENT" | "TEAM" | "SELF";

export type RoleCode = "ADMIN" | "MANAGER" | "LEADER" | "SALE" | "MKT" | "WAREHOUSE" | "EMPLOYEE";

export type ScopeUser = {
  employee: IEmployee & { _id: Types.ObjectId };
  role: RoleDoc;
  permissions: string[];
};

export type ScopeTarget = {
  _id: Types.ObjectId | string;
  roleId?: Types.ObjectId | string | null;
  teamId?: Types.ObjectId | string | null;
  leaderId?: Types.ObjectId | string | null;
  roleCode?: string | null;
  team?: { departmentId?: Types.ObjectId | string | null; code?: string | null } | null;
};

/**
 * Trả về scope của user dựa trên role + permissions.
 * - ADMIN (wildcard hoặc account.manageAll) → GLOBAL
 * - MANAGER → DEPARTMENT
 * - LEADER → TEAM
 * - SALE/MKT/WAREHOUSE/EMPLOYEE → SELF
 */
export function getAccountScope(user: ScopeUser): AccountScope {
  if (
    user.role.code === "ADMIN" ||
    user.permissions.includes("*") ||
    user.permissions.includes("account.manageAll")
  ) {
    return "GLOBAL";
  }

  if (user.role.code === "MANAGER") return "DEPARTMENT";
  if (user.role.code === "LEADER") return "TEAM";

  return "SELF";
}

export function hasAccountPermission(user: ScopeUser, permission: string) {
  return user.permissions.includes("*") || user.permissions.includes(permission);
}

/**
 * Lấy department codes mà user MANAGER quản lý (qua team.managerId → department.code).
 * Trả về [] nếu không có quản lý team nào.
 */
export async function getManagedDepartmentCodes(user: ScopeUser): Promise<string[]> {
  if (getAccountScope(user) !== "DEPARTMENT") return [];
  const teams = await Team.find({ managerId: user.employee._id, isActive: true })
    .select("departmentId")
    .lean<Array<Pick<ITeam, "departmentId">>>();
  const deptIds = teams.map((t) => t.departmentId).filter((id): id is Types.ObjectId => Boolean(id));
  if (!deptIds.length) return [];
  const depts = await Department.find({ _id: { $in: deptIds } }).select("code").lean();
  return depts.map((d) => d.code);
}

/**
 * Lấy teamIds mà user quản lý (tùy theo scope):
 * - DEPARTMENT (MANAGER): tất cả team thuộc department mà manager quản lý
 * - TEAM (LEADER): các team có team.leaderId === user._id
 */
export async function getManagedTeamIds(user: ScopeUser): Promise<Types.ObjectId[]> {
  const scope = getAccountScope(user);

  if (scope === "TEAM") {
    const teams = await Team.find({ leaderId: user.employee._id, isActive: true })
      .select("_id")
      .lean();
    return teams.map((t) => t._id);
  }

  if (scope === "DEPARTMENT") {
    const teams = await Team.find({
      managerId: user.employee._id,
      isActive: true,
    })
      .select("_id")
      .lean();
    return teams.map((t) => t._id);
  }

  return [];
}

/**
 * Build MongoDB filter cho Employee.find() để liệt kê account
 * theo scope của user. Trả về null nếu user không có quyền truy cập.
 */
export async function getAccountListFilter(user: ScopeUser): Promise<Record<string, unknown> | null> {
  const scope = getAccountScope(user);

  if (scope === "GLOBAL") return {};

  if (scope === "SELF") {
    return { _id: user.employee._id };
  }

  if (scope === "TEAM") {
    const teamIds = await getManagedTeamIds(user);
    if (!teamIds.length) {
      // Leader chưa được gán team nào: chỉ thấy chính mình.
      return { _id: user.employee._id };
    }
    return {
      $or: [
        { _id: user.employee._id },
        { teamId: { $in: teamIds } },
        { leaderId: user.employee._id },
      ],
    };
  }

  // DEPARTMENT
  const deptCodes = await getManagedDepartmentCodes(user);
  if (!deptCodes.length) {
    // Manager chưa được gán team nào: chỉ thấy chính mình.
    return { _id: user.employee._id };
  }
  return {
    $or: [
      { _id: user.employee._id },
      { "team.department.code": { $in: deptCodes } },
    ],
  };
}

/**
 * Kiểm tra user có quyền quản lý (create/update/disable/resetPassword)
 * một account target hay không, dựa trên:
 *  - role hierarchy
 *  - scope (DEPARTMENT/TEAM/SELF)
 *  - relationship (leader, manager)
 *
 * Trả về true nếu có quyền.
 */
export async function canManageAccount(
  user: ScopeUser,
  target: ScopeTarget
): Promise<boolean> {
  const scope = getAccountScope(user);

  if (scope === "GLOBAL") return true;

  const targetId = target._id.toString();
  const selfId = user.employee._id.toString();
  if (targetId === selfId) return false; // self management goes through self-account.* endpoints

  // Load target role code nếu chưa có
  let targetRoleCode = target.roleCode ?? null;
  if (!targetRoleCode) {
    if (typeof target.roleId === "string" || target.roleId instanceof Types.ObjectId) {
      const r = await Role.findById(target.roleId).select("code").lean();
      targetRoleCode = r?.code ?? null;
    }
  }

  // ADMIN không bao giờ bị sửa bởi non-ADMIN (chỉ self)
  if (targetRoleCode === "ADMIN") return false;

  if (scope === "SELF") return false;

  if (scope === "TEAM") {
    // Leader chỉ quản lý employee (không sửa MANAGER/LEADER khác)
    if (targetRoleCode === "MANAGER" || targetRoleCode === "LEADER") return false;
    const managedTeamIds = await getManagedTeamIds(user);
    if (!managedTeamIds.length) return false;
    // Trực tiếp là leader của target
    if (target.leaderId && target.leaderId.toString() === selfId) return true;
    // Hoặc target thuộc team leader quản lý
    if (target.teamId && managedTeamIds.some((id) => id.toString() === target.teamId!.toString())) {
      return true;
    }
    return false;
  }

  // DEPARTMENT (MANAGER)
  if (targetRoleCode === "MANAGER") return false; // Manager không sửa manager khác

  const deptCodes = await getManagedDepartmentCodes(user);
  if (!deptCodes.length) return false;

  // Load target team → department
  let targetDeptCode: string | null = null;
  if (target.team?.departmentId) {
    const deptId = target.team.departmentId;
    const d = await Department.findById(deptId).select("code").lean();
    targetDeptCode = d?.code ?? null;
  } else if (target.teamId) {
    const team = await Team.findById(target.teamId).select("departmentId").lean();
    if (team?.departmentId) {
      const d = await Department.findById(team.departmentId).select("code").lean();
      targetDeptCode = d?.code ?? null;
    }
  }

  if (!targetDeptCode) return false;
  return deptCodes.includes(targetDeptCode);
}

/**
 * Validate hierarchy khi tạo/cập nhật một account.
 *
 * Rules:
 *  - Admin không bị tạo (self)
 *  - MANAGER (by ADMIN/GLOBAL):
 *      - department mới (target) phải có code khớp với departmentCode được chọn
 *      - target.roleCode = "MANAGER" được phép
 *  - LEADER (by ADMIN/MANAGER):
 *      - teamId phải thuộc departmentCode
 *      - nếu có managerId: managerId phải là MANAGER của cùng department
 *  - Employee (SALE/MKT/WAREHOUSE/EMPLOYEE) (by ADMIN/MANAGER/LEADER):
 *      - teamId phải thuộc departmentCode
 *      - leaderId phải là LEADER của team đó
 *
 * Throws ForbiddenError nếu vi phạm.
 */
export async function assertHierarchyValid(args: {
  user: ScopeUser;
  targetRoleCode: string;
  targetTeamId?: string | null;
  targetLeaderId?: string | null;
  targetDepartmentCode?: string | null;
}): Promise<void> {
  const { user, targetRoleCode, targetTeamId, targetLeaderId, targetDepartmentCode } = args;
  const scope = getAccountScope(user);

  // Chỉ ADMIN/MANAGER/LEADER mới tạo được account; SELF không thể create.
  if (scope === "SELF") {
    throw new ForbiddenError("Nhân viên không có quyền tạo tài khoản");
  }

  // Chặn tạo ADMIN (không ai tạo ADMIN qua account management)
  if (targetRoleCode === "ADMIN") {
    throw new ForbiddenError("Không thể tạo tài khoản ADMIN");
  }

  // Nếu user là LEADER (TEAM scope):
  if (scope === "TEAM") {
    // Leader chỉ tạo Employee role (SALE/MKT/WAREHOUSE/EMPLOYEE)
    const allowedRoles = ["SALE", "MKT", "WAREHOUSE", "EMPLOYEE"];
    if (!allowedRoles.includes(targetRoleCode)) {
      throw new ForbiddenError("Leader chỉ được tạo tài khoản nhân viên");
    }
    // TeamId phải là team leader quản lý
    if (!targetTeamId) {
      throw new ForbiddenError("Team là bắt buộc");
    }
    const managedTeamIds = await getManagedTeamIds(user);
    if (!managedTeamIds.some((id) => id.toString() === targetTeamId)) {
      throw new ForbiddenError("Team nằm ngoài phạm vi quản lý");
    }
    // LeaderId phải là chính leader đang tạo
    if (targetLeaderId && targetLeaderId !== user.employee._id.toString()) {
      throw new ForbiddenError("Leader không thể gán leader khác");
    }
    return;
  }

  // Nếu user là MANAGER (DEPARTMENT scope):
  if (scope === "DEPARTMENT") {
    const managedDeptCodes = await getManagedDepartmentCodes(user);
    if (!managedDeptCodes.length) {
      throw new ForbiddenError("Manager chưa được gán phòng ban nào");
    }

    // MANAGER role: chỉ tạo được MANAGER cho chính department đó
    if (targetRoleCode === "MANAGER") {
      if (!targetDepartmentCode || !managedDeptCodes.includes(targetDepartmentCode)) {
        throw new ForbiddenError("Manager không thể tạo Manager phòng ban khác");
      }
      return;
    }

    // LEADER role: phải thuộc 1 trong các department mà manager quản lý
    if (targetRoleCode === "LEADER") {
      if (!targetTeamId) throw new ForbiddenError("Team là bắt buộc");
      const team = await Team.findById(targetTeamId).select("departmentId leaderId").lean();
      if (!team) throw new ForbiddenError("Team không tồn tại");
      const teamDept = await Department.findById(team.departmentId).select("code").lean();
      const teamDeptCode = teamDept?.code ?? null;
      if (!teamDeptCode || !managedDeptCodes.includes(teamDeptCode)) {
        throw new ForbiddenError("Team nằm ngoài phạm vi phòng ban của manager");
      }
      // Nếu có leaderId gán sẵn: leader đó phải thuộc team
      if (targetLeaderId && team.leaderId?.toString() !== targetLeaderId) {
        throw new ForbiddenError("Leader gán phải là leader của team");
      }
      return;
    }

    // Employee role (SALE/MKT/WAREHOUSE/EMPLOYEE): team thuộc department của manager
    const allowedRoles = ["SALE", "MKT", "WAREHOUSE", "EMPLOYEE"];
    if (!allowedRoles.includes(targetRoleCode)) {
      throw new ForbiddenError("Vai trò không hợp lệ trong phạm vi của manager");
    }
    if (!targetTeamId) throw new ForbiddenError("Team là bắt buộc");
    const team = await Team.findById(targetTeamId).select("departmentId leaderId").lean();
    if (!team) throw new ForbiddenError("Team không tồn tại");
    const teamDept = await Department.findById(team.departmentId).select("code").lean();
    const teamDeptCode = teamDept?.code ?? null;
    if (!teamDeptCode || !managedDeptCodes.includes(teamDeptCode)) {
      throw new ForbiddenError("Team nằm ngoài phạm vi phòng ban của manager");
    }
    // leaderId (nếu có) phải là leader của team đó
    if (targetLeaderId && team.leaderId?.toString() !== targetLeaderId) {
      throw new ForbiddenError("Leader gán phải là leader của team");
    }
    return;
  }

  // GLOBAL: cho phép mọi thứ (trừ tạo ADMIN đã chặn ở trên)
  return;
}

/**
 * Roles được hiển thị trong form tạo account tùy theo scope hiện tại.
 */
export function getAllowedRoleCodesForCreate(user: ScopeUser): string[] {
  const scope = getAccountScope(user);
  if (scope === "GLOBAL") return ["MANAGER", "LEADER", "SALE", "MKT", "WAREHOUSE", "EMPLOYEE"];
  if (scope === "DEPARTMENT") return ["LEADER", "SALE", "MKT", "WAREHOUSE", "EMPLOYEE"];
  if (scope === "TEAM") return ["SALE", "MKT", "WAREHOUSE", "EMPLOYEE"];
  return [];
}

/**
 * Trả về object role với scope label (MANAGER — SALE, …) cho UI display.
 */
export async function listRolesWithScopeForUser(user: ScopeUser): Promise<Array<{ code: string; name: string; display: string }>> {
  const all = await Role.find({ isActive: true }).lean();
  const managedDeptCodes = await getManagedDepartmentCodes(user);
  return all
    .filter((r) => r.code !== "ADMIN")
    .map((r) => {
      let display = r.name;
      if (r.code === "MANAGER" && managedDeptCodes.length === 1) {
        display = `${r.name} — ${managedDeptCodes[0]}`;
      } else if (r.code === "LEADER" && managedDeptCodes.length === 1) {
        display = `${r.name} — ${managedDeptCodes[0]}`;
      }
      return { code: r.code, name: r.name, display };
    });
}