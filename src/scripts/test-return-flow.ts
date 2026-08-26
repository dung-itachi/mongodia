/**
 * Simulate flow: reserve → ship → return → xem inventory có khôi phục đúng không.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/test-return-flow.ts
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import ProductVariant from "../models/ProductVariant";
import WarehouseInventory from "../models/WarehouseInventory";
import Employee from "@/models/Employee";
import Order from "@/models/Order";
import { reserveStock, shipStock, returnStock } from "../services/warehouse/stockEngine.service";

async function main() {
  await connectDB();

  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) throw new Error("KHO2 not seeded");

  const variant = await ProductVariant.findOne({ isActive: true })
    .select("_id productId variantValues")
    .lean();
  if (!variant) throw new Error("No variant");

  const employee = await Employee.findOne({ isActive: true })
    .select("_id")
    .lean();
  if (!employee) throw new Error("No employee");

  // Lấy order CONFIRMED đầu tiên (đã có reserved=1)
  const order = await Order.findOne({
    isActive: true,
    status: "CONFIRMED",
  })
    .select("_id orderCode warehouseId")
    .lean();
  if (!order) throw new Error("No CONFIRMED order");

  const lineItem = {
    itemType: "PRODUCT" as const,
    productVariantId: variant._id.toString(),
    quantity: 1,
  };

  async function snap(label: string) {
    const inv = await WarehouseInventory.findOne({
      warehouseId: kho2!._id,
      variantId: variant!._id,
    })
      .select("quantity reservedQuantity availableQuantity")
      .lean();
    console.log(
      `${label}: q=${inv?.quantity} reserved=${inv?.reservedQuantity} available=${inv?.availableQuantity}`
    );
    return inv;
  }

  console.log(`Order: ${order.orderCode}, variant=${variant._id}`);
  const before = await snap("BEFORE all");

  // 1. Reserve
  await reserveStock(
    kho2._id.toString(),
    [lineItem],
    {
      actorEmployeeId: employee._id.toString(),
      referenceType: "ORDER" as never,
      referenceCode: order.orderCode,
      orderId: order._id,
      note: "Test reserve",
    }
  );
  const afterReserve = await snap("AFTER reserve");

  // 2. Ship
  await shipStock(
    kho2._id.toString(),
    [lineItem],
    {
      actorEmployeeId: employee._id.toString(),
      referenceType: "ORDER" as never,
      referenceCode: order.orderCode,
      orderId: order._id,
      note: "Test ship",
    }
  );
  const afterShip = await snap("AFTER ship  ");

  // 3. Return
  await returnStock(
    kho2._id.toString(),
    [lineItem],
    {
      actorEmployeeId: employee._id.toString(),
      referenceType: "ORDER" as never,
      referenceCode: order.orderCode,
      orderId: order._id,
      note: "Test return",
    }
  );
  const afterReturn = await snap("AFTER return");

  console.log("\n=== Verify ===");
  if (
    afterReturn &&
    before &&
    afterReserve &&
    afterShip
  ) {
    const ok =
      afterReturn.quantity === before.quantity + 1 &&
      afterReturn.quantity === afterShip.quantity + 1;
    console.log(
      `quantity restored to before + 1 (ship qty)?  ${
        afterReturn.quantity === before.quantity + 1 ? "✅" : "❌ (got " + afterReturn.quantity + ", expected " + (before.quantity + 1) + ")"
      }`
    );
    console.log(
      `available restored to before + 1?  ${
        afterReturn.availableQuantity === before.availableQuantity + 1 ? "✅" : "❌ (got " + afterReturn.availableQuantity + ", expected " + (before.availableQuantity + 1) + ")"
      }`
    );
  }

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});