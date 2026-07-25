export function mapEmployeeList(employee: any) {
    const { roleId, teamId, __v, password, ...rest } = employee;
  
    return {
      _id: rest._id,
      employeeCode: rest.employeeCode,
      username: rest.username,
      fullName: rest.fullName,
      email: rest.email,
      avatar: rest.avatar,
      isActive: rest.isActive,
  
      role: roleId,
      team: teamId,
    };
  }
  
  export function mapEmployeeDetail(employee: any) {
    return {
      _id: employee._id,
  
      employeeCode: employee.employeeCode,
  
      username: employee.username,
  
      fullName: employee.fullName,
  
      email: employee.email,
  
      phone: employee.phone,
  
      avatar: employee.avatar,
  
      bankName: employee.bankName,
  
      bankAccountNumber: employee.bankAccountNumber,
  
      bankAccountHolder: employee.bankAccountHolder,
  
      lastLogin: employee.lastLogin,
  
      isActive: employee.isActive,
  
      createdAt: employee.createdAt,
  
      updatedAt: employee.updatedAt,
  
      role: employee.roleId,
  
      team: employee.teamId,
    };
  }