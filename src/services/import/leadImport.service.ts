/**
 * ==================================================
 * LEAD IMPORT - DB IMPORT SERVICE (Phase 3.6 refactored)
 * ==================================================
 *
 * Persists a batch of ParsedLead rows into MongoDB as ONE atomic
 * transaction. Either every row is committed or the whole batch
 * is rolled back.
 *
 * Pipeline (per row):
 *
 *   ParsedLead (status === "VALID")
 *     |
 *     | if customerId from context -> reuse existing Customer
 *     | else                        -> createCustomer() (CustomerService owns Counter)
 *     v
 *   Lead.create(customerId, ...)
 *     |
 *     v
 *   LeadHistory.create(leadId, action: CREATED, ...)
 *
 * Defaults (Area / Team / Marketing Employee) come from
 * `LeadImportDefaultsService`, which reads them from the `Setting`
 * collection. They are NEVER hardcoded here.
 *
 * The service does NOT:
 *   - Hardcode any reference code (PVD / SALE / EMP_MKT001 are
 *     admin-configured via Setting).
 *   - Rewrite / normalize the parser's `sourceType` - whatever the
 *     parser emits is what gets persisted.
 *   - Re-look-up Combo at import time - it reads the Combo id
 *     resolved earlier by the parser through `LeadImportContext`.
 *   - Manage the Customer counter - that's `CustomerService`'s job.
 *   - Handle Auto Assign Sale / Commission / Order.
 * ==================================================
 */

import mongoose, { ClientSession, Types } from "mongoose";

import Counter from "@/models/Counter";
import { Lead } from "@/models/Lead";
import { LeadHistory } from "@/models/LeadHistory";

import { LeadStatus } from "@/constants/leadStatus";
import { LeadAction } from "@/constants/leadAction";

import {
  createCustomer,
  CreateCustomerOptions,
} from "@/services/customer/customer.service";
import { loadLeadImportDefaults } from "@/services/import/leadImportDefaults.service";

import type { ParsedLead } from "@/utils/import/leadParser";
import type { LeadImportContext } from "@/services/import/leadImportValidation.service";

// ==================================================
// Types
// ==================================================

/** Result of a successful import. */
export interface LeadImportResult {
  /** Number of newly created Lead documents. */
  createdLead: number;
  /** Number of newly created Customer documents. */
  createdCustomer: number;
  /** Number of Customer documents that were reused (matched by context). */
  reusedCustomer: number;
  /** Total wall-clock time spent in the import (ms). */
  elapsedTime: number;
}

/** Thrown when the caller tries to import without simulating first. */
export class LeadImportNotReadyError extends Error {
  constructor() {
    super(
      "LeadImport: simulation.readyToImport phải === true trước khi gọi importLeads()."
    );
    this.name = "LeadImportNotReadyError";
  }
}

// ==================================================
// Counter helper (LEAD only - Customer is owned by CustomerService)
// ==================================================

async function nextLeadCode(session?: ClientSession): Promise<string> {
  const COUNTER_KEY = "LEAD";
  const updated = await Counter.findOneAndUpdate(
    { key: COUNTER_KEY },
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  )
    .session(session ?? null)
    .exec();
  const value = updated?.seq ?? 1;
  return `LE${String(value).padStart(6, "0")}`;
}

// ==================================================
// Source helpers
// ==================================================

/**
 * Tolerantly parse a numeric price cell. Mirrors the parser's
 * `parseNumericCell` so we don't introduce a second format.
 * Returns null when the value is not parseable.
 */
function parseNumericPrice(value: string): number | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const cleaned = trimmed.replace(/[^0-9.,-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === ",") {
    return null;
  }
  let normalized = cleaned;
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma >= 0 && lastDot === -1) {
    const parts = cleaned.split(",");
    const looksLikeThousand =
      parts.length > 2 || (parts.length === 2 && parts[0].length <= 3);
    normalized = looksLikeThousand
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

/**
 * Resolve Combo id from the parser's already-resolved context map.
 *
 * The parser produces a `row.combo` string (e.g. "CB001"); the
 * import service must NOT re-look-up by hitting the DB. We just
 * look up the Combo object id that `LeadImportContext.combosByCode`
 * already has in memory.
 */
function resolveComboIdFromContext(
  comboCode: string,
  context: LeadImportContext
): Types.ObjectId | null {
  const trimmed = (comboCode ?? "").trim();
  if (!trimmed) return null;
  const ref = context.combosByCode.get(trimmed.toUpperCase());
  if (!ref) return null;
  return new Types.ObjectId(ref.id);
}

// ==================================================
// Public API
// ==================================================

/**
 * Import a batch of VALID ParsedLead rows into the database.
 *
 * Contract:
 *   - Caller MUST call `simulateLeadImport` first and ensure
 *     `simulation.readyToImport === true` (the guard does this
 *     automatically unless `skipSimulationGuard: true`).
 *   - Rows with `status === "INVALID"` are ignored.
 *   - Whole batch runs in ONE transaction. Any failure rolls back
 *     every Customer / Lead / LeadHistory created by this call.
 *
 * @param rows     Rows produced by `parseLead` (do NOT re-validate).
 * @param context  Same context used at simulation time. Used to
 *                 resolve the existing Customer id (already matched)
 *                 and Combo id (already resolved by parser).
 * @param opts.employeeId  ObjectId of the Employee who performs the
 *                  import (used as `employeeId` on LeadHistory).
 * @param opts.skipSimulationGuard  When true (e.g. internal callers),
 *                  skip the `readyToImport` check. Default: false.
 */
export async function importLeads(
  rows: ParsedLead[],
  context: LeadImportContext,
  opts: {
    employeeId: string;
    skipSimulationGuard?: boolean;
  }
): Promise<LeadImportResult> {
  if (!opts?.employeeId) {
    throw new Error("LeadImport: opts.employeeId is required");
  }

  // ---- 1. Pre-flight simulation guard --------------------------------
  if (!opts.skipSimulationGuard) {
    const { simulateLeadImport } = await import(
      "@/services/import/leadImportSimulation.service"
    );
    const sim = simulateLeadImport(rows, context);
    if (!sim.readyToImport) {
      throw new LeadImportNotReadyError();
    }
  }

  const validRows = rows.filter(r => r.status === "VALID");
  if (validRows.length === 0) {
    return {
      createdLead: 0,
      createdCustomer: 0,
      reusedCustomer: 0,
      elapsedTime: 0,
    };
  }

  const started = Date.now();
  const defaults = await loadLeadImportDefaults();
  const employeeOid = new Types.ObjectId(opts.employeeId);

  let createdLead = 0;
  let createdCustomer = 0;
  let reusedCustomer = 0;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const row of validRows) {
        // ---- Customer resolution -------------------------------------
        let customerId: Types.ObjectId;
        if (row.customerId) {
          // Reuse the Customer the parser already matched by phone.
          customerId = new Types.ObjectId(row.customerId);
          reusedCustomer += 1;
        } else {
          // CustomerService owns the Customer counter.
          const customerOpts: CreateCustomerOptions = { session };
          const created = await createCustomer(
            {
              name: row.customerName,
              phone: row.phone,
              areaId: defaults.areaId,
              teamId: defaults.teamId,
              marketingEmployeeId: defaults.marketingEmployeeId,
            },
            customerOpts
          );
          customerId = created._id;
          createdCustomer += 1;
        }

        // ---- Lead ----------------------------------------------------
        const leadCode = await nextLeadCode(session);
        const priceNum = parseNumericPrice(row.price);

        // `row.sourceType` is taken verbatim from the parser. If empty,
        // the Lead model requires a value - in that case we treat it as
        // "OTHER" ONLY to satisfy the schema, but this is a schema
        // constraint, not a service-level rewrite.
        const rawSourceType = (row.sourceType ?? "").trim();
        const sourceType = rawSourceType === "" ? "OTHER" : rawSourceType;

        const created = await Lead.create(
          [
            {
              leadCode,
              customerId,
              customerName: row.customerName.trim(),
              phone: row.phone.trim(),
              comboId: resolveComboIdFromContext(row.combo, context) ?? undefined,
              unitPriceVND: priceNum ?? undefined,
              sourceType,
              status: LeadStatus.NEW,
              isDuplicate: row.isDuplicate,
              isActive: true,
            },
          ],
          { session }
        );
        const leadId = created[0]._id as Types.ObjectId;
        createdLead += 1;

        // ---- LeadHistory (CREATED) -----------------------------------
        await LeadHistory.create(
          [
            {
              leadId,
              employeeId: employeeOid,
              action: LeadAction.CREATED,
              newValue: LeadStatus.NEW,
              note: "Tạo Lead từ Import",
            },
          ],
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }

  return {
    createdLead,
    createdCustomer,
    reusedCustomer,
    elapsedTime: Date.now() - started,
  };
}
