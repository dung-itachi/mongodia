export enum LeadStatus {
  NEW = "NEW",
  ASSIGNED = "ASSIGNED",
  PROCESSING = "PROCESSING",
  NO_ANSWER = "NO_ANSWER",
  POTENTIAL = "POTENTIAL",
  ORDER_CREATED = "ORDER_CREATED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "Mới",
  [LeadStatus.ASSIGNED]: "Đã phân công",
  [LeadStatus.PROCESSING]: "Đang xử lý",
  [LeadStatus.NO_ANSWER]: "Không nghe máy",
  [LeadStatus.POTENTIAL]: "Tiềm năng",
  [LeadStatus.ORDER_CREATED]: "Đã tạo đơn",
  [LeadStatus.REJECTED]: "Từ chối",
  [LeadStatus.CANCELLED]: "Hủy",
};

export const LEAD_STATUS_ORDER = [
  LeadStatus.NEW,
  LeadStatus.ASSIGNED,
  LeadStatus.PROCESSING,
  LeadStatus.NO_ANSWER,
  LeadStatus.POTENTIAL,
  LeadStatus.ORDER_CREATED,
  LeadStatus.REJECTED,
  LeadStatus.CANCELLED,
];
