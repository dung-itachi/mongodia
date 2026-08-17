/**
 * GET  /api/roles/[id]/permissions
 * PUT  /api/roles/[id]/permissions
 *
 * Phase 9 — Role & Permission Tree (RBAC).
 *
 * Reads and replaces the role↔permission mapping for a single role.
 * Backed by the `RolePermission` junction table (see
 * `src/models/RolePermission.ts`).
 *
 * Authorization (constant across GET and PUT):
 *   - Requires `role.permission.manage` (or wildcard "*").
 *
 * ADMIN invariant (preserved across both methods):
 *   - ADMIN role's effective set is the wildcard "*"; it is NEVER
 *     enumerated as concrete permission codes in `RolePermission`.
 *   - PUT requests targeting the ADMIN role are rejected with 400 to
 *     keep the wildcard invariant safe by construction.
 *
 * GET response shape:
 *   {
 *     role: { _id, code, name, isActive },
 *     isWildcard: boolean,
 *     isAdmin: boolean,             // true when role.code === "ADMIN"
 *     grantedCodes: string[],       // empty when isWildcard
 *     totalGranted: number          // count of granted codes (or "ALL" when isWildcard)
 *   }
 *
 * PUT body:
 *   {
 *     codes: string[]               // required; the new full set
 *     wildcard?: boolean            // optional; only allowed when target is ADMIN
 *   }
 *
 * PUT validation:
 *   - Reject unknown permission codes (codes not in PERMISSIONS).
 *   - Reject `wildcard: true` unless target role is ADMIN.
 *   - Reject PUT targeting ADMIN (always).
 *   - Reject PUT on inactive roles (defensive — admins may want to
 *     reactivate first).
 *
 * Side effect:
 *   - Replace-all semantics: deletes all existing RolePermission rows
 *     for the role, then inserts the new ones. Wrapped in a single
 *     Mongo session so partial failure cannot leave dangling rows.
 *   - Audit row written via `writeRoleAudit`.
 */

import mongoose from "mongoose";

import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import {
  findUnknownPermissions,
  resolveRolePermissionSet,
} from "@/lib/permission-modules";
import { writeRoleAudit } from "@/lib/role-audit";

import Permission from "@/models/Permission";
import Role from "@/models/Role";
import RolePermission from "@/models/RolePermission";

import { error as errorResponse, success } from "@/utils/response";

function authorize(currentUser: { permissions: string[] }) {
  return (
    currentUser.permissions.includes("*") ||
    currentUser.permissions.includes("role.permission.manage")
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!authorize(currentUser)) {
      return errorResponse(
        "Bạn không có quyền quản lý phân quyền",
        403,
      );
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID vai trò không hợp lệ", 400);
    }

    const role = await Role.findById(id).lean();
    if (!role) return errorResponse("Không tìm thấy vai trò", 404);

    const isAdmin = role.code === "ADMIN";

    // Resolve the persisted RolePermission rows for this role. We
    // do not use Mongoose's `.populate<T>` typed helper here because
    // the row type would need to be expressed with a generic that
    // collides with `lean()`. Instead, look up permissions by id in
    // a single query — simpler and avoids any TS drift.
    const rpRows = await RolePermission.find({ roleId: role._id })
      .select("permissionId")
      .lean();
    const rpPermissionIds = rpRows.map((rp) => {
      const raw = rp.permissionId as unknown;
      return typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && "_id" in raw
          ? String((raw as { _id: unknown })._id)
          : "";
    });
    const permissionDocs =
      rpPermissionIds.length > 0
        ? await Permission.find({
            _id: { $in: rpPermissionIds },
            isActive: true,
          })
            .select("code")
            .lean()
        : [];
    const persistedCodes = permissionDocs.map((p) => p.code);

    const resolved = resolveRolePermissionSet(persistedCodes);
    // ADMIN always shows as wildcard, regardless of what (if anything)
    // is in RolePermission (defensive: the seed never writes rows for
    // ADMIN).
    const isWildcard = isAdmin || resolved.wildcard;
    const grantedCodes = isWildcard ? [] : resolved.codes;

    return success({
      role: {
        _id: role._id,
        code: role.code,
        name: role.name,
        isActive: role.isActive,
        visibleGroups: Array.isArray(role.visibleGroups) ? role.visibleGroups : [],
      },
      isWildcard,
      isAdmin,
      grantedCodes,
      totalGranted: isWildcard ? -1 : grantedCodes.length,
    });
  } catch (err) {
    console.error("Get Role Permissions Error:", err);
    return errorResponse("Không thể lấy phân quyền vai trò", 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!authorize(currentUser)) {
      return errorResponse(
        "Bạn không có quyền quản lý phân quyền",
        403,
      );
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("ID vai trò không hợp lệ", 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Dữ liệu không hợp lệ", 400);
    }

    const parsed = body as {
      codes?: unknown;
      wildcard?: unknown;
    };

    if (!Array.isArray(parsed.codes)) {
      return errorResponse("Mã permission không hợp lệ", 400);
    }
    if (parsed.codes.some((c) => typeof c !== "string")) {
      return errorResponse("Mã permission không hợp lệ", 400);
    }
    if (parsed.wildcard !== undefined && typeof parsed.wildcard !== "boolean") {
      return errorResponse("Cờ wildcard không hợp lệ", 400);
    }

    const codes = Array.from(new Set(parsed.codes as string[]));
    const wantsWildcard = parsed.wildcard === true;

    const role = await Role.findById(id);
    if (!role) return errorResponse("Không tìm thấy vai trò", 404);
    if (!role.isActive) {
      return errorResponse("Không thể sửa vai trò đã ngừng hoạt động", 400);
    }

    // ADMIN invariant: never edit ADMIN via this endpoint.
    if (role.code === "ADMIN") {
      return errorResponse(
        "Không thể thay đổi phân quyền của vai trò ADMIN",
        400,
      );
    }

    // Wildcard only allowed on ADMIN — already blocked above, so any
    // wildcard=true here is invalid.
    if (wantsWildcard) {
      return errorResponse(
        "Chỉ ADMIN mới được cấp wildcard — không thể gán cho vai trò khác",
        400,
      );
    }

    // Reject unknown codes.
    const unknown = findUnknownPermissions(codes);
    if (unknown.length > 0) {
      return errorResponse(
        `Mã permission không tồn tại: ${unknown.join(", ")}`,
        400,
      );
    }

    // Resolve permission IDs for the requested codes.
    const permissionDocs = await Permission.find({
      code: { $in: codes },
      isActive: true,
    })
      .select("_id code")
      .lean();
    const permissionIdByCode = new Map(
      permissionDocs.map((p) => [p.code, p._id.toString()]),
    );

    // Snapshot old data for audit. Look up permission codes by id —
    // see GET branch for rationale.
    const oldRp = await RolePermission.find({ roleId: role._id })
      .select("permissionId")
      .lean();
    const oldRpPermIds = oldRp.map((rp) => {
      const raw = rp.permissionId as unknown;
      return typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && "_id" in raw
          ? String((raw as { _id: unknown })._id)
          : "";
    });
    const oldPermDocs =
      oldRpPermIds.length > 0
        ? await Permission.find({ _id: { $in: oldRpPermIds } })
            .select("code")
            .lean()
        : [];
    const oldCodes = oldPermDocs.map((p) => p.code);

    // Replace-all under a session for atomicity.
    const session = await mongoose.startSession();
    let newRolePermissionIds: string[] = [];
    try {
      await session.withTransaction(async () => {
        await RolePermission.deleteMany({ roleId: role._id }, { session });
        const newRows = codes
          .map((code) => permissionIdByCode.get(code))
          .filter((pid): pid is string => Boolean(pid))
          .map((permissionId) => ({
            roleId: role._id,
            permissionId: new mongoose.Types.ObjectId(permissionId),
          }));
        if (newRows.length > 0) {
          const inserted = await RolePermission.insertMany(newRows, {
            session,
            ordered: false,
          });
          newRolePermissionIds = inserted.map((r) => r._id.toString());
        }
      });
    } finally {
      await session.endSession();
    }

    const employeeId = currentUser.employee?._id?.toString();
    if (employeeId) {
      await writeRoleAudit({
        actorId: employeeId,
        roleId: role._id.toString(),
        roleCode: role.code,
        action: "UPDATE_ROLE_PERMISSIONS",
        oldData: { codes: oldCodes },
        newData: { codes, insertedCount: newRolePermissionIds.length },
        request,
      });
    }

    return success(
      {
        role: {
          _id: role._id,
          code: role.code,
          name: role.name,
          isActive: role.isActive,
        },
        grantedCodes: codes,
        totalGranted: codes.length,
      },
      "Cập nhật phân quyền thành công",
    );
  } catch (err) {
    console.error("Update Role Permissions Error:", err);
    return errorResponse("Không thể cập nhật phân quyền vai trò", 500);
  }
}
