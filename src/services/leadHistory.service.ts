/**
 * LeadHistory Service (Sprint 5.6 — Lead Timeline)
 *
 * Clean Architecture: Service layer cho LeadHistory.
 * Chứa business logic - được gọi bởi API Routes.
 */

import { leadHistoryRepository } from "@/repositories/leadHistory.repository";
import type { LeadHistoryItem } from "@/repositories/leadHistory.repository";

export class LeadHistoryService {
  /**
   * Get timeline for a lead
   */
  async getTimeline(leadId: string): Promise<LeadHistoryItem[]> {
    return leadHistoryRepository.findTimelineByLead(leadId);
  }
}

// Singleton instance
export const leadHistoryService = new LeadHistoryService();
