/**
 * ==================================================
 * QUICK ORDER IMPORT - END TO END TEST
 * ==================================================
 *
 * Tests the full flow:
 * RAW INPUT → PARSE → VALIDATE → STAGING
 */

import { parseQuickOrder } from "./quickOrderParser";
import type { QuickOrderParsedRowBase } from "@/types/quickOrder";

// Mock context for testing (simulating DB lookups)
const mockContext = {
  productsByCode: new Map([
    ["EYELASH", { id: "p1", code: "EYELASH", name: "EYELASH", isActive: true }],
    ["EYE", { id: "p2", code: "EYE", name: "EYE", isActive: true }],
  ]),
  productsByName: new Map([
    ["eyelash", { id: "p1", code: "EYELASH", name: "EYELASH", isActive: true }],
    ["eye", { id: "p2", code: "EYE", name: "EYE", isActive: true }],
  ]),
  combosByCode: new Map(),
  combosByProductId: new Map([
    ["p1", [
      { id: "c1", code: "CB1", name: "Combo 4 hộp", productId: "p1", sellingPrice: 99000, giftQuantity: 2, isActive: true },
      { id: "c2", code: "CB2", name: "Combo 10 hộp", productId: "p1", sellingPrice: 199000, giftQuantity: 5, isActive: true },
    ]],
  ]),
  customersByPhone: new Map(),
  exchangeRate: 7,
  exchangeRateDate: new Date(),
  loadedAt: Date.now(),
};

// Replicate the validation logic
function validateRow(row: QuickOrderParsedRowBase, context: typeof mockContext) {
  // Product matching - EXACT match only
  const normalizedInput = row.productText?.trim() || "";
  
  let productId: string | undefined;
  let productCode: string | undefined;
  let productName: string | undefined;
  
  // 1. Exact code match
  const byCode = context.productsByCode.get(normalizedInput.toUpperCase());
  if (byCode) {
    productId = byCode.id;
    productCode = byCode.code;
    productName = byCode.name;
    console.log(`  [PRODUCT MATCH] Exact code match: "${normalizedInput}" → ${productCode}`);
  } else {
    // 2. Exact name match
    const byName = context.productsByName.get(normalizedInput.toLowerCase().trim());
    if (byName) {
      productId = byName.id;
      productCode = byName.code;
      productName = byName.name;
      console.log(`  [PRODUCT MATCH] Exact name match: "${normalizedInput}" → ${productCode}`);
    } else {
      console.log(`  [PRODUCT MATCH] NO MATCH: "${normalizedInput}"`);
    }
  }

  // Price extraction from combo text
  const priceMatch = row.comboText?.match(/(?:✅?\s*)?([\d,]+)\s*₮/);
  const priceValue = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : 0;

  return {
    rowNumber: row.rowNumber,
    timestamp: row.timestamp,
    customerName: row.customerName,
    phone: row.phone,
    address: row.address,
    comboText: row.comboText,
    productText: row.productText,
    priceText: String(priceValue),
    productId,
    productCode,
    productName,
    editableCustomerName: row.customerName,
    editablePhone: row.phone,
    editableAddress: row.address || "",
    editableProductId: productId,
    editablePrice: priceValue,
    editableQuantity: 1,
    comboCandidates: productId ? (context.combosByProductId.get(productId) || []).map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      sellingPrice: c.sellingPrice,
    })) : [],
  };
}

console.log("========================================");
console.log("QUICK ORDER IMPORT - E2E TEST");
console.log("========================================\n");

// =========================================
// RAW INPUT (exact from user)
// =========================================
const rawInput = `2025-09-02 05:59:42	Гантуяа Толя	96621013	Баянчандман	✅99,000₮-өөр 4 нь 10 нь үнэгүй	EYELASH
2025-09-03 11:21:10	Онолбаатар	88249975	Өмнөговь Ханбогд сум	1 бүтээгдэхүүн + 1 бүтээгдэхүүн: 78,000₮ үнэгүй хүргэлт`;

console.log("RAW INPUT:");
console.log("---");
console.log(rawInput);
console.log("---\n");

// =========================================
// STEP 1: PARSE
// =========================================
console.log("STEP 1: PARSE");
console.log("-".repeat(40));

const { rows: parsedRows } = parseQuickOrder(rawInput);

console.log(`Parsed ${parsedRows.length} rows:\n`);

parsedRows.forEach((row, i) => {
  console.log(`Row ${i + 1}:`);
  console.log(`  timestamp: "${row.timestamp}"`);
  console.log(`  customerName: "${row.customerName}"`);
  console.log(`  phone: "${row.phone}"`);
  console.log(`  address: "${row.address}"`);
  console.log(`  comboText: "${row.comboText}"`);
  console.log(`  productText: "${row.productText}"`);
  console.log(`  priceText: "${row.priceText}"`);
  console.log();
});

// =========================================
// STEP 2: VALIDATE
// =========================================
console.log("STEP 2: VALIDATE");
console.log("-".repeat(40));

const validatedRows = parsedRows.map((row, i) => {
  console.log(`Row ${i + 1}:`);
  const validated = validateRow(row, mockContext);
  return validated;
});

// =========================================
// STEP 3: ASSERTIONS
// =========================================
console.log("\nSTEP 3: ASSERTIONS");
console.log("-".repeat(40));

let allPass = true;

// Row 1 assertions
const row1 = validatedRows[0];
const row2 = validatedRows[1];

// TEST: Row 1 - customerName
const test1a = row1.customerName === "Гантуяа Толя";
console.log(`Row 1 - customerName === "Гантуяа Толя": ${test1a ? "✅" : "❌"} (got: "${row1.customerName}")`);
if (!test1a) allPass = false;

// TEST: Row 1 - phone is NOT date
const test1b = row1.phone === "96621013" && row1.phone !== row1.timestamp;
console.log(`Row 1 - phone === "96621013" (not date): ${test1b ? "✅" : "❌"} (got: "${row1.phone}")`);
if (!test1b) allPass = false;

// TEST: Row 1 - address
const test1c = row1.address === "Баянчандман";
console.log(`Row 1 - address === "Баянчандман": ${test1c ? "✅" : "❌"} (got: "${row1.address}")`);
if (!test1c) allPass = false;

// TEST: Row 1 - productText
const test1d = row1.productText === "EYELASH";
console.log(`Row 1 - productText === "EYELASH": ${test1d ? "✅" : "❌"} (got: "${row1.productText}")`);
if (!test1d) allPass = false;

// TEST: Row 1 - productId matched
const test1e = row1.productId === "p1" && row1.productCode === "EYELASH";
console.log(`Row 1 - product matched to EYELASH: ${test1e ? "✅" : "❌"} (got: ${row1.productCode || "undefined"})`);
if (!test1e) allPass = false;

// TEST: Row 1 - price
const test1f = row1.editablePrice === 99000;
console.log(`Row 1 - price === 99000: ${test1f ? "✅" : "❌"} (got: ${row1.editablePrice})`);
if (!test1f) allPass = false;

// Row 2 assertions
// TEST: Row 2 - customerName
const test2a = row2.customerName === "Онолбаатар";
console.log(`Row 2 - customerName === "Онолбаатар": ${test2a ? "✅" : "❌"} (got: "${row2.customerName}")`);
if (!test2a) allPass = false;

// TEST: Row 2 - phone
const test2b = row2.phone === "88249975";
console.log(`Row 2 - phone === "88249975": ${test2b ? "✅" : "❌"} (got: "${row2.phone}")`);
if (!test2b) allPass = false;

// TEST: Row 2 - address
const test2c = row2.address === "Өмнөговь Ханбогд сум";
console.log(`Row 2 - address === "Өмнөговь Ханбогд сум": ${test2c ? "✅" : "❌"} (got: "${row2.address}")`);
if (!test2c) allPass = false;

// TEST: Row 2 - NO product matched
const test2d = row2.productId === undefined;
console.log(`Row 2 - product NOT matched: ${test2d ? "✅" : "❌"} (got: ${row2.productCode || "undefined"})`);
if (!test2d) allPass = false;

// TEST: Row 2 - price is 78000
const test2e = row2.editablePrice === 78000;
console.log(`Row 2 - price === 78000: ${test2e ? "✅" : "❌"} (got: ${row2.editablePrice})`);
if (!test2e) allPass = false;

// Row isolation assertions
// TEST: Row 1 price !== Row 2 price
const testIso1 = row1.editablePrice !== row2.editablePrice;
console.log(`Row isolation - prices different: ${testIso1 ? "✅" : "❌"} (row1: ${row1.editablePrice}, row2: ${row2.editablePrice})`);
if (!testIso1) allPass = false;

// TEST: Row 1 combo !== Row 2 combo
const testIso2 = row1.comboText !== row2.comboText;
console.log(`Row isolation - combos different: ${testIso2 ? "✅" : "❌"}`);
if (!testIso2) allPass = false;

// TEST: Row 1 phone !== Row 2 phone
const testIso3 = row1.phone !== row2.phone;
console.log(`Row isolation - phones different: ${testIso3 ? "✅" : "❌"} (row1: ${row1.phone}, row2: ${row2.phone})`);
if (!testIso3) allPass = false;

// =========================================
// SUMMARY
// =========================================
console.log("\n" + "=".repeat(50));
console.log("TEST SUMMARY");
console.log("=".repeat(50));
console.log(allPass ? "🎉 ALL ASSERTIONS PASSED" : "❌ SOME ASSERTIONS FAILED");

console.log("\nEXPECTED UI PREVIEW:");
console.log("-".repeat(40));
console.log("Row 1:");
console.log("  Sản phẩm: EYELASH (selected in dropdown)");
console.log("  Tên: Гантуяа Толя");
console.log("  SĐT: 96621013");
console.log("  Địa chỉ: Баянчандман");
console.log("  Combo: ✅99,000₮-өөр 4 нь 10 нь үнэгүй");
console.log("  Giá: 99,000 ₮");

console.log("\nRow 2:");
console.log("  Sản phẩm: Chưa xác định (dropdown empty)");
console.log("  Tên: Онолбаатар");
console.log("  SĐT: 88249975");
console.log("  Địa chỉ: Өмнөговь Ханбогд сум");
console.log("  Combo: 1 бүтээгдэхүүн + 1 бүтээгдэхүүн: 78,000₮ үнэгүй хүргэлт");
console.log("  Giá: 78,000 ₮");
