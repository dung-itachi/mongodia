import { connectDB } from "@/lib/mongodb";

import Employee from "@/models/Employee";
import Permission from "@/models/Permission";
import Role from "@/models/Role";
import RolePermission from "@/models/RolePermission";

import { verifyToken } from "@/utils/jwt";
import {
  getCachedSession,
  setCachedSession,
} from "@/lib/sessionCache";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

interface SessionData {
  employee: Awaited<ReturnType<typeof Employee.findOne>>;
  role: Awaited<ReturnType<typeof Role.findOne>>;
  permissions: string[];
}

async function loadSession(employeeId: string, roleId: string): Promise<SessionData> {
  // Employee + Role chạy song song (Role không cần đợi Employee vì roleId đã có trong JWT).
  const [employee, role] = await Promise.all([
    Employee.findOne({ _id: employeeId, isActive: true }).lean(),
    Role.findOne({ _id: roleId, isActive: true }).lean(),
  ]);

  if (!employee) {
    throw new UnauthorizedError("Người dùng không tồn tại hoặc đã bị vô hiệu hóa");
  }
  if (!role) {
    throw new UnauthorizedError("Vai trò không tồn tại hoặc đã bị vô hiệu hóa");
  }

  // Lấy danh sách permissionId thuộc role, rồi fetch Permission song song theo batch.
  // Bỏ `populate({ match })` (2 round-trips) — thay bằng 2 query thẳng.
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

  return {
    employee,
    role,
    permissions: perms.map((p) => p.code),
  };
}

export async function getCurrentUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token không được cung cấp");
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    throw new UnauthorizedError("Token không hợp lệ");
  }

  // Cache hit — bỏ qua toàn bộ DB work cho request này.
  const cached = getCachedSession(token);
  if (cached) {
    return {
      employee: cached.employee,
      role: cached.role,
      permissions: cached.permissions,
      accountId: (cached.employee as { accountId?: string })?.accountId,
      roleCode: (cached.role as { code: string }).code,
    };
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new UnauthorizedError("Token không hợp lệ");
  }

  await connectDB();

  const session = await loadSession(payload.employeeId, payload.roleId);

  // Lưu cache trước khi trả về.
  setCachedSession(token, {
    employee: session.employee,
    role: session.role,
    permissions: session.permissions,
  });

  return {
    employee: session.employee,
    role: session.role,
    permissions: session.permissions,
    accountId: (session.employee as { accountId?: string }).accountId,
    roleCode: (session.role as { code: string }).code,
  };
}
