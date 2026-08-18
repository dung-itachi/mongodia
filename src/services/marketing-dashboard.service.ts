/**
 * Marketing Dashboard Service (Sprint 7.3 — Drill-down & Export)
 *
 * Clean Architecture: Service layer cho Marketing Dashboard.
 *
 * CHỉ orchestration — gọi repository, KHÔNG chứa pipeline Mongo.
 */

import { dashboardRepository } from "@/repositories/dashboard.repository";
import type {
  MarketingDashboardData,
  ChartData,
  RankingData,
  ChartPeriod,
  MarketingChartDataV2,
  LeadSourceChartItem,
  TopMarketingChannel,
  ExportData,
  DrillDownData,
  MarketingTrendSummary,
} from "@/types/marketing-dashboard";
import type { MarketingDashboardFilter } from "@/types/marketing-dashboard-filter";

export class MarketingDashboardService {
  /**
   * Get full dashboard data (summary + charts + top marketing).
   * CHỉ orchestration.
   */
  async getDashboard(filter?: MarketingDashboardFilter): Promise<MarketingDashboardData> {
    const [
      dashboard,
      dailyChart,
      monthlyChart,
      leadSource,
      topMarketingChannels,
      leadTrend,
      expenseTrend,
      revenueTrend,
      orderTrend,
    ] = await Promise.all([
      dashboardRepository.aggregateMarketingDashboard(filter),
      dashboardRepository.aggregateChartData(),
      dashboardRepository.aggregateChartData(),
      dashboardRepository.aggregateLeadSource(),
      dashboardRepository.aggregateTopMarketingChannels(),
      dashboardRepository.aggregateLeadTrendSummary(filter),
      dashboardRepository.aggregateExpenseTrendSummary(filter),
      dashboardRepository.aggregateRevenueTrendSummary(filter),
      dashboardRepository.aggregateOrderTrendSummary(filter),
    ]);

    const chart: MarketingChartDataV2 = {
      daily: dailyChart.leadTrend.map((d, i) => ({
        date: d.date,
        leads: d.value,
        revenue: dailyChart.revenueTrend[i]?.value ?? 0,
        spent: dailyChart.expenseTrend[i]?.value ?? 0,
      })),
      monthly: monthlyChart.leadTrend.map((d, i) => ({
        month: d.date,
        leads: d.value,
        revenue: monthlyChart.revenueTrend[i]?.value ?? 0,
        spent: monthlyChart.expenseTrend[i]?.value ?? 0,
      })),
    };

    const trend: MarketingTrendSummary = {
      todayLead: leadTrend.todayLead,
      monthLead: leadTrend.monthLead,
      assignedLead: leadTrend.assignedLead,
      closedLead: leadTrend.closedLead,
      totalSpent: expenseTrend.totalSpent,
      roas: expenseTrend.roas,
      conversionRate: expenseTrend.conversionRate,
      monthRevenue: revenueTrend.monthRevenue,
      totalPushed: orderTrend.totalPushed,
      called: orderTrend.called,
      notCalled: orderTrend.notCalled,
      closingRate: orderTrend.closingRate,
      orderRevenue: orderTrend.totalRevenue,
      deliveredOk: orderTrend.deliveredOk,
    };

    return {
      summary: {
        todayLead: dashboard.lead.todayLead,
        weekLead: dashboard.lead.weekLead,
        monthLead: dashboard.lead.monthLead,
        totalLead: dashboard.lead.totalLead,
        assignedLead: dashboard.lead.assignedLead,
        closedLead: dashboard.lead.closedLead,
        conversionRate: dashboard.lead.conversionRate,
      },
      expense: dashboard.expense,
      revenue: dashboard.revenue,
      order: dashboard.order,
      trend,
      chart,
      leadSource,
      topMarketing: topMarketingChannels,
    };
  }

  /**
   * Get chart data for dashboard.
   * CHỉ orchestration — gọi repository.
   */
  async getChartData(period: ChartPeriod = "7d"): Promise<ChartData> {
    return dashboardRepository.aggregateChartData(period);
  }

  /**
   * Get ranking data for dashboard.
   * CHỉ orchestration — gọi repository.
   */
  async getRankingData(): Promise<RankingData> {
    return dashboardRepository.aggregateRankingData();
  }

  /**
   * Get export data for Excel/PDF export.
   * CHỉ orchestration — gọi repository.
   */
  async getExportData(filter: MarketingDashboardFilter): Promise<ExportData> {
    return dashboardRepository.aggregateExportData(filter);
  }

  /**
   * Get drill-down data for drawer display.
   * CHỉ orchestration — gọi repository.
   */
  async getDrillDown(filter: MarketingDashboardFilter): Promise<DrillDownData> {
    return dashboardRepository.aggregateDrillDown(filter);
  }
}

// Singleton instance
export const marketingDashboardService = new MarketingDashboardService();
