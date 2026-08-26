/**
 * Reserve stock cho tất cả Order chưa ship (CONFIRMED / PACKING) của KHO2.
 *
 * Mục đích:
 *   - Sau khi reset + re-seed, các order CONFIRMED mới KHÔNG qua `reserveStock`
 *     (vì seed chỉ insert, không trigger app logic).
 *   - Để user có thể xuất kho các order này từ UI, ta phải gọi `reserveStock`
 *     thủ công với cùng identity (variantId/giftId + quantity) như khi tạo.
 *
 * Logic:
 *   - Với mỗi order active có status ∈ {CONFIRMED, PACKING} và warehouseId = KHO2:
 *       + Derive demands từ Order.orderItems[] (giống orderShipment.service).
 *       + Gọi `reserveStock(warehouseId, lineItems, { actorEmployeeId, ... })`.
 *   - Idempotent — reserveStock check `availableQuantity >= qty` rồi mới trừ.
 *     Nếu đã reserve trước đó (reservedQuantity > 0 cho các demand này), reserve
 *     thêm lần nữa có thể fail availableQuantity check → script sẽ report.
 *
 * DESTRUCTIVE theo nghĩa nó thay đổi WarehouseInventory (cộng reservedQuantity,
 * trừ availableQuantity). Có thể chạy dry-run để xem trước.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/backfill-reserve-for-orders.ts
 *   npx tsx --env-file=.env.local src/scripts/backfill-reserve-for-orders.ts --apply
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import Order from "@/models/Order";
import { reserveStock } from "../services/warehouse/stockEngine.service";
import {
  orderItemsToDemands,
  type NormalizedOrderItemShape,
} from "../services/warehouse/orderDemand";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(
    `🔄 Backfill reserveStock cho Order chưa ship của KHO2  (${
      dryRun ? "DRY RUN" : "APPLY"
    })\n`
  );

  await connectDB();

  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id code")
    .lean();
  if (!kho2) {
    console.error("❌ KHO2 not found");
    process.exit(1);
  }

  const orders = await Order.find({
    isActive: true,
    warehouseId: kho2._id,
    status: { $in: ["CONFIRMED", "PACKING"] },
  })
    .select("_id orderCode status orderItems")
    .lean();

  console.log(`Orders cần backfill: ${orders.length}\n`);
  for (const o of orders) {
    const items = (o.orderItems ?? []) as unknown as NormalizedOrderItemShape[];
    const demands = orderItemsToDemands(items);
    console.log(
      `  ${o.orderCode.padEnd(14)} status=${o.status.padEnd(10)} demands=${demands.length}  (items=${items.length}, detailRows=${items.reduce((s, it) => s + ((it.details ?? []).length), 0)})`
    );
    for (const d of demands) {
      console.log(
        `     · ${d.itemType} ${
          d.itemType === "PRODUCT"
            ? `variant=${(d as unknown as { variantId?: string }).variantId ?? "?"}`
            : `gift=${d.giftId ?? "?"}`
        }  qty=${d.quantity}`
      );
    }
  }

  if (dryRun || orders.length === 0) {
    if (orders.length === 0) {
      console.log("\n✓ Không có order cần reserve.");
    } else {
      console.log("\nRun with --apply flag to write changes.");
    }
    await mongoose.disconnect();
    return;
  }

  console.log("\n--- APPLYING ---\n");
  let successCount = 0;
  let failedOrders: Array<{ code: string; error: string }> = [];
  for (const o of orders) {
    const items = (o.orderItems ?? []) as unknown as NormalizedOrderItemShape[];
    const demands = orderItemsToDemands(items);
    if (demands.length === 0) continue;
    try {
      await reserveStock(
        kho2._id,
        demands.map((d) => {
          // PRODUCT: CHỈ set 1 trong productVariantId hoặc productId
          // (theo ensureLineItem contract).
          const stock: Record<string, unknown> = {
            itemType: d.itemType,
            quantity: d.quantity,
          };
          if (d.itemType === "PRODUCT") {
            const vid = (d as unknown as { variantId?: string | null }).variantId;
            if (vid) {
              stock.productVariantId = vid;
            } else if (d.productId) {
              stock.productId = d.productId;
            }
          } else if (d.itemType === "GIFT") {
            if (d.giftId) stock.giftId = d.giftId;
          }
          return stock as unknown as Parameters<typeof reserveStock>[1][number];
        }),
        {
          actorEmployeeId: new mongoose.Types.ObjectId(), // system actor (no real employee)
          referenceType: "ORDER" as never,
          referenceCode: o.orderCode,
          orderId: o._id as mongoose.Types.ObjectId,
          note: "Backfill reserve cho order seed",
        }
      );
      console.log(`  ✅ ${o.orderCode}: reserved`);
      successCount++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  ❌ ${o.orderCode}: ${msg}`);
      failedOrders.push({ code: o.orderCode, error: msg });
    }
  }

  console.log(
    `\nDone. success=${successCount}, failed=${failedOrders.length}.`
  );

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});