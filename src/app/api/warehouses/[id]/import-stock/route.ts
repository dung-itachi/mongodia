/**
 * ==================================================
 * POST /api/warehouses/[id]/import-stock (DEPRECATED)
 * ==================================================
 *
 * DEPRECATED: This endpoint used to write to the legacy `Inventory`
 * collection, bypassing `WarehouseInventory` (the source of truth).
 *
 * As of Sprint 7 warehouse inventory was migrated to
 * `WarehouseInventory` + `WarehouseStockMovement`, and IMPORT flows
 * must go through the warehouse workflow service:
 *
 *   POST /api/warehouse/imports
 *     body: { warehouseId, items: [{ productId|variantId|giftId,
 *                                     orderedQuantity, receivedQuantity }],
 *             note?, employeeId }
 *
 *   → warehouseWorkflowService.createReceipt()
 *     → writes WarehouseInventory (atomic, transactional)
 *     → writes WarehouseStockMovement (IMPORT)
 *
 * This route now returns 410 Gone so any caller still using it
 * gets an explicit migration signal rather than silently writing
 * to the legacy `Inventory` model.
 */

import { success, error as errorResponse } from "@/utils/response";

export async function POST(
  request: Request,
  _ctx: { params: Promise<{ id: string }> }
) {
  void request;
  void _ctx;
  return errorResponse(
    "Endpoint /api/warehouses/[id]/import-stock đã ngừng hoạt động. " +
      "Sử dụng POST /api/warehouse/imports với body { warehouseId, items: [{ variantId|productId|giftId, orderedQuantity, receivedQuantity }] } để nhập kho thông qua WarehouseInventory + WarehouseStockMovement.",
    410
  );
}

export async function GET() {
  return success(null, "Endpoint đã ngừng hoạt động");
}