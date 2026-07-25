import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Team from "@/models/Team";
import Department from "@/models/Department";
import Area from "@/models/Area";
import Employee from "@/models/Employee";

import "@/models/Department";
import "@/models/Area";
import "@/models/Employee";

import {
  mapTeam,
  mapTeamList,
} from "@/mappers/team.mapper";

import {
  createTeamSchema,
} from "@/utils/validator";

import {
  error as errorResponse,
  success,
} from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("team.view")) {
      return errorResponse(
        "Bạn không có quyền xem Team",
        403
      );
    }

    await connectDB();

    const teams = await Team.find({
      isActive: true,
    })
      .sort({
        code: 1,
      })
      .populate({
        path: "departmentId",
        select: "code name",
      })
      .populate({
        path: "areaId",
        select: "code name",
      })
      .populate({
        path: "leaderId",
        select: "employeeCode fullName",
      })
      .populate({
        path: "managerId",
        select: "employeeCode fullName",
      })
      .lean();

    return success({
      items: teams.map(mapTeamList),
      total: teams.length,
    });

  } catch (error) {
    console.error("Team List Error:", error);

    return errorResponse(
      "Không thể lấy danh sách Team",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("team.create")) {
      return errorResponse(
        "Bạn không có quyền tạo Team",
        403
      );
    }

    await connectDB();

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Dữ liệu không hợp lệ",
        400
      );
    }

    const parsedBody =
      createTeamSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    const existedCode = await Team.exists({
      code: data.code.toUpperCase(),
    });

    if (existedCode) {
      return errorResponse(
        "Mã Team đã tồn tại",
        400
      );
    }

    const existedName = await Team.exists({
      name: data.name,
    });

    if (existedName) {
      return errorResponse(
        "Tên Team đã tồn tại",
        400
      );
    }

    const department = await Department.findOne({
      code: data.departmentCode.toUpperCase(),
    });

    if (!department) {
      return errorResponse(
        "Phòng ban không tồn tại",
        400
      );
    }

    const area = await Area.findOne({
      code: data.areaCode.toUpperCase(),
    });

    if (!area) {
      return errorResponse(
        "Khu vực không tồn tại",
        400
      );
    }

    let leader = null;

    if (data.leaderCode) {
      leader = await Employee.findOne({
        employeeCode: data.leaderCode.toUpperCase(),
      });

      if (!leader) {
        return errorResponse(
          "Leader không tồn tại",
          400
        );
      }
    }

    let manager = null;

    if (data.managerCode) {
      manager = await Employee.findOne({
        employeeCode: data.managerCode.toUpperCase(),
      });

      if (!manager) {
        return errorResponse(
          "Manager không tồn tại",
          400
        );
      }
    }

    const team = await Team.create({
      code: data.code.toUpperCase(),

      name: data.name,

      departmentId: department._id,

      areaId: area._id,

      leaderId: leader?._id ?? null,

      managerId: manager?._id ?? null,
    });

    const createdTeam = await Team.findById(team._id)
      .populate({
        path: "departmentId",
        select: "code name",
      })
      .populate({
        path: "areaId",
        select: "code name",
      })
      .populate({
        path: "leaderId",
        select: "employeeCode fullName",
      })
      .populate({
        path: "managerId",
        select: "employeeCode fullName",
      })
      .lean();

    return success(
      mapTeam(createdTeam),
      "Tạo Team thành công"
    );

  } catch (error) {
    console.error("Create Team Error:", error);

    return errorResponse(
      "Không thể tạo Team",
      500
    );
  }
}