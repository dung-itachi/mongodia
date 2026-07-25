export function mapTeam(team: any) {
    return {
      _id: team._id,
  
      code: team.code,
  
      name: team.name,
  
      isActive: team.isActive,
  
      department:
        team.departmentId && typeof team.departmentId === "object"
          ? {
              _id: team.departmentId._id,
              code: team.departmentId.code,
              name: team.departmentId.name,
            }
          : null,
  
      area:
        team.areaId && typeof team.areaId === "object"
          ? {
              _id: team.areaId._id,
              code: team.areaId.code,
              name: team.areaId.name,
            }
          : null,
  
      leader:
        team.leaderId && typeof team.leaderId === "object"
          ? {
              _id: team.leaderId._id,
              employeeCode: team.leaderId.employeeCode,
              fullName: team.leaderId.fullName,
            }
          : null,
  
      manager:
        team.managerId && typeof team.managerId === "object"
          ? {
              _id: team.managerId._id,
              employeeCode: team.managerId.employeeCode,
              fullName: team.managerId.fullName,
            }
          : null,
    };
  }
  
  export function mapTeamList(team: any) {
    return mapTeam(team);
  }