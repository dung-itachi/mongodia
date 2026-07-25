export function mapRole(role: any) {
    return {
      _id: role._id,
      code: role.code,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
    };
  }
  
  export function mapRoleList(roles: any[]) {
    return roles.map(mapRole);
  }