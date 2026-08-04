import { LeadSource, LEAD_SOURCE_LABELS } from "@/constants/leadSource";
import { LeadStatus, LEAD_STATUS_LABELS } from "@/constants/leadStatus";

export { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS };

export const LEAD_STATUS_OPTIONS = [
  { value: LeadStatus.NEW, label: LEAD_STATUS_LABELS[LeadStatus.NEW] },
  { value: LeadStatus.CONTACTED, label: LEAD_STATUS_LABELS[LeadStatus.CONTACTED] },
  { value: LeadStatus.ASSIGNED, label: LEAD_STATUS_LABELS[LeadStatus.ASSIGNED] },
  { value: LeadStatus.CLOSED, label: LEAD_STATUS_LABELS[LeadStatus.CLOSED] },
  { value: LeadStatus.CANCELLED, label: LEAD_STATUS_LABELS[LeadStatus.CANCELLED] },
];

export const LEAD_SOURCE_OPTIONS = Object.values(LeadSource).map((source) => ({
  value: source,
  label: LEAD_SOURCE_LABELS[source],
}));

export const MARKETING_LEAD_ACTIONS = ["view", "edit", "delete", "assign", "convert"] as const;

export type MarketingLeadAction = (typeof MARKETING_LEAD_ACTIONS)[number];

export const MARKETING_LEAD_ACTION_LABELS: Record<MarketingLeadAction, string> = {
  view: "Xem",
  edit: "Sửa",
  delete: "Xóa",
  assign: "Assign",
  convert: "Convert",
};
