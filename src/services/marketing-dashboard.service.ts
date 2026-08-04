/**
 * Marketing Dashboard Service (Sprint 5.4 → 5.4A)
 *
 * Clean Architecture: Service layer cho Marketing Dashboard.
 *
 * Sprint 5.4A: Chỉ orchestration — gọi repository, không chứa pipeline Mongo.
 *
 * KHÔNG viết aggregation trong page.
 * KHÔNG viết aggregation trong hook.
 * KHÔNG để business logic trong API route.
 *
 * KHÔNG thay đổi schema Lead chỉ để phục vụ Dashboard.
 */

import { leadRepository } from "@/repositories/lead.repository";
import type {
  MarketingSummary,
  DailyLeadChartItem,
  LeadSourceChartItem,
  TopMarketingItem,
  MarketingChartData,
  MarketingDashboardData,
} from "@/types/marketing-dashboard";

export class MarketingDashboardService {
  /**
   * Get full dashboard data.
   *
   * Chỉ orchestration — gọi repository rồi ghép shape response.
   * Không chứa pipeline Mongo.
   */
  async getDashboard(): Promise<MarketingDashboardData> {
    const [summary, dailyLead, leadSource, topMarketing] = await Promise.all([
      leadRepository.aggregateSummary(),
      leadRepository.aggregateDailyLead(),
      leadRepository.aggregateLeadSource(),
      leadRepository.aggregateTopMarketing(),
    ]);

    const chart: MarketingChartData = { dailyLead, source: leadSource };

    return { summary, chart, topMarketing };
  }
}

// Singleton instance
export const marketingDashboardService = new MarketingDashboardService();
