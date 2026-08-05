/**
 * ==================================================
 * CUSTOMER MAPPER
 * ==================================================
 *
 * Sprint 8.0 — Customer Module Foundation
 *
 * Maps Mongoose documents to API response DTOs.
 */

import type { CustomerResponse } from "@/types/customer";
import { CustomerStatus } from "@/models/Customer";

const STATUS_LABELS: Record<CustomerStatus, string> = {
  [CustomerStatus.ACTIVE]: "Hoạt động",
  [CustomerStatus.INACTIVE]: "Không hoạt động",
  [CustomerStatus.BLOCKED]: "Bị chặn",
};

type PopulatedDoc = Record<string, unknown>;

export function mapCustomer(doc: PopulatedDoc | null): CustomerResponse | null {
  if (!doc) return null;

  return {
    _id: String(doc._id ?? ""),
    customerCode: String(doc.customerCode ?? ""),
    fullName: String(doc.fullName ?? ""),
    phone: String(doc.phone ?? ""),
    email: doc.email as string | undefined,
    gender: doc.gender as "male" | "female" | "other" | undefined,
    birthday: doc.birthday
      ? new Date(doc.birthday as string).toISOString()
      : undefined,
    address: doc.address as CustomerResponse["address"],

    facebook: doc.facebook as string | undefined,
    zalo: doc.zalo as string | undefined,
    note: doc.note as string | undefined,

    marketingEmployee: doc.marketingEmployeeId
      ? {
          _id: String(getFieldValue(doc.marketingEmployeeId, "_id") ?? doc.marketingEmployeeId),
          employeeCode: String(getFieldValue(doc.marketingEmployeeId, "employeeCode") ?? ""),
          fullName: String(getFieldValue(doc.marketingEmployeeId, "fullName") ?? ""),
        }
      : undefined,

    saleEmployee: doc.saleEmployeeId
      ? {
          _id: String(getFieldValue(doc.saleEmployeeId, "_id") ?? doc.saleEmployeeId),
          employeeCode: String(getFieldValue(doc.saleEmployeeId, "employeeCode") ?? ""),
          fullName: String(getFieldValue(doc.saleEmployeeId, "fullName") ?? ""),
        }
      : undefined,

    facebookPage: doc.facebookPageId
      ? {
          _id: String(getFieldValue(doc.facebookPageId, "_id") ?? doc.facebookPageId),
          code: String(getFieldValue(doc.facebookPageId, "code") ?? ""),
          name: String(getFieldValue(doc.facebookPageId, "name") ?? ""),
        }
      : undefined,

    campaign: doc.campaignId
      ? {
          _id: String(getFieldValue(doc.campaignId, "_id") ?? doc.campaignId),
          code: String(getFieldValue(doc.campaignId, "code") ?? ""),
          name: String(getFieldValue(doc.campaignId, "name") ?? ""),
        }
      : undefined,

    lead: doc.leadId
      ? {
          _id: String(getFieldValue(doc.leadId, "_id") ?? doc.leadId),
          code: String(getFieldValue(doc.leadId, "code") ?? ""),
          fullName: String(getFieldValue(doc.leadId, "fullName") ?? ""),
        }
      : undefined,

    status: doc.status as CustomerStatus,
    statusLabel: STATUS_LABELS[doc.status as CustomerStatus] ?? String(doc.status ?? ""),

    createdBy: doc.createdBy
      ? String(getFieldValue(doc.createdBy, "_id") ?? doc.createdBy)
      : undefined,

    createdAt: doc.createdAt
      ? new Date(doc.createdAt as string).toISOString()
      : new Date().toISOString(),
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt as string).toISOString()
      : new Date().toISOString(),
    isActive: doc.isActive !== false,
  };
}

function getFieldValue(obj: unknown, field: string): unknown {
  if (obj && typeof obj === "object" && field in obj) {
    return (obj as Record<string, unknown>)[field];
  }
  return undefined;
}
