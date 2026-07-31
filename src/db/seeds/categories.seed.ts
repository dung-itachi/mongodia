import Category from "@/models/Category";

const CATEGORIES = [
  {
    code: "PHONE",
    name: "Điện thoại",
    sortOrder: 1,
  },
  {
    code: "LAPTOP",
    name: "Laptop",
    sortOrder: 2,
  },
  {
    code: "TABLET",
    name: "Máy tính bảng",
    sortOrder: 3,
  },
  {
    code: "ACCESSORY",
    name: "Phụ kiện",
    sortOrder: 4,
  },
  {
    code: "OTHER",
    name: "Khác",
    sortOrder: 5,
  },
  {
    code: "KEM",
    name: "Kem",
    sortOrder: 6,
  },
];

export async function seedCategories() {
  for (const category of CATEGORIES) {
    await Category.updateOne(
      { code: category.code },
      {
        $set: {
          ...category,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Categories");
}
