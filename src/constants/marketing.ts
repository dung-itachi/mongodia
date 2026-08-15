import { LeadSource, LEAD_SOURCE_LABELS } from "@/constants/leadSource";
import { LeadStatus, LEAD_STATUS_LABELS } from "@/constants/leadStatus";

export { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS };

export const LEAD_STATUS_OPTIONS = (Object.values(LeadStatus) as LeadStatus[]).map(
  (status) => ({ value: status, label: LEAD_STATUS_LABELS[status] })
);

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
