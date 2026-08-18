/**
 * ==================================================
 * GET /api/employees/org-chart
 * ==================================================
 *
 * Builds the organization chart tree from existing employee data.
 *
 * Hierarchy rules (read-only, derived from current data model):
 *
 *   - ROOT (ADMIN)        : Employees with role "ADMIN". Falls back to a
 *                          synthetic root only when no ADMIN exists.
 *   - LEVEL 1 (MANAGER)   : Employees with role "MANAGER".
 *                          Direct children = LEADERs that report to that
 *                          MANAGER through teams (Team.managerId → manager).
 *                          If a LEADER has no managed team, they fall
 *                          under any available MANAGER (kept stable by id).
 *   - LEVEL 2 (LEADER)    : Employees with role "LEADER".
 *                          Direct children = EMPLOYEEs whose
 *                          Employee.leaderId points at this LEADER.
 *   - LEVEL 3 (EMPLOYEE)  : Employees with role "EMPLOYEE" (and other
 *                          operational roles) whose Employee.leaderId
 *                          points at a LEADER.
 *
 * The endpoint does NOT mutate any data and does NOT change relationships.
 * It only DERIVES a presentation tree for the UI.
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import Employee from "@/models/Employee";
import Role from "@/models/Role";
import Team from "@/models/Team";
import { error as errorResponse, success } from "@/utils/response";
import "@/models/Role";

type OrgNode = {
  id: string;
  /** Role code (ADMIN | MANAGER | LEADER | EMPLOYEE | other). */
  role: string;
  /** Display label for the role. */
  roleLabel: string;
  employeeCode: string;
  fullName: string;
  avatar?: string;
  teamName?: string | null;
  isActive: boolean;
  /** Direct children in the tree. */
  children: OrgNode[];
  /** Aggregated totals — purely for UI display. */
  meta: {
    directReports: number;
    totalReports: number;
  };
};

type OrgChartPayload = {
  root: OrgNode;
  /** Flat list of every node (for search). */
  flat: Array<{
    id: string;
    employeeCode: string;
    fullName: string;
    role: string;
    /** Path of ids from root → node. */
    ancestorIds: string[];
  }>;
};

const ROOT_ROLE_ORDER = ["ADMIN", "MANAGER", "LEADER"] as const;

function toNode(
  employee: {
    _id: string;
    employeeCode: string;
    fullName: string;
    avatar?: string;
    isActive: boolean;
    roleId?: { code?: string; name?: string } | null;
    teamId?: { name?: string } | null;
  }
): OrgNode {
  return {
    id: employee._id.toString(),
    role: employee.roleId?.code ?? "UNKNOWN",
    roleLabel: employee.roleId?.name ?? employee.roleId?.code ?? "—",
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    avatar: employee.avatar || undefined,
    teamName: employee.teamId?.name ?? null,
    isActive: employee.isActive !== false,
    children: [],
    meta: { directReports: 0, totalReports: 0 },
  };
}

function aggregate(node: OrgNode): number {
  let total = 0;
  for (const child of node.children) {
    total += 1 + aggregate(child);
  }
  node.meta.directReports = node.children.length;
  node.meta.totalReports = total;
  return total;
}

function flatten(
  node: OrgNode,
  ancestors: string[],
  sink: OrgChartPayload["flat"]
): void {
  sink.push({
    id: node.id,
    employeeCode: node.employeeCode,
    fullName: node.fullName,
    role: node.role,
    ancestorIds: ancestors,
  });
  for (const child of node.children) {
    flatten(child, [...ancestors, node.id], sink);
  }
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("employee.view")) {
      return errorResponse("Bạn không có quyền xem sơ đồ tổ chức", 403);
    }

    await connectDB();

    // Load all roles so we can resolve role code → label and detect
    // operational roles generically (SALE / MKT / WAREHOUSE / …).
    const roles = await Role.find({ isActive: true }).select("code name").lean();
    const roleByCode = new Map(roles.map((r) => [r.code, r.name]));

    // Pull every active employee with the bits we need.
    const employeesRaw = await Employee.find({ isActive: true })
      .populate({ path: "roleId", select: "code name" })
      .populate({ path: "teamId", select: "name code" })
      .select("_id employeeCode fullName avatar roleId teamId leaderId isActive")
      .lean();

    // Build maps for quick lookup.
    const employeeById = new Map<string, (typeof employeesRaw)[number]>();
    const employeesByRole = new Map<string, typeof employeesRaw>();
    for (const emp of employeesRaw) {
      const id = emp._id.toString();
      employeeById.set(id, emp);
      const roleCode = (emp.roleId as unknown as { code?: string } | null)?.code;
      if (!roleCode) continue;
      const bucket = employeesByRole.get(roleCode) ?? [];
      bucket.push(emp);
      employeesByRole.set(roleCode, bucket);
    }

    // Pull all teams so we can resolve manager → leader via team.managerId +
    // team.leaderId. We do NOT change the team data — we only READ.
    const teamsRaw = await Team.find({ isActive: true })
      .select("_id code name leaderId managerId")
      .lean();

    // For each LEADER, collect the list of MANAGERs that own at least one
    // team where that LEADER is leaderId. If the LEADER has no managed team,
    // they will be attached to every MANAGER (keeps the chart useful even
    // when teams are not configured yet).
    const leaderToManagerIds = new Map<string, Set<string>>();
    for (const team of teamsRaw) {
      const managerId =
        team.managerId && (team.managerId as { toString?: () => string }).toString
          ? (team.managerId as unknown as { _id: string })._id?.toString()
          : null;
      const leaderId =
        team.leaderId && (team.leaderId as { toString?: () => string }).toString
          ? (team.leaderId as unknown as { _id: string })._id?.toString()
          : null;
      if (!managerId || !leaderId) continue;
      const set = leaderToManagerIds.get(leaderId) ?? new Set<string>();
      set.add(managerId);
      leaderToManagerIds.set(leaderId, set);
    }

    const managers = (employeesByRole.get("MANAGER") ?? []).map((e) =>
      toNode(e as unknown as Parameters<typeof toNode>[0])
    );
    const leaders = (employeesByRole.get("LEADER") ?? []).map((e) =>
      toNode(e as unknown as Parameters<typeof toNode>[0])
    );

    // Build the LEADER → EMPLOYEE map by walking Employee.leaderId.
    const employeesUnderLeader = new Map<string, OrgNode[]>();
    const leaderlessEmployees: OrgNode[] = [];
    for (const [code, list] of employeesByRole.entries()) {
      if (ROOT_ROLE_ORDER.includes(code as (typeof ROOT_ROLE_ORDER)[number])) {
        continue;
      }
      for (const emp of list) {
        const leaderId =
          emp.leaderId &&
          (emp.leaderId as unknown as { _id?: string })._id
            ? (emp.leaderId as unknown as { _id: string })._id.toString()
            : null;
        const node = toNode(emp as unknown as Parameters<typeof toNode>[0]);
        if (leaderId) {
          const bucket = employeesUnderLeader.get(leaderId) ?? [];
          bucket.push(node);
          employeesUnderLeader.set(leaderId, bucket);
        } else {
          leaderlessEmployees.push(node);
        }
      }
    }

    // Attach EMPLOYEEs to their LEADERs.
    for (const leader of leaders) {
      const children = employeesUnderLeader.get(leader.id) ?? [];
      leader.children = children;
    }

    // Attach LEADERs to MANAGERs. LEADERs with at least one managed team
    // get attached to the matching MANAGER(s). LEADERs without any managed
    // team are attached to every MANAGER so they never become orphans.
    if (managers.length > 0) {
      for (const leader of leaders) {
        const managedBy = leaderToManagerIds.get(leader.id);
        if (managedBy && managedBy.size > 0) {
          for (const manager of managers) {
            if (managedBy.has(manager.id)) {
              manager.children.push(leader);
            }
          }
        } else {
          // No team assignment — attach to first MANAGER as a fallback so
          // the leader is still discoverable in the chart.
          managers[0].children.push(leader);
        }
      }

      // LEADERless employees (no Employee.leaderId pointing anywhere)
      // become direct children of the first MANAGER to keep them visible.
      if (leaderlessEmployees.length > 0) {
        managers[0].children.push(...leaderlessEmployees);
      }
    }

    // Build the ADMIN root. If there are no ADMINs at all, we synthesize
    // a virtual root so the chart always renders something useful.
    const admins = (employeesByRole.get("ADMIN") ?? []).map((e) =>
      toNode(e as unknown as Parameters<typeof toNode>[0])
    );

    let root: OrgNode;

    if (admins.length > 0) {
      // When multiple admins exist, use the first as the visual root and
      // attach the others as siblings at level 1.
      root = admins[0];
      const extraAdmins = admins.slice(1);
      const extraManagers = [...managers, ...extraAdmins];
      root.children = extraManagers;
    } else {
      // Synthesize a virtual root when no ADMIN is configured.
      root = {
        id: "__root__",
        role: "ADMIN",
        roleLabel: roleByCode.get("ADMIN") ?? "Administrator",
        employeeCode: "ROOT",
        fullName: "Tổ chức",
        isActive: true,
        children: managers,
        meta: { directReports: managers.length, totalReports: 0 },
      };
    }

    // Recompute aggregated meta after the tree is fully wired.
    aggregate(root);

    const flat: OrgChartPayload["flat"] = [];
    flatten(root, [], flat);

    return success({ root, flat });
  } catch (error) {
    console.error("Org Chart Error:", error);
    return errorResponse("Không thể tải sơ đồ tổ chức", 500);
  }
}
