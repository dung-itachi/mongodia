/**
 * ==================================================
 * CUSTOMER API ROUTES
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * GET  /api/customers/:id     - Get customer detail
 * PATCH /api/customers/:id   - Update customer
 * DELETE /api/customers/:id  - Soft delete customer
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { success, error as errorResponse } from "@/utils/response";
import { customerService } from "@/services/customer/customer.service";
import { mapCustomer } from "@/mappers/customer.mapper";

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

    return success(mapCustomer(customer as unknown as Record<string, unknown>));
  } catch (error) {
    console.error("Customer Detail Error:", error);
    return serverError("Không thể lấy khách hàng");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer.update")) {
      return forbidden("Bạn không có quyền cập nhật khách hàng");
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

    const result = await customerService.update(id, body as never);

    if (!result.success) {
      return badRequest(result.error);
    }

    return success(result.data, "Cập nhật khách hàng thành công");
  } catch (error) {
    console.error("Update Customer Error:", error);
    return serverError("Không thể cập nhật khách hàng");
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer.delete")) {
      return forbidden("Bạn không có quyền xóa khách hàng");
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return badRequest("ID không hợp lệ");
    }

    const result = await customerService.delete(id);

    if (!result.success) {
      return badRequest(result.error);
    }

    return success(null, "Xóa khách hàng thành công");
  } catch (error) {
    console.error("Delete Customer Error:", error);
    return serverError("Không thể xóa khách hàng");
  }
}
