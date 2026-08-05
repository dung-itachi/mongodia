/**
 * ==================================================
 * CUSTOMER ACTIVITIES API
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * GET /api/customers/:id/activities - List activities for a customer
 * POST /api/customers/:id/activities - Create activity for a customer
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { customerActivityService } from "@/services/customer-activity/customer-activity.service";
import { listCustomerActivitySchema } from "@/validators/customer-activity.validator";
import { createCustomerActivitySchema } from "@/validators/customer-activity.validator";

function badRequest(message: string) {
  return errorResponse(message, 400);
}

function forbidden(message: string) {
  return errorResponse(message, 403);
}

function serverError(message: string) {
  return errorResponse(message, 500);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer-activity.view")) {
      return forbidden("Bạn không có quyền xem hoạt động");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID khách hàng không hợp lệ");
    }

    const { searchParams } = new URL(request.url);
    const paramsObj: Record<string, unknown> = {};

    const keyword = searchParams.get("keyword");
    if (keyword) paramsObj.keyword = keyword;

    const activityType = searchParams.get("activityType");
    if (activityType) paramsObj.activityType = activityType;

    const result = searchParams.get("result");
    if (result) paramsObj.result = result;

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) paramsObj.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) paramsObj.dateTo = dateTo;

    const page = searchParams.get("page");
    if (page) paramsObj.page = parseInt(page);

    const pageSize = searchParams.get("pageSize");
    if (pageSize) paramsObj.pageSize = parseInt(pageSize);

    const sortField = searchParams.get("sortField");
    if (sortField) paramsObj.sortField = sortField;

    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder) paramsObj.sortOrder = sortOrder;

    const parsed = listCustomerActivitySchema.safeParse(paramsObj);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Tham số không hợp lệ");
    }

    const result_data = await customerActivityService.getByCustomer(id, {
      ...parsed.data,
      customerId: id,
    });

    return success(result_data);
  } catch (error) {
    console.error("Customer Activities List Error:", error);
    return serverError("Không thể lấy danh sách hoạt động");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer-activity.create")) {
      return forbidden("Bạn không có quyền tạo hoạt động");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID khách hàng không hợp lệ");
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest("Dữ liệu không hợp lệ");
    }

    // Validate input
    const parsed = createCustomerActivitySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    // Ensure customerId matches the URL param
    const input = {
      ...parsed.data,
      customerId: id,
      employeeId: currentUser.employee._id.toString(),
    };

    const result = await customerActivityService.create(input as never);

    if (!result.success) {
      return badRequest(result.error);
    }

    return success(result.data, "Tạo hoạt động thành công");
  } catch (error) {
    console.error("Create Customer Activity Error:", error);
    return serverError("Không thể tạo hoạt động");
  }
}
