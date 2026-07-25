import { connectDB } from "@/lib/mongodb";

import Employee from "@/models/Employee";
import Permission from "@/models/Permission";
import Role from "@/models/Role";

import { verifyToken } from "@/utils/jwt";

export async function getCurrentUser(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authorization.split(" ")[1];

  const payload = verifyToken(token);

  await connectDB();

  const employee = await Employee.findOne({
    _id: payload.employeeId,
    isActive: true,
  }).lean();

  if (!employee) {
    throw new Error("USER_NOT_FOUND");
  }

  const role = await Role.findOne({
    _id: employee.roleId,
    isActive: true,
  }).lean();

  if (!role) {
    throw new Error("ROLE_NOT_FOUND");
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