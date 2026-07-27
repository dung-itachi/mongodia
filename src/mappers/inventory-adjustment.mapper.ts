export function mapInventoryAdjustment(
  inventoryAdjustment: any
) {
  return {
    _id: inventoryAdjustment._id,

    inventoryId: inventoryAdjustment.inventoryId,

    type: inventoryAdjustment.type,

    quantity: inventoryAdjustment.quantity,

    reason: inventoryAdjustment.reason,

    employeeId: inventoryAdjustment.employeeId,

    note: inventoryAdjustment.note,
  };
}

export function mapInventoryAdjustmentList(
  inventoryAdjustment: any
) {
  return mapInventoryAdjustment(inventoryAdjustment);
}
