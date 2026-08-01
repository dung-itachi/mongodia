/**
 * ==================================================
 * LEAD IMPORT - IMPORT SIMULATION SERVICE (Phase 3.5)
 * ==================================================
 *
 * Pure simulation of the Lead Import pipeline.
 * NEVER writes to the database, NEVER creates Customers or Leads,
 * NEVER opens a transaction. Only aggregates what WOULD happen if
 * the user pressed "Import" right now.
 *
 * Pipeline:
 *
 *   paste text
 *      |
 *      v
 *   parseLead(text, context)  -> ParsedLead[]
 *      |
 *      v
 *   simulateLeadImport(rows, context)
 *      |
 *      v
 *   LeadImportSimulation   <- consumed by LeadImportPreview
 *
 * Outputs (per LeadImportSimulation):
 *
 *   - totalRows
 *   - validRows / invalidRows / warningRows
 *   - leadsToCreate       (count of VALID rows that would become new Leads)
 *   - customersToCreate   (count of VALID rows with no matching Customer)
 *   - newCustomers        (alias of customersToCreate)
 *   - returningCustomers  (VALID rows matched to an existing Customer)
 *   - duplicatePhone      (matched by phone - Customer or Lead)
 *   - duplicateFacebook   (matched by Facebook link - reserved)
 *   - duplicateCustomer   (soft heuristic, reserved)
 *   - errorCount          (sum of ERROR issues across all rows)
 *   - warningCount        (sum of WARNING issues across all rows)
 *   - skippedRowNumbers   (INVALID rows that import would skip)
 *   - issueSummary        (grouped counts by LeadValidationCode)
 *
 * The contract is intentionally read-only: callers can render the
 * summary without worrying about side effects. The actual import
 * will be implemented in Phase 3.6 and is expected to consume the
 * SAME shape, then take action.
 * ==================================================
 */

import {
  LeadValidationCode,
  ParsedLead,
} from "@/utils/import/leadParser";

import type { LeadImportContext } from "@/services/import/leadImportValidation.service";

// ==================================================
// Types
// ==================================================

/**
 * Read-only summary describing what an import would do.
 * All counters are derived purely from the supplied ParsedLead rows
 * and the in-memory LeadImportContext; no DB access happens here.
 */
export interface LeadImportSimulation {
  /** Total number of parsed rows. */
  totalRows: number;

  /** Rows whose validation status === "VALID" (errors allowed if only warnings). */
  validRows: number;
  /** Rows whose validation status === "INVALID" (would be skipped on import). */
  invalidRows: number;
  /** Subset of validRows that carry at least one WARNING issue. */
  warningRows: number;

  /** Number of Lead documents the importer would create. */
  leadsToCreate: number;
  /** Number of Customer documents the importer would create. */
  customersToCreate: number;
  /** Alias of customersToCreate (UI label: "Khách mới"). */
  newCustomers: number;
  /** Number of Leads that would link to an existing Customer instead of creating one. */
  returningCustomers: number;

  /** Rows matched by phone (Customer or Lead). */
  duplicatePhone: number;
  /** Rows matched by Facebook link (reserved - 0 in current schema). */
  duplicateFacebook: number;
  /** Rows matched by soft Customer heuristic (reserved - 0). */
  duplicateCustomer: number;

  /** Total number of ERROR-severity issues across all rows. */
  errorCount: number;
  /** Total number of WARNING-severity issues across all rows. */
  warningCount: number;

  /**
   * True if the import button should be enabled.
   *
   * Definition: `errorCount === 0` AND `leadsToCreate > 0`.
   * The component must NOT recompute this — every consumer (Import
   * button, KPI card, API guard) reads the same field.
   */
  readyToImport: boolean;

  /**
   * Rough execution-time estimate, derived purely from `leadsToCreate`
   * for UX hinting only (e.g. "15 Lead → ~0.2s"). The model is intentionally
   * simple — actual time depends on transaction, indexes, history writes.
   */
  estimatedExecution: {
    /** Source count used for the estimate. */
    leadCount: number;
    /** Human-readable label, e.g. "~0.2s" or "~5s". */
    label: string;
  };

  /** Row numbers that import would skip (INVALID rows). */
  skippedRowNumbers: number[];

  /** Per-code counts of issues (ERROR + WARNING combined). */
  issueSummary: Record<string, number>;
}

// ==================================================
// Helpers
// ==================================================

function countIssueByCode(
  rows: ParsedLead[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    for (const issue of row.errors) {
      out[issue.code] = (out[issue.code] ?? 0) + 1;
    }
  }
  return out;
}

/**
 * Rough per-Lead cost model for UX hinting.
 *
 * Heuristic (ms per lead, additive):
 *   - Base write (Lead.create)                  ~20 ms
 *   - Counter increment + Customer lookup (avg) ~30 ms
 *   - LeadHistory inserts (1-3 rows / lead)     ~25 ms
 *
 * The point is NOT precision — just to show "~0.2s" for 15 leads and
 * "~5s" for 500 leads without making the user guess.
 */
function estimateExecutionMs(leadCount: number): number {
  if (leadCount <= 0) return 0;
  const PER_LEAD_MS = 75;
  return Math.round(leadCount * PER_LEAD_MS);
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "~0s";
  if (ms < 1000) return `~${ms}ms`;
  const seconds = ms / 1000;
  // 1 decimal when < 10s (e.g. "~0.2s"), integer otherwise (e.g. "~5s").
  const label = seconds < 10 ? seconds.toFixed(1) : Math.round(seconds).toString();
  return `~${label}s`;
}

// ==================================================
// Public API
// ==================================================

/**
 * Build a LeadImportSimulation from an already-parsed row set.
 *
 * The simulation NEVER mutates the database and NEVER opens a
 * transaction. It is a pure function of `rows` + `context`.
 *
 * Pass the SAME `ParsedLead[]` that the parser produced (do NOT
 * re-parse) so the simulation always agrees with the table the
 * user is looking at.
 *
 * `context` is currently unused (reserved for future phases that
 * simulate SKU resolution etc.); accepted to keep the signature
 * stable across Phase 3.5 → 3.6.
 */
export function simulateLeadImport(
  rows: ParsedLead[],
  _context?: LeadImportContext
): LeadImportSimulation {
  const totalRows = rows.length;

  let validRows = 0;
  let invalidRows = 0;
  let warningRows = 0;
  let leadsToCreate = 0;
  let customersToCreate = 0;
  let newCustomers = 0;
  let returningCustomers = 0;
  let duplicatePhone = 0;
  let duplicateFacebook = 0;
  let duplicateCustomer = 0;
  let errorCount = 0;
  let warningCount = 0;
  const skippedRowNumbers: number[] = [];

  for (const row of rows) {
    // ---- Issue counters -------------------------------------------------
    for (const issue of row.errors) {
      if (issue.severity === "ERROR") errorCount += 1;
      else if (issue.severity === "WARNING") warningCount += 1;
    }

    if (row.status === "INVALID") {
      invalidRows += 1;
      skippedRowNumbers.push(row.rowNumber);
      continue;
    }

    validRows += 1;
    if (row.errors.some(i => i.severity === "WARNING")) {
      warningRows += 1;
    }

    // ---- Duplicate breakdown -------------------------------------------
    if (row.isDuplicate) {
      switch (row.duplicateType) {
        case "PHONE":
          duplicatePhone += 1;
          break;
        case "FACEBOOK":
          duplicateFacebook += 1;
          break;
        case "CUSTOMER":
          duplicateCustomer += 1;
          break;
        // LEAD / NONE: tracked under "isDuplicate" but reserved buckets
      }
    }

    // ---- Create / link -------------------------------------------------
    // A VALID row always creates a Lead (current Phase 3.5 contract:
    // duplicates are INFO-only and still allowed).
    leadsToCreate += 1;

    // Customer is created only when no existing Customer was matched.
    if (row.customerId) {
      // Matched an existing Customer -> link, do not create.
      returningCustomers += 1;
    } else {
      // Either no duplicate, or duplicate is a Lead (no Customer link).
      customersToCreate += 1;
      newCustomers += 1;
    }
  }

  const totalMs = estimateExecutionMs(leadsToCreate);

  return {
    totalRows,
    validRows,
    invalidRows,
    warningRows,
    leadsToCreate,
    customersToCreate,
    newCustomers,
    returningCustomers,
    duplicatePhone,
    duplicateFacebook,
    duplicateCustomer,
    errorCount,
    warningCount,
    readyToImport: errorCount === 0 && leadsToCreate > 0,
    estimatedExecution: {
      leadCount: leadsToCreate,
      label: formatDuration(totalMs),
    },
    skippedRowNumbers,
    issueSummary: countIssueByCode(rows),
  };
}

/** Human-readable label for an issue code (uses parser's stable codes). */
export function describeIssueCode(code: LeadValidationCode): string {
  // Localised labels - keep in sync with parser's issue messages.
  const labels: Record<LeadValidationCode, string> = {
    MISSING_NAME: "Thiếu tên khách hàng",
    MISSING_PHONE: "Thiếu số điện thoại",
    PHONE_INVALID: "Số điện thoại không hợp lệ",
    PRICE_INVALID: "Giá không hợp lệ",
    PRICE_NEGATIVE: "Giá không được âm",
    DATE_INVALID: "Ngày không hợp lệ",
    SOURCE_TYPE_INVALID: "Loại nguồn không hợp lệ",
    PRODUCT_NOT_FOUND: "Không tìm thấy Product",
    COMBO_NOT_FOUND: "Không tìm thấy Combo",
    FACEBOOK_PAGE_NOT_FOUND: "Không tìm thấy Facebook Page",
    CUSTOMER_NOT_FOUND: "Không tìm thấy Customer",
    EMPLOYEE_NOT_FOUND: "Không tìm thấy Employee",
  };
  return labels[code] ?? code;
}