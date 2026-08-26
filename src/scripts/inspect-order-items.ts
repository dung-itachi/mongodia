/**
 * Debug: Xem chi tiết 1 order cụ thể.
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import Order from "@/models/Order";

async function main() {
  await connectDB();
  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) return;
  const code = process.argv[2];
  if (!code) {
    console.log("Usage: tsx inspect-order-items.ts <orderCode>");
    return;
  }
  const o = await Order.findOne({ orderCode: code, isActive: true })
    .select("_id orderCode status orderType productId productVariantId comboId orderItems")
    .lean();
  console.log(JSON.stringify(o, null, 2));
  await mongoose.disconnect();
}
main();