/**
 * ==================================================
 * WAREHOUSE SERVICE
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Clean Architecture: Service layer for WarehouseTask.
 * Chứa business logic - được gọi bởi API Routes.
 */

import mongoose from "mongoose";
import { warehouseRepository } from "@/repositories/warehouse.repository";
import { warehouseHistoryService } from "@/services/warehouse-history.service";
import { WarehouseStatus } from "@/constants/warehouseStatus";
import { WarehouseAction } from "@/constants/warehouseStatus";
import {
  isWarehouseTransitionAllowed,
  getAllowedWarehouseTransitions,
} from "@/configs/warehouse-status.config";

// ============================================================================
// Types
// ============================================================================

export interface CreateWarehouseTaskData {
  orderId: string;
  employeeId: string;
  assignedEmployeeId?: string;
  note?: string;
}

export interface ChangeStatusData {
  taskId: string;
  newStatus: string;
  employeeId: string;
  note?: string;
}

export interface AssignEmployeeData {
  taskId: string;
  employeeId: string;
  assigneeId: string;
  note?: string;
}

export interface ChangeStatusResult {
  success: true;
  task: unknown;
  alreadyShipped?: boolean;
  terminalStatus?: string;
}

export interface ChangeStatusError {
  success: false;
  error: string;
}

export interface CreateTaskResult {
  success: true;
  task: unknown;
}

export interface CreateTaskError {
  success: false;
  error: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get full order document with orderItems and warehouseId.
 * Uses the Order model directly to avoid going through orderService.
 */
async function getOrderDocument(orderId: string) {
  const Order = (await import("@/models/Order")).Order;
  return Order.findById(orderId).lean();
}

// ============================================================================
// Warehouse Service
// ============================================================================

export class WarehouseService {
  /**
   * Validate warehouse status transition
   */
  validateWarehouseTransition(currentStatus: string, newStatus: string): boolean {
    return isWarehouseTransitionAllowed(currentStatus, newStatus);
  }

  /**
   * Get allowed next statuses for a warehouse task
   */
  getAllowedTransitions(currentStatus: string): string[] {
    return getAllowedWarehouseTransitions(currentStatus);
  }

  /**
   * Create warehouse task from order
   * Called automatically when Order moves to PACKING status
   */
  async createFromOrder(
    data: CreateWarehouseTaskData,
    options?: { session?: mongoose.ClientSession }
  ): Promise<CreateTaskResult | CreateTaskError> {
    const { orderId, employeeId, assignedEmployeeId, note } = data;
    const session = options?.session;

    // Check if task already exists (use the same session if provided)
    const existing = await warehouseRepository.findByOrderId(orderId, session);
    if (existing) {
      return { success: false, error: "WarehouseTask đã tồn tại cho đơn hàng này" };
    }

    // Create task
    const task = await warehouseRepository.create({
      orderId: new mongoose.Types.ObjectId(orderId),
      warehouseStatus: WarehouseStatus.WAITING_PICK,
      assignedEmployeeId: assignedEmployeeId
        ? new mongoose.Types.ObjectId(assignedEmployeeId)
        : undefined,
      note,
    }, session);

    // Record history
    await warehouseHistoryService.createHistory({
      warehouseTaskId: task._id,
      employeeId,
      action: WarehouseAction.CREATED,
      note: "Tạo task từ đơn hàng",
    }, session);

    return { success: true, task };
  }

  /**
   * Change warehouse task status
   */
  async changeStatus(
    data: ChangeStatusData
  ): Promise<ChangeStatusResult | ChangeStatusError> {
    const { taskId, newStatus, employeeId, note } = data;

    // Find existing task
    const task = await warehouseRepository.findById(taskId);
    if (!task) {
      return { success: false, error: "WarehouseTask không tồn tại" };
    }

    // Validate transition
    if (!isWarehouseTransitionAllowed(task.warehouseStatus, newStatus)) {
      return {
        success: false,
        error: `Không thể chuyển từ ${task.warehouseStatus} sang ${newStatus}`,
      };
    }

    const oldStatus = task.warehouseStatus;

    // Use transaction for atomic operation
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Fetch the related order once — needed for both the terminal-status check
      // and for the shipOrder call below.
      const orderDoc = await getOrderDocument(task.orderId.toString());
      if (!orderDoc) {
        await session.abortTransaction();
        return { success: false, error: "Không tìm thấy đơn hàng" };
      }
      if (!orderDoc.warehouseId) {
        await session.abortTransaction();
        return { success: false, error: "Đơn hàng chưa được gán kho, không thể xuất kho" };
      }

      // Idempotency: if the order is already in a terminal state (SHIPPING, DELIVERED,
      // RETURNED, RECONCILED, CANCELLED), abort the entire WarehouseTask status change
      // so we don't double-write the task history. This matches the behaviour of
      // shipOrder() which also returns alreadyShipped: true and aborts.
      const TERMINAL_STATUSES = new Set(["SHIPPING", "DELIVERED", "RETURNED", "RECONCILED", "CANCELLED"]);
      if (TERMINAL_STATUSES.has(orderDoc.status)) {
        await session.abortTransaction();
        return {
          success: true,
          task,
          alreadyShipped: true,
          terminalStatus: orderDoc.status,
        };
      }

      // ── 1. Update WarehouseTask status + history (inside the session) ──────
      const updatedTask = await warehouseRepository.changeStatus(taskId, newStatus, session);
      if (!updatedTask) {
        await session.abortTransaction();
        return { success: false, error: "Không thể cập nhật trạng thái" };
      }

      await warehouseHistoryService.createStatusChangeHistory(
        {
          warehouseTaskId: taskId,
          employeeId,
          oldStatus,
          newStatus,
          note,
        },
        session
      );

      // ── 2. Delegate to the canonical shipOrder operation ─────────────────────
      // orderShipmentService.shipOrder() uses the existing session so everything
      // (task update + history + inventory + order status + order history) commits
      // atomically. It returns alreadyShipped: true only when the order was
      // already terminal before we updated the task above (race condition), in
      // which case it aborts the transaction.
      const { orderShipmentService } = await import("@/services/warehouse/orderShipment.service");

      const shipResult = await orderShipmentService.shipOrder(
        {
          orderId: task.orderId.toString(),
          employeeId,
          note: note || "Xuất kho khi WarehouseTask SHIPPED",
        },
        { session }
      );

      if (!shipResult.success) {
        await session.abortTransaction();
        return { success: false, error: shipResult.error };
      }

      // shipResult.alreadyShipped === true means the order transitioned to terminal
      // status between our check above and the shipOrder call (race condition).
      // shipOrder already aborted the transaction; propagate the idempotent result.
      if (shipResult.alreadyShipped) {
        await session.abortTransaction();
        return {
          success: true,
          task: updatedTask,
          alreadyShipped: true,
          terminalStatus: shipResult.terminalStatus,
        };
      }

      await session.commitTransaction();
      return { success: true, task: updatedTask };
    } catch (err) {
      await session.abortTransaction();
      console.error("WarehouseService.changeStatus error:", err);
      return { success: false, error: "Lỗi khi cập nhật trạng thái" };
    } finally {
      session.endSession();
    }
  }

  /**
   * Assign employee to warehouse task
   */
  async assignEmployee(
    data: AssignEmployeeData
  ): Promise<ChangeStatusResult | ChangeStatusError> {
    const { taskId, employeeId, assigneeId, note } = data;

    const task = await warehouseRepository.findById(taskId);
    if (!task) {
      return { success: false, error: "WarehouseTask không tồn tại" };
    }

    const oldAssigneeId = task.assignedEmployeeId;

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const updatedTask = await warehouseRepository.assignEmployee(
        taskId,
        new mongoose.Types.ObjectId(assigneeId),
        session
      );

      if (!updatedTask) {
        await session.abortTransaction();
        return { success: false, error: "Không thể giao việc" };
      }

      await warehouseHistoryService.createHistory({
        warehouseTaskId: taskId,
        employeeId,
        action: WarehouseAction.ASSIGNED,
        oldValue: oldAssigneeId ?? undefined,
        newValue: assigneeId,
        note,
      }, session);

      await session.commitTransaction();
      return { success: true, task: updatedTask };
    } catch (err) {
      await session.abortTransaction();
      console.error("WarehouseService.assignEmployee error:", err);
      return { success: false, error: "Lỗi khi giao việc" };
    } finally {
      session.endSession();
    }
  }

  /**
   * Get warehouse task by ID
   */
  async getTaskById(taskId: string) {
    return warehouseRepository.findById(taskId);
  }

  /**
   * Get warehouse task by Order ID
   */
  async getTaskByOrderId(orderId: string) {
    return warehouseRepository.findByOrderId(orderId);
  }

  /**
   * Get all warehouse tasks with pagination
   */
  async getAllTasks(options?: {
    status?: string;
    assignedEmployeeId?: string;
    warehouseId?: string;
    page?: number;
    limit?: number;
  }) {
    return warehouseRepository.findAll(options);
  }

  /**
   * Complete packing and transition to READY_TO_SHIP
   * Helper for workflow
   */
  async completePacking(
    taskId: string,
    employeeId: string,
    note?: string
  ): Promise<ChangeStatusResult | ChangeStatusError> {
    return this.changeStatus({
      taskId,
      newStatus: WarehouseStatus.READY_TO_SHIP,
      employeeId,
      note: note ?? "Hoàn tất đóng gói",
    });
  }
}

// Singleton instance
export const warehouseService = new WarehouseService();
