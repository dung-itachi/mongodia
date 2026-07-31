import Category from "@/models/Category";
import Product from "@/models/Product";

const PRODUCTS = [
  {
    code: "IPHONE16",
    name: "iPhone 16",
    categoryCode: "PHONE",
  },
  {
    code: "GALAXYS25",
    name: "Galaxy S25",
    categoryCode: "PHONE",
  },
  {
    code: "MACBOOKPRO",
    name: "MacBook Pro",
    categoryCode: "LAPTOP",
  },
  {
    code: "KEMABC",
    name: "Kem ABC",
    categoryCode: "KEM",
  },
];

export async function seedProducts() {
  for (const product of PRODUCTS) {
    const category = await Category.findOne({
      code: product.categoryCode,
    });

    await Product.updateOne(
      { code: product.code },
      {
        $set: {
          code: product.code,
          name: product.name,
          categoryId: category?._id,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Products");
}
