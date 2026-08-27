/**
 * Lead Call Status Constants (Module 6 - Nhật ký cuộc gọi)
 *
 * Các trạng thái cuộc gọi khi Sale liên hệ với Lead.
 */

export enum LeadCallStatus {
  /** Chưa gọi - Lead mới, chưa có ai liên hệ */
  NOT_CALLED = "NOT_CALLED",
  /** Không nghe máy - Gọi nhưng không có ai trả lời */
  NO_ANSWER = "NO_ANSWER",
  /** Máy bận - Gọi nhưng đường dây bận */
  BUSY = "BUSY",
  /** Sai số - Số điện thoại không đúng */
  WRONG_NUMBER = "WRONG_NUMBER",
  /** Tiềm năng - Khách hàng có nhu cầu, cần theo dõi */
  POTENTIAL = "POTENTIAL",
  /** Không nhu cầu - Khách hàng từ chối hoặc không có nhu cầu */
  NOT_INTERESTED = "NOT_INTERESTED",
  /** Hẹn gọi lại - Khách hẹn gọi lại sau */
  CALL_BACK = "CALL_BACK",
  /** Đã gọi chốt - Khách đồng ý mua, đã xác nhận nhưng chưa tạo đơn */
  LEAD_CLOSED = "LEAD_CLOSED",
  /** Chốt đơn - Chuyển sang trạng thái chốt đơn, mở form tạo đơn hàng */
  CONVERTED = "CONVERTED",
}

export const LEAD_CALL_STATUS_LABELS: Record<LeadCallStatus, string> = {
  [LeadCallStatus.NOT_CALLED]: "Chưa gọi",
  [LeadCallStatus.NO_ANSWER]: "Không nghe máy",
  [LeadCallStatus.BUSY]: "Máy bận",
  [LeadCallStatus.WRONG_NUMBER]: "Sai số",
  [LeadCallStatus.POTENTIAL]: "Tiềm năng",
  [LeadCallStatus.NOT_INTERESTED]: "Không nhu cầu",
  [LeadCallStatus.CALL_BACK]: "Hẹn gọi lại",
  [LeadCallStatus.LEAD_CLOSED]: "Đã gọi chốt",
  [LeadCallStatus.CONVERTED]: "Chốt đơn",
};

/** Trạng thái cuộc gọi mà khiến lead chuyển sang NO_ANSWER */
export const NO_ANSWER_STATUSES = [
  LeadCallStatus.NO_ANSWER,
  LeadCallStatus.BUSY,
  LeadCallStatus.WRONG_NUMBER,
] as const;

/** Trạng thái cuộc gọi tích cực - cần theo dõi */
export const POSITIVE_STATUSES = [
  LeadCallStatus.POTENTIAL,
  LeadCallStatus.CALL_BACK,
  LeadCallStatus.LEAD_CLOSED,
  LeadCallStatus.CONVERTED,
] as const;

/** Trạng thái cuộc gọi tiêu cực - khách không mua */
export const NEGATIVE_STATUSES = [
  LeadCallStatus.NOT_INTERESTED,
  LeadCallStatus.WRONG_NUMBER,
] as const;

export const LEAD_CALL_STATUSES = Object.values(LeadCallStatus);
