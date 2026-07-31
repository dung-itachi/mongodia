import { connectDB } from "@/lib/mongodb";

import Employee from "@/models/Employee";
import Permission from "@/models/Permission";
import Role from "@/models/Role";

import { verifyToken } from "@/utils/jwt";

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

export async function getCurrentUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token không được cung cấp");
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    throw new UnauthorizedError("Token không hợp lệ");
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new UnauthorizedError("Token không hợp lệ");
  }

  await connectDB();

  const employee = await Employee.findOne({
    _id: payload.employeeId,
    isActive: true,
  }).lean();

  if (!employee) {
    throw new UnauthorizedError("Người dùng không tồn tại hoặc đã bị vô hiệu hóa");
  }

  const role = await Role.findOne({
    _id: employee.roleId,
    isActive: true,
  }).lean();

  if (!role) {
    throw new UnauthorizedError("Vai trò không tồn tại hoặc đã bị vô hiệu hóa");
  }

  const permissions = role.permissions.length
    ? await Permission.find({
        _id: { $in: role.permissions },
        isActive: true,
      })
        .select("code -_id")
        .lean()
    : [];

  return {
    employee,
    role,
    permissions: permissions.map((p) => p.code),
  };
}