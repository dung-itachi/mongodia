import mongoose from "mongoose";

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
} from "@/mappers/team.mapper";

import {
    updateTeamSchema,
} from "@/utils/validator";

import {
    error as errorResponse,
    success,
} from "@/utils/response";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("team.view")) {
            return errorResponse(
                "Bạn không có quyền xem Team",
                403
            );
        }

        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(
                "ID Team không hợp lệ",
                400
            );
        }

        const team = await Team.findById(id)
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

        if (!team) {
            return errorResponse(
                "Không tìm thấy Team",
                404
            );
        }

        return success(mapTeam(team));

    } catch (error) {
        console.error("Team Detail Error:", error);

        return errorResponse(
            "Không thể lấy thông tin Team",
            500
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("team.update")) {
            return errorResponse(
                "Bạn không có quyền cập nhật Team",
                403
            );
        }

        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(
                "ID Team không hợp lệ",
                400
            );
        }

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
            updateTeamSchema.safeParse(body);

        if (!parsedBody.success) {
            return errorResponse(
                parsedBody.error.issues[0]?.message ??
                "Dữ liệu không hợp lệ",
                400
            );
        }

        const data = parsedBody.data;

        const team = await Team.findById(id);

        if (!team) {
            return errorResponse(
                "Không tìm thấy Team",
                404
            );
        }

        const existedCode = await Team.findOne({
            code: data.code.toUpperCase(),
            _id: { $ne: id },
        });

        if (existedCode) {
            return errorResponse(
                "Mã Team đã tồn tại",
                400
            );
        }

        const existedName = await Team.findOne({
            name: data.name,
            _id: { $ne: id },
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

        team.code = data.code.toUpperCase();

        team.name = data.name;

        team.departmentId = department._id;

        team.areaId = area._id;

        team.leaderId = leader?._id ?? null;

        team.managerId = manager?._id ?? null;

        await team.save();

        const updatedTeam = await Team.findById(team._id)
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
            mapTeam(updatedTeam),
            "Cập nhật Team thành công"
        );

    } catch (error) {
        console.error("Update Team Error:", error);

        return errorResponse(
            "Không thể cập nhật Team",
            500
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const currentUser = await getCurrentUser(request);
  
      if (!currentUser.permissions.includes("team.delete")) {
        return errorResponse(
          "Bạn không có quyền xóa Team",
          403
        );
      }
  
      await connectDB();
  
      const { id } = await params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(
          "ID Team không hợp lệ",
          400
        );
      }
  
      const team = await Team.findById(id);
  
      if (!team) {
        return errorResponse(
          "Không tìm thấy Team",
          404
        );
      }
  
      team.isActive = false;
  
      await team.save();
  
      return success(
        null,
        "Xóa Team thành công"
      );
  
    } catch (error) {
      console.error("Delete Team Error:", error);
  
      return errorResponse(
        "Không thể xóa Team",
        500
      );
    }
  }