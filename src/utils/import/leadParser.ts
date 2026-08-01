/**
 * ==================================================
 * LEAD IMPORT PARSER
 * ==================================================
 *
 * Pure parser for pasted TSV lead data.
 * Returns a structured result (rows + diagnostics) so the UI layer
 * can render preview, statistics and error states without owning
 * any parsing logic.
 *
 * Pipeline:
 *   Parse  →  Mapping  →  Validation  →  Result
 *
 * This module is intentionally DATABASE-FREE:
 *   - NO Mongoose imports
 *   - NO direct DB queries
 *   - business-level lookups (Product / Combo / Facebook Page /
 *     Customer / Employee) are performed by
 *     `leadImportValidation.service.ts`, which batches them and
 *     passes the result through the optional `context` argument.
 *
 * Public API:
 *   parseLead(text, context?) → LeadParseResult
 *
 * Internal helpers (kept exported for testability / reuse):
 *   normalizeHeader(header)
 *   buildHeaderIndex(rawHeaderFields)
 *   parseRow(rawFields, columnIndex, rowNumber)
 *   validateRow(row, context?) → ValidationResult
 * ==================================================
 */

import {
  LEAD_IMPORT_HEADER_MAP,
  LEAD_IMPORT_REQUIRED_FIELDS,
  LeadImportField,
} from "@/constants/importHeaders";

import type { LeadImportContext } from "@/services/import/leadImportValidation.service";

// ==================================================
// Types
// ==================================================

/** Severity of a single validation issue. */
export type LeadValidationSeverity = "ERROR" | "WARNING";

/** Stable codes used by the UI to highlight specific cells / messages. */
export type LeadValidationCode =
  // Required fields
  | "MISSING_NAME"
  | "MISSING_PHONE"
  // Phone
  | "PHONE_INVALID"
  // Price
  | "PRICE_INVALID"
  | "PRICE_NEGATIVE"
  // Date
  | "DATE_INVALID"
  // Source type
  | "SOURCE_TYPE_INVALID"
  // Business-existence checks (Phase 3.3 hooks - reserved)
  | "PRODUCT_NOT_FOUND"
  | "COMBO_NOT_FOUND"
  | "FACEBOOK_PAGE_NOT_FOUND"
  | "CUSTOMER_NOT_FOUND"
  | "EMPLOYEE_NOT_FOUND";

export interface LeadValidationIssue {
  code: LeadValidationCode;
  message: string;
  severity: LeadValidationSeverity;
  /** Field the issue is attached to (used for cell highlighting). */
  field?: LeadImportField | "row";
}

export type LeadValidationStatus = "VALID" | "INVALID";

export interface ParsedLead {
  rowNumber: number;
  customerName: string;
  phone: string;
  combo: string;
  price: string;
  sourceType: string;
  date: string;
  raw: string[];
  status: LeadValidationStatus;
  errors: LeadValidationIssue[];
}

export interface LeadParseResult {
  rows: ParsedLead[];
  headers: string[];
  missing: LeadImportField[];
}

// ==================================================
// Validation constants
// Reused from project validator (Phase 3.2)
// ==================================================

/**
 * Vietnamese phone regex reused from src/utils/validator.ts
 * Format: bắt đầu bằng 0, theo sau bởi 9-10 chữ số.
 */
const VIETNAMESE_PHONE_REGEX = /^(0[0-9]{9,10})$/;

/** Lower-bound check cho price (>= 0). */
const PRICE_MIN = 0;

/** Allowed sourceType values (reused from createLeadSchema). */
const ALLOWED_SOURCE_TYPES = new Set([
  "LANDING_PAGE",
  "FACEBOOK_COMMENT",
  "FACEBOOK_INBOX",
  "TIKTOK",
  "ZALO",
  "OTHER",
]);

// ==================================================
// Internal helpers - Parsing
// ==================================================

/**
 * Normalize header text for lookup:
 *   - lowercase
 *   - trim leading/trailing whitespace
 *   - collapse internal whitespace
 *
 * Does NOT mutate the input.
 */
export function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Map a raw header row to an index of column → canonical field.
 * Returns `null` for columns that don't match any known header alias
 * (these columns will be ignored at parse time).
 */
export function buildHeaderIndex(
  rawHeaderFields: string[]
): Array<LeadImportField | null> {
  return rawHeaderFields.map(f => {
    const normalized = normalizeHeader(f);
    return LEAD_IMPORT_HEADER_MAP[normalized] ?? null;
  });
}

/**
 * Detect whether the first non-empty line looks like a header row.
 * A line is treated as a header if at least one of its cells
 * matches a known alias.
 */
export function hasHeaderRow(firstLineFields: string[]): boolean {
  return firstLineFields.some(f => normalizeHeader(f) in LEAD_IMPORT_HEADER_MAP);
}

/**
 * Parse a single data row using a pre-built column index.
 *
 * Rules:
 *   - columns beyond columnIndex.length are ignored (extra columns → skipped)
 *   - unknown columns (value `null` in columnIndex) are ignored silently
 */
export function parseRow(
  rawFields: string[],
  columnIndex: Array<LeadImportField | null>,
  rowNumber: number
): Omit<ParsedLead, "status" | "errors"> {
  const row: Omit<ParsedLead, "status" | "errors"> = {
    rowNumber,
    customerName: "",
    phone: "",
    combo: "",
    price: "",
    sourceType: "",
    date: "",
    raw: rawFields,
  };

  rawFields.forEach((value, fieldIdx) => {
    if (fieldIdx >= columnIndex.length) return; // extra column → ignore
    const target = columnIndex[fieldIdx];
    if (target) {
      (row[target] as string) = value;
    }
  });

  return row;
}

// ==================================================
// Internal helpers - Validation (Phase 3.2)
// ==================================================

/**
 * Parse a numeric cell (price / quantity) tolerantly.
 * Accepts strings that may include thousand separators (`100,000`,
 * `100.000`, leading currency symbols, surrounding whitespace).
 *
 * Returns null when the value cannot be interpreted as a number.
 */
function parseNumericCell(value: string): number | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;

  // Normalize: drop currency symbols / spaces. Keep digits, sign, dot & comma.
  const cleaned = trimmed.replace(/[^0-9.,-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === ",") {
    return null;
  }

  // If both `.` and `,` present, the right-most is the decimal separator.
  let normalized = cleaned;
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = cleaned.replace(/,/g, "");
    }
  } else if (lastComma >= 0 && lastDot === -1) {
    // Only commas. Treat commas as thousand separators (most common in VN import).
    const parts = cleaned.split(",");
    const looksLikeThousand = parts.length > 2 || (parts.length === 2 && parts[0].length <= 3);
    normalized = looksLikeThousand ? cleaned.replace(/,/g, "") : cleaned.replace(",", ".");
  } else {
    normalized = cleaned.replace(/,/g, "");
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function isNonEmpty(value: string): boolean {
  return value !== undefined && value !== null && String(value).trim().length > 0;
}

// ==================================================
// Issue builders
// ==================================================

function err(
  code: LeadValidationCode,
  message: string,
  field: LeadImportField | "row"
): LeadValidationIssue {
  return { code, message, severity: "ERROR", field };
}

function warn(
  code: LeadValidationCode,
  message: string,
  field: LeadImportField | "row"
): LeadValidationIssue {
  return { code, message, severity: "WARNING", field };
}

// ==================================================
// Business-existence checks (Phase 3.3 hook)
// ==================================================

/**
 * Hook for business-existence checks against the in-memory context.
 *
 * Currently returns NO issues — existence checks (Product / Combo /
 * Facebook Page / Customer / Employee) are intentionally deferred to
 * Phase 3.3 per project plan. The signature is finalised so the
 * parser/UI pipeline won't need to change later.
 *
 * The function reads only from the provided maps, never from the DB.
 */
export function validateBusinessRow(
  row: Omit<ParsedLead, "status" | "errors">,
  _context: LeadImportContext | undefined
): LeadValidationIssue[] {
  // Reserved for Phase 3.3 (Product / Combo / Page / Customer / Employee
  // existence + Duplicate detection + Auto-assign). Keeping the parser
  // API stable now means later phases just add issues here.
  return [];
}

// ==================================================
// Validation entry point
// ==================================================

/**
 * Validate a single parsed row.
 *
 * Errors block import. Warnings allow import.
 *
 * Phase 3.2 - format / required checks:
 *   - customerName, phone (required)
 *   - phone: must match VIETNAMESE_PHONE_REGEX
 *   - price: if present, parseable as number >= 0
 *   - date: if present, parseable as Date
 *   - sourceType: warning when value is not in the allowed enum set
 *
 * Phase 3.3 - business-existence checks:
 *   - delegated to `validateBusinessRow`, reads only from the
 *     in-memory `context` (no DB access from this module).
 */
export function validateRow(
  row: Omit<ParsedLead, "status" | "errors">,
  context?: LeadImportContext
): { status: LeadValidationStatus; errors: LeadValidationIssue[] } {
  const issues: LeadValidationIssue[] = [];

  // Required: customerName
  if (!isNonEmpty(row.customerName)) {
    issues.push(err("MISSING_NAME", "Thiếu tên khách hàng", "customerName"));
  }

  // Required: phone
  if (!isNonEmpty(row.phone)) {
    issues.push(err("MISSING_PHONE", "Thiếu số điện thoại", "phone"));
  } else if (!VIETNAMESE_PHONE_REGEX.test(row.phone.trim())) {
    issues.push(err("PHONE_INVALID", "Số điện thoại không hợp lệ", "phone"));
  }

  // Price (optional) - if present, must be >= 0
  if (isNonEmpty(row.price)) {
    const priceNum = parseNumericCell(row.price);
    if (priceNum === null) {
      issues.push(err("PRICE_INVALID", "Giá không hợp lệ", "price"));
    } else if (priceNum < PRICE_MIN) {
      issues.push(err("PRICE_NEGATIVE", "Giá không được âm", "price"));
    }
  }

  // Date (optional) - if present, must be parseable
  if (isNonEmpty(row.date)) {
    const parsed = new Date(row.date.trim());
    if (Number.isNaN(parsed.getTime())) {
      issues.push(err("DATE_INVALID", "Ngày không hợp lệ", "date"));
    }
  }

  // Source type (optional) - warning if not in allowed enum
  if (isNonEmpty(row.sourceType)) {
    if (!ALLOWED_SOURCE_TYPES.has(row.sourceType.trim())) {
      issues.push(
        warn(
          "SOURCE_TYPE_INVALID",
          `Loại nguồn "${row.sourceType}" không hợp lệ - sẽ được ghi nhận`,
          "sourceType"
        )
      );
    }
  }

  // Phase 3.3 hook - business-existence checks against cached context.
  // Currently no-op, but the slot is reserved.
  if (context) {
    issues.push(...validateBusinessRow(row, context));
  }

  const hasError = issues.some(i => i.severity === "ERROR");

  return {
    status: hasError ? "INVALID" : "VALID",
    errors: issues,
  };
}

/**
 * Run validation on a fully-parsed row and attach status + issues.
 */
export function validateAndFinalize(
  row: Omit<ParsedLead, "status" | "errors">,
  context?: LeadImportContext
): ParsedLead {
  const { status, errors } = validateRow(row, context);
  return { ...row, status, errors };
}

// ==================================================
// Public API
// ==================================================

/**
 * Parse pasted TSV lead text into structured rows.
 *
 * Returns:
 *   - rows:      parsed + validated leads (empty if header validation fails or input empty)
 *   - headers:   detected raw header cells (empty when no header row)
 *   - missing:   required header fields missing
 *                (non-empty → caller should show validation error)
 *
 * `context` is optional and forward-compatible. When provided, the
 * parser may run business-existence checks against the in-memory maps.
 * The parser itself NEVER queries the database.
 */
export function parseLead(
  text: string,
  context?: LeadImportContext
): LeadParseResult {
  if (!text || !text.trim()) {
    return { rows: [], headers: [], missing: [] };
  }

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], headers: [], missing: [] };
  }

  const firstLineFields = lines[0].split("\t").map(f => f.trim());

  let startIndex = 0;
  let columnIndex: Array<LeadImportField | null>;
  let headers: string[];

  if (hasHeaderRow(firstLineFields)) {
    startIndex = 1;
    columnIndex = buildHeaderIndex(firstLineFields);
    headers = firstLineFields;
  } else {
    // No header row → default positional mapping.
    columnIndex = [
      "customerName",
      "phone",
      "combo",
      "price",
      "sourceType",
      "date",
    ];
    headers = [];
  }

  // Validate required header fields.
  const mappedFields = new Set(columnIndex.filter((f): f is LeadImportField => f !== null));
  const missing = LEAD_IMPORT_REQUIRED_FIELDS.filter(f => !mappedFields.has(f));

  if (missing.length > 0) {
    return { rows: [], headers, missing };
  }

  // Parse  →  Mapping  →  Validation  →  Result
  const rows: ParsedLead[] = lines.slice(startIndex).map((line, idx) => {
    const fields = line.split("\t").map(f => f.trim());
    const rowNumber = startIndex + idx + 1;
    const draft = parseRow(fields, columnIndex, rowNumber);
    return validateAndFinalize(draft, context);
  });

  return { rows, headers, missing: [] };
}