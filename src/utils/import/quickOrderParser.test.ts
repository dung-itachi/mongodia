/**
 * ==================================================
 * QUICK ORDER PARSER TESTS
 * ==================================================
 *
 * Sprint 9.x - Quick Order Import
 *
 * Test cases for TSV parsing:
 * - TEST A: Full row with all fields
 * - TEST B: Row without product
 * - TEST C: Exact match priority
 * - TEST D: Row isolation (price independence)
 * - TEST E: Multiple rows
 */

import { parseQuickOrder } from "./quickOrderParser";

console.log("========================================");
console.log("QUICK ORDER PARSER TESTS");
console.log("========================================\n");

// =========================================
// TEST A: Full row with all fields
// =========================================
console.log("TEST A: Full row with all fields");
console.log("-".repeat(40));

const testA = `2025-09-02 05:59:42\tГантуяа Толя\t96621013\tБаянчандман\t✅99,000₮-өөр 4 нь 10 нь үнэгүй\tEYELASH`;

const resultA = parseQuickOrder(testA);

console.log("Input:");
console.log(testA);
console.log("\nParsed:");
console.log("  rowNumber:", resultA.rows[0].rowNumber);
console.log("  timestamp:", resultA.rows[0].timestamp);
console.log("  customerName:", resultA.rows[0].customerName);
console.log("  phone:", resultA.rows[0].phone);
console.log("  address:", resultA.rows[0].address);
console.log("  comboText:", resultA.rows[0].comboText);
console.log("  productText:", resultA.rows[0].productText);
console.log("  priceText:", resultA.rows[0].priceText);

const testAPass =
  resultA.rows[0].timestamp === "2025-09-02 05:59:42" &&
  resultA.rows[0].customerName === "Гантуяа Толя" &&
  resultA.rows[0].phone === "96621013" &&
  resultA.rows[0].address === "Баянчандман" &&
  resultA.rows[0].comboText.includes("99,000₮") &&
  resultA.rows[0].productText === "EYELASH" &&
  resultA.rows[0].priceText === "99000";

console.log("\nExpected:");
console.log("  timestamp: 2025-09-02 05:59:42");
console.log("  customerName: Гантуяа Толя");
console.log("  phone: 96621013");
console.log("  address: Баянчандман");
console.log("  productText: EYELASH");
console.log("  priceText: 99000");

console.log("\n" + (testAPass ? "✅ TEST A PASSED" : "❌ TEST A FAILED"));

// =========================================
// TEST B: Row without product
// =========================================
console.log("\n" + "=".repeat(50));
console.log("TEST B: Row without product");
console.log("-".repeat(40));

const testB = `2025-09-03 11:21:10\tОнолбаатар\t88249975\tӨмнөговь Ханбогд сум\t1 бүтээгдэхүүн + 1 бүтээгдэхүүн: 78,000₮ үнэгүй хүргэлт`;

const resultB = parseQuickOrder(testB);

console.log("Input:");
console.log(testB);
console.log("\nParsed:");
console.log("  rowNumber:", resultB.rows[0].rowNumber);
console.log("  timestamp:", resultB.rows[0].timestamp);
console.log("  customerName:", resultB.rows[0].customerName);
console.log("  phone:", resultB.rows[0].phone);
console.log("  address:", resultB.rows[0].address);
console.log("  comboText:", resultB.rows[0].comboText);
console.log("  productText:", resultB.rows[0].productText);
console.log("  priceText:", resultB.rows[0].priceText);

const testBPass =
  resultB.rows[0].timestamp === "2025-09-03 11:21:10" &&
  resultB.rows[0].customerName === "Онолбаатар" &&
  resultB.rows[0].phone === "88249975" &&
  resultB.rows[0].address === "Өмнөговь Ханбогд сум" &&
  resultB.rows[0].comboText.includes("78,000₮") &&
  (resultB.rows[0].productText === "" || resultB.rows[0].productText === undefined) &&
  resultB.rows[0].priceText === "78000";

console.log("\nExpected:");
console.log("  timestamp: 2025-09-03 11:21:10");
console.log("  customerName: Онолбаатар");
console.log("  phone: 88249975");
console.log("  address: Өмнөговь Ханбогд сум");
console.log("  productText: undefined/empty");
console.log("  priceText: 78000");

console.log("\n" + (testBPass ? "✅ TEST B PASSED" : "❌ TEST B FAILED"));

// =========================================
// TEST C: Multiple rows (row isolation)
// =========================================
console.log("\n" + "=".repeat(50));
console.log("TEST C: Multiple rows (row isolation)");
console.log("-".repeat(40));

const testC = `2025-09-02 05:59:42\tГантуяа Толя\t96621013\tБаянчандман\t✅99,000₮-өөр 4 нь 10 нь үнэгүй\tEYELASH
2025-09-03 11:21:10\tОнолбаатар\t88249975\tӨмнөговь Ханбогд сум\t1 бүтээгдэхүүн + 1 бүтээгдэхүүн: 78,000₮ үнэгүй хүргэлт`;

const resultC = parseQuickOrder(testC);

console.log("Input: 2 rows");
console.log("\nRow 1:");
console.log("  customerName:", resultC.rows[0].customerName);
console.log("  phone:", resultC.rows[0].phone);
console.log("  productText:", resultC.rows[0].productText);
console.log("  priceText:", resultC.rows[0].priceText);

console.log("\nRow 2:");
console.log("  customerName:", resultC.rows[1].customerName);
console.log("  phone:", resultC.rows[1].phone);
console.log("  productText:", resultC.rows[1].productText);
console.log("  priceText:", resultC.rows[1].priceText);

const testCPass =
  resultC.rows.length === 2 &&
  resultC.rows[0].priceText === "99000" &&
  resultC.rows[1].priceText === "78000" &&
  resultC.rows[0].productText === "EYELASH" &&
  (resultC.rows[1].productText === "" || resultC.rows[1].productText === undefined) &&
  // CRITICAL: Row 2 must NOT inherit row 1's combo/price
  resultC.rows[1].comboText !== resultC.rows[0].comboText;

console.log("\nExpected:");
console.log("  Row 1: priceText=99000, productText=EYELASH");
console.log("  Row 2: priceText=78000, productText=undefined");
console.log("  Row 1 combo !== Row 2 combo");

console.log("\n" + (testCPass ? "✅ TEST C PASSED" : "❌ TEST C FAILED"));

// =========================================
// TEST D: Tab-separated vs space-separated
// =========================================
console.log("\n" + "=".repeat(50));
console.log("TEST D: Tab-separated parsing");
console.log("-".repeat(40));

const testD = "2025-09-02 05:59:42\tГантуяа Толя\t96621013\tБаянчандман\t✅99,000₮-өөр 4 нь 10 нь үнэгүй\tEYELASH";

const resultD = parseQuickOrder(testD);

console.log("Input (TAB-separated):");
console.log(testD.replace(/\t/g, " | "));
console.log("\nParsed columns count:", resultD.rows[0].raw.length);
console.log("  Raw:", resultD.rows[0].raw);

const testDPass =
  resultD.rows[0].raw.length === 6 &&
  resultD.rows[0].customerName === "Гантуяа Толя" &&
  resultD.rows[0].phone === "96621013";

console.log("\nExpected: 6 columns, correctly parsed");

console.log("\n" + (testDPass ? "✅ TEST D PASSED" : "❌ TEST D FAILED"));

// =========================================
// TEST E: Different column counts
// =========================================
console.log("\n" + "=".repeat(50));
console.log("TEST E: Different column counts");
console.log("-".repeat(40));

// 5 columns: no product
const testE1 = `Онолбаатар\t88249975\tӨмнөговь Ханбогд сум\t1 бүтээгдэхүүн + 1 бүтээгдэхүүн: 78,000₮ үнэгүй хүргэлт`;
const resultE1 = parseQuickOrder(testE1);

console.log("5-column input (no product):");
console.log(testE1.replace(/\t/g, " | "));
console.log("  columns:", resultE1.rows[0].raw.length);
console.log("  customerName:", resultE1.rows[0].customerName);
console.log("  productText:", resultE1.rows[0].productText);

// 4 columns: name, phone, address, combo
const testE2 = `Гантуяа\t96621013\tБаянчандман\t✅99,000₮-өөр 4 нь 10 нь үнэгүй`;
const resultE2 = parseQuickOrder(testE2);

console.log("\n4-column input:");
console.log(testE2.replace(/\t/g, " | "));
console.log("  columns:", resultE2.rows[0].raw.length);
console.log("  customerName:", resultE2.rows[0].customerName);
console.log("  phone:", resultE2.rows[0].phone);

const testEPass =
  resultE1.rows[0].raw.length === 4 &&
  resultE2.rows[0].raw.length === 4;

console.log("\n" + (testEPass ? "✅ TEST E PASSED" : "❌ TEST E FAILED"));

// =========================================
// SUMMARY
// =========================================
console.log("\n" + "=".repeat(50));
console.log("TEST SUMMARY");
console.log("=".repeat(50));
console.log("TEST A:", testAPass ? "✅ PASS" : "❌ FAIL");
console.log("TEST B:", testBPass ? "✅ PASS" : "❌ FAIL");
console.log("TEST C:", testCPass ? "✅ PASS" : "❌ FAIL");
console.log("TEST D:", testDPass ? "✅ PASS" : "❌ FAIL");
console.log("TEST E:", testEPass ? "✅ PASS" : "❌ FAIL");

const allPass = testAPass && testBPass && testCPass && testDPass && testEPass;
console.log("\n" + (allPass ? "🎉 ALL TESTS PASSED" : "❌ SOME TESTS FAILED"));
