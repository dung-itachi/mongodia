export function mapInventory(inventory: any) {
  return {
    _id: inventory._id,

    warehouseId: inventory.warehouseId,

    productVariantId: inventory.productVariantId,

    quantity: inventory.quantity,

    reservedQuantity: inventory.reservedQuantity,

    availableQuantity: inventory.availableQuantity,

    isActive: inventory.isActive,
  };
}

export function mapInventoryList(inventory: any) {
  return mapInventory(inventory);
}
