/**
 * Verify: gọi logic overview API với warehouseCode=KHO1 / KHO2
 * để confirm filter theo code trả về 2 tập data khác nhau.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/verify-country-filter.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import WarehouseInventory from "../models/WarehouseInventory";

async function countStockForWarehouse(code: string) {
  const ws = await Warehouse.find({ code, isActive: true })
    .select("_id code")
    .lean();
  const warehouseIds = ws.map((w) => w._id);

  if (warehouseIds.length === 0) {
    return { code, warehouses: [], stock: 0, products: 0 };
  }

  const agg = await WarehouseInventory.aggregate([
    {
      $match: {
        warehouseId: { $in: warehouseIds },
        itemType: "PRODUCT",
        isActive: { $ne: false },
      },
    },
    {
      $group: {
        _id: "$productId",
        stock: { $sum: { $ifNull: ["$availableQuantity", 0] } },
      },
    },
    { $match: { stock: { $gt: 0 } } },
  ]);

  return {
    code,
    warehouses: ws.map((w) => w.code),
    stock: agg.reduce((s, r) => s + (r.stock ?? 0), 0),
    products: agg.length,
  };
}

async function main() {
  await connectDB();

  console.log("\n=== Warehouse code filter verification ===\n");
  for (const code of ["KHO1", "KHO2"]) {
    const r = await countStockForWarehouse(code);
    console.log(
      `[${code}] warehouses=${r.warehouses.length} (${r.warehouses.join(", ") || "—"}) · productsWithStock=${r.products} · totalStock=${r.stock}`
    );
  }

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});