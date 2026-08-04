/**
 * ==================================================
 * ORDER HISTORY SERVICE
 * ==================================================
 *
 * Sprint 6.2 — Order Workflow
 *
 * Clean Architecture: Service layer cho OrderHistory.
 * Chứa business logic - được gọi bởi API Routes.
 */

import mongoose from "mongoose";
import { orderHistoryRepository } from "@/repositories/order-history.repository";
import { OrderAction, OrderStatus } from "@/constants/orderStatus";

// ============================================================================
// Types
// ============================================================================

export interface CreateStatusChangeHistoryData {
  orderId: string;
  employeeId: string;
  oldStatus: string;
  newStatus: string;
  note?: string;
}

export interface CreateHistoryData {
  orderId: string;
  employeeId: string;
  action: OrderAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

// ============================================================================
// Status to Action Mapping (Sprint 6.2)
// ============================================================================

/**
 * Map OrderStatus to OrderAction for timeline display
 * Sprint 6.2: Using status-specific actions instead of generic STATUS_CHANGED
 */
function getStatusAction(status: string): OrderAction {
  const statusActionMap: Record<string, OrderAction> = {
    [OrderStatus.PENDING]: OrderAction.PENDING,
    [OrderStatus.CONFIRMED]: OrderAction.CONFIRMED,
    [OrderStatus.PACKING]: OrderAction.PACKING,
    [OrderStatus.SHIPPING]: OrderAction.SHIPPING,
    [OrderStatus.DELIVERED]: OrderAction.DELIVERED,
    [OrderStatus.RETURNED]: OrderAction.RETURNED,
    [OrderStatus.CANCELLED]: OrderAction.CANCELLED,
    [OrderStatus.PREPAID]: OrderAction.PREPAID,
    [OrderStatus.REJECTED]: OrderAction.REJECTED,
    [OrderStatus.FAILED]: OrderAction.FAILED,
  };

  return statusActionMap[status] || OrderAction.STATUS_CHANGED;
}

// ============================================================================
// Order History Service
// ============================================================================

export class OrderHistoryService {
  /**
   * Create status change history entry with status-specific action
   * Sprint 6.2: Uses specific actions (PACKING, SHIPPING, DELIVERED, etc.)
   */
  async createStatusChangeHistory(
    data: CreateStatusChangeHistoryData,
    session?: mongoose.ClientSession
  ) {
    const action = getStatusAction(data.newStatus);

    return orderHistoryRepository.create(
      {
        orderId: new mongoose.Types.ObjectId(data.orderId),
        employeeId: new mongoose.Types.ObjectId(data.employeeId),
        action,
        fieldName: "status",
        oldValue: data.oldStatus,
        newValue: data.newStatus,
        note: data.note,
      },
      session
    );
  }

  /**
   * Create generic history entry
   */
  async createHistory(
    data: CreateHistoryData,
    session?: mongoose.ClientSession
  ) {
    return orderHistoryRepository.create(
      {
        orderId: new mongoose.Types.ObjectId(data.orderId),
        employeeId: new mongoose.Types.ObjectId(data.employeeId),
        action: data.action,
        fieldName: data.fieldName,
        oldValue: data.oldValue,
        newValue: data.newValue,
        note: data.note,
      },
      session
    );
  }

  /**
   * Get history by order ID with employee population
   */
  async getHistoryByOrderId(orderId: string) {
    return orderHistoryRepository.findByOrderIdWithPopulate(orderId);
  }
}

// Singleton instance
export const orderHistoryService = new OrderHistoryService();
