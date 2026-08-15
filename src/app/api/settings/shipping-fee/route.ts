/**
 * GET /api/settings/shipping-fee
 * PUT /api/settings/shipping-fee
 *
 * Returns/updates the active shipping fee (system currency MNT) used as
 * the global baseline when aggregating order revenue: `combo total +
 * shipping fee`. Requires `settings.shipping_fee.view` to read and
 * `settings.shipping_fee.update` to write.
 *
 * IMPORTANT: Writing a new shipping fee does NOT recalculate any existing
 * Order documents. Each Order carries its own snapshot (`summary.shippingFee`,
 * `shipping.shippingFee`).
 *
 * Business: Phí ship cố định cộng vào tổng giá trị combo để ra doanh số đơn hàng.
 */

import { getCurrentUser } from "@/lib/auth";
import {
  getCurrentShippingFee,
  setShippingFee,
} from "@/lib/system-settings";
import { success, error as errorResponse } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("settings.shipping_fee.view")) {
      return errorResponse("Bạn không có quyền xem phí ship", 403);
    }

    const value = await getCurrentShippingFee();
    return success(value);
  } catch (err) {
    console.error("Get Shipping Fee Error:", err);
    return errorResponse("Không thể lấy phí ship", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("settings.shipping_fee.update")) {
      return errorResponse("Bạn không có quyền cập nhật phí ship", 403);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const raw = body as { fee?: unknown; currency?: unknown };
    const fee = raw.fee;
    if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) {
      return errorResponse("Phí ship phải là số không âm", 400);
    }

    const allowedCurrencies = ["MNT", "VND", "USD"] as const;
    const currency = allowedCurrencies.find((c) => c === raw.currency) ?? "MNT";

    const employeeId = currentUser.employee?._id?.toString() ?? null;
    const saved = await setShippingFee({
      fee,
      currency,
      updatedBy: employeeId,
    });

    return success(saved, "Cập nhật phí ship thành công");
  } catch (err) {
    console.error("Update Shipping Fee Error:", err);
    if (err instanceof Error && err.message.includes("Phí ship")) {
      return errorResponse(err.message, 400);
    }
    return errorResponse("Không thể cập nhật phí ship", 500);
  }
}