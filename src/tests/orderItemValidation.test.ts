/**
 * Sprint 8.x — Validation cases for OrderItem workflow.
 *
 * Run: npx tsx src/tests/orderItemValidation.test.ts
 *
 * Required cases (from product brief):
 *   A: Kem đánh răng, no variant, 2 combo × 3 SP ⇒ details total 6, attributes []
 *   B: Thuốc nhuộm, COLOR, 2 combo × 3 SP ⇒ 6 sản phẩm, black × 4, brown × 2
 *   C: Áo, COLOR + SIZE ⇒ multiple combinations
 *   D: Gift RANDOM, comboQuantity=2, giftQuantity=2 ⇒ giftSelections = []
 *   E: Gift CUSTOMER_SELECTED, comboQuantity=2, giftQuantity=2 ⇒ 4 quà
 *   F: Thiếu variant quantity ⇒ rejected
 *   G: Thiếu gift quantity ⇒ rejected
 */

import {
  getTotalDetailsQuantity,
  getTotalGifts,
  getTotalProducts,
  validateOrderItem,
  type GiftSelection,
  type OrderItem,
  type ProductAttribute,
  type ProductVariantSelection,
} from "../types/variant";

interface Case {
  id: string;
  description: string;
  item: OrderItem;
  expectValid: boolean;
  expectedProducts?: number;
  expectedGifts?: number;
}

const blackId = "6b6c61636b";
const brownId = "62726f776e";
const smallId = "73697a65";
const largeId = "6c61726765";
const xlId = "786c";

function buildItem(input: {
  comboQuantity: number;
  packageQuantity: number;
  giftQuantity?: number;
  giftMode?: "RANDOM" | "CUSTOMER_SELECTED";
  giftSelections?: GiftSelection[];
  details: Array<{
    quantity: number;
    attributes?: ProductAttribute[];
  }>;
}): OrderItem {
  return {
    comboId: "60b8c5f5f5f5f5f5f5f5f5f5",
    productId: "60b8c5f5f5f5f5f5f5f5f5f6",
    comboName: "Test combo",
    comboCode: "TEST",
    comboQuantity: input.comboQuantity,
    packageQuantity: input.packageQuantity,
    giftQuantity: input.giftQuantity ?? 0,
    giftMode: input.giftMode ?? "RANDOM",
    giftSelections: input.giftSelections ?? [],
    sellingPrice: 350000,
    discount: 0,
    subtotal: 350000 * input.comboQuantity,
    details: input.details.map<Record<string, unknown>>((detail) => ({
      variantId: undefined,
      attributes: detail.attributes ?? [],
      quantity: detail.quantity,
    })) as unknown as ProductVariantSelection[],
  };
}

function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runCase(testCase: Case): void {
  const item = testCase.item;
  const products = getTotalProducts(item);
  const gifts = getTotalGifts(item);
  if (testCase.expectedProducts !== undefined) {
    expect(products === testCase.expectedProducts, `${testCase.id}: expected ${testCase.expectedProducts} products, got ${products}`);
  }
  if (testCase.expectedGifts !== undefined) {
    expect(gifts === testCase.expectedGifts, `${testCase.id}: expected ${testCase.expectedGifts} gifts, got ${gifts}`);
  }
  const validation = validateOrderItem(item);
  expect(validation.isValid === testCase.expectValid, `${testCase.id}: expected isValid=${testCase.expectValid}, got ${validation.isValid} (errors: ${validation.detailsError ?? "-"} | ${validation.giftsError ?? "-"})`);
  const detailTotal = getTotalDetailsQuantity(item.details);
  // Case F intentionally violates the invariant; skip the equality assertion.
  if (testCase.id === "F") {
    expect(detailTotal !== item.comboQuantity * item.packageQuantity, `${testCase.id}: detail quantity ${detailTotal} must differ from ${item.comboQuantity * item.packageQuantity}`);
  } else {
    expect(detailTotal === item.comboQuantity * item.packageQuantity, `${testCase.id}: detail quantity ${detailTotal} must equal ${item.comboQuantity * item.packageQuantity}`);
  }
}

const cases: Case[] = [
  {
    id: "A",
    description: "Kem đánh răng - no variant, 2 combo × 3 SP",
    item: buildItem({
      comboQuantity: 2,
      packageQuantity: 3,
      details: [{ quantity: 6, attributes: [] }],
    }),
    expectValid: true,
    expectedProducts: 6,
    expectedGifts: 0,
  },
  {
    id: "B",
    description: "Thuốc nhuộm - COLOR, 2 combo × 3 SP",
    item: buildItem({
      comboQuantity: 2,
      packageQuantity: 3,
      details: [
        { quantity: 4, attributes: [{ optionId: "color", valueId: blackId }] },
        { quantity: 2, attributes: [{ optionId: "color", valueId: brownId }] },
      ],
    }),
    expectValid: true,
    expectedProducts: 6,
  },
  {
    id: "C",
    description: "Áo - COLOR + SIZE, nhiều combination",
    item: buildItem({
      comboQuantity: 3,
      packageQuantity: 2,
      details: [
        { quantity: 2, attributes: [{ optionId: "color", valueId: blackId }, { optionId: "size", valueId: xlId }] },
        { quantity: 2, attributes: [{ optionId: "color", valueId: brownId }, { optionId: "size", valueId: smallId }] },
        { quantity: 2, attributes: [{ optionId: "color", valueId: blackId }, { optionId: "size", valueId: largeId }] },
      ],
    }),
    expectValid: true,
    expectedProducts: 6,
  },
  {
    id: "D",
    description: "Gift RANDOM, comboQuantity=2, giftQuantity=2",
    item: buildItem({
      comboQuantity: 2,
      packageQuantity: 1,
      giftQuantity: 2,
      giftMode: "RANDOM",
      details: [{ quantity: 2, attributes: [] }],
    }),
    expectValid: true,
    expectedProducts: 2,
    expectedGifts: 4,
  },
  {
    id: "E",
    description: "Gift CUSTOMER_SELECTED, comboQuantity=2, giftQuantity=2",
    item: buildItem({
      comboQuantity: 2,
      packageQuantity: 1,
      giftQuantity: 2,
      giftMode: "CUSTOMER_SELECTED",
      giftSelections: [
        { giftProductId: "gift1", giftProductName: "Dầu gội", quantity: 2 },
        { giftProductId: "gift2", giftProductName: "Khăn", quantity: 2 },
      ],
      details: [{ quantity: 2, attributes: [] }],
    }),
    expectValid: true,
    expectedProducts: 2,
    expectedGifts: 4,
  },
  {
    id: "F",
    description: "Thiếu variant quantity (required 6, selected 5)",
    item: buildItem({
      comboQuantity: 2,
      packageQuantity: 3,
      details: [
        { quantity: 3, attributes: [{ optionId: "color", valueId: blackId }] },
        { quantity: 2, attributes: [{ optionId: "color", valueId: brownId }] },
      ],
    }),
    expectValid: false,
    expectedProducts: 6,
  },
  {
    id: "G",
    description: "Thiếu gift quantity (required 4, selected 3)",
    item: buildItem({
      comboQuantity: 2,
      packageQuantity: 1,
      giftQuantity: 2,
      giftMode: "CUSTOMER_SELECTED",
      giftSelections: [
        { giftProductId: "gift1", giftProductName: "Dầu gội", quantity: 2 },
        { giftProductId: "gift2", giftProductName: "Khăn", quantity: 1 },
      ],
      details: [{ quantity: 2, attributes: [] }],
    }),
    expectValid: false,
    expectedProducts: 2,
    expectedGifts: 4,
  },
];

let passed = 0;
let failed = 0;

for (const testCase of cases) {
  try {
    runCase(testCase);
    console.log(`[OK] Case ${testCase.id} — ${testCase.description}`);
    passed += 1;
  } catch (error) {
    console.error(`[FAIL] Case ${testCase.id} — ${testCase.description}\n${error instanceof Error ? error.message : String(error)}`);
    failed += 1;
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}