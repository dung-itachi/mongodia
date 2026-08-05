/**
 * Marketing Dashboard Advanced Filter Types (Sprint 7.3 — Drill-down & Export)
 *
 * Types for dashboard filter state shared across components.
 */

import type { ChartPeriod, DrillDownData, ExportData } from "@/types/marketing-dashboard";
import type { LeadStatus } from "@/constants/leadStatus";
import type { LeadSource } from "@/constants/leadSource";

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type MarketingDashboardFilter = {
  period: ChartPeriod;
  dateRange?: DateRange;
  facebookPageId?: string;
  marketingEmployeeId?: string;
  campaignId?: string;
  source?: LeadSource;
  status?: LeadStatus;
};

export type DrillDownContext = {
  type: "card" | "chart" | "ranking";
  id: string;
  label: string;
  filter: MarketingDashboardFilter;
};

export type ExportType = "excel" | "pdf";

// Re-export for convenience
export type { DrillDownData, ExportData };
