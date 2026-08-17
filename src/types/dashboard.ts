/**
 * Dashboard Types (Sprint 4.1 - Dashboard Foundation)
 *
 * Type definitions for Dashboard data.
 * All values are aggregated từ Lead + Order collections (real data only).
 */

/** Available filter periods for dashboard KPI stats. */
export type DashboardPeriod =
  | "1d"   // Hôm nay (1 ngày)
  | "3d"   // 3 ngày gần nhất
  | "7d"   // 7 ngày gần nhất
  | "month" // Từ đầu tháng đến hiện tại
  | "prev_month"; // Tháng trước (toàn bộ tháng)

export type DashboardTrend = {
  /** % thay đổi so với kỳ trước (cùng độ dài). Ví dụ: 12.5 nghĩa là +12.5% */
  percent: number;
  /** Hướng thay đổi. */
  direction: "up" | "down" | "flat";
};

export type DashboardSummary = {
  /** Tổng số Lead (mọi status, không bao gồm CANCELLED/REJECTED). */
  totalLeads: number;
  /** Tổng số Lead đã chốt (CLOSED + ORDER_CREATED). */
  closedLeads: number;
  /** Số đơn hàng đang vận chuyển (SHIPPING). */
  shippingOrders: number;
  /** Số đơn hàng đã giao (DELIVERED + RECONCILED). */
  deliveredOrders: number;
  /** Số đơn hàng bị hoàn/trả (RETURNED). */
  returnedOrders: number;
  /** Số đơn hàng bị hủy (CANCELLED). */
  cancelledOrders: number;
  /** Tổng doanh thu (sum totalAmount của các đơn không CANCELLED). */
  revenue: number;
  /** Tổng số đơn hàng (mọi status, bao gồm CANCELLED). */
  totalOrders: number;
  /** Thay đổi doanh thu so với kỳ trước (cùng độ dài). */
  trend: DashboardTrend;
};

export type DashboardPipeline = {
  /** Lead mới (NEW) */
  new: number;
  /** Lead đã liên hệ (CONTACTED + QUALIFIED + ASSIGNED + PROCESSING) */
  contacted: number;
  /** Lead đã chốt (CLOSED + ORDER_CREATED) */
  closed: number;
  /** Đơn hàng đang giao (SHIPPING) */
  shipping: number;
  /** Đơn hàng đã giao thành công (DELIVERED + RECONCILED) */
  delivered: number;
  /** Đơn hàng hoàn/trả (RETURNED) */
  returned: number;
  /** Đơn hàng đã hủy (CANCELLED) */
  cancelled: number;
};

export type DashboardResponse = {
  /** Summary statistics for KPI cards */
  summary: DashboardSummary;
  /** Pipeline data for pipeline visualization */
  pipeline: DashboardPipeline;
};

export type DashboardApiResponse = {
  success: boolean;
  data: DashboardResponse;
  message?: string;
};