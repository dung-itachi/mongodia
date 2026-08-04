/**
 * ==================================================
 * WAREHOUSE REPOSITORY
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Clean Architecture: Repository layer for WarehouseTask.
 * Chỉ query - không business logic.
 */

import mongoose from "mongoose";
import { WarehouseTask, type IWarehouseTask } from "@/models/WarehouseTask";
import type { Types } from "mongoose";

// ============================================================================
// Types
// ============================================================================

export interface CreateWarehouseTaskData {
  orderId: Types.ObjectId;
  warehouseStatus?: string;
  assignedEmployeeId?: Types.ObjectId;
  note?: string;
}

export interface UpdateWarehouseTaskData {
  warehouseStatus?: string;
  assignedEmployeeId?: Types.ObjectId;
  note?: string;
}

// ============================================================================
// Mapper
// ============================================================================

function mapToWarehouseTask(doc: IWarehouseTask) {
  return {
    _id: doc._id.toString(),
    orderId: doc.orderId.toString(),
    warehouseStatus: doc.warehouseStatus,
    assignedEmployeeId: doc.assignedEmployeeId?.toString() ?? null,
    note: doc.note ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ============================================================================
// Warehouse Repository
// ============================================================================

export class WarehouseRepository {
  /**
   * Create a new warehouse task
   */
  async create(data: CreateWarehouseTaskData, session?: mongoose.ClientSession) {
    const task = new WarehouseTask(data);
    const doc = await task.save({ session });
    return mapToWarehouseTask(doc);
  }

  /**
   * Find warehouse task by ID
   */
  async findById(id: string): Promise<ReturnType<typeof mapToWarehouseTask> | null> {
    const doc = await WarehouseTask.findById(id).lean();
    if (!doc) return null;
    return mapToWarehouseTask(doc as IWarehouseTask);
  }

  /**
   * Find warehouse task by Order ID
   */
  async findByOrderId(orderId: string): Promise<ReturnType<typeof mapToWarehouseTask> | null> {
    const doc = await WarehouseTask.findOne({ orderId: new mongoose.Types.ObjectId(orderId) }).lean();
    if (!doc) return null;
    return mapToWarehouseTask(doc as IWarehouseTask);
  }

  /**
   * Find all warehouse tasks with pagination
   */
  async findAll(options?: {
    status?: string;
    assignedEmployeeId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ tasks: Array<ReturnType<typeof mapToWarehouseTask>>; total: number }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (options?.status) filter.warehouseStatus = options.status;
    if (options?.assignedEmployeeId) filter.assignedEmployeeId = new mongoose.Types.ObjectId(options.assignedEmployeeId);

    const [docs, total] = await Promise.all([
      WarehouseTask.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WarehouseTask.countDocuments(filter),
    ]);

    return {
      tasks: docs.map((doc) => mapToWarehouseTask(doc as IWarehouseTask)),
      total,
    };
  }

  /**
   * Update warehouse task
   */
  async update(id: string, data: UpdateWarehouseTaskData, session?: mongoose.ClientSession) {
    const doc = await WarehouseTask.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, session }
    ).lean();

    if (!doc) return null;
    return mapToWarehouseTask(doc as IWarehouseTask);
  }

  /**
   * Change warehouse status
   */
  async changeStatus(id: string, status: string, session?: mongoose.ClientSession) {
    const doc = await WarehouseTask.findByIdAndUpdate(
      id,
      { $set: { warehouseStatus: status } },
      { new: true, session }
    ).lean();

    if (!doc) return null;
    return mapToWarehouseTask(doc as IWarehouseTask);
  }

  /**
   * Assign employee to warehouse task
   */
  async assignEmployee(id: string, employeeId: Types.ObjectId, session?: mongoose.ClientSession) {
    const doc = await WarehouseTask.findByIdAndUpdate(
      id,
      { $set: { assignedEmployeeId: employeeId } },
      { new: true, session }
    ).lean();

    if (!doc) return null;
    return mapToWarehouseTask(doc as IWarehouseTask);
  }

  /**
   * Check if warehouse task exists for order
   */
  async existsByOrderId(orderId: string): Promise<boolean> {
    const count = await WarehouseTask.countDocuments({ orderId: new mongoose.Types.ObjectId(orderId) });
    return count > 0;
  }
}

// Singleton instance
export const warehouseRepository = new WarehouseRepository();
