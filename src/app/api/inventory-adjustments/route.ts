/**
 * ==================================================
 * LEGACY INVENTORY ADJUSTMENT API — PERMANENTLY DISABLED
 * ==================================================
 *
 * This route is INTENTIONALLY DISABLED.
 *
 * Background:
 *   WarehouseInventory (collection: `warehouse_inventory`) is now the
 *   authoritative inventory Source of Truth. All adjustment writes
 *   must go through:
 *
 *     POST /api/warehouse/adjustments
 *     → src/services/warehouse/warehouse-adjustment.service.ts
 *     → WarehouseInventory (SoT)
 *     → WarehouseStockMovement (audit log)
 *
 * The previous implementation of this file mutated legacy collections
 * (`Inventory`, `InventoryAdjustment`, `InventoryTransaction`) that
 * are no longer the source of truth. Continuing to accept writes here
 * would silently desynchronize legacy state from WarehouseInventory.
 *
 * Phase 8A Read-Only Audit confirmed:
 *   - No production caller invokes POST or GET on this route.
 *   - No frontend code references `/api/inventory-adjustments`.
 *   - No server-side service imports these handlers.
 *   - Disabling this endpoint is safe.
 *
 * Other legacy dependencies that REMAIN ACTIVE and are NOT touched
 * by this change:
 *   - InventoryHistory is still written by stockEngine.reserveStock /
 *     stockEngine.releaseReservedStock and is read by
 *     orderStockWiring.helper.ts and /api/products/management.
 *   - Inventory is still read by /api/products/management.
 *   - inventory.service.ts::getMovements / getMovementById are still
 *     used by /api/inventory/movements and
 *     /api/warehouse/tasks/[id]/inventory.
 *
 * Both GET and POST return 410 Gone with a pointer to the
 * replacement endpoint. No authentication, validation, or DB I/O is
 * performed.
 * ==================================================
 */

import { error as errorResponse } from "@/utils/response";

const REPLACEMENT_ENDPOINT = "/api/warehouse/adjustments";
const GONE_MESSAGE =
  "Endpoint này đã ngừng hoạt động vĩnh viễn. " +
  `Vui lòng sử dụng ${REPLACEMENT_ENDPOINT} thay thế.`;

export async function GET() {
  return errorResponse(GONE_MESSAGE, 410);
}

export async function POST() {
  return errorResponse(GONE_MESSAGE, 410);
}