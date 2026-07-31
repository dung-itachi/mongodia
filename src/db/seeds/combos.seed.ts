import Category from "@/models/Category";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Combo from "@/models/Combo";

const COMBOS = [
  {
    code: "COMBO-1HOP",
    name: "Combo 1 Hộp",
    productCode: "KEMABC",
    categoryCode: "KEM",
    comboItems: [
      { sku: "KEM-HOP-1", quantity: 1, isGift: false },
    ],
    sellingPrice: 45000,
    packageSize: 1,
    displayOrder: 1,
  },
  {
    code: "COMBO-2HOP",
    name: "Combo 2 Hộp",
    productCode: "KEMABC",
    categoryCode: "KEM",
    comboItems: [
      { sku: "KEM-HOP-1", quantity: 2, isGift: false },
    ],
    sellingPrice: 90000,
    packageSize: 2,
    displayOrder: 2,
  },
  {
    code: "COMBO-3HOP-QUA",
    name: "Combo 3 Hộp + Quà",
    productCode: "KEMABC",
    categoryCode: "KEM",
    comboItems: [
      { sku: "KEM-HOP-3", quantity: 1, isGift: false },
      { sku: "KEM-QUA", quantity: 1, isGift: true },
    ],
    sellingPrice: 150000,
    packageSize: 4,
    displayOrder: 3,
  },
  {
    code: "COMBO-5HOP",
    name: "Combo 5 Hộp",
    productCode: "KEMABC",
    categoryCode: "KEM",
    comboItems: [
      { sku: "KEM-HOP-3", quantity: 1, isGift: false },
      { sku: "KEM-HOP-1", quantity: 2, isGift: false },
    ],
    sellingPrice: 230000,
    packageSize: 5,
    displayOrder: 4,
  },
];

export async function seedCombos() {
  const category = await Category.findOne({ code: "KEM" });
  const product = await Product.findOne({ code: "KEMABC" });

  for (const combo of COMBOS) {
    const comboItems = [];

    for (const item of combo.comboItems) {
      const variant = await ProductVariant.findOne({ sku: item.sku });

      if (variant) {
        comboItems.push({
          productVariantId: variant._id,
          quantity: item.quantity,
          isGift: item.isGift,
        });
      }
    }

    await Combo.updateOne(
      { code: combo.code },
      {
        $set: {
          code: combo.code,
          name: combo.name,
          productId: product?._id,
          categoryId: category?._id,
          comboItems: comboItems,
          sellingPrice: combo.sellingPrice,
          packageSize: combo.packageSize,
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
