import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import FacebookPageAssignment from "@/models/FacebookPageAssignment";
import FacebookPage from "@/models/FacebookPage";
import Employee from "@/models/Employee";

import {
  mapFacebookPageAssignment,
  mapFacebookPageAssignmentList,
} from "@/mappers/facebook-page-assignment.mapper";

import {
  createFacebookPageAssignmentSchema,
} from "@/utils/validator";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "facebook-page-assignment.view"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xem phân công Facebook Page",
        403
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const facebookPageId = searchParams.get("facebookPageId") ?? "";
    const marketingEmployeeId = searchParams.get("marketingEmployeeId") ?? "";
    const isActive = searchParams.get("isActive");

    const filter: Record<string, unknown> = {};

    if (facebookPageId) {
      filter.facebookPageId = facebookPageId;
    }

    if (marketingEmployeeId) {
      filter.marketingEmployeeId = marketingEmployeeId;
    }

    if (isActive !== null && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      FacebookPageAssignment.find(filter)
        .populate("facebookPageId", "_id code name")
        .populate("marketingEmployeeId", "_id employeeCode fullName")
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FacebookPageAssignment.countDocuments(filter),
    ]);

    return success({
      items: items.map(mapFacebookPageAssignmentList),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("FacebookPageAssignment List Error:", error);

    return errorResponse(
      "Không thể lấy danh sách phân công Facebook Page",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (
      !currentUser.permissions.includes(
        "facebook-page-assignment.create"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền tạo phân công Facebook Page",
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
      createFacebookPageAssignmentSchema.safeParse(body);

    if (!parsedBody.success) {
      return errorResponse(
        parsedBody.error.issues[0]?.message ??
          "Dữ liệu không hợp lệ",
        400
      );
    }

    const data = parsedBody.data;

    // Rule 1: facebookPageId phải tồn tại
    const existedFacebookPage = await FacebookPage.exists({
      _id: data.facebookPageId,
    });

    if (!existedFacebookPage) {
      return errorResponse(
        "Facebook Page không tồn tại",
        400
      );
    }

    // Rule 2: marketingEmployeeId phải tồn tại
    const existedEmployee = await Employee.exists({
      _id: data.marketingEmployeeId,
    });

    if (!existedEmployee) {
      return errorResponse(
        "Nhân viên marketing không tồn tại",
        400
      );
    }

    // Rule 3: marketingEmployeeId phải là nhân viên có Role = MKT
    const employee = await Employee.findById(data.marketingEmployeeId)
      .populate("roleId", "_id code")
      .lean();

    if (!employee || !employee.roleId) {
      return errorResponse(
        "Nhân viên marketing không tồn tại",
        400
      );
    }

    const roleIdObj = employee.roleId as unknown as { _id: string; code: string };
    if (roleIdObj.code !== "MKT") {
      return errorResponse(
        "Nhân viên phải có vai trò MKT",
        400
      );
    }

    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    // Rule 5 (chạy trước Rule 4): Xử lý assignment hiện tại (endDate = null)
    // Nếu tạo assignment mới với endDate = null và đã có assignment hiện tại:
    //   - Auto-close assignment hiện tại với endDate = startDate - 1 ngày
    //   - Áp dụng cho mọi startDate (>= current.startDate) để hỗ trợ chuyển giao MKT tại thời điểm hiện tại.
    //   - Riêng trường hợp startDate mới < current.startDate mới báo lỗi.
    let closingAssignmentId: string | null = null;
    if (endDate === null) {
      const currentAssignment = await FacebookPageAssignment.findOne({
        facebookPageId: data.facebookPageId,
        endDate: null,
        isActive: true,
      });

      if (currentAssignment) {
        if (startDate < currentAssignment.startDate) {
          return errorResponse(
            "Ngày bắt đầu phải lớn hơn hoặc bằng ngày bắt đầu của Assignment hiện tại",
            409
          );
        }

        const newEndDate = new Date(data.startDate);
        newEndDate.setDate(newEndDate.getDate() - 1);

        await FacebookPageAssignment.updateOne(
          { _id: currentAssignment._id },
          { $set: { endDate: newEndDate } }
        );
        closingAssignmentId = currentAssignment._id.toString();
      }
    }

    // Rule 4: Không được có 2 Assignment chồng thời gian (loại trừ assignment vừa bị auto-close)
    const overlappingFilter: Record<string, unknown> = {
      facebookPageId: data.facebookPageId,
      isActive: true,
    };

    if (closingAssignmentId) {
      overlappingFilter._id = { $ne: closingAssignmentId };
    }

    if (endDate) {
      overlappingFilter.$or = [
        {
          $and: [
            { startDate: { $lte: endDate } },
            { $or: [{ endDate: null }, { endDate: { $gte: startDate } }] },
          ],
        },
        {
          $and: [
            { startDate: { $gte: startDate } },
            { startDate: { $lte: endDate } },
          ],
        },
      ];
    } else {
      // endDate = null (Assignment mới là hiện tại)
      overlappingFilter.$or = [
        { endDate: null },
        { endDate: { $gte: startDate } },
      ];
    }

    const overlapping = await FacebookPageAssignment.findOne(
      overlappingFilter
    );

    if (overlapping) {
      return errorResponse(
        "Facebook Page đã có Assignment trong khoảng thời gian này",
        409
      );
    }

    const assignment = await FacebookPageAssignment.create({
      facebookPageId: data.facebookPageId,
      marketingEmployeeId: data.marketingEmployeeId,
      startDate: new Date(data.startDate),
      endDate: endDate,
      note: data.note ?? "",
    });

    const populatedAssignment = await FacebookPageAssignment.findById(
      assignment._id
    )
      .populate("facebookPageId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .lean();

    return success(
      mapFacebookPageAssignment(populatedAssignment!),
      "Tạo phân công Facebook Page thành công"
    );
  } catch (error) {
    console.error("Create FacebookPageAssignment Error:", error);

    return errorResponse(
      "Không thể tạo phân công Facebook Page",
      500
    );
  }
}
