export function mapSupplier(supplier: any) {
  return {
    _id: supplier._id,

    code: supplier.code,

    name: supplier.name,

    phone: supplier.phone,

    email: supplier.email,

    contactPerson: supplier.contactPerson,

    address: supplier.address,

    areaId: supplier.areaId,

    note: supplier.note,

    isActive: supplier.isActive,
  };
}

export function mapSupplierList(supplier: any) {
  return mapSupplier(supplier);
}
