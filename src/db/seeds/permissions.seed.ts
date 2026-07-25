import { PERMISSIONS } from "@/constants/permissions";
import Permission from "@/models/Permission";

export async function seedPermissions() {
  for (const permission of PERMISSIONS) {
    await Permission.updateOne(
      {
        code: permission.code,
      },
      {
        $set: {
          ...permission,
          isActive: true,
        },
      },
      {
        upsert: true,
      }
    );
  }

  console.log("[OK] Permissions");
}