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
import Order from "@/models/Order";
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
    // orderId có thể là ObjectId (chưa populate) hoặc object (đã populate).
    // Khi populate, .toString() sẽ ra "[object Object]" nên phải dùng helper.
    orderId: extractObjectIdString(doc.orderId),
    warehouseStatus: doc.warehouseStatus,
    assignedEmployeeId: doc.assignedEmployeeId?.toString() ?? null,
    note: doc.note ?? null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function extractObjectIdString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  // Mongoose ObjectId có .toString() trả về hex string — dùng trực tiếp.
  if (typeof value === "object" && value !== null) {
    const obj = value as { _id?: unknown; toString?: () => string };
    if (obj._id) {
      const id = obj._id as { toString?: () => string };
      if (typeof id.toString === "function") return id.toString();
    }
    if (typeof obj.toString === "function") {
      const str = obj.toString();
      // Mongoose ObjectId.toString() trả hex; populated object thì ra "[object Object]".
      // Nếu ra "[object Object]" thì fallback về _id (đã check ở trên) — không tới đây.
      return str;
    }
  }
  return "";
}

type PopulatedOrderRef = {
  _id: string;
  orderCode?: string;
  warehouseId?: { _id: string; code?: string; name?: string } | string | null;
};

function readOrderWarehouse(order: PopulatedOrderRef | string | null | undefined): {
  warehouseId: string | null;
  warehouseName: string | null;
  warehouseCode: string | null;
} {
  if (!order || typeof order === "string") {
    return { warehouseId: null, warehouseName: null, warehouseCode: null };
  }
  const w = order.warehouseId;
  if (!w) return { warehouseId: null, warehouseName: null, warehouseCode: null };
  if (typeof w === "string") {
    return { warehouseId: w, warehouseName: null, warehouseCode: null };
  }
  return {
    warehouseId: w._id ?? null,
    warehouseName: w.name ?? null,
    warehouseCode: w.code ?? null,
  };
}

function enrichTaskWithOrder<T extends ReturnType<typeof mapToWarehouseTask>>(
  task: T,
  order: PopulatedOrderRef | string | null | undefined
): T & {
  orderCode: string | null;
  warehouseId: string | null;
  warehouseName: string | null;
  warehouseCode: string | null;
} {
  const wh = readOrderWarehouse(order);
  return {
    ...task,
    orderCode: order && typeof order === "object" ? order.orderCode ?? null : null,
    ...wh,
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
  async findById(id: string): Promise<ReturnType<typeof enrichTaskWithOrder> | null> {
    const doc = await WarehouseTask.findById(id)
      .populate("orderId", "_id orderCode warehouseId")
      .populate({
        path: "orderId",
        populate: { path: "warehouseId", select: "_id code name" },
      })
      .lean();
    if (!doc) return null;
    const base = mapToWarehouseTask(doc as IWarehouseTask);
    const order = (doc as unknown as { orderId: PopulatedOrderRef | string | null }).orderId;
    return enrichTaskWithOrder(base, order);
  }

  /**
   * Find warehouse task by Order ID
   */
  async findByOrderId(orderId: string, session?: mongoose.ClientSession): Promise<ReturnType<typeof enrichTaskWithOrder> | null> {
    const query = WarehouseTask.findOne({ orderId: new mongoose.Types.ObjectId(orderId) })
      .populate("orderId", "_id orderCode warehouseId")
      .populate({
        path: "orderId",
        populate: { path: "warehouseId", select: "_id code name" },
      });
    if (session) query.session(session);
    const doc = await query.lean();
    if (!doc) return null;
    const base = mapToWarehouseTask(doc as IWarehouseTask);
    const order = (doc as unknown as { orderId: PopulatedOrderRef | string | null }).orderId;
    return enrichTaskWithOrder(base, order);
  }

  /**
   * Find all warehouse tasks with pagination
   */
  async findAll(options?: {
    status?: string;
    assignedEmployeeId?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    tasks: Array<ReturnType<typeof enrichTaskWithOrder>>;
    total: number;
  }> {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (options?.status) filter.warehouseStatus = options.status;
    if (options?.assignedEmployeeId) filter.assignedEmployeeId = new mongoose.Types.ObjectId(options.assignedEmployeeId);
    if (options?.warehouseId) {
      // `warehouseId` lives on the related Order, not on the task itself,
      // so we narrow by joining through the orderId reference.
      filter.orderId = { $in: await Order.find({ warehouseId: new mongoose.Types.ObjectId(options.warehouseId) }).select("_id").lean() };
    }

    const [docs, total] = await Promise.all([
      WarehouseTask.find(filter)
        .populate("orderId", "_id orderCode warehouseId")
        .populate({
          path: "orderId",
          populate: { path: "warehouseId", select: "_id code name" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WarehouseTask.countDocuments(filter),
    ]);

    return {
      tasks: docs.map((doc) => {
        const base = mapToWarehouseTask(doc as IWarehouseTask);
        const order = (doc as unknown as { orderId: PopulatedOrderRef | string | null }).orderId;
        return enrichTaskWithOrder(base, order);
      }),
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
      { returnDocument: "after", session }
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
      { returnDocument: "after", session }
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
      { returnDocument: "after", session }
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
