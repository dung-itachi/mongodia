/**
 * ==================================================
 * POST /api/warehouses/import-product-stock (DEPRECATED)
 * ==================================================
 *
 * DEPRECATED: This endpoint used to iterate over every active warehouse
 * and write to the legacy `Inventory` collection. That violated the
 * warehouse business rule:
 *
 *   NHÀ SẢN XUẤT → KHO1 (Kho Trung Quốc / trung gian)
 *                     ↓ WarehouseTransfer
 *                   KHO2 (Kho Mông Cổ / kho chính bán hàng)
 *
 * It could also indirectly credit KHO2 stock without going through the
 * TRANSFER workflow, breaking WarehouseInventory as the single source
 * of truth.
 *
 * Correct flow now:
 *   1. POST /api/warehouse/imports   → IMPORT vào KHO1
 *   2. POST /api/warehouse/transfers → TRANSFER KHO1 → KHO2
 *
 * This route now returns 410 Gone so callers get a clear migration
 * signal rather than silently corrupting stock.
 */

import { error as errorResponse } from "@/utils/response";

export async function POST(request: Request) {
  void request;
  return errorResponse(
    "Endpoint /api/warehouses/import-product-stock đã ngừng hoạt động. " +
      "IMPORT phải vào đúng một kho (KHO1 = kho trung gian) qua POST /api/warehouse/imports. " +
      "Muốn KHO2 tăng tồn, tạo WarehouseTransfer KHO1 → KHO2 qua POST /api/warehouse/transfers.",
    410
  );
}

export async function GET() {
  return errorResponse("Endpoint đã ngừng hoạt động", 410);
}