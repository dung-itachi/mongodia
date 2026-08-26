/**
 * Raw query: SELECT toàn bộ warehouse_inventory rows của KHO2.
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";

async function main() {
  await connectDB();
  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) return;
  const raw = await mongoose.connection
    .collection("warehouse_inventory")
    .find({ warehouseId: kho2._id, itemType: "PRODUCT" })
    .toArray();
  console.log(`Rows: ${raw.length}`);
  for (const r of raw) {
    console.log(
      `  _id=${r._id} productId=${r.productId} variantId=${r.variantId} giftId=${r.giftId} q=${r.quantity} available=${r.availableQuantity} reserved=${r.reservedQuantity}`
    );
  }
  await mongoose.disconnect();
}
main();