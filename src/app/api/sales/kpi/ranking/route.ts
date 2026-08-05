/**
 * ==================================================
 * SALES KPI RANKING API
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * GET /api/sales/kpi/ranking
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
 * GET /api/sales/kpi/ranking
 * Get KPI ranking data.
 */
export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("sales.kpi.view")) {
      return forbidden("Bạn không có quyền xem KPI");
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const limit = parseInt(searchParams.get("limit") ?? "5");

    const rankingData = await salesKPIService.getKPIRanking(month, year, limit);

    return NextResponse.json(rankingData);
  } catch (error) {
    console.error("[SALES KPI RANKING API]", error);
    return serverError("Không thể lấy dữ liệu ranking KPI");
  }
}
