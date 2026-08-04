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
import { OrderStatus } from "@/constants/orderStatus";

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
 * Lazy import OrderService to avoid circular dependency.
 * order.service.ts imports warehouse.service.ts,
 * so warehouse.service.ts cannot directly import orderService.
 */
async function getOrderService() {
  const { orderService } = await import("@/services/order.service");
  return orderService;
}

/**
 * Lazy import InventoryService to avoid circular dependency.
 */
async function getInventoryService() {
  const { inventoryService } = await import("@/services/inventory.service");
  return inventoryService;
}

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
  async createFromOrder(data: CreateWarehouseTaskData): Promise<CreateTaskResult | CreateTaskError> {
    const { orderId, employeeId, assignedEmployeeId, note } = data;

    // Check if task already exists
    const existing = await warehouseRepository.findByOrderId(orderId);
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
    });

    // Record history
    await warehouseHistoryService.createHistory({
      warehouseTaskId: task._id,
      employeeId,
      action: WarehouseAction.CREATED,
      note: "Tạo task từ đơn hàng",
    });

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

      // Update status
      const updatedTask = await warehouseRepository.changeStatus(taskId, newStatus, session);
      if (!updatedTask) {
        await session.abortTransaction();
        return { success: false, error: "Không thể cập nhật trạng thái" };
      }

      // Record history
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

      // Sync: Warehouse SHIPPED → Order SHIPPING + Export Inventory
      if (newStatus === WarehouseStatus.SHIPPED) {
        // Step 1: Export inventory first (must succeed before status change)
        const orderDoc = await getOrderDocument(task.orderId.toString());
        if (!orderDoc) {
          await session.abortTransaction();
          return { success: false, error: "Không tìm thấy đơn hàng" };
        }

        if (!orderDoc.warehouseId) {
          await session.abortTransaction();
          return {
            success: false,
            error: "Đơn hàng chưa được gán kho, không thể xuất kho",
          };
        }

        if (orderDoc.orderItems && orderDoc.orderItems.length > 0) {
          const inventoryService = await getInventoryService();
          const orderItems = orderDoc.orderItems as Array<{
            productId?: mongoose.Types.ObjectId;
            sku: string;
            productName: string;
            quantity: number;
          }>;
          const exportResult = await inventoryService.exportOrder({
            orderId: task.orderId.toString(),
            warehouseTaskId: taskId,
            warehouseId: orderDoc.warehouseId.toString(),
            items: orderItems.map((item) => ({
              productVariantId: orderDoc.productVariantId?.toString(),
              sku: item.sku,
              productName: item.productName,
              quantity: item.quantity,
            })),
            employeeId,
            note: note || "Xuất kho khi WarehouseTask SHIPPED",
          });

          if (!exportResult.success) {
            await session.abortTransaction();
            const detail = exportResult.insufficientItems
              ? `: ${exportResult.insufficientItems.map((i) => `${i.sku} (cần ${i.requested}, còn ${i.available})`).join(", ")}`
              : "";
            return {
              success: false,
              error: `Xuất kho thất bại${detail}: ${exportResult.error}`,
            };
          }
        }

        // Step 2: Change Order status to SHIPPING
        const orderService = await getOrderService();
        const orderResult = await orderService.changeStatus({
          orderId: task.orderId.toString(),
          newStatus: OrderStatus.SHIPPING,
          employeeId,
          note: note || "Tự động chuyển SHIPPING khi warehouse SHIPPED",
        });

        if (!orderResult.success) {
          await session.abortTransaction();
          return {
            success: false,
            error: `Warehouse SHIPPED thành công nhưng Order SHIPPING thất bại: ${orderResult.error}`,
          };
        }
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
