import { ROLES } from "@/constants/roles";
import Permission from "@/models/Permission";
import Role from "@/models/Role";
import RolePermission from "@/models/RolePermission";

export async function seedRoles() {
  // Seed Roles (without embedded permissions)
  for (const role of ROLES) {
    await Role.updateOne(
      { code: role.code },
      {
        $set: {
          code: role.code,
          name: role.name,
          description: "",
          isActive: true,
        },
      },
      { upsert: true }
    );
  }

  console.log("[OK] Roles");

  // Seed RolePermissions (junction table)
  // Clear existing RolePermissions first (for idempotent seed)
  await RolePermission.deleteMany({});

  for (const role of ROLES) {
    const roleDoc = await Role.findOne({ code: role.code, isActive: true });
    if (!roleDoc) continue;

    let permissionIds: string[];

    if (role.permissions.includes("*")) {
      const permissions = await Permission.find(
        { isActive: true },
        "_id"
      ).lean();
      permissionIds = permissions.map((p) => p._id.toString());
    } else {
      const permissions = await Permission.find(
        { code: { $in: role.permissions }, isActive: true },
        "_id"
      ).lean();
      permissionIds = permissions.map((p) => p._id.toString());
    }

    // Create RolePermission documents
    const rolePermissions = permissionIds.map((permissionId) => ({
      roleId: roleDoc._id,
      permissionId: permissionId,
    }));

    if (rolePermissions.length > 0) {
      await RolePermission.insertMany(rolePermissions, { ordered: false });
    }
  }

  console.log("[OK] RolePermissions");
}
