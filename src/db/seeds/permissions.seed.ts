import Permission from "@/models/Permission";
import { PERMISSIONS } from "@/constants/permissions";
import { PERMISSION_MODULE_MAP } from "@/lib/permission-modules";

export { PERMISSION_MODULE_MAP };

export async function seedPermissions() {
  for (const permission of PERMISSIONS) {
    const module = PERMISSION_MODULE_MAP[permission.code] ?? "General";

    await Permission.updateOne(
      { code: permission.code },
      {
        $set: {
          code: permission.code,
          name: permission.name,
          module,
          description: "",
          isActive: true,
        },
      },
      { upsert: true }
    );
  }

  console.log("[OK] Permissions");
}
