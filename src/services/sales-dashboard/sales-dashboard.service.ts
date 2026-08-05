/**
 * ==================================================
 * SALES DASHBOARD SERVICE
 * ==================================================
 *
 * Sprint 8.2 — Sales Dashboard
 *
 * Service layer - ONLY orchestration.
 * NO business logic or calculations.
 */

import { salesDashboardRepository } from "@/repositories/sales-dashboard.repository";
import type {
  SalesDashboardResponse,
  SalesDashboardChartResponse,
  SalesDashboardRankingResponse,
  SalesDashboardFilter,
} from "@/types/sales-dashboard";

export class SalesDashboardService {
  /**
   * Get dashboard data (cards + follow-ups).
   */
  async getDashboard(filter: SalesDashboardFilter = {}) {
    const { saleEmployeeId } = filter;

    const [cards, todayFollowUps, missedFollowUps] = await Promise.all([
      salesDashboardRepository.aggregateDashboardCards(saleEmployeeId),
      salesDashboardRepository.aggregateTodayFollowUps(20, saleEmployeeId),
      salesDashboardRepository.aggregateMissedFollowUps(20, saleEmployeeId),
    ]);

    return {
      cards,
      todayFollowUps,
      missedFollowUps,
    } as SalesDashboardResponse;
  }

  /**
   * Get chart data (trends).
   */
  async getChartData(filter: SalesDashboardFilter = {}) {
    const { saleEmployeeId, days = 30 } = filter;

    const [revenue, orders, customers] = await Promise.all([
      salesDashboardRepository.aggregateRevenueTrend(days, saleEmployeeId),
      salesDashboardRepository.aggregateOrderTrend(days, saleEmployeeId),
      salesDashboardRepository.aggregateCustomerTrend(days, saleEmployeeId),
    ]);

    return {
      revenue,
      orders,
      customers,
    } as SalesDashboardChartResponse;
  }

  /**
   * Get ranking data (top sales).
   */
  async getRanking(filter: SalesDashboardFilter = {}) {
    const { saleEmployeeId, limit = 10 } = filter;

    const [topByRevenue, topByOrders, topByCustomers] = await Promise.all([
      salesDashboardRepository.aggregateTopSales("revenue", limit, saleEmployeeId),
      salesDashboardRepository.aggregateTopSales("orders", limit, saleEmployeeId),
      salesDashboardRepository.aggregateTopSales("customers", limit, saleEmployeeId),
    ]);

    return {
      topByRevenue,
      topByOrders,
      topByCustomers,
    } as SalesDashboardRankingResponse;
  }
}

export const salesDashboardService = new SalesDashboardService();
