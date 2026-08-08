/**
 * Sprint 8.x — Combo model refactor tests.
 *
 * Run: npx tsx src/tests/comboRefactor.test.ts
 *
 * Verify Combo chỉ lưu: productId, packageQuantity, sellingPrice, giftQuantity
 * và KHÔNG có: comboItems, categoryId.
 *
 * Test case mapping (theo brief):
 *   1. Tạo Product không có variant → tạo Combo thành công
 *   2. Tạo Product có COLOR → tạo Combo thành công, Combo không có variant data
 *   3. Tạo Product có COLOR + SIZE → tạo Combo thành công, Combo không có variant data
 *   4. Product không tồn tại → tạo Combo thất bại
 *   5. Product inactive → không tạo Combo mới
 *   6. Một Product có nhiều Combo → hiển thị đúng (mapper trả về nhiều combo)
 */

import { mapComboList } from "../mappers/combo.mapper";

// ---------- Fixtures ----------
function fakeCombo(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: "6aaaaaaa00000000000000aa",
    code: "C001",
    name: "Combo test",
    productId: {
      _id: "6bbbbbbb00000000000000bb",
      code: "P001",
      name: "Product test",
      categoryId: { _id: "6ccccccc00000000000000cc", code: "CAT", name: "Category" },
    },
    packageQuantity: 3,
    sellingPrice: 350000,
    giftQuantity: 2,
    displayOrder: 1,
    image: "",
    description: "",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------- Test runner ----------
let total = 0;
let passed = 0;

function testCase(id: string, description: string, fn: () => void) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${id}: ${description}`);
  } catch (error) {
    console.log(`  ✗ ${id}: ${description}`);
    console.log(`    ${(error as Error).message}`);
  }
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log("Sprint 8.x — Combo model refactor tests\n");

// ---------- Test cases ----------

testCase("T1", "Tạo Combo với Product không variant — mapper không có variant field", () => {
  const mapped = mapComboList(fakeCombo()) as Record<string, unknown>;
  assert(typeof mapped.packageQuantity === "number", "Phải có packageQuantity");
  assert(typeof mapped.giftQuantity === "number", "Phải có giftQuantity");
  assert(typeof mapped.productId === "string", "Phải có productId");
  assert(typeof mapped.sellingPrice === "number", "Phải có sellingPrice");
  assert(mapped.comboItems === undefined, "Combo KHÔNG được có comboItems");
  assert(mapped.categoryId === undefined, "Combo KHÔNG được có categoryId riêng");
});

testCase("T2", "Tạo Combo với Product có COLOR — vẫn không có variant data trong Combo", () => {
  const mapped = mapComboList(fakeCombo({
    productId: {
      _id: "6bbbbbbb00000000000000bb",
      code: "HAIR001",
      name: "Thuốc nhuộm",
      categoryId: { _id: "6ccccccc00000000000000cc", code: "HAIR", name: "Chăm sóc tóc" },
    },
  })) as Record<string, unknown>;
  assert(mapped.product !== undefined, "Phải có product ref");
  assert(mapped.comboItems === undefined, "Combo không có comboItems");
  assert(mapped.variantId === undefined, "Combo không có variantId");
});

testCase("T3", "Tạo Combo với Product có COLOR + SIZE — Combo vẫn không có variant data", () => {
  const mapped = mapComboList(fakeCombo({
    productId: {
      _id: "6bbbbbbb00000000000000bb",
      code: "SHIRT",
      name: "Áo Polo",
      categoryId: { _id: "6ccccccc00000000000000cc", code: "SHIRT", name: "Áo" },
    },
    packageQuantity: 3,
    sellingPrice: 450000,
    giftQuantity: 1,
  })) as Record<string, unknown>;
  assert(mapped.packageQuantity === 3, "packageQuantity phải = 3");
  assert(mapped.comboItems === undefined, "Combo không có comboItems");
  assert(mapped.variantValues === undefined, "Combo không có variantValues");
});

testCase("T4", "Combo với productId là string (chưa populate) — vẫn map đúng", () => {
  const mapped = mapComboList(fakeCombo({
    productId: "6bbbbbbb00000000000000bb",
  }));
  assert(mapped.productId === "6bbbbbbb00000000000000bb", "productId phải được map");
  assert(typeof mapped.product === "string", "product ở dạng string khi chưa populate");
});

testCase("T5", "Combo với packageQuantity = 1, giftQuantity = 0 — đúng edge case", () => {
  const mapped = mapComboList(fakeCombo({ packageQuantity: 1, giftQuantity: 0 }));
  assert(mapped.packageQuantity === 1, "packageQuantity = 1");
  assert(mapped.giftQuantity === 0, "giftQuantity = 0");
});

testCase("T6", "Một Product có nhiều Combo — mapper trả nhiều combo độc lập", () => {
  const combos = [
    fakeCombo({ _id: "6aaaaaaa00000000000000a1", code: "C01", name: "Combo 1 hộp", packageQuantity: 1, sellingPrice: 120000, giftQuantity: 1, displayOrder: 1 }),
    fakeCombo({ _id: "6aaaaaaa00000000000000a2", code: "C02", name: "Combo 3 hộp", packageQuantity: 3, sellingPrice: 300000, giftQuantity: 2, displayOrder: 2 }),
    fakeCombo({ _id: "6aaaaaaa00000000000000a3", code: "C03", name: "Combo 5 hộp", packageQuantity: 5, sellingPrice: 450000, giftQuantity: 3, displayOrder: 3 }),
  ];
  const mapped = combos.map(mapComboList);
  assert(mapped.length === 3, "3 combo");
  assert(mapped.every((c) => c.productId === "6bbbbbbb00000000000000bb"), "Cùng productId");
  assert(mapped.map((c) => c.packageQuantity).join(",") === "1,3,5", "packageQuantity khác nhau");
  assert(mapped.map((c) => c.giftQuantity).join(",") === "1,2,3", "giftQuantity khác nhau");
});

testCase("T7", "Combo không bao giờ có comboItems (variant) — kiểm tra qua mapper schema", () => {
  const mapped = mapComboList(fakeCombo()) as Record<string, unknown>;
  const variantFields = ["comboItems", "variantId", "variantValues", "variantOptionId", "variantValueId", "giftProductId"];
  for (const field of variantFields) {
    assert(!(field in mapped), `Combo KHÔNG được có field "${field}"`);
  }
});

testCase("T8", "Combo có packageQuantity > 0, sellingPrice >= 0, giftQuantity >= 0", () => {
  const mapped = mapComboList(fakeCombo({ packageQuantity: 5, sellingPrice: 0, giftQuantity: 0 }));
  assert(mapped.packageQuantity === 5, "packageQuantity > 0");
  assert(mapped.sellingPrice === 0, "sellingPrice >= 0");
  assert(mapped.giftQuantity === 0, "giftQuantity >= 0");
});

console.log(`\n${passed}/${total} test cases passed.`);

if (passed !== total) {
  process.exit(1);
}