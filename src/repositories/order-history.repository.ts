/**
 * ==================================================
 * ORDER HISTORY REPOSITORY
 * ==================================================
 *
 * Sprint 6.2 — Order Workflow
 *
 * Clean Architecture: Repository layer cho OrderHistory.
 * Chỉ làm việc với MongoDB - không có business logic.
 */

import mongoose from "mongoose";
import { OrderHistory, type IOrderHistory } from "@/models/OrderHistory";
import type { Types } from "mongoose";

// ============================================================================
// Types
// ============================================================================

export interface CreateHistoryData {
  orderId: Types.ObjectId;
  employeeId: Types.ObjectId;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

// ============================================================================
// Helpers
// ============================================================================

function mapToHistory(doc: IOrderHistory) {
  return {
    _id: doc._id.toString(),
    orderId: doc.orderId.toString(),
    employeeId: doc.employeeId.toString(),
    action: doc.action,
    fieldName: doc.fieldName,
    oldValue: doc.oldValue,
    newValue: doc.newValue,
    note: doc.note,
    createdAt: doc.createdAt.toISOString(),
  };
}

// ============================================================================
// Order History Repository
// ============================================================================

export class OrderHistoryRepository {
  /**
   * Create history entry
   */
  async create(
    data: CreateHistoryData,
    session?: mongoose.ClientSession
  ): Promise<ReturnType<typeof mapToHistory>> {
    const history = new OrderHistory(data);
    const doc = await history.save({ session });
    return mapToHistory(doc);
  }

  /**
   * Create multiple history entries
   */
  async createMany(
    data: CreateHistoryData[],
    session?: mongoose.ClientSession
  ): Promise<Array<ReturnType<typeof mapToHistory>>> {
    const docs = await OrderHistory.insertMany(data, { session });
    return docs.map(mapToHistory);
  }

  /**
   * Find history by order ID
   */
  async findByOrderId(orderId: string): Promise<Array<ReturnType<typeof mapToHistory>>> {
    const docs = await OrderHistory.find({ orderId: new mongoose.Types.ObjectId(orderId) })
      .sort({ createdAt: -1 })
      .lean();

    return docs.map((doc) => mapToHistory(doc as IOrderHistory));
  }

  /**
   * Find history by order ID with employee population
   */
  async findByOrderIdWithPopulate(orderId: string): Promise<IOrderHistory[]> {
    return OrderHistory.find({ orderId: new mongoose.Types.ObjectId(orderId) })
      .populate("employee", "_id employeeCode fullName")
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Count history entries by order ID
   */
  async countByOrderId(orderId: string): Promise<number> {
    return OrderHistory.countDocuments({ orderId: new mongoose.Types.ObjectId(orderId) });
  }
}

// Singleton instance
export const orderHistoryRepository = new OrderHistoryRepository();
