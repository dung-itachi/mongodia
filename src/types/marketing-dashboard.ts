/**
 * Marketing Dashboard Types (Sprint 5.1 — Marketing Dashboard)
 *
 * Type definitions for the marketing dashboard.
 */

export type MarketingSummary = {
  /** Total leads accumulated */
  totalLead: number;
  /** Leads created today */
  todayLead: number;
  /** Leads already assigned to a sale */
  assignedLead: number;
  /** Leads waiting for assignment */
  unassignedLead: number;
  /** Leads converted to orders */
  closedLead: number;
  /** Conversion rate percentage (0–100) */
  conversionRate: number;
};

export type DailyLeadChartItem = {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Number of leads on this day */
  count: number;
};

export type LeadSourceChartItem = {
  /** Lead source name */
  source: string;
  /** Number of leads from this source */
  count: number;
};

export type TopMarketingItem = {
  /** Marketing staff name */
  name: string;
  /** Number of leads generated */
  count: number;
};

export type MarketingChartData = {
  dailyLead: DailyLeadChartItem[];
  source: LeadSourceChartItem[];
};

export type MarketingDashboardData = {
  summary: MarketingSummary;
  chart: MarketingChartData;
  topMarketing: TopMarketingItem[];
};

export type MarketingDashboardApiResponse = {
  success: boolean;
  data: MarketingDashboardData;
  message?: string;
};