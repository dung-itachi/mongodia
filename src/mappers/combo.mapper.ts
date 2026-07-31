export function mapComboItem(comboItem: any) {
  return {
    _id: comboItem._id,
    productVariant: comboItem.productVariantId,
    quantity: comboItem.quantity,
    isGift: comboItem.isGift,
  };
}

export function mapCombo(combo: any) {
  return {
    _id: combo._id,
    code: combo.code,
    name: combo.name,
    product: combo.productId,
    category: combo.categoryId,
    comboItems: combo.comboItems?.map(mapComboItem) ?? [],
    sellingPrice: combo.sellingPrice,
    packageSize: combo.packageSize,
    displayOrder: combo.displayOrder ?? 0,
    image: combo.image,
    description: combo.description,
    isActive: combo.isActive,
    createdAt: combo.createdAt,
    updatedAt: combo.updatedAt,
  };
}

export function mapComboList(combo: any) {
  return {
    _id: combo._id,
    code: combo.code,
    name: combo.name,
    product: combo.productId,
    category: combo.categoryId,
    sellingPrice: combo.sellingPrice,
    packageSize: combo.packageSize,
    displayOrder: combo.displayOrder ?? 0,
    image: combo.image,
    isActive: combo.isActive,
    itemCount: combo.comboItems?.length ?? 0,
  };
}
