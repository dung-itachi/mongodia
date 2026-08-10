/**
 * ==================================================
 * QUICK ORDER PARSER
 * ==================================================
 *
 * Sprint 9.x - Quick Order Import (Fixed)
 *
 * Pure parser for pasted TSV data from Excel / Google Sheets.
 *
 * RULES:
 * 1. Parse by TAB first - if input has tabs, columns have fixed positions
 * 2. Each row is parsed INDEPENDENTLY - no shared state
 * 3. Field detection by content type (date, phone, price, etc.)
 * 4. NO hardcoded products/combos - matching is done by validation service
 *
 * Expected TSV format:
 * DATE/TIME | NAME | PHONE | ADDRESS | COMBO_TEXT | PRODUCT
 *
 * Column count varies:
 * - 6 columns: all fields present
 * - 5 columns: no product (combo is last)
 * - 4 columns: name, phone, address, combo
 * - 3 columns: name, phone, combo
 */

import type { QuickOrderParsedRowBase } from "@/types/quickOrder";

// ==================================================
// Regex patterns
// ==================================================

/** Date/Time patterns */
const DATETIME_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/, // 2025-09-02 05:59:42
  /^\d{4}\/\d{2}\/\d{2}[\sT]\d{2}:\d{2}:\d{2}/, // 2025/09/02 05:59:42
  /^\d{2}-\d{2}-\d{4}[\sT]\d{2}:\d{2}:\d{2}/, // 02-09-2025 05:59:42
  /^\d{2}\/\d{2}\/\d{4}[\sT]\d{2}:\d{2}:\d{2}/, // 02/09/2025 05:59:42
];

/** Date only patterns */
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/, // 2025-09-02
  /^\d{4}\/\d{2}\/\d{2}$/, // 2025/09/02
  /^\d{2}-\d{2}-\d{4}$/, // 02-09-2025
  /^\d{2}\/\d{2}\/\d{4}$/, // 02/09/2025
];

/** Mongolia phone patterns (8 digits) */
const PHONE_PATTERN = /^[0]?\d{8}$/;

/** MNT price pattern */
const MNT_PRICE_PATTERN = /(?:✅?\s*)?([\d,]+)\s*₮/;

// ==================================================
// Helper functions
// ==================================================

function isDateTime(value: string): boolean {
  const trimmed = value.trim();
  return DATETIME_PATTERNS.some((p) => p.test(trimmed)) ||
         DATE_PATTERNS.some((p) => p.test(trimmed));
}

function isPhone(value: string): boolean {
  const trimmed = value.trim().replace(/[\s\-().]/g, "");
  return PHONE_PATTERN.test(trimmed);
}

function isEmpty(value: string): boolean {
  return !value || value.trim() === "";
}

/**
 * Extract price from MNT text.
 * Returns number in MNT, or null if not found.
 */
function extractPrice(text: string): number | null {
  const match = text.match(MNT_PRICE_PATTERN);
  if (match) {
    const priceStr = match[1].replace(/,/g, "");
    const price = parseInt(priceStr, 10);
    return isNaN(price) ? null : price;
  }
  return null;
}

// ==================================================
// Main parser
// ==================================================

/**
 * Parse pasted TSV text into structured rows.
 *
 * Strategy:
 * 1. Split by TAB (Excel/Sheets copy-paste)
 * 2. Map columns by position:
 *    - col[0]: DATE/TIME (if matches datetime pattern)
 *    - col[1]: CUSTOMER NAME
 *    - col[2]: PHONE (if matches phone pattern)
 *    - col[3]: ADDRESS (if no phone in col[2])
 *    - col[n-1]: PRODUCT (last column if many columns)
 *    - Remaining: COMBO TEXT (contains price or Mongolia words)
 * 3. Extract price from combo text
 *
 * @param text - Raw pasted TSV text
 * @returns Parsed rows
 */
export function parseQuickOrder(text: string): {
  rows: QuickOrderParsedRowBase[];
  totalRows: number;
} {
  if (!text || !text.trim()) {
    return { rows: [], totalRows: 0 };
  }

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { rows: [], totalRows: 0 };
  }

  const rows: QuickOrderParsedRowBase[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const columns = parseColumns(line);
    const row = parseRow(columns, i + 1);
    rows.push(row);
  }

  return { rows, totalRows: rows.length };
}

/**
 * Parse line into columns.
 * Primary separator: TAB (Excel/Sheets)
 * Fallback: multiple spaces
 */
function parseColumns(line: string): string[] {
  // Primary: TAB separator
  if (line.includes("\t")) {
    return line.split("\t").map((col) => col.trim());
  }

  // Fallback: multiple spaces (but preserve single spaces in names)
  // Split only on 2+ spaces to keep names intact
  const parts = line.split(/\s{2,}/);
  if (parts.length > 1) {
    return parts.map((col) => col.trim());
  }

  // If only one part, check if it looks like we should split by single space
  // But for names with spaces, this is risky - better to return as-is
  // unless it clearly looks like separate fields
  return [line.trim()];
}

/**
 * Parse a single row's columns into structured fields.
 *
 * Column mapping based on actual TSV export from Excel/Sheets:
 * - 6 columns: DATE | NAME | PHONE | ADDRESS | COMBO | PRODUCT
 * - 5 columns:   DATE | NAME | PHONE | ADDRESS | COMBO
 * - 4 columns:   NAME | PHONE | ADDRESS | COMBO
 * - 3 columns:   NAME | PHONE | COMBO
 */
function parseRow(columns: string[], rowNumber: number): QuickOrderParsedRowBase {
  // Initialize result
  const result: QuickOrderParsedRowBase = {
    rowNumber,
    timestamp: undefined,
    customerName: "",
    phone: "",
    address: "",
    comboText: "",
    productText: "",
    priceText: "",
    raw: columns,
  };

  const colCount = columns.length;
  if (colCount === 0) {
    return result;
  }

  // Step 1: Handle 6-column format (most common from Excel export)
  // Format: DATE | NAME | PHONE | ADDRESS | COMBO | PRODUCT
  if (colCount === 6) {
    // Column 0: DATE
    if (isDateTime(columns[0])) {
      result.timestamp = columns[0].trim();
    }
    // Column 1: NAME
    result.customerName = columns[1].trim();
    // Column 2: PHONE
    if (isPhone(columns[2])) {
      result.phone = columns[2].trim().replace(/[\s\-().]/g, "");
    }
    // Column 3: ADDRESS
    result.address = columns[3].trim();
    // Column 4: COMBO
    result.comboText = columns[4].trim();
    // Column 5: PRODUCT
    result.productText = columns[5].trim();

    // Extract price from combo
    const price = extractPrice(result.comboText);
    if (price !== null) {
      result.priceText = String(price);
    }

    return result;
  }

  // Step 2: Handle 5-column format
  // Format: DATE | NAME | PHONE | ADDRESS | COMBO
  if (colCount === 5) {
    // Column 0: DATE
    if (isDateTime(columns[0])) {
      result.timestamp = columns[0].trim();
    }
    // Column 1: NAME
    result.customerName = columns[1].trim();
    // Column 2: PHONE
    if (isPhone(columns[2])) {
      result.phone = columns[2].trim().replace(/[\s\-().]/g, "");
    }
    // Column 3: ADDRESS
    result.address = columns[3].trim();
    // Column 4: COMBO
    result.comboText = columns[4].trim();

    // Extract price from combo
    const price = extractPrice(result.comboText);
    if (price !== null) {
      result.priceText = String(price);
    }

    return result;
  }

  // Step 3: Handle 4-column format
  // Format: NAME | PHONE | ADDRESS | COMBO
  if (colCount === 4) {
    // Check if first column is date
    if (isDateTime(columns[0])) {
      result.timestamp = columns[0].trim();
    }

    // Find phone column
    let phoneIdx = -1;
    for (let i = 0; i < colCount; i++) {
      if (isPhone(columns[i])) {
        phoneIdx = i;
        result.phone = columns[i].trim().replace(/[\s\-().]/g, "");
        break;
      }
    }

    // Determine name, address, combo based on phone position
    if (phoneIdx === 1) {
      // Format: NAME | PHONE | ADDRESS | COMBO
      result.customerName = columns[0].trim();
      result.address = columns[2].trim();
      result.comboText = columns[3].trim();
    } else if (phoneIdx === 2) {
      // Format: ADDRESS | PHONE | NAME | COMBO (unusual)
      result.address = columns[0].trim();
      result.customerName = columns[2].trim();
      result.comboText = columns[3].trim();
    } else {
      // Fallback: use position
      result.customerName = columns[0].trim();
      result.address = columns[2].trim();
      result.comboText = columns[3].trim();
    }

    // Extract price from combo
    const price = extractPrice(result.comboText);
    if (price !== null) {
      result.priceText = String(price);
    }

    return result;
  }

  // Step 4: Handle 3-column format
  // Format: NAME | PHONE | COMBO
  if (colCount === 3) {
    // Check if first column is date
    if (isDateTime(columns[0])) {
      result.timestamp = columns[0].trim();
    }

    // Find phone column
    let phoneIdx = -1;
    for (let i = 0; i < colCount; i++) {
      if (isPhone(columns[i])) {
        phoneIdx = i;
        result.phone = columns[i].trim().replace(/[\s\-().]/g, "");
        break;
      }
    }

    // Determine name and combo
    if (phoneIdx === 1) {
      result.customerName = columns[0].trim();
      result.comboText = columns[2].trim();
    } else if (phoneIdx === 2) {
      result.customerName = columns[0].trim();
      result.comboText = columns[2].trim();
    } else {
      // Fallback
      result.customerName = columns[0].trim();
      result.comboText = columns[2].trim();
    }

    // Extract price from combo
    const price = extractPrice(result.comboText);
    if (price !== null) {
      result.priceText = String(price);
    }

    return result;
  }

  // Step 5: Handle variable columns (fallback)
  // Track used columns
  const usedCols = new Set<number>();
  let dateCol: number | null = null;
  let phoneCol: number | null = null;

  // Find DATE column
  if (isDateTime(columns[0])) {
    dateCol = 0;
    result.timestamp = columns[0].trim();
    usedCols.add(0);
  }

  // Find PHONE column
  for (let i = 1; i < colCount; i++) {
    if (isPhone(columns[i]) && phoneCol === null) {
      phoneCol = i;
      result.phone = columns[i].trim().replace(/[\s\-().]/g, "");
      usedCols.add(i);
      break;
    }
  }

  // Determine columns based on count
  const remainingCols = columns.map((_, i) => i).filter(i => !usedCols.has(i));
  const remainingCount = remainingCols.length;

  if (remainingCount >= 4) {
    // NAME | ADDRESS | COMBO | PRODUCT
    result.customerName = columns[remainingCols[0]].trim();
    result.address = columns[remainingCols[1]].trim();
    result.comboText = columns[remainingCols[2]].trim();
    if (remainingCount >= 5) {
      result.productText = columns[remainingCols[3]].trim();
    }
  } else if (remainingCount >= 3) {
    // NAME | ADDRESS | COMBO
    result.customerName = columns[remainingCols[0]].trim();
    result.address = columns[remainingCols[1]].trim();
    result.comboText = columns[remainingCols[2]].trim();
  } else if (remainingCount >= 2) {
    // NAME | COMBO
    result.customerName = columns[remainingCols[0]].trim();
    result.comboText = columns[remainingCols[1]].trim();
  } else if (remainingCount === 1) {
    result.customerName = columns[remainingCols[0]].trim();
  }

  // Extract price from combo
  const price = extractPrice(result.comboText);
  if (price !== null) {
    result.priceText = String(price);
  }

  return result;
}
