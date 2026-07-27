export function mapCustomer(customer: any) {
  return {
    _id: customer._id,

    code: customer.code,

    name: customer.name,

    phone: customer.phone,

    email: customer.email,

    gender: customer.gender,

    birthday: customer.birthday,

    address: customer.address,

    areaId: customer.areaId,

    teamId: customer.teamId,

    employeeId: customer.employeeId,

    note: customer.note,

    isActive: customer.isActive,
  };
}

export function mapCustomerList(customer: any) {
  return mapCustomer(customer);
}
