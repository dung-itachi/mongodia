import Department from "@/models/Department";
import { DEPARTMENTS } from "@/constants/departments";

export async function seedDepartments() {
  for (const department of DEPARTMENTS) {
    await Department.updateOne(
      { code: department.code },
      {
        $set: {
          ...department,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Departments");
}