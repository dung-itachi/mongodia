/**
 * LeadHistory Service (Sprint 5.6 — Lead Timeline)
 *
 * Clean Architecture: Service layer cho LeadHistory.
 * Chứa business logic - được gọi bởi API Routes.
 */

import { leadHistoryRepository } from "@/repositories/leadHistory.repository";
import type { LeadHistoryItem } from "@/repositories/leadHistory.repository";
import { LeadHistory } from "@/models/LeadHistory";
import type { LeadAction } from "@/constants/leadAction";

export interface LogActionInput {
  leadId: string;
  employeeId: string;
  action: LeadAction;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

export class LeadHistoryService {
  /**
   * Get timeline for a lead
   */
  async getTimeline(leadId: string): Promise<LeadHistoryItem[]> {
    return leadHistoryRepository.findTimelineByLead(leadId);
  }

  /**
   * Record a lead action in the history log.
   */
  async logAction(input: LogActionInput): Promise<void> {
    await LeadHistory.create({
      leadId: input.leadId,
      employeeId: input.employeeId,
      action: input.action,
      oldValue: input.oldValue,
      newValue: input.newValue,
      note: input.note,
    });
  }
}

// Singleton instance
export const leadHistoryService = new LeadHistoryService();
