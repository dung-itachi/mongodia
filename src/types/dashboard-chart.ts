/**
 * Dashboard Chart Types (Sprint 4.2 - Dashboard Charts)
 *
 * Type definitions for dashboard charts.
 */

export type PipelineChartItem = {
  /** Stage label */
  label: string;
  /** Number of items in this stage */
  value: number;
};

export type RevenueChartItem = {
  /** Date string (YYYY-MM-DD or YYYY-MM) */
  date: string;
  /** Revenue amount for this period */
  revenue: number;
};

export type LeadSourceChartItem = {
  /** Lead source name */
  source: string;
  /** Number of leads from this source */
  count: number;
};

export type TopSaleItem = {
  /** Sales person name */
  name: string;
  /** Total sales value */
  total: number;
};

export type TopMarketingItem = {
  /** Marketing employee ID (ObjectId string) */
  employeeId: string;
  /** Marketing person name */
  name: string;
  /** Doanh thu từ đơn hàng (tổng totalAmount của các đơn MKT này phụ trách). */
  revenue: number;
  /** Số đơn hàng trong kỳ. */
  orders: number;
};

export type TopMarketingRange = "day" | "week" | "month";

export type DashboardChartsData = {
  pipeline: PipelineChartItem[];
  revenue: RevenueChartItem[];
  leadSource: LeadSourceChartItem[];
  topSale: TopSaleItem[];
  topMarketing: TopMarketingItem[];
};

export type DashboardChartsApiResponse = {
  success: boolean;
  data: DashboardChartsData;
  message?: string;
};