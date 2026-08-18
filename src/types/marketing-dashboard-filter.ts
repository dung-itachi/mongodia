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
  // Sprint 8.0: Area/Team/MKT filtering
  teamId?: string;
  areaId?: string;
  // Sprint 8.x: card key filter for drill-down
  cardKey?: string;
};

export type DrillDownContext = {
  type: "card" | "chart" | "ranking";
  id: string;
  label: string;
  cardKey?: string; // Sprint 8.x: filter by card key (e.g. "totalPushed", "called", etc.)
  filter: MarketingDashboardFilter;
};

export type ExportType = "excel" | "pdf";

// Re-export for convenience
export type { DrillDownData, ExportData };
