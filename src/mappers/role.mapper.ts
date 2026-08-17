export function mapRole(role: any) {
    return {
      _id: role._id,
      code: role.code,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
      // Sprint — Role-based sidebar visibility.
      // Default to [] for legacy rows pre-dating this field so the
      // Sidebar can fall back gracefully.
      visibleGroups: Array.isArray(role.visibleGroups) ? role.visibleGroups : [],
    };
  }

  export function mapRoleList(roles: any[]) {
    return roles.map(mapRole);
  }