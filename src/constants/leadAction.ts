export enum LeadAction {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  ASSIGNED = "ASSIGNED",
  UNASSIGNED = "UNASSIGNED",
  STATUS_CHANGED = "STATUS_CHANGED",
  ORDER_CREATED = "ORDER_CREATED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  SALE_CHANGED = "SALE_CHANGED",
  MARKETING_CHANGED = "MARKETING_CHANGED",
  NOTE_UPDATED = "NOTE_UPDATED",
  DELETED = "DELETED",
  CONVERT = "CONVERT",
}

export const LEAD_ACTION_LABELS: Record<LeadAction, string> = {
  [LeadAction.CREATED]: "Tạo Lead",
  [LeadAction.UPDATED]: "Cập nhật",
  [LeadAction.ASSIGNED]: "Phân công Sale",
  [LeadAction.UNASSIGNED]: "Hủy phân công",
  [LeadAction.STATUS_CHANGED]: "Thay đổi trạng thái",
  [LeadAction.ORDER_CREATED]: "Tạo đơn hàng",
  [LeadAction.ORDER_CANCELLED]: "Hủy đơn hàng",
  [LeadAction.SALE_CHANGED]: "Đổi Sale phụ trách",
  [LeadAction.MARKETING_CHANGED]: "Đổi Marketing phụ trách",
  [LeadAction.NOTE_UPDATED]: "Cập nhật ghi chú",
  [LeadAction.DELETED]: "Xóa Lead",
  [LeadAction.CONVERT]: "Convert Lead thành Order",
};

export const LEAD_ACTIONS = Object.values(LeadAction);
