/**
 * API Route: Combined Lead Timeline & Call History (Performance Optimization)
 *
 * GET /api/leads/[id]/timeline-combined
 * Trả về cả timeline và lịch sử cuộc gọi trong 1 request thay vì 2 API riêng biệt
 *
 * Response:
 * {
 *   timeline: LeadHistoryItem[],
 *   callHistory: CallLogItem[]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { LeadHistory } from "@/models/LeadHistory";
import { LeadCallLog } from "@/models/LeadCallLog";
import { success, error as errorResponse } from "@/utils/response";

/**
 * GET /api/leads/[id]/timeline-combined
 * Lấy cả timeline và lịch sử cuộc gọi trong 1 request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("lead.view")) {
      return errorResponse("Bạn không có quyền xem thông tin lead", 403);
    }

    await connectDB();

    const { id: leadId } = await params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return errorResponse("ID không hợp lệ", 400);
    }

    const objectId = new mongoose.Types.ObjectId(leadId);

    // Execute both queries in parallel for better performance
    const [timelineDocs, callHistoryDocs] = await Promise.all([
      // Get timeline with employee lookup
      LeadHistory.aggregate([
        { $match: { leadId: objectId } },
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
      ]),
      // Get call history with sale lookup
      LeadCallLog.aggregate([
        { $match: { leadId: objectId } },
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
      ]),
    ]);

    // Map timeline results
    const timeline = timelineDocs.map((doc) => ({
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

    // Map call history results
    const callHistory = callHistoryDocs.map((doc) => ({
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

    return success({ timeline, callHistory });
  } catch (err) {
    console.error("Get Combined Timeline Error:", err);
    return errorResponse(
      err instanceof Error ? err.message : "Lỗi khi lấy timeline",
      500
    );
  }
}
