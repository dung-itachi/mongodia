/**
 * Debug: Run orderItemsToDemands thủ công trên 1 order để xem output.
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import Order from "@/models/Order";
import {
  orderItemsToDemands,
  type NormalizedOrderItemShape,
} from "../services/warehouse/orderDemand";

async function main() {
  await connectDB();
  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) return;
  const code = process.argv[2] ?? "2608270002";
  const o = await Order.findOne({ orderCode: code, isActive: true })
    .select("_id orderCode orderItems")
    .lean();
  if (!o) {
    console.log(`Order ${code} not found`);
    return;
  }
  console.log(`Order ${code}:`);
  console.log(`  orderItems.length = ${o.orderItems?.length ?? 0}`);
  for (let i = 0; i < (o.orderItems ?? []).length; i++) {
    const it = (o.orderItems as unknown[])[i] as NormalizedOrderItemShape;
    console.log(`  item[${i}]:`);
    console.log(`    productId = ${it.productId}`);
    console.log(`    details = ${JSON.stringify(it.details)}`);
  }
  try {
    const demands = orderItemsToDemands(
      (o.orderItems ?? []) as unknown as NormalizedOrderItemShape[]
    );
    console.log(`\nDemands: ${demands.length}`);
    for (const d of demands) {
      console.log(`  · ${d.itemType} qty=${d.quantity}`);
    }
  } catch (e) {
    console.error("ERROR:", e);
  }
  await mongoose.disconnect();
}
main();