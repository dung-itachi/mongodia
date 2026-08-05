/**
 * ==================================================
 * CUSTOMER ACTIVITY MAPPER
 * ==================================================
 *
 * Sprint 8.1 — Customer Timeline & CRM Activities
 *
 * Maps Mongoose documents to API response DTOs.
 */

import type { CustomerActivityResponse } from "@/types/customer-activity";
import { ActivityType, ActivityResult } from "@/models/CustomerActivity";

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ActivityType.CALL]: "Gọi điện",
  [ActivityType.MEETING]: "Gặp trực tiếp",
  [ActivityType.NOTE]: "Ghi chú",
  [ActivityType.FOLLOW_UP]: "Theo dõi",
  [ActivityType.EMAIL]: "Email",
  [ActivityType.SMS]: "SMS",
  [ActivityType.OTHER]: "Khác",
};

const ACTIVITY_RESULT_LABELS: Record<ActivityResult, string> = {
  [ActivityResult.SUCCESS]: "Thành công",
  [ActivityResult.FAILED]: "Thất bại",
  [ActivityResult.NO_ANSWER]: "Không nghe máy",
  [ActivityResult.PENDING]: "Chờ xử lý",
};

const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  [ActivityType.CALL]: "📞",
  [ActivityType.MEETING]: "🤝",
  [ActivityType.NOTE]: "📝",
  [ActivityType.FOLLOW_UP]: "🔔",
  [ActivityType.EMAIL]: "📧",
  [ActivityType.SMS]: "💬",
  [ActivityType.OTHER]: "📌",
};

type PopulatedDoc = Record<string, unknown>;

function getFieldValue(obj: unknown, field: string): unknown {
  if (obj && typeof obj === "object" && field in obj) {
    return (obj as Record<string, unknown>)[field];
  }
  return undefined;
}

export function mapCustomerActivity(
  doc: PopulatedDoc | null
): CustomerActivityResponse | null {
  if (!doc) return null;

  const activityType = doc.activityType as ActivityType;
  const result = doc.result as ActivityResult | undefined;

  return {
    _id: String(doc._id ?? ""),
    customerId: String(doc.customerId ?? ""),
    employeeId: String(doc.employeeId ?? ""),
    activityType,
    title: String(doc.title ?? ""),
    content: doc.content as string | undefined,
    nextFollowUpAt: doc.nextFollowUpAt
      ? new Date(doc.nextFollowUpAt as string).toISOString()
      : undefined,
    result,
    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string).toISOString()
      : new Date().toISOString(),
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt as string).toISOString()
      : new Date().toISOString(),
    activityTypeLabel: ACTIVITY_TYPE_LABELS[activityType] ?? activityType,
    resultLabel: result ? ACTIVITY_RESULT_LABELS[result] ?? result : undefined,
    customer: doc.customerId
      ? {
          _id: String(getFieldValue(doc.customerId, "_id") ?? doc.customerId),
          customerCode: String(getFieldValue(doc.customerId, "customerCode") ?? ""),
          fullName: String(getFieldValue(doc.customerId, "fullName") ?? ""),
        }
      : undefined,
    employee: doc.employeeId
      ? {
          _id: String(getFieldValue(doc.employeeId, "_id") ?? doc.employeeId),
          employeeCode: String(getFieldValue(doc.employeeId, "employeeCode") ?? ""),
          fullName: String(getFieldValue(doc.employeeId, "fullName") ?? ""),
        }
      : undefined,
  };
}

export function getActivityTypeLabel(type: ActivityType): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type;
}

export function getActivityResultLabel(result: ActivityResult): string {
  return ACTIVITY_RESULT_LABELS[result] ?? result;
}

export function getActivityTypeIcon(type: ActivityType): string {
  return ACTIVITY_TYPE_ICONS[type] ?? "📌";
}
