/**
 * ==================================================
 * SALES KPI TYPES
 * ==================================================
 *
 * Sprint 8.3 — Sales KPI & Target
 */

// ============================================================================
// Sales Target Entity
// ============================================================================

export interface SalesTarget {
  _id: string;
  employeeId: string;
  month: number;
  year: number;

  targetRevenue: number;
  targetOrders: number;
  targetCustomers: number;
  targetClosedLead: number;

  note?: string;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// KPI Data
// ============================================================================

export interface KPIData {
  revenue: {
    target: number;
    current: number;
    achievement: number;
    remaining: number;
  };
  orders: {
    target: number;
    current: number;
    achievement: number;
    remaining: number;
  };
  customers: {
    target: number;
    current: number;
    achievement: number;
    remaining: number;
  };
  closedLeads: {
    target: number;
    current: number;
    achievement: number;
    remaining: number;
  };
}

export interface KPIEmployeeData {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  month: number;
  year: number;
  kpi: KPIData;
}

export interface KPISummary {
  month: number;
  year: number;
  totalTargets: number;
  employees: KPIEmployeeData[];
  averages: {
    revenueAchievement: number;
    orderAchievement: number;
    customerAchievement: number;
  };
}

// ============================================================================
// Chart Data
// ============================================================================

export interface KPIChartDataPoint {
  label: string;
  target: number;
  actual: number;
  achievement: number;
}

export interface KPIChartData {
  revenue: KPIChartDataPoint[];
  orders: KPIChartDataPoint[];
  customers: KPIChartDataPoint[];
}

// ============================================================================
// Ranking
// ============================================================================

export interface KPIRankingItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  revenueAchievement: number;
  orderAchievement: number;
  customerAchievement: number;
  overallAchievement: number;
  rank: number;
}

export interface KPIRankingData {
  topPerformers: KPIRankingItem[];
  bottomPerformers: KPIRankingItem[];
}

// ============================================================================
// Filter
// ============================================================================

export interface SalesKPIFilter {
  employeeId?: string;
  month?: number;
  year?: number;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateSalesTargetInput {
  employeeId: string;
  month: number;
  year: number;
  targetRevenue: number;
  targetOrders: number;
  targetCustomers: number;
  targetClosedLead?: number;
  note?: string;
}

export interface UpdateSalesTargetInput {
  targetRevenue?: number;
  targetOrders?: number;
  targetCustomers?: number;
  targetClosedLead?: number;
  note?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface SalesKPIDashboardResponse {
  current: KPIEmployeeData;
  summary: KPISummary;
}

export interface SalesKPIChartResponse {
  revenue: KPIChartDataPoint[];
  orders: KPIChartDataPoint[];
}

export interface SalesKPIRankingResponse {
  topPerformers: KPIRankingItem[];
  bottomPerformers: KPIRankingItem[];
}
