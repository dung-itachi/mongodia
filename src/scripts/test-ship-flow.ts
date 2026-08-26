/**
 * Test ship flow end-to-end trên 1 CONFIRMED order.
 *
 * Steps:
 *   1. Tìm 1 CONFIRMED order thuộc KHO2 có reserved > 0.
 *   2. Gọi orderShipmentService.shipOrder(orderId, employeeId).
 *   3. Report kết quả.
 *   4. Verify inventory sau khi ship.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/test-ship-flow.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import Order from "@/models/Order";
import WarehouseInventory from "../models/WarehouseInventory";
import Employee from "@/models/Employee";
import { orderShipmentService } from "../services/warehouse/orderShipment.service";

async function main() {
  await connectDB();

  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) {
    console.error("KHO2 not found");
    process.exit(1);
  }

  // Lấy 1 order CONFIRMED có reserve
  const order = await Order.findOne({
    isActive: true,
    warehouseId: kho2._id,
    status: "CONFIRMED",
  })
    .select("_id orderCode status warehouseId orderItems")
    .lean();

  if (!order) {
    console.log("No CONFIRMED order found.");
    await mongoose.disconnect();
    return;
  }

  // Tìm 1 employee thật làm actor
  const employee = await Employee.findOne({ isActive: true })
    .select("_id")
    .lean();
  if (!employee) {
    console.error("No employee found");
    process.exit(1);
  }

  console.log(`\nTest ship: ${order.orderCode}`);
  console.log(`Order._id = ${order._id}`);

  // Snapshot trước
  const beforeInv = await WarehouseInventory.find({
    warehouseId: kho2._id,
    isActive: { $ne: false },
  }).lean();
  console.log(
    `\nInventory BEFORE ship — total q=${beforeInv.reduce((s, r) => s + (r.quantity ?? 0), 0)}, available=${beforeInv.reduce((s, r) => s + (r.availableQuantity ?? 0), 0)}, reserved=${beforeInv.reduce((s, r) => s + (r.reservedQuantity ?? 0), 0)}`
  );

  // Ship
  const result = await orderShipmentService.shipOrder({
    orderId: order._id.toString(),
    employeeId: employee._id.toString(),
  });

  console.log(`\nShip result:`);
  console.log(JSON.stringify(result, null, 2));

  // Snapshot sau
  const afterInv = await WarehouseInventory.find({
    warehouseId: kho2._id,
    isActive: { $ne: false },
  }).lean();
  console.log(
    `\nInventory AFTER ship — total q=${afterInv.reduce((s, r) => s + (r.quantity ?? 0), 0)}, available=${afterInv.reduce((s, r) => s + (r.availableQuantity ?? 0), 0)}, reserved=${afterInv.reduce((s, r) => s + (r.reservedQuantity ?? 0), 0)}`
  );

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});