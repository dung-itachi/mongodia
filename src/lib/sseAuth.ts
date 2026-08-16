/**
 * SSE auth helper.
 *
 * The browser's native `EventSource` cannot send an `Authorization` header.
 * To authenticate the SSE stream we mirror the access token into a
 * non-httpOnly cookie (`notification-stream-token`) on the client and read
 * it back here.
 *
 * Why not httpOnly?
 *   The cookie is set from `AuthProvider` after login via `document.cookie`,
 *   so JS on the page itself must be able to read it. The route verifies
 *   the JWT signature and expiry in exactly the same way as the header
 *   path in `getCurrentUser`, so the security guarantee is identical:
 *   anyone holding the *valid* token can connect over SSE.
 *
 * Headers take precedence. If the Authorization header is present (e.g. for
 * curl-based smoke tests), we honour it.
 */

import { verifyToken } from "@/utils/jwt";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
import Role from "@/models/Role";
import RolePermission from "@/models/RolePermission";
import { SSE_TOKEN_COOKIE } from "./sseAuthConstants";

export { SSE_TOKEN_COOKIE };

function extractToken(request: Request): string | null {
  const headerToken = request.headers.get("authorization");
  if (headerToken?.startsWith("Bearer ")) {
    return headerToken.split(" ")[1] ?? null;
  }
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(";").map((c) => c.trim());
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq === -1) continue;
    const key = pair.slice(0, eq);
    if (key === SSE_TOKEN_COOKIE) {
      return decodeURIComponent(pair.slice(eq + 1)) || null;
    }
  }
  return null;
}

export async function getCurrentUserFromSseRequest(request: Request) {
  const token = extractToken(request);
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new Error("UNAUTHORIZED");
  }

  await connectDB();
  const employee = await Employee.findOne({
    _id: payload.employeeId,
    isActive: true,
  }).lean();
  if (!employee) throw new Error("UNAUTHORIZED");

  const role = await Role.findOne({ _id: employee.roleId, isActive: true }).lean();
  if (!role) throw new Error("UNAUTHORIZED");

  const rolePermissions = await RolePermission.find({ roleId: role._id })
    .populate<{ permissionId: { code: string } | null }>({
      path: "permissionId",
      match: { isActive: true },
      select: "code",
    })
    .lean() as Array<{ permissionId: { code: string } | null }>;

  const permissions = rolePermissions
    .filter((rp) => rp.permissionId != null)
    .map((rp) => (rp.permissionId as { code: string }).code);

  return {
    employee,
    role,
    permissions,
  };
}
