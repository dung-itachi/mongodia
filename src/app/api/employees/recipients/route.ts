/**
 * ==================================================
 * GET /api/employees/recipients
 * ==================================================
 *
 * Returns a list of employees that can be used as notification recipients.
 * Supports filtering by:
 *   - role: specific role code (SALE, MKT, WAREHOUSE, LEADER, MANAGER, etc.)
 *   - roles: comma-separated list of role codes
 *   - teamId: specific team
 *   - leaderId: all employees under a specific leader (including the leader)
 *   - keyword: search by name or code
 *   - includeHierarchy: when true with leaderId, includes all nested employees
 *
 * This endpoint supports the notification recipient selection UI with
 * multiple selection modes:
 *   1. By individual employee
 *   2. By team
 *   3. By leader (includes leader + all their direct reports)
 *   4. By role (e.g., all Sale employees, all MKT employees)
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Employee from "@/models/Employee";
import Team from "@/models/Team";
import Role from "@/models/Role";
import { error as errorResponse, success } from "@/utils/response";
import "@/models/Role";

type RecipientOption = {
  id: string;
  employeeCode: string;
  fullName: string;
  role: string;
  roleLabel: string;
  teamName?: string | null;
};

type TeamOption = {
  id: string;
  code: string;
  name: string;
  memberCount: number;
};

type RecipientGroup = {
  employees: RecipientOption[];
  teams: TeamOption[];
};

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("notification.manage")) {
      return errorResponse("Bạn không có quyền quản lý thông báo", 403);
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") ?? "employees";
    const role = searchParams.get("role");
    const roles = searchParams.get("roles");
    const teamId = searchParams.get("teamId");
    const leaderId = searchParams.get("leaderId");
    const keyword = searchParams.get("keyword");
    const includeHierarchy = searchParams.get("includeHierarchy") === "true";
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

    await connectDB();

    // Build employee filter
    const employeeFilter: Record<string, unknown> = { isActive: true };

    // Role filter (single or multiple)
    if (role) {
      employeeFilter["roleId.code"] = role;
    } else if (roles) {
      const roleList = roles.split(",").map((r) => r.trim()).filter(Boolean);
      if (roleList.length > 0) {
        employeeFilter["roleId.code"] = { $in: roleList };
      }
    }

    // Team filter
    if (teamId) {
      employeeFilter["teamId"] = teamId;
    }

    // Leader filter (employees under a leader, optionally including the leader)
    if (leaderId) {
      if (includeHierarchy) {
        // Get all employees where leaderId chain leads to the target leader
        // First, find all employees directly under the leader
        const directReports = await Employee.find({
          isActive: true,
          leaderId: leaderId,
        })
          .select("_id")
          .lean();

        const directReportIds = directReports.map((e) => e._id);

        // Recursively find all nested reports
        const allReportIds = new Set<string>([leaderId]);
        const toProcess = [...directReportIds.map((id) => id.toString())];

        while (toProcess.length > 0) {
          const currentId = toProcess.pop()!;
          if (allReportIds.has(currentId)) continue;
          allReportIds.add(currentId);

          const nestedReports = await Employee.find({
            isActive: true,
            leaderId: currentId,
          })
            .select("_id")
            .lean();

          for (const nr of nestedReports) {
            const nrStr = nr._id.toString();
            if (!allReportIds.has(nrStr)) {
              toProcess.push(nrStr);
            }
          }
        }

        employeeFilter._id = { $in: Array.from(allReportIds) };
      } else {
        // Only direct reports under the leader
        employeeFilter.leaderId = leaderId;
      }
    }

    // Keyword search
    if (keyword && keyword.trim()) {
      const kw = keyword.trim();
      employeeFilter.$or = [
        { fullName: { $regex: kw, $options: "i" } },
        { employeeCode: { $regex: kw, $options: "i" } },
      ];
    }

    // Load role labels for display
    const rolesData = await Role.find({ isActive: true })
      .select("code name")
      .lean();
    const roleLabelMap = new Map(
      rolesData.map((r) => [r.code, r.name ?? r.code])
    );

    // Execute employee query with population
    const employees = await Employee.find(employeeFilter)
      .populate({ path: "roleId", select: "code name" })
      .populate({ path: "teamId", select: "name code" })
      .select("_id employeeCode fullName roleId teamId")
      .sort({ fullName: 1 })
      .limit(pageSize)
      .lean();

    const recipientOptions: RecipientOption[] = employees.map((emp) => ({
      id: emp._id.toString(),
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      role: (emp.roleId as unknown as { code?: string } | null)?.code ?? "UNKNOWN",
      roleLabel:
        (emp.roleId as unknown as { name?: string } | null)?.name ??
        (emp.roleId as unknown as { code?: string } | null)?.code ??
        "—",
      teamName: (emp.teamId as unknown as { name?: string } | null)?.name ?? null,
    }));

    // If mode is "all", also return teams for team-based selection
    let teamOptions: TeamOption[] = [];
    if (mode === "all" || mode === "teams") {
      const teams = await Team.find({ isActive: true })
        .select("_id code name")
        .lean();

      // Get member count for each team
      const memberCounts = await Employee.aggregate([
        { $match: { isActive: true, teamId: { $ne: null } } },
        { $group: { _id: "$teamId", count: { $sum: 1 } } },
      ]);

      const countMap = new Map(
        memberCounts.map((mc) => [
          (mc._id as { toString: () => string }).toString(),
          mc.count,
        ])
      );

      teamOptions = teams.map((team) => ({
        id: team._id.toString(),
        code: team.code,
        name: team.name,
        memberCount: countMap.get(team._id.toString()) ?? 0,
      }));
    }

    const result: RecipientGroup = {
      employees: recipientOptions,
      teams: teamOptions,
    };

    return success(result);
  } catch (error) {
    console.error("Recipient options error:", error);
    return errorResponse("Không thể lấy danh sách người nhận", 500);
  }
}
