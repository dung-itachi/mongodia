/**
 * Sprint RBAC — Account Management hierarchy seed.
 *
 * Thực hiện:
 *   1. Tìm các employee theo employeeCode đã seed trong employees.seed.ts.
 *   2. Gắn Employee.teamId / Employee.leaderId.
 *   3. Gắn Team.managerId theo Manager theo department.
 *   4. Gắn Team.leaderId theo Leader của team.
 *
 * Idempotent: chạy nhiều lần không tạo duplicate; chỉ cập nhật các mối quan hệ.
 */

import Department from "@/models/Department";
import Employee from "@/models/Employee";
import Team from "@/models/Team";

type Link = {
  employeeCode: string;
  teamCode: string | null;
  departmentCode: string | null;
  isManagerOfDepartment?: "SALE" | "MKT" | "WAREHOUSE";
  isLeaderOfTeam?: string;
};

const links: Link[] = [
  // Managers (department-scoped)
  { employeeCode: "EMP_MGR_SALE", teamCode: null, departmentCode: null, isManagerOfDepartment: "SALE" },
  { employeeCode: "EMP_MGR_MKT", teamCode: null, departmentCode: null, isManagerOfDepartment: "MKT" },
  { employeeCode: "EMP_MGR_WH", teamCode: null, departmentCode: null, isManagerOfDepartment: "WAREHOUSE" },

  // Leaders (team-scoped)
  { employeeCode: "EMP_LEADER_MKT", teamCode: "MKT", departmentCode: "MKT", isLeaderOfTeam: "MKT" },
  { employeeCode: "EMP_LEADER_SALE", teamCode: "SALE", departmentCode: "SALE", isLeaderOfTeam: "SALE" },
  { employeeCode: "EMP_LEADER_WH", teamCode: "WAREHOUSE", departmentCode: "WAREHOUSE", isLeaderOfTeam: "WAREHOUSE" },

  // Employees
  { employeeCode: "EMP_MKT001", teamCode: "MKT", departmentCode: "MKT" },
  { employeeCode: "EMP_MKT002", teamCode: "MKT", departmentCode: "MKT" },
  { employeeCode: "EMP_MKT003", teamCode: "MKT", departmentCode: "MKT" },
  { employeeCode: "EMP_SALE001", teamCode: "SALE", departmentCode: "SALE" },
  { employeeCode: "EMP_SALE002", teamCode: "SALE", departmentCode: "SALE" },
  { employeeCode: "EMP_SALE003", teamCode: "SALE", departmentCode: "SALE" },
  { employeeCode: "EMP_WH001", teamCode: "WAREHOUSE", departmentCode: "WAREHOUSE" },
  { employeeCode: "EMP_WH002", teamCode: "WAREHOUSE", departmentCode: "WAREHOUSE" },
];

export async function seedHierarchy() {
  const departments = await Department.find({ isActive: true }).lean();
  const deptByCode = new Map(departments.map((d) => [d.code, d]));

  const teams = await Team.find({ isActive: true }).lean();
  const teamByCode = new Map(teams.map((t) => [t.code, t]));

  // Bước 1: Gắn teamId cho Employee theo link
  for (const link of links) {
    const employee = await Employee.findOne({ employeeCode: link.employeeCode }).select("_id teamId").lean();
    if (!employee) {
      console.warn(`[hierarchy] employeeCode ${link.employeeCode} chưa tồn tại — bỏ qua`);
      continue;
    }
    if (link.teamCode) {
      const team = teamByCode.get(link.teamCode);
      if (!team) {
        console.warn(`[hierarchy] team ${link.teamCode} chưa tồn tại — bỏ qua`);
        continue;
      }
      await Employee.updateOne({ _id: employee._id }, { $set: { teamId: team._id } });
    }
  }

  // Bước 2: Gắn Team.managerId theo Manager
  for (const link of links) {
    if (!link.isManagerOfDepartment) continue;
    const manager = await Employee.findOne({ employeeCode: link.employeeCode }).select("_id").lean();
    if (!manager) continue;
    const dept = deptByCode.get(link.isManagerOfDepartment);
    if (!dept) continue;
    await Team.updateMany({ departmentId: dept._id, isActive: true }, { $set: { managerId: manager._id } });
  }

  // Bước 3: Gắn Team.leaderId
  for (const link of links) {
    if (!link.isLeaderOfTeam) continue;
    const leader = await Employee.findOne({ employeeCode: link.employeeCode }).select("_id").lean();
    if (!leader) continue;
    await Team.updateOne({ code: link.isLeaderOfTeam, isActive: true }, { $set: { leaderId: leader._id } });
  }

  // Bước 4: Gắn Employee.leaderId cho employee thuộc team (dùng leader của team đó)
  const updatedTeams = await Team.find({ isActive: true, leaderId: { $ne: null } }).select("_id code leaderId").lean();
  const leaderByTeamCode = new Map(updatedTeams.map((t) => [t.code, t.leaderId]));
  for (const link of links) {
    if (!link.teamCode) continue;
    const leaderId = leaderByTeamCode.get(link.teamCode);
    if (!leaderId) continue;
    await Employee.updateOne({ employeeCode: link.employeeCode }, { $set: { leaderId } });
  }

  console.log("[OK] Hierarchy (Team.managerId / Team.leaderId / Employee.leaderId)");
}