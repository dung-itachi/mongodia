/**
 * GET /api/settings/exchange-rate
 * PUT /api/settings/exchange-rate
 *
 * Returns/updates the active exchange rate (1 USD → MNT) used for Order
 * snapshotting. Requires `settings.exchange_rate.view` to read and
 * `settings.exchange_rate.update` to write.
 *
 * IMPORTANT: Writing a new rate does NOT recalculate any existing Order
 * documents. Each Order carries its own snapshot (`exchangeRate`,
 * `exchangeRateDate`) — see `lib/system-settings.ts` for the contract.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getCurrentExchangeRate,
  setExchangeRate,
} from "@/lib/system-settings";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("settings.exchange_rate.view")) {
      return errorResponse("Bạn không có quyền xem tỷ giá", 403);
    }

    const value = await getCurrentExchangeRate();
    return success(value);
  } catch (err) {
    console.error("Get Exchange Rate Error:", err);
    return errorResponse("Không thể lấy tỷ giá", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("settings.exchange_rate.update")) {
      return errorResponse("Bạn không có quyền cập nhật tỷ giá", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const rate = (body as { rate?: unknown }).rate;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) {
      return errorResponse("Tỷ giá phải là số dương", 400);
    }

    const employeeId = currentUser.employee?._id?.toString() ?? null;
    const saved = await setExchangeRate({
      rate,
      updatedBy: employeeId,
    });

    return success(saved, "Cập nhật tỷ giá thành công");
  } catch (err) {
    console.error("Update Exchange Rate Error:", err);
    if (err instanceof Error && err.message.includes("Tỷ giá phải là số dương")) {
      return errorResponse(err.message, 400);
    }
    return errorResponse("Không thể cập nhật tỷ giá", 500);
  }
}