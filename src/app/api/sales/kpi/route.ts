/**
 * ==================================================
 * SALES KPI API
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * GET /api/sales/kpi
 */

import { NextResponse } from "next/server";
import { salesKPIService } from "@/services/sales-kpi/sales-kpi.service";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * GET /api/sales/kpi
 * Get KPI data for dashboard.
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("sales.kpi.view")) {
      return forbidden("Bạn không có quyền xem KPI");
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId") ?? currentUser.employee?.toString() ?? "";
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

    const [kpiData, summary] = await Promise.all([
      salesKPIService.getEmployeeKPI(employeeId, month, year),
      salesKPIService.getKPISummary(month, year),
    ]);

    return NextResponse.json({
      current: kpiData,
      summary,
    });
  } catch (error) {
    console.error("[SALES KPI API]", error);
    return serverError("Không thể lấy dữ liệu KPI");
  }
}
