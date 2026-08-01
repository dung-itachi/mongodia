/**
 * ==================================================
 * POST /api/leads/import
 * ==================================================
 *
 * Thin transport layer. NO business logic:
 *   1. Authenticate via getCurrentUser().
 *   2. Authorize via permission "lead.create".
 *   3. Parse + validate body (rows: ParsedLead[]).
 *   4. Build LeadImportContext (1 batch / domain).
 *   5. Delegate to LeadImportService.importLeads().
 *   6. Return service result.
 *
 * Any rollback / Counter / transaction responsibility stays inside
 * the service.
 * ==================================================
 */

import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser, UnauthorizedError, ForbiddenError } from "@/lib/auth";

import {
  simulateLeadImport,
} from "@/services/import/leadImportSimulation.service";
import {
  loadLeadImportContext,
} from "@/services/import/leadImportValidation.service";
import {
  importLeads,
  LeadImportResult,
  LeadImportNotReadyError,
} from "@/services/import/leadImport.service";

import { success, error as errorResponse } from "@/utils/response";

/** Wire-format body for /api/leads/import */
interface ImportLeadsBody {
  rows: unknown[];
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function POST(request: Request) {
  try {
    // ---- 1. Auth --------------------------------------------------
    const currentUser = await getCurrentUser(request);

    // ---- 2. Authorize --------------------------------------------
    if (!currentUser.permissions.includes("lead.create")) {
      return errorResponse("Bạn không có quyền tạo lead", 403);
    }

    // ---- 3. Parse body -------------------------------------------
    let body: ImportLeadsBody;
    try {
      const raw = (await request.json()) as unknown;
      if (!isObject(raw) || !Array.isArray(raw.rows)) {
        return errorResponse("Body không hợp lệ: cần { rows: ParsedLead[] }", 400);
      }
      body = raw as unknown as ImportLeadsBody;
    } catch {
      return errorResponse("Body không phải JSON hợp lệ", 400);
    }

    if (body.rows.length === 0) {
      return errorResponse("rows rỗng - không có gì để import", 400);
    }

    await connectDB();

    // ---- 4. Build context (1 batch / domain) --------------------
    const context = await loadLeadImportContext();

    // Service re-validates with simulateLeadImport + readyToImport guard.
    // We pass rows through directly; service owns the type narrowing via
    // the simulation guard (any non-ParsedLead will fail simulation).
    const rows = body.rows as never;

    // ---- 5. Delegate to service ---------------------------------
    let result: LeadImportResult;
    try {
      result = await importLeads(rows, context, {
        employeeId: currentUser.employee._id.toString(),
      });
    } catch (err) {
      if (err instanceof LeadImportNotReadyError) {
        // Surface the simulation so the caller knows why import was blocked.
        const sim = simulateLeadImport(rows, context);
        return errorResponse(
          `Import chưa sẵn sàng: errorCount=${sim.errorCount}, leadsToCreate=${sim.leadsToCreate}`,
          409
        );
      }
      throw err;
    }

    // ---- 6. Return result ---------------------------------------
    return success(result, "Import Lead thành công");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return errorResponse(err.message, 401);
    }
    if (err instanceof ForbiddenError) {
      return errorResponse(err.message, 403);
    }
    // eslint-disable-next-line no-console
    console.error("[POST /api/leads/import] Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Không thể import Lead",
      500
    );
  }
}
