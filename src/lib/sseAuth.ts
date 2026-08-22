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
import Permission from "@/models/Permission";
import { SSE_TOKEN_COOKIE } from "./sseAuthConstants";
import {
  getCachedSession,
  setCachedSession,
} from "@/lib/sessionCache";

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

  // Cache hit — bỏ qua 4 round-trips MongoDB.
  const cached = getCachedSession(token);
  if (cached) {
    return {
      employee: cached.employee,
      role: cached.role,
      permissions: cached.permissions,
    };
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new Error("UNAUTHORIZED");
  }

  await connectDB();

  // Employee + Role chạy song song vì roleId đã có trong JWT.
  const [employee, role] = await Promise.all([
    Employee.findOne({ _id: payload.employeeId, isActive: true }).lean(),
    Role.findOne({ _id: payload.roleId, isActive: true }).lean(),
  ]);

  if (!employee) throw new Error("UNAUTHORIZED");
  if (!role) throw new Error("UNAUTHORIZED");

  const rolePermissions = await RolePermission.find({ roleId: role._id })
    .select("permissionId")
    .lean();
  const permIds = rolePermissions
    .map((rp) => rp.permissionId)
    .filter((id): id is NonNullable<typeof id> => id != null);
  const perms = permIds.length
    ? await Permission.find({ _id: { $in: permIds }, isActive: true })
        .select("code")
        .lean()
    : [];

  const session = {
    employee,
    role,
    permissions: perms.map((p) => p.code),
  };

  setCachedSession(token, session);

  return session;
}
