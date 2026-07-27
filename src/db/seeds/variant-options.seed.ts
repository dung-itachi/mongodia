import VariantOption from "@/models/VariantOption";

const VARIANT_OPTIONS = [
  {
    code: "COLOR",
    name: "Màu sắc",
    sortOrder: 1,
  },
  {
    code: "STORAGE",
    name: "Dung lượng",
    sortOrder: 2,
  },
  {
    code: "RAM",
    name: "RAM",
    sortOrder: 3,
  },
];

export async function seedVariantOptions() {
  for (const option of VARIANT_OPTIONS) {
    await VariantOption.updateOne(
      { code: option.code },
      {
        $set: {
          ...option,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Variant Options");
}
