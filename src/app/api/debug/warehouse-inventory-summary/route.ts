/**
 * Debug endpoint: returns raw aggregation result from WarehouseInventory
 * to verify the fix works. No auth required.
 */
import { connectDB } from "@/lib/mongodb";
import WarehouseInventory from "@/models/WarehouseInventory";
import { success, error } from "@/utils/response";

export async function GET() {
  try {
    await connectDB();

    const all = await WarehouseInventory.find({ itemType: "PRODUCT" }).lean();
    const byVariant = new Map<string, { total: number; perWarehouse: Record<string, number> }>();
    for (const r of all) {
      const vid = r.variantId ? String(r.variantId) : "null";
      const wid = String(r.warehouseId);
      const prev = byVariant.get(vid) ?? { total: 0, perWarehouse: {} };
      prev.total += r.availableQuantity ?? 0;
      prev.perWarehouse[wid] = (prev.perWarehouse[wid] ?? 0) + (r.availableQuantity ?? 0);
      byVariant.set(vid, prev);
    }

    const result = Array.from(byVariant.entries()).map(([variantId, v]) => ({
      variantId,
      totalAvailable: v.total,
      perWarehouse: v.perWarehouse,
    }));

    return success({ count: result.length, records: result });
  } catch (err) {
    return error(String(err), 500);
  }
}
