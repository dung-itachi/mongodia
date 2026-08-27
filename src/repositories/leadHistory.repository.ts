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
   * Using aggregate with $lookup for better performance
   */
  async findTimelineByLead(leadId: string): Promise<LeadHistoryItem[]> {
    const docs = await LeadHistory.aggregate([
      { $match: { leadId: new mongoose.Types.ObjectId(leadId) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "employees",
          localField: "employeeId",
          foreignField: "_id",
          as: "employeeData",
        },
      },
      { $unwind: { path: "$employeeData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          leadId: 1,
          action: 1,
          oldValue: 1,
          newValue: 1,
          note: 1,
          createdAt: 1,
          "employeeData._id": 1,
          "employeeData.employeeCode": 1,
          "employeeData.fullName": 1,
        },
      },
    ]);

    return docs.map((doc) => ({
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      leadId: (doc.leadId as mongoose.Types.ObjectId).toString(),
      action: doc.action,
      field: doc.note ? doc.note.split(":")[0] : undefined,
      oldValue: doc.oldValue,
      newValue: doc.newValue,
      note: doc.note,
      employee: doc.employeeData
        ? {
            id: doc.employeeData._id.toString(),
            name: doc.employeeData.fullName,
            employeeCode: doc.employeeData.employeeCode,
          }
        : null,
      createdAt: doc.createdAt,
    }));
  }
}

// Singleton instance
export const leadHistoryRepository = new LeadHistoryRepository();
