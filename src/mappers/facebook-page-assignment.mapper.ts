export function mapFacebookPageAssignment(assignment: any) {
  return {
    _id: assignment._id,
    facebookPageId: assignment.facebookPageId
      ? {
          _id: assignment.facebookPageId._id || assignment.facebookPageId,
          code: assignment.facebookPageId.code,
          name: assignment.facebookPageId.name,
        }
      : null,
    marketingEmployeeId: assignment.marketingEmployeeId
      ? {
          _id: assignment.marketingEmployeeId._id || assignment.marketingEmployeeId,
          employeeCode: assignment.marketingEmployeeId.employeeCode,
          fullName: assignment.marketingEmployeeId.fullName,
        }
      : null,
    startDate: assignment.startDate,
    endDate: assignment.endDate,
    note: assignment.note,
    isActive: assignment.isActive,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt,
  };
}

export function mapFacebookPageAssignmentList(assignment: any) {
  return mapFacebookPageAssignment(assignment);
}
