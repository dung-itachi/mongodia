/**
 * LeadCallLog Repository (Module 6 - Nhật ký cuộc gọi)
 *
 * Clean Architecture: Repository layer cho LeadCallLog.
 * Chỉ làm việc với MongoDB - không có business logic.
 */

import mongoose from "mongoose";
import { LeadCallLog, type ILeadCallLog } from "@/models/LeadCallLog";
import { LeadCallStatus } from "@/constants/leadCallStatus";

export interface CallLogItem {
  id: string;
  leadId: string;
  saleId: string;
  callTime: Date;
  status: LeadCallStatus;
  note?: string;
  duration?: number;
  sale?: {
    id: string;
    name: string;
    employeeCode: string;
  };
  createdAt: Date;
}

export interface CallLogStats {
  totalCalls: number;
  noAnswerCount: number;
  busyCount: number;
  wrongNumberCount: number;
  potentialCount: number;
  notInterestedCount: number;
  callBackCount: number;
  convertedCount: number;
}

export interface CreateCallLogData {
  leadId: string;
  saleId: string;
  status: LeadCallStatus;
  note?: string;
  duration?: number;
  callTime?: Date;
}

export class LeadCallLogRepository {
  /**
   * Tạo bản ghi cuộc gọi mới (append-only)
   */
  async create(data: CreateCallLogData): Promise<CallLogItem> {
    const doc = await LeadCallLog.create({
      leadId: new mongoose.Types.ObjectId(data.leadId),
      saleId: new mongoose.Types.ObjectId(data.saleId),
      status: data.status,
      note: data.note,
      duration: data.duration,
      callTime: data.callTime || new Date(),
    });

    return this.mapToItem(doc);
  }

  /**
   * Tìm lịch sử cuộc gọi theo lead ID, sắp xếp theo thời gian giảm dần
   * Using aggregate with $lookup for better performance
   */
  async findByLeadId(leadId: string): Promise<CallLogItem[]> {
    const docs = await LeadCallLog.aggregate([
      { $match: { leadId: new mongoose.Types.ObjectId(leadId) } },
      { $sort: { callTime: -1 } },
      {
        $lookup: {
          from: "employees",
          localField: "saleId",
          foreignField: "_id",
          as: "saleData",
        },
      },
      { $unwind: { path: "$saleData", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          leadId: 1,
          saleId: 1,
          callTime: 1,
          status: 1,
          note: 1,
          duration: 1,
          createdAt: 1,
          "saleData._id": 1,
          "saleData.employeeCode": 1,
          "saleData.fullName": 1,
        },
      },
    ]);

    return docs.map((doc) => ({
      id: (doc._id as mongoose.Types.ObjectId).toString(),
      leadId: (doc.leadId as mongoose.Types.ObjectId).toString(),
      saleId: (doc.saleId as mongoose.Types.ObjectId).toString(),
      callTime: doc.callTime,
      status: doc.status,
      note: doc.note,
      duration: doc.duration,
      sale: doc.saleData
        ? {
            id: doc.saleData._id.toString(),
            name: doc.saleData.fullName,
            employeeCode: doc.saleData.employeeCode,
          }
        : undefined,
      createdAt: doc.createdAt,
    }));
  }

  /**
   * Đếm số cuộc gọi theo trạng thái cho một lead
   */
  async getCallStatsByLead(leadId: string): Promise<CallLogStats> {
    const pipeline = [
      { $match: { leadId: new mongoose.Types.ObjectId(leadId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ];

    const results = await LeadCallLog.aggregate<
      { _id: LeadCallStatus; count: number }
    >(pipeline);

    const stats: CallLogStats = {
      totalCalls: 0,
      noAnswerCount: 0,
      busyCount: 0,
      wrongNumberCount: 0,
      potentialCount: 0,
      notInterestedCount: 0,
      callBackCount: 0,
      convertedCount: 0,
    };

    for (const result of results) {
      switch (result._id) {
        case LeadCallStatus.NO_ANSWER:
          stats.noAnswerCount = result.count;
          break;
        case LeadCallStatus.BUSY:
          stats.busyCount = result.count;
          break;
        case LeadCallStatus.WRONG_NUMBER:
          stats.wrongNumberCount = result.count;
          break;
        case LeadCallStatus.POTENTIAL:
          stats.potentialCount = result.count;
          break;
        case LeadCallStatus.NOT_INTERESTED:
          stats.notInterestedCount = result.count;
          break;
        case LeadCallStatus.CALL_BACK:
          stats.callBackCount = result.count;
          break;
        case LeadCallStatus.CONVERTED:
          stats.convertedCount = result.count;
          break;
      }
      stats.totalCalls += result.count;
    }

    return stats;
  }

  /**
   * Đếm số lần "không nghe máy" (NO_ANSWER, BUSY, WRONG_NUMBER) cho một lead
   */
  async getNoAnswerCount(leadId: string): Promise<number> {
    const count = await LeadCallLog.countDocuments({
      leadId: new mongoose.Types.ObjectId(leadId),
      status: {
        $in: [
          LeadCallStatus.NO_ANSWER,
          LeadCallStatus.BUSY,
          LeadCallStatus.WRONG_NUMBER,
        ],
      },
    });
    return count;
  }

  /**
   * Thống kê cuộc gọi theo sale trong một khoảng thời gian
   */
  async getCallStatsBySale(
    saleId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CallLogStats> {
    const matchStage: Record<string, unknown> = {
      saleId: new mongoose.Types.ObjectId(saleId),
    };

    if (startDate || endDate) {
      matchStage.callTime = {};
      if (startDate) {
        (matchStage.callTime as Record<string, Date>).$gte = startDate;
      }
      if (endDate) {
        (matchStage.callTime as Record<string, Date>).$lte = endDate;
      }
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ];

    const results = await LeadCallLog.aggregate<
      { _id: LeadCallStatus; count: number }
    >(pipeline);

    const stats: CallLogStats = {
      totalCalls: 0,
      noAnswerCount: 0,
      busyCount: 0,
      wrongNumberCount: 0,
      potentialCount: 0,
      notInterestedCount: 0,
      callBackCount: 0,
      convertedCount: 0,
    };

    for (const result of results) {
      switch (result._id) {
        case LeadCallStatus.NO_ANSWER:
          stats.noAnswerCount = result.count;
          break;
        case LeadCallStatus.BUSY:
          stats.busyCount = result.count;
          break;
        case LeadCallStatus.WRONG_NUMBER:
          stats.wrongNumberCount = result.count;
          break;
        case LeadCallStatus.POTENTIAL:
          stats.potentialCount = result.count;
          break;
        case LeadCallStatus.NOT_INTERESTED:
          stats.notInterestedCount = result.count;
          break;
        case LeadCallStatus.CALL_BACK:
          stats.callBackCount = result.count;
          break;
        case LeadCallStatus.CONVERTED:
          stats.convertedCount = result.count;
          break;
      }
      stats.totalCalls += result.count;
    }

    return stats;
  }

  /**
   * Map document to CallLogItem
   */
  private mapToItem(
    doc: ILeadCallLog | (mongoose.HydratedDocument<ILeadCallLog> & { _id: mongoose.Types.ObjectId })
  ): CallLogItem {
    const sale = doc.saleId as unknown as {
      _id: mongoose.Types.ObjectId;
      employeeCode: string;
      fullName: string;
    } | null;

    return {
      id: doc._id.toString(),
      leadId: (doc.leadId as mongoose.Types.ObjectId).toString(),
      saleId: (doc.saleId as mongoose.Types.ObjectId).toString(),
      callTime: doc.callTime,
      status: doc.status,
      note: doc.note,
      duration: doc.duration,
      sale: sale
        ? {
            id: sale._id.toString(),
            name: sale.fullName,
            employeeCode: sale.employeeCode,
          }
        : undefined,
      createdAt: doc.createdAt,
    };
  }
}

// Singleton instance
export const leadCallLogRepository = new LeadCallLogRepository();
