import { Types } from "mongoose";

import AuditLog from "@/models/AuditLog";

type AccountAuditAction =
  | "CREATE_ACCOUNT"
  | "UPDATE_ACCOUNT"
  | "DISABLE_ACCOUNT"
  | "ENABLE_ACCOUNT"
  | "RESET_PASSWORD"
  | "CHANGE_ROLE"
  | "CHANGE_LEADER"
  | "UPDATE_PROFILE"
  | "CHANGE_PASSWORD";

export async function writeAccountAudit({
  actorId,
  targetId,
  action,
  oldData,
  newData,
  request,
}: {
  actorId: Types.ObjectId | string;
  targetId?: Types.ObjectId | string | null;
  action: AccountAuditAction;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  request?: Request;
}) {
  await AuditLog.create({
    employeeId: actorId,
    targetId: targetId ?? null,
    action,
    module: "ACCOUNT",
    oldData: oldData ?? null,
    newData: newData ?? null,
    ip: request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request?.headers.get("user-agent") ?? "",
  });
}
