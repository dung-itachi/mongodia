import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import FacebookPageAssignment from "@/models/FacebookPageAssignment";
import FacebookPage from "@/models/FacebookPage";
import Employee from "@/models/Employee";

import {
  mapFacebookPageAssignment,
} from "@/mappers/facebook-page-assignment.mapper";

import {
  updateFacebookPageAssignmentSchema,
} from "@/utils/validator";

import {
  success,
  error as errorResponse,
} from "@/utils/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID phân công Facebook Page không hợp lệ",
        400
      );
    }

    const assignment = await FacebookPageAssignment.findById(id)
      .populate("facebookPageId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .lean();

    if (!assignment) {
      return errorResponse(
        "Không tìm thấy phân công Facebook Page",
        404
      );
    }

    return success(mapFacebookPageAssignment(assignment));
  } catch (error) {
    console.error("FacebookPageAssignment Detail Error:", error);

    return errorResponse(
      "Không thể lấy thông tin phân công Facebook Page",
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

    if (
      !currentUser.permissions.includes(
        "facebook-page-assignment.update"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền cập nhật phân công Facebook Page",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID phân công Facebook Page không hợp lệ",
        400
      );
    }

    const existedAssignment = await FacebookPageAssignment.findById(id);

    if (!existedAssignment) {
      return errorResponse(
        "Không tìm thấy phân công Facebook Page",
        404
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
      updateFacebookPageAssignmentSchema.safeParse(body);

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

    // Rule 4: Không được có 2 Assignment chồng thời gian
    const overlappingFilter: Record<string, unknown> = {
      facebookPageId: data.facebookPageId,
      isActive: true,
      _id: { $ne: id },
    };

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

    // Rule 5: Nếu update thành endDate = null
    // thì kiểm tra Assignment hiện tại khác (endDate = null)
    if (endDate === null) {
      const currentAssignment = await FacebookPageAssignment.findOne({
        facebookPageId: data.facebookPageId,
        endDate: null,
        isActive: true,
        _id: { $ne: id },
      });

      if (currentAssignment) {
        // Nếu startDate mới <= startDate hiện tại thì không cho update
        if (startDate <= currentAssignment.startDate) {
          return errorResponse(
            "Ngày bắt đầu phải lớn hơn ngày bắt đầu của Assignment hiện tại",
            409
          );
        }

        // Nếu startDate mới > startDate hiện tại thì auto-close assignment hiện tại
        const newEndDate = new Date(data.startDate);
        newEndDate.setDate(newEndDate.getDate() - 1);

        await FacebookPageAssignment.updateOne(
          { _id: currentAssignment._id },
          { $set: { endDate: newEndDate } }
        );
      }
    }

    await FacebookPageAssignment.updateOne(
      { _id: id },
      {
        $set: {
          facebookPageId: data.facebookPageId,
          marketingEmployeeId: data.marketingEmployeeId,
          startDate: new Date(data.startDate),
          endDate: endDate,
          note: data.note ?? "",
          isActive: data.isActive,
        },
      }
    );

    const updatedAssignment = await FacebookPageAssignment.findById(id)
      .populate("facebookPageId", "_id code name")
      .populate("marketingEmployeeId", "_id employeeCode fullName")
      .lean();

    return success(
      mapFacebookPageAssignment(updatedAssignment!),
      "Cập nhật phân công Facebook Page thành công"
    );
  } catch (error) {
    console.error("Update FacebookPageAssignment Error:", error);

    return errorResponse(
      "Không thể cập nhật phân công Facebook Page",
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

    if (
      !currentUser.permissions.includes(
        "facebook-page-assignment.delete"
      )
    ) {
      return errorResponse(
        "Bạn không có quyền xóa phân công Facebook Page",
        403
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse(
        "ID phân công Facebook Page không hợp lệ",
        400
      );
    }

    const assignment = await FacebookPageAssignment.findById(id);

    if (!assignment) {
      return errorResponse(
        "Không tìm thấy phân công Facebook Page",
        404
      );
    }

    // Rule: Không được xóa Assignment nếu đang là Assignment hiện tại (endDate == null)
    if (assignment.endDate === null) {
      return errorResponse(
        "Không thể xóa Assignment đang có hiệu lực",
        400
      );
    }

    await FacebookPageAssignment.deleteOne({ _id: id });

    return success(
      null,
      "Xóa phân công Facebook Page thành công"
    );
  } catch (error) {
    console.error("Delete FacebookPageAssignment Error:", error);

    return errorResponse(
      "Không thể xóa phân công Facebook Page",
      500
    );
  }
}
