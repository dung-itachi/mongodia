export function mapDepartment(department: any) {
    return {
        _id: department._id,
        code: department.code,
        name: department.name,
        isActive: department.isActive,
    };
}

export function mapDepartmentList(department: any) {
    return mapDepartment(department);
}