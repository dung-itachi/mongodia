/**
 * ==================================================
 * WAREHOUSE HISTORY REPOSITORY
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Clean Architecture: Repository layer for WarehouseHistory.
 * Chỉ query - không business logic.
 */

import mongoose from "mongoose";
import { WarehouseHistory, type IWarehouseHistory } from "@/models/WarehouseHistory";
import type { Types } from "mongoose";

// ============================================================================
// Types
// ============================================================================

export interface CreateHistoryData {
  warehouseTaskId: Types.ObjectId;
  employeeId: Types.ObjectId;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

// ============================================================================
// Mapper
// ============================================================================

function mapToHistory(doc: IWarehouseHistory) {
  return {
    _id: doc._id.toString(),
    warehouseTaskId: doc.warehouseTaskId.toString(),
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
// Warehouse History Repository
// ============================================================================

export class WarehouseHistoryRepository {
  /**
   * Create a new history entry
   */
  async create(data: CreateHistoryData, session?: mongoose.ClientSession) {
    const history = new WarehouseHistory(data);
    const doc = await history.save({ session });
    return mapToHistory(doc);
  }

  /**
   * Find history by warehouse task ID
   */
  async findByTaskId(taskId: string): Promise<Array<ReturnType<typeof mapToHistory>>> {
    const docs = await WarehouseHistory.find({
      warehouseTaskId: new mongoose.Types.ObjectId(taskId)
    })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map((doc) => mapToHistory(doc as IWarehouseHistory));
  }

  /**
   * Find history by warehouse task ID with employee population
   */
  async findByTaskIdWithPopulate(taskId: string): Promise<IWarehouseHistory[]> {
    return WarehouseHistory.find({
      warehouseTaskId: new mongoose.Types.ObjectId(taskId)
    })
      .populate("employeeId", "_id employeeCode fullName")
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Count history entries by warehouse task ID
   */
  async countByTaskId(taskId: string): Promise<number> {
    return WarehouseHistory.countDocuments({
      warehouseTaskId: new mongoose.Types.ObjectId(taskId)
    });
  }
}

// Singleton instance
export const warehouseHistoryRepository = new WarehouseHistoryRepository();
