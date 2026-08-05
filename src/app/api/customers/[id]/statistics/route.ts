/**
 * ==================================================
 * CUSTOMER STATISTICS API
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * GET /api/customers/:id/statistics
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { success, error as errorResponse } from "@/utils/response";
import { customerService } from "@/services/customer/customer.service";

function badRequest(message: string) {
  return errorResponse(message, 400);
}

function notFound(message: string) {
  return errorResponse(message, 404);
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

    if (!currentUser.permissions.includes("customer.view")) {
      return forbidden("Bạn không có quyền xem khách hàng");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID không hợp lệ");
    }

    const customer = await customerService.getById(id);
    if (!customer) {
      return notFound("Khách hàng không tồn tại");
    }

    const statistics = await customerService.getStatistics(id);

    return success(statistics);
  } catch (error) {
    console.error("Customer Statistics Error:", error);
    return serverError("Không thể lấy thống kê khách hàng");
  }
}
