export function mapWarehouse(warehouse: any) {
  return {
    _id: warehouse._id,

    code: warehouse.code,

    name: warehouse.name,

    address: warehouse.address,

    managerId: warehouse.managerId,

    note: warehouse.note,

    isActive: warehouse.isActive,
  };
}

export function mapWarehouseList(warehouse: any) {
  return mapWarehouse(warehouse);
}
