/**
 * ==================================================
 * SALES TARGET API
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 *
 * PATCH /api/sales/target
 */

import { NextResponse } from "next/server";
import { salesKPIService } from "@/services/sales-kpi/sales-kpi.service";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { createSalesTargetSchema } from "@/validators/sales-target.validator";

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * PATCH /api/sales/target
 * Create or update sales target.
 */
export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("sales.kpi.update")) {
      return forbidden("Bạn không có quyền cập nhật target");
    }

    await connectDB();

    const body = await request.json();
    const validated = createSalesTargetSchema.parse(body);

    const result = await salesKPIService.upsertTarget({
      employeeId: validated.employeeId,
      month: validated.month,
      year: validated.year,
      targetRevenue: validated.targetRevenue,
      targetOrders: validated.targetOrders,
      targetCustomers: validated.targetCustomers,
      targetClosedLead: validated.targetClosedLead,
      note: validated.note,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[SALES TARGET API]", error);

    if (error instanceof Error && error.name === "ZodError") {
      return badRequest("Dữ liệu không hợp lệ");
    }

    return serverError("Không thể cập nhật target");
  }
}
