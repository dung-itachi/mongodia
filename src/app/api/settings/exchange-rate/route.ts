/**
 * GET /api/settings/exchange-rate
 * PUT /api/settings/exchange-rate
 *
 * Returns/updates the active exchange rate (1 MNT → VND) used for Order
 * snapshotting and revenue reporting.
 *
 * Authorization (Sprint 8.x+ — Public Read):
 *   - GET requires authentication only (any logged-in user). The rate is
 *     a global, non-secret configuration that the FE needs to render
 *     MNT↔VND toggles on /leads, /marketing/orders, the order detail
 *     page, the dashboard, and the leads reconciliation panel. Without
 *     this, SALE/MKT/... hit 403 whenever they load those pages.
 *   - PUT requires `system-settings.manage` (or legacy `settings.exchange_rate.update`)
 *     so only Admin/Manager can mutate the setting.
 *
 * IMPORTANT: Writing a new rate does NOT recalculate any existing Order
 * documents. Each Order carries its own snapshot (`exchangeRate`,
 * `exchangeRateDate`) — see `lib/system-settings.ts` for the contract.
 *
 * Business: Order prices are stored in MNT (₮). Exchange rate converts
 * MNT → VND for reporting purposes only.
 */

import { getCurrentUser, UnauthorizedError } from "@/lib/auth";
import {
  getCurrentExchangeRate,
  setExchangeRate,
} from "@/lib/system-settings";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: Request) {
  try {
    // Public read for any authenticated user. The rate is a global,
    // non-secret value that FE needs to render MNT↔VND toggles.
    // Restricting this to admin caused 403s on /leads, /marketing/orders,
    // /dashboard, and the leads reconciliation panel for non-admin roles
    // — see Sprint 8.x public-read.
    await getCurrentUser(request);

    const value = await getCurrentExchangeRate();
    return success(value);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return errorResponse(err.message, 401);
    }
    console.error("Get Exchange Rate Error:", err);
    return errorResponse("Không thể lấy tỷ giá", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    const hasManage =
      currentUser.permissions.includes("*") ||
      currentUser.permissions.includes("system-settings.manage") ||
      currentUser.permissions.includes("settings.exchange_rate.update");
    if (!hasManage) {
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
