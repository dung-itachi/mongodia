/**
 * ==================================================
 * MARKETING EXPENSE HISTORY SERVICE
 * ==================================================
 *
 * Sprint 6.12 — Marketing Expense Timeline
 *
 * Clean Architecture: Service layer cho MarketingExpenseHistory.
 */

import { marketingExpenseHistoryRepository } from "@/repositories/marketing-expense-history.repository";
import type { MarketingExpenseHistoryItem } from "@/repositories/marketing-expense-history.repository";

export class MarketingExpenseHistoryService {
  /**
   * Get timeline for a marketing expense report
   */
  async getTimelineByReport(reportId: string): Promise<MarketingExpenseHistoryItem[]> {
    return marketingExpenseHistoryRepository.findByReportIdWithPopulate(reportId);
  }
}

export const marketingExpenseHistoryService = new MarketingExpenseHistoryService();
