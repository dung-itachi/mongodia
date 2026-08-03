/**
 * Dashboard Types (Sprint 4.1 - Dashboard Foundation)
 *
 * Type definitions for Dashboard data.
 */

export type DashboardSummary = {
  /** Total number of leads */
  totalLeads: number;
  /** Number of leads that were converted to orders */
  closedLeads: number;
  /** Number of orders currently being shipped */
  shippingOrders: number;
  /** Number of orders successfully delivered */
  deliveredOrders: number;
  /** Number of orders that were returned/cancelled */
  returnedOrders: number;
  /** Total revenue */
  revenue: number;
};

export type DashboardPipeline = {
  /** New leads */
  new: number;
  /** Contacted leads (KNM) */
  contacted: number;
  /** Closed deals */
  closed: number;
  /** Orders being shipped */
  shipping: number;
  /** Orders delivered successfully */
  delivered: number;
  /** Orders returned/cancelled */
  returned: number;
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
