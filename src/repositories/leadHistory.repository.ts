/**
 * LeadHistory Repository (Sprint 5.6 — Lead Timeline)
 *
 * Clean Architecture: Repository layer cho LeadHistory.
 * Chỉ làm việc với MongoDB - không có business logic.
 */

import mongoose from "mongoose";
import { LeadHistory, type ILeadHistory } from "@/models/LeadHistory";

export interface LeadHistoryItem {
  id: string;
  leadId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  employee: {
    id: string;
    name: string;
    employeeCode: string;
  } | null;
  createdAt: Date;
}

export class LeadHistoryRepository {
  /**
   * Find timeline records for a lead, sorted by createdAt DESC
   */
  async findTimelineByLead(leadId: string): Promise<LeadHistoryItem[]> {
    const docs = await LeadHistory.find({ leadId: new mongoose.Types.ObjectId(leadId) })
      .sort({ createdAt: -1 })
      .populate({
        path: "employeeId",
        select: "_id employeeCode fullName",
        options: { lean: true },
      })
      .lean();

    return docs.map((doc) => {
      const employee = doc.employeeId as {
        _id: mongoose.Types.ObjectId;
        employeeCode: string;
        fullName: string;
      } | null;

      return {
        id: (doc._id as mongoose.Types.ObjectId).toString(),
        leadId: (doc.leadId as mongoose.Types.ObjectId).toString(),
        action: doc.action,
        field: doc.note ? doc.note.split(":")[0] : undefined,
        oldValue: doc.oldValue,
        newValue: doc.newValue,
        note: doc.note,
        employee: employee
          ? {
              id: employee._id.toString(),
              name: employee.fullName,
              employeeCode: employee.employeeCode,
            }
          : null,
        createdAt: doc.createdAt,
      };
    });
  }
}

// Singleton instance
export const leadHistoryRepository = new LeadHistoryRepository();
