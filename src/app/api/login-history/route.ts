import mongoose from "mongoose";

import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { error as errorResponse, success } from "@/utils/response";
import LoginHistory from "@/models/LoginHistory";
import Employee from "@/models/Employee";
import Team from "@/models/Team";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    await connectDB();

    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(params.get("pageSize")) || 20));
    const employeeIdParam = params.get("employeeId")?.trim();
    const search = params.get("search")?.trim();
    const successParam = params.get("success");
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const areaId = params.get("areaId")?.trim();
    const teamId = params.get("teamId")?.trim();

    // Build filter
    const filter: Record<string, unknown> = {};

    // Authorization
    const hasViewAll =
      currentUser.permissions.includes("*") ||
      currentUser.permissions.includes("login-history.viewAll");

    if (hasViewAll) {
      // Build employee filter based on area/team/search
      const employeeFilter: Record<string, unknown> = {};

      if (areaId && mongoose.isValidObjectId(areaId)) {
        // Filter by area - find all teams in this area, then employees in those teams
        const teams = await Team.find({ areaId: new mongoose.Types.ObjectId(areaId) })
          .select("_id")
          .lean();
        const teamIds = teams.map((t) => t._id);
        employeeFilter.teamId = { $in: teamIds };
      }

      if (teamId && mongoose.isValidObjectId(teamId)) {
        employeeFilter.teamId = new mongoose.Types.ObjectId(teamId);
      }

      if (search) {
        employeeFilter.$or = [
          { username: { $regex: search, $options: "i" } },
          { fullName: { $regex: search, $options: "i" } },
          { employeeCode: { $regex: search, $options: "i" } },
        ];
      }

      if (employeeIdParam && mongoose.isValidObjectId(employeeIdParam)) {
        employeeFilter._id = new mongoose.Types.ObjectId(employeeIdParam);
      }

      // Get matching employees
      const employees = await Employee.find(employeeFilter)
        .select("_id")
        .limit(50)
        .lean();

      if (employees.length > 0) {
        filter.employeeId = { $in: employees.map((e) => e._id) };
      } else if (search || employeeIdParam || areaId || teamId) {
        // No matching employees, return empty
        return success({
          items: [],
          total: 0,
          page,
          pageSize,
          totalPages: 1,
        });
      }
    } else {
      // Non-admin: can only see their own history
      filter.employeeId = currentUser.employee._id;
    }

    // Filter by success status
    if (successParam === "true") {
      filter.success = true;
    } else if (successParam === "false") {
      filter.success = false;
    }

    // Filter by date range
    if (startDate) {
      filter.loginAt = { ...(filter.loginAt as object || {}), $gte: new Date(startDate) };
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filter.loginAt = { ...(filter.loginAt as object || {}), $lte: endOfDay };
    }

    // Aggregate với $lookup để thay thế nested populate (1 round-trip thay vì 61).
    // Đồng thời đọc sẵn các field anomaly đã được persist trên doc
    // (`isUnusualIp`, `isUnusualDevice`, `anomalyReason`) — bỏ qua
    // `detectAnomalies` per-row vốn gây thêm N+1 round-trips.
    const basePipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      { $sort: { loginAt: -1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      {
        $lookup: {
          from: "employees",
          let: { eid: "$employeeId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$eid"] } } },
            {
              $project: {
                employeeCode: 1,
                fullName: 1,
                username: 1,
                avatar: 1,
                roleId: 1,
                teamId: 1,
                areaId: 1,
              },
            },
            {
              $lookup: {
                from: "roles",
                localField: "roleId",
                foreignField: "_id",
                as: "role",
                pipeline: [{ $project: { code: 1, name: 1 } }],
              },
            },
            {
              $lookup: {
                from: "teams",
                localField: "teamId",
                foreignField: "_id",
                as: "team",
                pipeline: [{ $project: { code: 1, name: 1 } }],
              },
            },
            {
              $lookup: {
                from: "areas",
                localField: "areaId",
                foreignField: "_id",
                as: "area",
                pipeline: [{ $project: { code: 1, name: 1 } }],
              },
            },
            { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$area", preserveNullAndEmptyArrays: true } },
          ],
          as: "employee",
        },
      },
      { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
    ];

    const [items, total] = await Promise.all([
      LoginHistory.aggregate(basePipeline),
      LoginHistory.countDocuments(filter),
    ]);

    const mappedItems = items.map((item: any) => {
      const emp = item.employee ?? {};
      return {
        _id: item._id.toString(),
        employeeId: emp._id?.toString() || "",
        employeeCode: emp.employeeCode || "",
        fullName: emp.fullName || "",
        username: emp.username || item.username || "",
        avatar: emp.avatar || "",
        role: emp.role
          ? { code: emp.role.code || "", name: emp.role.name || "" }
          : null,
        team: emp.team
          ? {
              _id: emp.team._id?.toString() || "",
              code: emp.team.code || "",
              name: emp.team.name || "",
            }
          : null,
        area: emp.area
          ? {
              _id: emp.area._id?.toString() || "",
              code: emp.area.code || "",
              name: emp.area.name || "",
            }
          : null,
        ip: item.ip || "",
        userAgent: item.userAgent || "",
        success: item.success,
        loginAt: item.loginAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        isTrusted: item.isTrusted || false,
        // Đọc trực tiếp flag đã persist trên doc — bỏ qua recompute per-row.
        isUnusualIp: item.isUnusualIp || false,
        isUnusualDevice: item.isUnusualDevice || false,
        isUnusualLocation: item.isUnusualLocation || false,
        anomalyReason: item.anomalyReason || "",
      };
    });

    return success({
      items: mappedItems,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return errorResponse(err.message, 401);
    }
    console.error("LoginHistory GET error:", err);
    return errorResponse("Không thể lấy lịch sử đăng nhập", 500);
  }
}
