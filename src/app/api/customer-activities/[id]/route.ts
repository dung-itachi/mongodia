/**
 * ==================================================
 * CUSTOMER ACTIVITY API
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * GET /api/customer-activities/:id - Get activity detail
 * PATCH /api/customer-activities/:id - Update activity
 * DELETE /api/customer-activities/:id - Delete activity
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { customerActivityService } from "@/services/customer-activity/customer-activity.service";
import { updateCustomerActivitySchema } from "@/validators/customer-activity.validator";
import { mapCustomerActivity } from "@/mappers/customer-activity.mapper";

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
      return badRequest("ID không hợp lệ");
    }

    const activity = await customerActivityService.getById(id);

    if (!activity) {
      return errorResponse("Hoạt động không tồn tại", 404);
    }

    return success(mapCustomerActivity(activity as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Get Customer Activity Error:", error);
    return serverError("Không thể lấy hoạt động");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer-activity.update")) {
      return forbidden("Bạn không có quyền cập nhật hoạt động");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID không hợp lệ");
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest("Dữ liệu không hợp lệ");
    }

    const parsed = updateCustomerActivitySchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
    }

    const result = await customerActivityService.update(id, parsed.data as never);

    if (!result.success) {
      return badRequest(result.error);
    }

    return success(result.data, "Cập nhật hoạt động thành công");
  } catch (error) {
    console.error("Update Customer Activity Error:", error);
    return serverError("Không thể cập nhật hoạt động");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer-activity.delete")) {
      return forbidden("Bạn không có quyền xóa hoạt động");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID không hợp lệ");
    }

    const result = await customerActivityService.delete(id);

    if (!result.success) {
      return badRequest(result.error);
    }

    return success(null, "Xóa hoạt động thành công");
  } catch (error) {
    console.error("Delete Customer Activity Error:", error);
    return serverError("Không thể xóa hoạt động");
  }
}
