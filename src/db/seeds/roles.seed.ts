import { ROLES } from "@/constants/roles";
import Permission from "@/models/Permission";
import Role from "@/models/Role";

export async function seedRoles() {
  for (const role of ROLES) {
    let permissionIds = [];

    if (role.permissions.includes("*")) {
      const permissions = await Permission.find(
        { isActive: true },
        "_id"
      );

      permissionIds = permissions.map((permission) => permission._id);
    } else {
      const permissions = await Permission.find({
        code: {
          $in: role.permissions,
        },
        isActive: true,
      });

      permissionIds = permissions.map((permission) => permission._id);
    }

    await Role.updateOne(
      {
        code: role.code,
      },
      {
        $set: {
          code: role.code,
          name: role.name,
          permissions: permissionIds,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Roles");
}