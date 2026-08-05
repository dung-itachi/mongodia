/**
 * ==================================================
 * SALES DASHBOARD TYPES
 * ==================================================
 *
 * Sprint 8.2 — Sales Dashboard
 */

import type {
  DashboardCards,
  ChartDataPoint,
  RevenueTrendData,
  OrderTrendData,
  CustomerTrendData,
  TopSalesItem,
  FollowUpItem,
} from "@/repositories/sales-dashboard.repository";

export type {
  DashboardCards,
  ChartDataPoint,
  RevenueTrendData,
  OrderTrendData,
  CustomerTrendData,
  TopSalesItem,
  FollowUpItem,
};

// Dashboard response
export interface SalesDashboardResponse {
  cards: DashboardCards;
  todayFollowUps: FollowUpItem[];
  missedFollowUps: FollowUpItem[];
}

// Chart response
export interface SalesDashboardChartResponse {
  revenue: RevenueTrendData;
  orders: OrderTrendData;
  customers: CustomerTrendData;
}

// Ranking response
export interface SalesDashboardRankingResponse {
  topByRevenue: TopSalesItem[];
  topByOrders: TopSalesItem[];
  topByCustomers: TopSalesItem[];
}

// Filter
export interface SalesDashboardFilter {
  saleEmployeeId?: string;
  days?: number;
  limit?: number;
}
