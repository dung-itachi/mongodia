import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { updateRoleSchema } from "@/utils/validator";

import Role from "@/models/Role";
import Permission from "@/models/Permission";
import RolePermission from "@/models/RolePermission";

import { getModulesByGroup } from "@/config/modules";
import { mapRole } from "@/mappers/role.mapper";
import { error as errorResponse, success } from "@/utils/response";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("role.view")) {
            return errorResponse(
                "Bạn không có quyền xem vai trò",
                403
            );
        }

        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(
                "ID vai trò không hợp lệ",
                400
            );
        }

        const role = await Role.findById(id).lean();

        if (!role) {
            return errorResponse(
                "Không tìm thấy vai trò",
                404
            );
        }

        return success(mapRole(role));

    } catch (error) {
        console.error("Role Detail Error:", error);

        return errorResponse(
            "Không thể lấy thông tin vai trò",
            500
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getCurrentUser(request);

        if (!currentUser.permissions.includes("role.update")) {
            return errorResponse(
                "Bạn không có quyền cập nhật vai trò",
                403
            );
        }

        await connectDB();

        const { id } = await params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return errorResponse(
                "ID vai trò không hợp lệ",
                400
            );
        }

        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return errorResponse(
                "Dữ liệu không hợp lệ",
                400
            );
        }

        const parsedBody =
            updateRoleSchema.safeParse(body);

        if (!parsedBody.success) {
            return errorResponse(
                parsedBody.error.issues[0]?.message ??
                "Dữ liệu không hợp lệ",
                400
            );
        }

        const data = parsedBody.data;

        const role = await Role.findById(id);

        if (!role) {
            return errorResponse(
                "Không tìm thấy vai trò",
                404
            );
        }

        const existedCode = await Role.findOne({
            code: data.code.toUpperCase(),
            _id: { $ne: id },
          });
          
          if (existedCode) {
            return errorResponse(
              "Mã vai trò đã tồn tại",
              400
            );
          }

          const existedName = await Role.findOne({
            name: data.name,
            _id: { $ne: id },
          });
          
          if (existedName) {
            return errorResponse(
              "Tên vai trò đã tồn tại",
              400
            );
          }

          role.code = data.code.toUpperCase();
          role.name = data.name;
          role.description = data.description ?? "";
          role.isActive = data.isActive;

          // Sprint — Role-based sidebar visibility.
          // Empty array means "use dynamic resolution" (Leader only).
          // ADMIN role ignores this; we still store it for symmetry.
          const nextVisibleGroups = Array.isArray(
            (data as { visibleGroups?: unknown }).visibleGroups,
          )
            ? ((data as { visibleGroups: unknown[] }).visibleGroups.filter(
                (g) => typeof g === "string",
              ) as string[])
            : [];
          const previousVisibleGroups = Array.isArray(role.visibleGroups)
            ? (role.visibleGroups as string[])
            : [];
          role.visibleGroups = nextVisibleGroups;

          // Auto-grant — when the admin ticks a NEW group for this role
          // (i.e. a group that wasn't in `previousVisibleGroups`), grant
          // the corresponding module permissions so the user can both SEE
          // the menu items AND actually OPEN them (otherwise they would
          // hit a 403 from the backend route guard).
          //
          // We are ADDITIVE only: existing permissions are never
          // removed. If the admin wants to revoke a previously-granted
          // permission, they should manage it via the Permission Tree
          // page. This keeps the Sidebar tick and the Permission Tree
          // independent and prevents accidental data loss.
          const previousSet = new Set(previousVisibleGroups);
          const newlyAddedGroups = nextVisibleGroups.filter(
            (g) => !previousSet.has(g),
          );

          if (newlyAddedGroups.length > 0) {
            // Collect unique permission codes for every newly-ticked group.
            const codes = new Set<string>();
            for (const groupKey of newlyAddedGroups) {
              const modules = getModulesByGroup(
                groupKey as Parameters<typeof getModulesByGroup>[0],
              );
              for (const m of modules) {
                if (Array.isArray(m.permissions) && m.permissions.length > 0) {
                  m.permissions.forEach((p) => codes.add(p));
                } else if (typeof m.permission === "string" && m.permission) {
                  codes.add(m.permission);
                }
              }
            }

            if (codes.size > 0) {
              const permissionDocs = await Permission.find({
                code: { $in: Array.from(codes) },
                isActive: true,
              })
                .select("_id code")
                .lean();

              if (permissionDocs.length > 0) {
                const roleId = role._id as mongoose.Types.ObjectId;
                // insertMany with `ordered: false` skips duplicates (the
                // unique index on (roleId, permissionId) prevents creating
                // duplicates).
                await RolePermission.insertMany(
                  permissionDocs.map((p) => ({
                    roleId,
                    permissionId: p._id,
                  })),
                  { ordered: false },
                ).catch((err: unknown) => {
                  // E11000 duplicate-key errors are expected when the
                  // role already has some of these permissions.
                  if (
                    !(err as { code?: number }).code ||
                    (err as { code?: number }).code !== 11000
                  ) {
                    throw err;
                  }
                });
              }
            }
          }

          await role.save();

          return success(
            mapRole(role.toObject()),
            "Cập nhật vai trò thành công"
          );

    } catch (error) {
        console.error("Update Role Error:", error);

        return errorResponse(
            "Không thể cập nhật vai trò",
            500
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const currentUser = await getCurrentUser(request);
  
      if (!currentUser.permissions.includes("role.delete")) {
        return errorResponse(
          "Bạn không có quyền xóa vai trò",
          403
        );
      }
  
      await connectDB();
  
      const { id } = await params;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return errorResponse(
          "ID vai trò không hợp lệ",
          400
        );
      }
  
      const role = await Role.findById(id);
  
      if (!role) {
        return errorResponse(
          "Không tìm thấy vai trò",
          404
        );
      }
  
      role.isActive = false;
  
      await role.save();
  
      return success(
        null,
        "Xóa vai trò thành công"
      );
  
    } catch (error) {
      console.error("Delete Role Error:", error);
  
      return errorResponse(
        "Không thể xóa vai trò",
        500
      );
    }
  }