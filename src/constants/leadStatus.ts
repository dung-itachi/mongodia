export enum LeadStatus {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  QUALIFIED = "QUALIFIED",
  ASSIGNED = "ASSIGNED",
  PROCESSING = "PROCESSING",
  NO_ANSWER = "NO_ANSWER",
  POTENTIAL = "POTENTIAL",
  CLOSED = "CLOSED",
  LOST = "LOST",
  ORDER_CREATED = "ORDER_CREATED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  [LeadStatus.NEW]: "Mới",
  [LeadStatus.CONTACTED]: "Đã liên hệ",
  [LeadStatus.QUALIFIED]: "Đủ điều kiện",
  [LeadStatus.ASSIGNED]: "Đã phân công",
  [LeadStatus.PROCESSING]: "Đang xử lý",
  [LeadStatus.NO_ANSWER]: "Không nghe máy",
  [LeadStatus.POTENTIAL]: "Tiềm năng",
  [LeadStatus.CLOSED]: "Đã chốt",
  [LeadStatus.LOST]: "Không mua",
  [LeadStatus.ORDER_CREATED]: "Đã tạo đơn",
  [LeadStatus.REJECTED]: "Từ chối",
  [LeadStatus.CANCELLED]: "Hủy",
};

export const LEAD_STATUS_ORDER = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.ASSIGNED,
  LeadStatus.PROCESSING,
  LeadStatus.NO_ANSWER,
  LeadStatus.POTENTIAL,
  LeadStatus.CLOSED,
  LeadStatus.LOST,
  LeadStatus.ORDER_CREATED,
  LeadStatus.REJECTED,
  LeadStatus.CANCELLED,
];
