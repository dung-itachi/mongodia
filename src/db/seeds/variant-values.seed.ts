import VariantOption from "@/models/VariantOption";
import VariantValue from "@/models/VariantValue";

const VARIANT_VALUES = [
  { code: "BLACK", name: "Đen", variantOptionCode: "COLOR", sortOrder: 1 },
  { code: "WHITE", name: "Trắng", variantOptionCode: "COLOR", sortOrder: 2 },
  { code: "BLUE", name: "Xanh dương", variantOptionCode: "COLOR", sortOrder: 3 },

  { code: "128GB", name: "128GB", variantOptionCode: "STORAGE", sortOrder: 1 },
  { code: "256GB", name: "256GB", variantOptionCode: "STORAGE", sortOrder: 2 },
  { code: "512GB", name: "512GB", variantOptionCode: "STORAGE", sortOrder: 3 },

  { code: "8GB", name: "8GB", variantOptionCode: "RAM", sortOrder: 1 },
  { code: "16GB", name: "16GB", variantOptionCode: "RAM", sortOrder: 2 },
];

export async function seedVariantValues() {
  for (const value of VARIANT_VALUES) {
    const option = await VariantOption.findOne({
      code: value.variantOptionCode,
    });

    await VariantValue.updateOne(
      {
        code: value.code,
        variantOptionId: option?._id,
      },
      {
        $set: {
          code: value.code,
          name: value.name,
          variantOptionId: option?._id,
          sortOrder: value.sortOrder,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Variant Values");
}
