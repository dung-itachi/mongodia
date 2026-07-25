import { EMPLOYEES } from "@/constants/employees";
import Employee from "@/models/Employee";
import Role from "@/models/Role";
import Team from "@/models/Team";
import { hashPassword } from "@/utils/bcrypt";

export async function seedEmployees() {
  for (const employee of EMPLOYEES) {
    const role = await Role.findOne({
      code: employee.roleCode,
      isActive: true,
    });

    if (!role) {
      throw new Error(`Role ${employee.roleCode} không tồn tại`);
    }

    let teamId = null;

    if (employee.teamCode) {
      const team = await Team.findOne({
        code: employee.teamCode,
        isActive: true,
      });

      if (!team) {
        throw new Error(`Team ${employee.teamCode} không tồn tại`);
      }

      teamId = team._id;
    }

    const hashedPassword = await hashPassword(employee.password);

    await Employee.updateOne(
      {
        username: employee.username,
      },
      {
        $set: {
          employeeCode: employee.employeeCode,

          username: employee.username,

          password: hashedPassword,

          fullName: employee.fullName,

          email: employee.email,

          phone: employee.phone,

          avatar: employee.avatar,

          roleId: role._id,

          teamId,

          bankName: employee.bankName,

          bankAccountNumber: employee.bankAccountNumber,

          bankAccountHolder: employee.bankAccountHolder,

          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Employees");
}