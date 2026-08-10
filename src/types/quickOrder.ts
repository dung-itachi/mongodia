/**
 * ==================================================
 * QUICK ORDER IMPORT TYPES
 * ==================================================
 *
 * Sprint 9.x - Quick Order Import
 *
 * Types for Quick Order Import feature.
 * Supports paste from Excel / Google Sheets / Facebook export.
 */

import type { Types } from "mongoose";

// ==================================================
// Parsed Row (from parser)
// ==================================================

/** Severity of a single validation issue. */
export type QuickOrderValidationSeverity = "ERROR" | "WARNING";

/** Stable codes used by the UI to highlight specific cells. */
export type QuickOrderValidationCode =
  // Required fields
  | "MISSING_CUSTOMER_NAME"
  | "MISSING_PHONE"
  // Phone
  | "PHONE_INVALID"
  // Product
  | "PRODUCT_NOT_FOUND"
  // Combo
  | "COMBO_NOT_FOUND"
  | "COMBO_NOT_BELONG_TO_PRODUCT"
  // Price
  | "PRICE_INVALID"
  | "PRICE_NEGATIVE"
  // Duplicate
  | "DUPLICATE_ORDER";

export interface QuickOrderValidationIssue {
  code: QuickOrderValidationCode;
  message: string;
  severity: QuickOrderValidationSeverity;
  /** Field the issue is attached to (used for cell highlighting). */
  field?: "customerName" | "phone" | "address" | "product" | "combo" | "price" | "row";
}

export type QuickOrderValidationStatus = "VALID" | "INVALID";

/**
 * Base interface for parsed row (without validation/matching fields).
 * Used by the parser output.
 */
export interface QuickOrderParsedRowBase {
  rowNumber: number;
  timestamp?: string;
  customerName: string;
  phone: string;
  address: string;
  comboText: string;
  productText: string;
  priceText: string;
  raw: string[];
}

/**
 * Result of parsing a single row.
 * Contains both raw data and matched references.
 */
export interface ParsedQuickOrderRow extends QuickOrderParsedRowBase {

  // Matched references
  productId?: string;
  productCode?: string;
  productName?: string;
  comboId?: string;
  comboCode?: string;
  comboName?: string;
  comboPrice?: number;

  // Customer
  customerId?: string;
  isNewCustomer: boolean;

  // Validation
  status: QuickOrderValidationStatus;
  errors: QuickOrderValidationIssue[];

  // Duplicate detection
  isDuplicate: boolean;
  duplicateReason?: string;

  // Exchange rate snapshot
  exchangeRate?: number;
  exchangeRateDate?: Date;
}

// ==================================================
// Parse Result
// ==================================================

export interface QuickOrderParseResult {
  rows: ParsedQuickOrderRow[];
  totalRows: number;
  validCount: number;
  invalidCount: number;
  warningCount: number;
}

// ==================================================
// Context (from validation service)
// ==================================================

export interface QuickOrderProductRef {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

export interface QuickOrderComboRef {
  id: string;
  code: string;
  name: string;
  productId: string;
  sellingPrice: number;
  giftQuantity: number;
  isActive: boolean;
}

export interface QuickOrderCustomerRef {
  id: string;
  customerCode: string;
  fullName: string;
  phone: string;
  address?: string;
  isActive: boolean;
}

/**
 * Context for Quick Order Import validation.
 * Contains cached reference data loaded from DB.
 */
export interface QuickOrderImportContext {
  productsByCode: Map<string, QuickOrderProductRef>;
  productsByName: Map<string, QuickOrderProductRef>;
  combosByCode: Map<string, QuickOrderComboRef>;
  combosByProductId: Map<string, QuickOrderComboRef[]>;
  customersByPhone: Map<string, QuickOrderCustomerRef>;

  // Exchange rate
  exchangeRate: number;
  exchangeRateDate: Date;

  /** When the snapshot was loaded. */
  loadedAt: number;
}

// ==================================================
// Combo Candidates (for UI selection)
// ==================================================

export interface QuickOrderComboCandidate {
  id: string;
  code: string;
  name: string;
  productId: string;
  productName: string;
  sellingPrice: number;
  giftQuantity: number;
  matchScore: number;
}

// ==================================================
// Editable Row (for UI preview)
// ==================================================

export interface EditableQuickOrderRow extends ParsedQuickOrderRow {
  // Editable fields (user can modify before import)
  editableCustomerName: string;
  editablePhone: string;
  editableAddress: string;
  editableProductId?: string;
  editableComboId?: string;
  editableQuantity: number;
  editablePrice: number;
  editableNote: string;

  // Combo candidates if multiple matches
  comboCandidates: QuickOrderComboCandidate[];
}

// ==================================================
// Import Result
// ==================================================

export interface QuickOrderImportResult {
  createdOrders: number;
  createdCustomers: number;
  skippedRows: number;
  errors: Array<{ rowNumber: number; message: string }>;
  elapsedTime: number;
}

// ==================================================
// Editable Row Update (from UI)
// ==================================================

export interface UpdateEditableRowInput {
  rowIndex: number;
  field: keyof Pick<
    EditableQuickOrderRow,
    | "editableCustomerName"
    | "editablePhone"
    | "editableAddress"
    | "editableProductId"
    | "editableComboId"
    | "editableQuantity"
    | "editablePrice"
    | "editableNote"
  >;
  value: string | number;
}
