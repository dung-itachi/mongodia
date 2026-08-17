import Team from "@/models/Team";
import { getCurrentUser } from "@/lib/auth";
import { error as errorResponse, success } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    // Resolve teamCode for Leader scope — the sidebar uses this to
    // decide which NavGroup (MKT/SALE/WAREHOUSE) the Leader can see.
    let teamCode: string | null = null;
    if (currentUser.employee.teamId) {
      const team = await Team.findById(currentUser.employee.teamId)
        .select("code")
        .lean();
      teamCode = team?.code ?? null;
    }

    return success({
      _id: currentUser.employee._id.toString(),
      employeeCode: currentUser.employee.employeeCode,
      username: currentUser.employee.username,
      fullName: currentUser.employee.fullName,
      email: currentUser.employee.email,
      avatar: currentUser.employee.avatar,
      role: currentUser.role.code,
      roleName: currentUser.role.name,
      // Nav groups this role is allowed to see on the sidebar.
      // Empty array means "use dynamic resolution" (Leader only).
      visibleGroups: (currentUser.role as { visibleGroups?: string[] }).visibleGroups ?? [],
      // Team code — used by Sidebar to resolve Leader's scope
      // (MKT → MKT group, SALE → SALE group, WAREHOUSE → WAREHOUSE group).
      teamCode,
      permissions: currentUser.permissions,
    });
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case "UNAUTHORIZED":
          return errorResponse("Chưa đăng nhập", 401);

        case "USER_NOT_FOUND":
          return errorResponse("Không tìm thấy người dùng", 404);

        case "ROLE_NOT_FOUND":
          return errorResponse("Vai trò không hợp lệ", 403);
      }
    }

    console.error(error);

    return errorResponse("Không thể lấy thông tin người dùng", 500);
  }
}