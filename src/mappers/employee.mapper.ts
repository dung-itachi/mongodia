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
    const { roleId, teamId, __v, password, ...rest } = employee;
  
    return {
      ...rest,
      role: roleId,
      team: teamId,
    };
  }