import { IProductVariant } from "@/models/ProductVariant";

export function mapProductVariant(
  productVariant: IProductVariant & { _id: unknown }
) {
  return {
    _id: productVariant._id,

    productId: productVariant.productId,

    sku: productVariant.sku,

    barcode: productVariant.barcode,

    image: productVariant.image,

    variantValues: productVariant.variantValues,

    price: productVariant.price,

    cost: productVariant.cost,

    weight: productVariant.weight,

    sortOrder: productVariant.sortOrder,

    isActive: productVariant.isActive,
  };
}

export function mapProductVariantList(
  productVariant: IProductVariant & { _id: unknown }
) {
  return mapProductVariant(productVariant);
}
