/**
 * ==================================================
 * CUSTOMER API ROUTES
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * GET  /api/customers     - List customers
 * POST /api/customers     - Create customer
 */

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import { success, error as errorResponse } from "@/utils/response";
import { customerService } from "@/services/customer/customer.service";
import { listCustomerSchema } from "@/validators/customer.validator";

function badRequest(message: string) {
  return errorResponse(message, 400);
}

function forbidden(message: string) {
  return errorResponse(message, 403);
}

function serverError(message: string) {
  return errorResponse(message, 500);
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer.view")) {
      return forbidden("Bạn không có quyền xem khách hàng");
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const params: Record<string, unknown> = {};

    const keyword = searchParams.get("keyword");
    if (keyword) params.keyword = keyword;

    const status = searchParams.get("status");
    if (status) params.status = status;

    const saleEmployeeId = searchParams.get("saleEmployeeId");
    if (saleEmployeeId) params.saleEmployeeId = saleEmployeeId;

    const marketingEmployeeId = searchParams.get("marketingEmployeeId");
    if (marketingEmployeeId) params.marketingEmployeeId = marketingEmployeeId;

    const facebookPageId = searchParams.get("facebookPageId");
    if (facebookPageId) params.facebookPageId = facebookPageId;

    const campaignId = searchParams.get("campaignId");
    if (campaignId) params.campaignId = campaignId;

    const dateFrom = searchParams.get("dateFrom");
    if (dateFrom) params.dateFrom = dateFrom;

    const dateTo = searchParams.get("dateTo");
    if (dateTo) params.dateTo = dateTo;

    const page = searchParams.get("page");
    if (page) params.page = parseInt(page);

    const pageSize = searchParams.get("pageSize");
    if (pageSize) params.pageSize = parseInt(pageSize);

    const sortField = searchParams.get("sortField");
    if (sortField) params.sortField = sortField;

    const sortOrder = searchParams.get("sortOrder");
    if (sortOrder) params.sortOrder = sortOrder;

    const parsed = listCustomerSchema.safeParse(params);
    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Tham số không hợp lệ");
    }

    const result = await customerService.getList(parsed.data);

    return success(result);
  } catch (error) {
    console.error("Customer List Error:", error);
    return serverError("Không thể lấy danh sách khách hàng");
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("customer.create")) {
      return forbidden("Bạn không có quyền tạo khách hàng");
    }

    await connectDB();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest("Dữ liệu không hợp lệ");
    }

    // Add createdBy from current user
    body.createdBy = currentUser.employee._id.toString();

    const result = await customerService.create(body as never);

    if (!result.success) {
      return badRequest(result.error);
    }

    return success(result.data, "Tạo khách hàng thành công");
  } catch (error) {
    console.error("Create Customer Error:", error);
    return serverError("Không thể tạo khách hàng");
  }
}
