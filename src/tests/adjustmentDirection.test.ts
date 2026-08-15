/**
 * ==================================================
 * WAREHOUSE ADJUSTMENT DIRECTION REPLAY — UNIT TEST
 * ==================================================
 *
 * Verifies the PURE helper `replayAdjustmentSings` exported from
 * `src/services/warehouse/warehouse-adjustment.service.ts`.
 *
 * This helper takes a chronological list of all `WarehouseStockMovement`
 * events for a single item key (warehouseId + itemType + productId/variantId/giftId)
 * and recovers the SIGN and `before`/`after` quantities of each ADJUSTMENT
 * movement without requiring any schema change.
 *
 * The replay algorithm uses the current `WarehouseInventory.quantity` as
 * ground truth at the end of the timeline, applying known signed deltas
 * for non-ADJUSTMENT events and choosing a sign for each ADJUSTMENT
 * event so the running total stays non-negative and consistent.
 *
 * Run: npx tsx src/tests/adjustmentDirection.test.ts
 */

import {
  replayAdjustmentSings,
  classifyAdjustmentDirection,
} from "../services/warehouse/warehouse-adjustment.service";

let pass = 0;
let fail = 0;
const failed: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    failed.push(label);
    console.log(`  ✗ ${label}`);
  }
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    failed.push(`${label} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
    console.log(`  ✗ ${label}`);
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     actual:   ${JSON.stringify(actual)}`);
  }
}

console.log("========================================");
console.log("ADJUSTMENT DIRECTION CLASSIFICATION");
console.log("========================================");

{
  const cases: Array<{ input: number; expected: "INCREASE" | "DECREASE" | "NEUTRAL"; label: string }> = [
    { input: 5, expected: "INCREASE", label: "+5 → INCREASE" },
    { input: -5, expected: "DECREASE", label: "-5 → DECREASE" },
    { input: 0, expected: "NEUTRAL", label: "0 → NEUTRAL" },
    { input: 0.5, expected: "INCREASE", label: "tiny positive → INCREASE" },
    { input: -0.5, expected: "DECREASE", label: "tiny negative → DECREASE" },
    { input: Number.MAX_SAFE_INTEGER, expected: "INCREASE", label: "very large positive → INCREASE" },
    { input: Number.MIN_SAFE_INTEGER, expected: "DECREASE", label: "very large negative → DECREASE" },
  ];
  for (const { input, expected, label } of cases) {
    assertEqual(classifyAdjustmentDirection(input), expected, label);
  }
}

console.log();
console.log("========================================");
console.log("ADJUSTMENT REPLAY — SINGLE ADJUSTMENT");
console.log("========================================");

// Scenario A: empty history (no prior movements), single ADJUSTMENT,
// inventory.quantity = 50 ⇒ ADJUSTMENT must be an INCREASE of +50
// (from 0 to 50).
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 50 },
    ],
    currentQuantity: 50,
  });
  const result = r.get("adj1");
  assert(result !== undefined, "scenario A: returns result for adj1");
  if (result) {
    assertEqual(result.signed, 50, "scenario A: signed is +50");
    assertEqual(result.before, 0, "scenario A: before is 0");
    assertEqual(result.after, 50, "scenario A: after is 50");
  }
}

// Scenario B: empty history, single ADJUSTMENT creating a decrease.
// Impossible in a clean state (cannot go negative) — but if
// currentQuantity = 0 and stored magnitude = 0, classify as NEUTRAL.
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 0 },
    ],
    currentQuantity: 0,
  });
  const result = r.get("adj1");
  assert(result !== undefined, "scenario B: returns result");
  if (result) {
    assertEqual(result.signed, 0, "scenario B: zero adjustment is 0");
    assertEqual(result.after, 0, "scenario B: after is 0");
  }
}

console.log();
console.log("========================================");
console.log("ADJUSTMENT REPLAY — PRIOR IMPORTS");
console.log("========================================");

// Scenario C: IMPORT 100, then ADJUSTMENT 50 (decreased to 50).
// Total running: 0 → 100 → 50 ⇒ ADJUSTMENT must be −50.
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "imp1", type: "IMPORT", referenceType: "RECEIPT", quantity: 100 },
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 50 },
    ],
    currentQuantity: 50,
  });
  const adj = r.get("adj1");
  assert(adj !== undefined, "scenario C: returns result");
  if (adj) {
    assertEqual(adj.before, 100, "scenario C: before = 100");
    assertEqual(adj.after, 50, "scenario C: after = 50");
    assertEqual(adj.signed, -50, "scenario C: signed = -50");
    assertEqual(classifyAdjustmentDirection(adj.signed), "DECREASE", "scenario C: DECREASE");
  }
}

// Scenario D: IMPORT 100, then ADJUSTMENT 200 (increased to 200).
// Total running: 0 → 100 → 200 ⇒ ADJUSTMENT must be +100.
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "imp1", type: "IMPORT", referenceType: "RECEIPT", quantity: 100 },
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 100 },
    ],
    currentQuantity: 200,
  });
  const adj = r.get("adj1");
  assert(adj !== undefined, "scenario D: returns result");
  if (adj) {
    assertEqual(adj.before, 100, "scenario D: before = 100");
    assertEqual(adj.after, 200, "scenario D: after = 200");
    assertEqual(adj.signed, 100, "scenario D: signed = +100");
    assertEqual(classifyAdjustmentDirection(adj.signed), "INCREASE", "scenario D: INCREASE");
  }
}

console.log();
console.log("========================================");
console.log("ADJUSTMENT REPLAY — TRANSFER + ADJUSTMENT");
console.log("========================================");

// Scenario E: IMPORT 1000, TRANSFER_OUT 300, ADJUSTMENT (magnitude 200) → 900.
// Running: 0 → 1000 → 700 → ?. To reach 900, ADJUSTMENT = +200.
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "imp1", type: "IMPORT", referenceType: "RECEIPT", quantity: 1000 },
      { _id: "xfer1", type: "TRANSFER_OUT", referenceType: "TRANSFER", quantity: 300 },
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 200 },
    ],
    currentQuantity: 900,
  });
  const adj = r.get("adj1");
  assert(adj !== undefined, "scenario E: returns result");
  if (adj) {
    assertEqual(adj.before, 700, "scenario E: before = 700");
    assertEqual(adj.signed, 200, "scenario E: signed = +200 (to reach 900)");
    assertEqual(adj.after, 900, "scenario E: after = 900");
  }
}

// Scenario F: IMPORT 1000, TRANSFER_OUT 300, ADJUSTMENT (magnitude 200) → 500.
// Running: 0 → 1000 → 700 → ?. To reach 500, ADJUSTMENT = −200.
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "imp1", type: "IMPORT", referenceType: "RECEIPT", quantity: 1000 },
      { _id: "xfer1", type: "TRANSFER_OUT", referenceType: "TRANSFER", quantity: 300 },
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 200 },
    ],
    currentQuantity: 500,
  });
  const adj = r.get("adj1");
  assert(adj !== undefined, "scenario F: returns result");
  if (adj) {
    assertEqual(adj.before, 700, "scenario F: before = 700");
    assertEqual(adj.signed, -200, "scenario F: signed = -200 (to reach 500)");
    assertEqual(adj.after, 500, "scenario F: after = 500");
  }
}

console.log();
console.log("========================================");
console.log("ADJUSTMENT REPLAY — MULTIPLE ADJUSTMENTS");
console.log("========================================");

// Scenario G: IMPORT 1000, ADJUSTMENT +200, ADJUSTMENT −100, ADJUSTMENT +50.
// Running under picked signs: 0 → 1000 → 1200 → 1100 → 1150.
// All sign decisions must be locally consistent.
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "imp1", type: "IMPORT", referenceType: "RECEIPT", quantity: 1000 },
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 200 },
      { _id: "adj2", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 100 },
      { _id: "adj3", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 50 },
    ],
    currentQuantity: 1150,
  });
  const a1 = r.get("adj1");
  const a2 = r.get("adj2");
  const a3 = r.get("adj3");
  assert(a1 !== undefined && a2 !== undefined && a3 !== undefined, "scenario G: all results returned");
  if (a1 && a2 && a3) {
    assertEqual(a1.before, 1000, "scenario G: adj1.before = 1000");
    assertEqual(a1.after, 1200, "scenario G: adj1.after = 1200");
    assertEqual(a2.before, 1200, "scenario G: adj2.before = 1200");
    assertEqual(a2.after, 1100, "scenario G: adj2.after = 1100");
    assertEqual(a3.before, 1100, "scenario G: adj3.before = 1100");
    assertEqual(a3.after, 1150, "scenario G: adj3.after = 1150");
  }
}

// Scenario H: ORDER_OUT consumes reserved stock (no available change), then adjustment.
// ORDER_OUT signed delta = -1 * 100. After adjustment -50 ⇒ running 100 → 0.
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "imp1", type: "IMPORT", referenceType: "RECEIPT", quantity: 100 },
      { _id: "order1", type: "ORDER_OUT", referenceType: "ORDER", quantity: 50 },
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 50 },
    ],
    currentQuantity: 0,
  });
  const adj = r.get("adj1");
  assert(adj !== undefined, "scenario H: returns result");
  if (adj) {
    assertEqual(adj.before, 50, "scenario H: before = 50");
    assertEqual(adj.signed, -50, "scenario H: signed = -50");
    assertEqual(adj.after, 0, "scenario H: after = 0");
  }
}

console.log();
console.log("========================================");
console.log("ADJUSTMENT REPLAY — INVARIANT FORBIDDEN SIGNS");
console.log("========================================");

// Scenario I: ADJUSTMENT cannot drive running total negative. Even if
// currentQuantity happens to be zero (boundary), algorithm must not
// produce a negative `after` for any ADJUSTMENT if a non-negative
// alternative exists.
{
  const r = replayAdjustmentSings({
    events: [
      { _id: "imp1", type: "IMPORT", referenceType: "RECEIPT", quantity: 50 },
      { _id: "adj1", type: "ADJUSTMENT", referenceType: "ADJUSTMENT", quantity: 60 },
    ],
    currentQuantity: 110,
  });
  const adj = r.get("adj1");
  assert(adj !== undefined, "scenario I: returns result");
  if (adj) {
    assertEqual(adj.signed, 60, "scenario I: increasing 60 to reach 110");
    assert(adj.after >= 0, "scenario I: non-negative after");
  }
}

console.log();
console.log("========================================");
console.log("TOTAL");
console.log("========================================");
console.log(`pass: ${pass}`);
console.log(`fail: ${fail}`);
if (fail > 0) {
  console.log("Failed tests:");
  for (const label of failed) console.log(`  - ${label}`);
  process.exit(1);
}
console.log("OK — all assertions passed");
process.exit(0);
