import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { mapEmployeeList } from "@/mappers/employee.mapper";

import Employee from "@/models/Employee";
import Role from "@/models/Role";
import Team from "@/models/Team";

import { createEmployeeSchema } from "@/utils/validator";
import { error as errorResponse, success } from "@/utils/response";
import { hashPassword } from "@/utils/bcrypt";
import { generateEmployeeCode } from "@/lib/generateEmployeeCode";
const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
    createdAt_desc: {
        createdAt: -1,
    },
    createdAt_asc: {
        createdAt: 1,
    },
    fullName_asc: {
        fullName: 1,
    },
    fullName_desc: {
        fullName: -1,
    },
    employeeCode_asc: {
        employeeCode: 1,
    },
    employeeCode_desc: {
        employeeCode: -1,
    },
};

export async function GET(request: Request) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("employee.view")) {
            return errorResponse("Bạn không có quyền xem nhân viên", 403);
        }

        const { searchParams } = new URL(request.url);

        const keyword = searchParams.get("keyword")?.trim() ?? "";
        const role = searchParams.get("role")?.trim() ?? "";
        const team = searchParams.get("team")?.trim() ?? "";
        const isActive = searchParams.get("isActive");
        const sort = searchParams.get("sort") ?? "createdAt_desc";

        const sortQuery =
            SORT_OPTIONS[sort] ?? SORT_OPTIONS.createdAt_desc;

        const page = Math.max(1, Number(searchParams.get("page")) || 1);

        const pageSize = Math.min(
            100,
            Math.max(1, Number(searchParams.get("pageSize")) || 20)
        );

        const skip = (page - 1) * pageSize;

        await connectDB();

        const filter: any = {
            isActive: true,
        };

        if (isActive !== null) {
            filter.isActive = isActive === "true";
        }

        if (keyword) {
            filter.$or = [
                {
                    employeeCode: {
                        $regex: keyword,
                        $options: "i",
                    },
                },
                {
                    username: {
                        $regex: keyword,
                        $options: "i",
                    },
                },
                {
                    fullName: {
                        $regex: keyword,
                        $options: "i",
                    },
                },
                {
                    email: {
                        $regex: keyword,
                        $options: "i",
                    },
                },
            ];
        }

        if (role) {
            const roleDoc = await Role.findOne({
                code: role.toUpperCase(),
            }).select("_id");

            filter.roleId = roleDoc?._id ?? null;
        }

        if (team) {
            const teamDoc = await Team.findOne({
                code: team.toUpperCase(),
            }).select("_id");

            filter.teamId = teamDoc?._id ?? null;
        }

        const total = await Employee.countDocuments(filter);

        const employees = await Employee.find(filter)
            .sort(sortQuery)
            .skip(skip)
            .limit(pageSize)
            .populate({
                path: "roleId",
                select: "code name",
            })
            .populate({
                path: "teamId",
                select: "code name",
            })
            .select("-password")
            .lean();

        const items = employees.map(mapEmployeeList);

        return success({
            items,
            total,
            page,
            pageSize,
            totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),

            keyword,
            role,
            team,
            isActive: filter.isActive,
            sort,
        });
    } catch (error) {
        console.error("Employees API Error:", error);

        return errorResponse("Không thể lấy danh sách nhân viên", 500);
    }
}

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("employee.create")) {
            return errorResponse(
                "Bạn không có quyền tạo nhân viên",
                403
            );
        }

        await connectDB();

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return errorResponse("Dữ liệu không hợp lệ", 400);
        }

        const parsedBody = createEmployeeSchema.safeParse(body);

        if (!parsedBody.success) {
            return errorResponse(
                parsedBody.error.issues[0]?.message ??
                "Dữ liệu không hợp lệ",
                400
            );
        }

        const data = parsedBody.data;
        const role = await Role.findOne({
            code: data.roleCode.toUpperCase(),
        });

        if (!role) {
            return errorResponse("Vai trò không tồn tại", 400);
        }
        let team = null;

        if (data.teamCode) {
            team = await Team.findOne({
                code: data.teamCode.toUpperCase(),
            });

            if (!team) {
                return errorResponse("Nhóm không tồn tại", 400);
            }
        }
        const existedUsername = await Employee.exists({
            username: data.username.toLowerCase(),
        });

        if (existedUsername) {
            return errorResponse("Tên đăng nhập đã tồn tại", 400);
        }
        const existedEmail = await Employee.exists({
            email: data.email.toLowerCase(),
        });

        if (existedEmail) {
            return errorResponse("Email đã tồn tại", 400);
        }
        const employeeCode = await generateEmployeeCode();

        const hashedPassword = await hashPassword(data.password);
        const employee = await Employee.create({
            employeeCode,
          
            username: data.username.toLowerCase(),
          
            password: hashedPassword,
          
            fullName: data.fullName,
          
            email: data.email.toLowerCase(),
          
            phone: data.phone ?? "",
          
            avatar: data.avatar ?? "",
          
            roleId: role._id,
          
            teamId: team?._id ?? null,
          
            bankName: data.bankName ?? "",
          
            bankAccountNumber: data.bankAccountNumber ?? "",
          
            bankAccountHolder: data.bankAccountHolder ?? "",
          });
          const createdEmployee = await Employee.findById(employee._id)
          .populate({
            path: "roleId",
            select: "code name",
          })
          .populate({
            path: "teamId",
            select: "code name",
          })
          .select("-password")
          .lean();
          return success(createdEmployee, "Tạo nhân viên thành công");
    } catch (error) {
        console.error("Create Employee Error:", error);

        return errorResponse(
            "Không thể tạo nhân viên",
            500
        );
    }
}