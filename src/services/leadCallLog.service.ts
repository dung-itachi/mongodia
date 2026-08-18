/**
 * LeadCallLog Service (Module 6 - Nhật ký cuộc gọi)
 *
 * Clean Architecture: Service layer cho LeadCallLog.
 * Chứa business logic - được gọi bởi API Routes.
 */

import { leadCallLogRepository, type CallLogStats } from "@/repositories/leadCallLog.repository";
import { leadHistoryService } from "./leadHistory.service";
import { LeadAction } from "@/constants/leadAction";
import { LeadStatus } from "@/constants/leadStatus";
import { LeadCallStatus } from "@/constants/leadCallStatus";
import { leadRepository } from "@/repositories/lead.repository";
import type { CallLogItem, CreateCallLogData } from "@/repositories/leadCallLog.repository";

export class LeadCallLogService {
  /**
   * Ghi nhận một cuộc gọi mới
   * - Tạo bản ghi LeadCallLog
   * - Cập nhật trạng thái Lead nếu cần
   */
  async logCall(data: CreateCallLogData): Promise<CallLogItem> {
    // Tạo bản ghi cuộc gọi
    const callLog = await leadCallLogRepository.create(data);

    // Cập nhật trạng thái Lead dựa trên trạng thái cuộc gọi
    const leadStatus = this.mapCallStatusToLeadStatus(data.status);
    if (leadStatus) {
      try {
        await leadRepository.update(data.leadId, {
          status: leadStatus,
          latestRemark: data.note,
        });

        // Ghi lịch sử thay đổi trạng thái
        await leadHistoryService.logAction({
          leadId: data.leadId,
          employeeId: data.saleId,
          action: LeadAction.STATUS_CHANGED,
          oldValue: leadStatus,
          note: data.note,
        });
      } catch (error) {
        // Log error nhưng không fail việc tạo call log
        console.error("Error updating lead status:", error);
      }
    }

    return callLog;
  }

  /**
   * Lấy lịch sử cuộc gọi theo lead
   */
  async getCallHistory(leadId: string): Promise<CallLogItem[]> {
    return leadCallLogRepository.findByLeadId(leadId);
  }

  /**
   * Lấy thống kê cuộc gọi cho một lead
   */
  async getCallStats(leadId: string): Promise<CallLogStats> {
    return leadCallLogRepository.getCallStatsByLead(leadId);
  }

  /**
   * Lấy số lần "không nghe máy" cho một lead
   * (Đếm cả NO_ANSWER, BUSY, WRONG_NUMBER)
   */
  async getNoAnswerCount(leadId: string): Promise<number> {
    return leadCallLogRepository.getNoAnswerCount(leadId);
  }

  /**
   * Thống kê cuộc gọi theo sale
   */
  async getCallStatsBySale(
    saleId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CallLogStats> {
    return leadCallLogRepository.getCallStatsBySale(saleId, startDate, endDate);
  }

  /**
   * Map trạng thái cuộc gọi sang trạng thái Lead
   */
  private mapCallStatusToLeadStatus(
    callStatus: LeadCallStatus
  ): LeadStatus | null {
    switch (callStatus) {
      case LeadCallStatus.NO_ANSWER:
        return LeadStatus.NO_ANSWER;
      case LeadCallStatus.BUSY:
        return LeadStatus.NO_ANSWER;
      case LeadCallStatus.WRONG_NUMBER:
        return LeadStatus.REJECTED;
      case LeadCallStatus.POTENTIAL:
        return LeadStatus.POTENTIAL;
      case LeadCallStatus.NOT_INTERESTED:
        return LeadStatus.LOST;
      case LeadCallStatus.CALL_BACK:
        return LeadStatus.CONTACTED;
      case LeadCallStatus.CONVERTED:
        return LeadStatus.CLOSED;
      default:
        return null;
    }
  }
}

// Singleton instance
export const leadCallLogService = new LeadCallLogService();
