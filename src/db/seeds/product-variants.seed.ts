import Product from "@/models/Product";
import VariantValue from "@/models/VariantValue";
import ProductVariant from "@/models/ProductVariant";

const PRODUCT_VARIANTS = [
  {
    productCode: "IPHONE16",
    sku: "IP16-BLK-128",
    barcode: "1234567890001",
    variantValueCodes: ["BLACK", "128GB"],
    price: 24990000,
    cost: 20000000,
    weight: 170,
  },
  {
    productCode: "IPHONE16",
    sku: "IP16-BLK-256",
    barcode: "1234567890002",
    variantValueCodes: ["BLACK", "256GB"],
    price: 27990000,
    cost: 22500000,
    weight: 170,
  },
  {
    productCode: "IPHONE16",
    sku: "IP16-WHT-128",
    barcode: "1234567890003",
    variantValueCodes: ["WHITE", "128GB"],
    price: 24990000,
    cost: 20000000,
    weight: 170,
  },
  {
    productCode: "GALAXYS25",
    sku: "GS25-BLK-256",
    barcode: "1234567890004",
    variantValueCodes: ["BLACK", "256GB"],
    price: 22990000,
    cost: 18000000,
    weight: 168,
  },
  {
    productCode: "MACBOOKPRO",
    sku: "MBP-16G-512",
    barcode: "1234567890005",
    variantValueCodes: ["16GB", "512GB"],
    price: 49990000,
    cost: 40000000,
    weight: 1580,
  },
];

export async function seedProductVariants() {
  const allVariantValues = await VariantValue.find();
  const variantValueMap = Object.fromEntries(
    allVariantValues.map((v) => [v.code, v])
  );

  for (const variant of PRODUCT_VARIANTS) {
    const product = await Product.findOne({
      code: variant.productCode,
    });

    await ProductVariant.updateOne(
      { sku: variant.sku },
      {
        $set: {
          productId: product?._id,
          sku: variant.sku,
          barcode: variant.barcode,
          variantValues: variant.variantValueCodes.map(
            (code) => variantValueMap[code]._id
          ),
          price: variant.price,
          cost: variant.cost,
          weight: variant.weight,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Product Variants");
}
