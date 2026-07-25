import { connectDB } from "@/lib/mongodb";

import Employee from "@/models/Employee";
import LoginHistory from "@/models/LoginHistory";
import Permission from "@/models/Permission";
import Role from "@/models/Role";

import { comparePassword } from "@/utils/bcrypt";
import { signToken } from "@/utils/jwt";
import { error as errorResponse, success } from "@/utils/response";
import { loginSchema } from "@/utils/validator";

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return (
    forwardedFor?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    ""
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("Dữ liệu đăng nhập không hợp lệ", 400);
  }

  const parsedBody = loginSchema.safeParse(body);

  if (!parsedBody.success) {
    return errorResponse(
      parsedBody.error.issues[0]?.message ??
        "Dữ liệu đăng nhập không hợp lệ",
      400
    );
  }

  try {
    await connectDB();

    const username = parsedBody.data.username.trim();
    const { password } = parsedBody.data;

    const employee = await Employee.findOne({
      username,
      isActive: true,
    })
      .select("+password")
      .lean();

    if (!employee) {
      return errorResponse(
        "Tên đăng nhập hoặc mật khẩu không chính xác",
        401
      );
    }

    const passwordMatches = await comparePassword(
      password,
      employee.password
    );

    if (!passwordMatches) {
      return errorResponse(
        "Tên đăng nhập hoặc mật khẩu không chính xác",
        401
      );
    }

    const role = await Role.findOne({
      _id: employee.roleId,
      isActive: true,
    }).lean();

    if (!role) {
      return errorResponse(
        "Tài khoản chưa được gán vai trò hợp lệ",
        403
      );
    }

    const permissions = role.permissions.length
      ? await Permission.find({
          _id: {
            $in: role.permissions,
          },
          isActive: true,
        })
          .select("code -_id")
          .lean()
      : [];

    const permissionCodes = permissions.map(
      (permission) => permission.code
    );

    // Bước 9: JWT
    const accessToken = signToken({
        employeeId: employee._id.toString(),
        roleId: role._id.toString(),
      });
      
      const ip = getClientIp(request);
      const userAgent = request.headers.get("user-agent") ?? "";
      
      await Promise.all([
        Employee.updateOne(
          { _id: employee._id },
          {
            $set: {
              lastLogin: new Date(),
            },
          }
        ),
      
        LoginHistory.create({
          employeeId: employee._id,
          username: employee.username,
          ip,
          userAgent,
          success: true,
        }),
      ]);
      
      return success(
        {
          accessToken,
      
          user: {
            _id: employee._id.toString(),
            employeeCode: employee.employeeCode,
            username: employee.username,
            fullName: employee.fullName,
            email: employee.email,
            avatar: employee.avatar,
            role: role.code,
            permissions: permissionCodes,
          },
        },
        "Đăng nhập thành công"
      );
  } catch (error) {
    console.error("Login error:", error);

    return errorResponse("Không thể đăng nhập lúc này", 500);
  }
}