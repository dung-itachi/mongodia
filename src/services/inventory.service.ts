/**
 * ==================================================
 * INVENTORY SERVICE — READ-ONLY LEGACY READS
 * ==================================================
 *
 * Phase 8D-3: All mutation methods removed (exportOrder, rollbackExport,
 * reserveStock, releaseStock, checkStock).
 *
 * Only the two read methods remain because they have ACTIVE PRODUCTION
 * callers:
 *   - getMovements      → /api/inventory/movements
 *                         /api/warehouse/tasks/[id]/inventory
 *   - getMovementById   → /api/inventory/movements/[id]
 *
 * They read from the legacy `InventoryMovement` collection, which is
 * still kept for historical read access.
 */

import { inventoryRepository } from "@/repositories/inventory.repository";

// ============================================================================
// Inventory Service
// ============================================================================

export class InventoryService {
  /**
   * Get movements with pagination
   */
  async getMovements(options?: {
    warehouseId?: string;
    orderId?: string;
    warehouseTaskId?: string;
    page?: number;
    limit?: number;
  }) {
    return inventoryRepository.findMovements(options);
  }

  /**
   * Get movement by ID
   */
  async getMovementById(id: string) {
    return inventoryRepository.findMovementById(id);
  }
}

// Singleton instance
export const inventoryService = new InventoryService();
