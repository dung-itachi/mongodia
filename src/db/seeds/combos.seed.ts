import Category from "@/models/Category";
import Product from "@/models/Product";
import Combo from "@/models/Combo";

/**
 * Seed Combos (Sprint 8.x - Combo theo Product)
 *
 * Combo chỉ cần:
 *   - productId
 *   - packageQuantity
 *   - sellingPrice
 *   - giftQuantity
 *
 * Combo KHÔNG lưu variant / quà cụ thể.
 */

const COMBOS = [
  {
    code: "COMBO-1HOP",
    name: "Combo 1 Hộp",
    productCode: "KEMABC",
    packageQuantity: 1,
    sellingPrice: 45000,
    giftQuantity: 0,
    displayOrder: 1,
  },
  {
    code: "COMBO-2HOP",
    name: "Combo 2 Hộp",
    productCode: "KEMABC",
    packageQuantity: 2,
    sellingPrice: 90000,
    giftQuantity: 0,
    displayOrder: 2,
  },
  {
    code: "COMBO-3HOP-QUA",
    name: "Combo 3 Hộp + Quà",
    productCode: "KEMABC",
    packageQuantity: 3,
    sellingPrice: 150000,
    giftQuantity: 1,
    displayOrder: 3,
  },
  {
    code: "COMBO-5HOP",
    name: "Combo 5 Hộp",
    productCode: "KEMABC",
    packageQuantity: 5,
    sellingPrice: 230000,
    giftQuantity: 0,
    displayOrder: 4,
  },
];

export async function seedCombos() {
  const category = await Category.findOne({ code: "KEM" });
  const product = await Product.findOne({ code: "KEMABC" });

  for (const combo of COMBOS) {
    await Combo.updateOne(
      { code: combo.code },
      {
        $set: {
          code: combo.code,
          name: combo.name,
          productId: product?._id,
          packageQuantity: combo.packageQuantity,
          sellingPrice: combo.sellingPrice,
          giftQuantity: combo.giftQuantity ?? 0,
          displayOrder: combo.displayOrder,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Combos");
}