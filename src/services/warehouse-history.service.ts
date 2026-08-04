/**
 * ==================================================
 * WAREHOUSE HISTORY SERVICE
 * ==================================================
 *
 * Sprint 6.3 — Warehouse Integration
 *
 * Clean Architecture: Service layer for WarehouseHistory.
 * Chứa business logic - được gọi bởi API Routes hoặc WarehouseService.
 */

import mongoose from "mongoose";
import { warehouseHistoryRepository } from "@/repositories/warehouse-history.repository";
import { WarehouseAction, WarehouseStatus } from "@/constants/warehouseStatus";

// ============================================================================
// Types
// ============================================================================

export interface CreateStatusChangeHistoryData {
  warehouseTaskId: string;
  employeeId: string;
  oldStatus: string;
  newStatus: string;
  note?: string;
}

export interface CreateHistoryData {
  warehouseTaskId: string;
  employeeId: string;
  action: WarehouseAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}

// ============================================================================
// Status to Action Mapping (Sprint 6.3)
// ============================================================================

/**
 * Map WarehouseStatus to WarehouseAction for timeline display
 */
function getStatusAction(status: string): WarehouseAction {
  const statusActionMap: Record<string, WarehouseAction> = {
    [WarehouseStatus.WAITING_PICK]: WarehouseAction.WAITING_PICK,
    [WarehouseStatus.PICKING]: WarehouseAction.PICKING,
    [WarehouseStatus.PACKED]: WarehouseAction.PACKED,
    [WarehouseStatus.READY_TO_SHIP]: WarehouseAction.READY_TO_SHIP,
    [WarehouseStatus.SHIPPED]: WarehouseAction.SHIPPED,
  };

  return statusActionMap[status] || WarehouseAction.UPDATED;
}

// ============================================================================
// Warehouse History Service
// ============================================================================

export class WarehouseHistoryService {
  /**
   * Create status change history entry with status-specific action
   */
  async createStatusChangeHistory(
    data: CreateStatusChangeHistoryData,
    session?: mongoose.ClientSession
  ) {
    const action = getStatusAction(data.newStatus);

    return warehouseHistoryRepository.create(
      {
        warehouseTaskId: new mongoose.Types.ObjectId(data.warehouseTaskId),
        employeeId: new mongoose.Types.ObjectId(data.employeeId),
        action,
        fieldName: "warehouseStatus",
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
    return warehouseHistoryRepository.create(
      {
        warehouseTaskId: new mongoose.Types.ObjectId(data.warehouseTaskId),
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
   * Get history by warehouse task ID with employee population
   */
  async getHistoryByTaskId(taskId: string) {
    return warehouseHistoryRepository.findByTaskIdWithPopulate(taskId);
  }
}

// Singleton instance
export const warehouseHistoryService = new WarehouseHistoryService();
