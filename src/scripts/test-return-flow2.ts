/**
 * Test full return flow với order thực.
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/test-return-flow2.ts OD2608270002
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Order from "@/models/Order";
import Warehouse from "@/models/Warehouse";
import WarehouseInventory from "@/models/WarehouseInventory";
import { orderShipmentService } from "../services/warehouse/orderShipment.service";
import Employee from "@/models/Employee";

async function main() {
  await connectDB();

  const code = process.argv[2] ?? "OD2608270002";
  const order = await Order.findOne({ orderCode: code, isActive: true })
    .select("_id orderCode status warehouseId orderItems whReturned")
    .lean();
  if (!order) throw new Error(`Order ${code} not found`);
  console.log(
    `Order ${order.orderCode}: status=${order.status} whReturned=${order.whReturned}`
  );

  if (order.status !== "RETURNED") {
    console.log(`Order not in RETURNED, skipping`);
    await mongoose.disconnect();
    return;
  }

  const employee = await Employee.findOne({ isActive: true })
    .select("_id")
    .lean();
  if (!employee) throw new Error("No employee");

  // Build shipments từ orderItems (giống UI handleReturn)
  const items = (order.orderItems ?? []) as Array<{
    productId?: string;
    details?: Array<{ variantId?: string; quantity?: number }>;
    quantity?: number;
  }>;
  const shipments = items.flatMap((item) => {
    const det = item.details ?? [];
    if (det.length > 0) {
      return det.map((d) => ({
        itemType: "PRODUCT" as const,
        productId: item.productId,
        productVariantId: d.variantId,
        quantity: d.quantity ?? 1,
      }));
    }
    return [];
  });

  if (shipments.length === 0) {
    console.log("No shipments to return");
    await mongoose.disconnect();
    return;
  }

  // Snapshot inv trước
  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  const variantIds = shipments
    .map((s) => s.productVariantId)
    .filter(Boolean) as string[];
  const beforeInv = await WarehouseInventory.find({
    warehouseId: kho2!._id,
    variantId: { $in: variantIds },
  })
    .select("variantId quantity reservedQuantity availableQuantity")
    .lean();
  console.log("\nBEFORE return:");
  for (const r of beforeInv) {
    console.log(
      `  v=${r.variantId} q=${r.quantity} reserved=${r.reservedQuantity} available=${r.availableQuantity}`
    );
  }

  console.log("\nCalling returnOrder service...");
  const result = await orderShipmentService.returnOrder({
    orderId: order._id.toString(),
    employeeId: employee._id.toString(),
    items: shipments,
    note: "Test return",
  });
  console.log("Result:", JSON.stringify(result, null, 2));

  const after = await Order.findById(order._id)
    .select("status whReturned returnedToStockAt")
    .lean();
  console.log(
    `\nAfter: status=${after?.status} whReturned=${after?.whReturned} returnedAt=${after?.returnedToStockAt?.toISOString?.()}`
  );

  const afterInv = await WarehouseInventory.find({
    warehouseId: kho2!._id,
    variantId: { $in: variantIds },
  })
    .select("variantId quantity reservedQuantity availableQuantity")
    .lean();
  console.log("\nAFTER return:");
  for (const r of afterInv) {
    console.log(
      `  v=${r.variantId} q=${r.quantity} reserved=${r.reservedQuantity} available=${r.availableQuantity}`
    );
  }

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});