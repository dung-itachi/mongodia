/**
 * Backfill Order.orderItems[] cho orders seed thiếu mảng này.
 *
 * Lý do:
 *   - Seed orders.insert chỉ set top-level `productId`, `productVariantId`,
 *     `comboId`, `quantity` — KHÔNG tạo `orderItems[]` (cấu trúc mới với
 *     `details[]` cho variant/gift).
 *   - Stock engine + orderShipment.service dùng `orderItems[]` để derive
 *     shipment demands. Không có `orderItems[]` → demands = [] → ship fail.
 *
 * Logic:
 *   - Với mỗi order active trên KHO2 có `orderItems.length === 0` (hoặc null):
 *     + Nếu có `comboId`: tạo 1 orderItem kiểu COMBO với packageQuantity +
 *       giftQuantity (lấy từ Combo.productVariants[] & comboGifts[]).
 *     + Nếu chỉ có `productVariantId`: tạo 1 orderItem kiểu PRODUCT với
 *       quantity = order.quantity, variant = productVariantId, gift = none.
 *     + Nếu chỉ có `productId` (không variant): tạo 1 orderItem kiểu PRODUCT
 *       không variant.
 *
 *   - KHÔNG đụng vào orders đã có `orderItems.length > 0` (đã đúng).
 *
 * DESTRUCTIVE (ghi vào Order). Có dry-run.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/backfill-order-items.ts
 *   npx tsx --env-file=.env.local src/scripts/backfill-order-items.ts --apply
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";
import Order from "@/models/Order";
import ProductVariant from "@/models/ProductVariant";
import Combo from "@/models/Combo";
import Gift from "@/models/Gift";

interface BuiltOrderItem {
  productId?: mongoose.Types.ObjectId;
  productVariantId?: mongoose.Types.ObjectId;
  comboId?: mongoose.Types.ObjectId;
  productName?: string;
  comboName?: string;
  productVariantSku?: string;
  quantity: number;
  packageQuantity: number;
  giftQuantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  /**
   * Schema thực tế của Order.orderItems[].details[]:
   *   { variantId?: ObjectId, attributes?: [...], quantity: number }
   * (variantId = null nếu product không variant)
   */
  details: Array<{
    variantId?: mongoose.Types.ObjectId | null;
    attributes?: Array<{
      optionId: mongoose.Types.ObjectId;
      valueId: mongoose.Types.ObjectId;
    }>;
    quantity: number;
  }>;
  /**
   * Schema thực tế của Order.orderItems[].giftSelections[]:
   *   { giftProductId: ObjectId, giftProductName: string, quantity: number }
   */
  giftSelections: Array<{
    giftProductId: mongoose.Types.ObjectId;
    giftProductName: string;
    quantity: number;
  }>;
  giftMode: "RANDOM" | "CUSTOMER_SELECTED" | "NONE";
}

async function buildOrderItemFromTopLevel(order: {
  productId?: mongoose.Types.ObjectId;
  productVariantId?: mongoose.Types.ObjectId;
  comboId?: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  currency?: string;
}): Promise<BuiltOrderItem | null> {
  const quantity = order.quantity ?? 1;
  const unitPrice = order.unitPrice ?? 0;
  const totalAmount = order.totalAmount ?? unitPrice * quantity;
  const currency = order.currency ?? "VND";

  if (order.comboId) {
    const combo = await Combo.findById(order.comboId).lean();
    if (!combo) return null;
    const packageQuantity = combo.packageQuantity ?? 1;

    let chosenVariant: { _id: mongoose.Types.ObjectId } | null = null;
    if (combo.productId) {
      chosenVariant = await ProductVariant.findOne({
        productId: combo.productId,
      })
        .select("_id")
        .lean();
    }

    const details: BuiltOrderItem["details"] = [];
    if (chosenVariant) {
      details.push({
        variantId: chosenVariant._id,
        quantity: quantity * packageQuantity,
      });
    }

    let giftQuantity = 0;
    const giftQtyTotal = combo.giftQuantity ?? 0;
    const giftSelections: BuiltOrderItem["giftSelections"] = [];
    if (giftQtyTotal > 0) {
      const firstGift = await Gift.findOne({ isActive: true })
        .select("_id name")
        .lean();
      if (firstGift) {
        giftSelections.push({
          giftProductId: firstGift._id,
          giftProductName: firstGift.name,
          quantity: quantity * giftQtyTotal,
        });
        giftQuantity = giftQtyTotal;
      }
    }

    return {
      // QUAN TRỌNG: orderItemsToDemands skip item nếu thiếu productId.
      // Set productId từ combo.productId.
      productId: combo.productId,
      comboId: order.comboId,
      comboName: combo.name,
      quantity,
      packageQuantity,
      giftQuantity,
      unitPrice,
      totalAmount,
      currency,
      details,
      giftSelections,
      giftMode: "RANDOM",
    };
  }

  if (order.productVariantId) {
    const variant = await ProductVariant.findById(order.productVariantId).lean();
    if (!variant) return null;
    return {
      productId: order.productId,
      productVariantId: order.productVariantId,
      productVariantSku: variant.sku,
      quantity,
      packageQuantity: 1,
      giftQuantity: 0,
      unitPrice,
      totalAmount,
      currency,
      details: [
        {
          variantId: order.productVariantId,
          quantity,
        },
      ],
      giftSelections: [],
      giftMode: "RANDOM",
    };
  }

  if (order.productId) {
    return {
      productId: order.productId,
      quantity,
      packageQuantity: 1,
      giftQuantity: 0,
      unitPrice,
      totalAmount,
      currency,
      details: [
        {
          variantId: null, // product không variant
          quantity,
        },
      ],
      giftSelections: [],
      giftMode: "RANDOM",
    };
  }

  return null;
}

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(
    `🔧 Backfill Order.orderItems[] cho orders thiếu  (${
      dryRun ? "DRY RUN" : "APPLY"
    })\n`
  );

  await connectDB();

  const kho2 = await Warehouse.findOne({ code: "KHO2", isActive: true })
    .select("_id")
    .lean();
  if (!kho2) {
    console.error("❌ KHO2 not found");
    process.exit(1);
  }

  const candidates = await Order.find({
    isActive: true,
    warehouseId: kho2._id,
    $or: [
      { orderItems: { $exists: false } },
      { orderItems: null },
      { orderItems: { $size: 0 } },
    ],
  })
    .select("_id orderCode status productId productVariantId comboId quantity unitPrice totalAmount currency orderType")
    .lean();

  console.log(`Candidates: ${candidates.length}\n`);

  let built = 0;
  let failed = 0;
  for (const o of candidates) {
    const item = await buildOrderItemFromTopLevel({
      productId: o.productId,
      productVariantId: o.productVariantId,
      comboId: o.comboId,
      quantity: o.quantity ?? 1,
      unitPrice: o.unitPrice ?? 0,
      totalAmount: o.totalAmount ?? 0,
      currency: o.currency ?? "VND",
    });
    if (!item) {
      console.log(`  ❌ ${o.orderCode}: không build được (thiếu product/variant/combo)`);
      failed++;
      continue;
    }
    console.log(
      `  ✓ ${o.orderCode.padEnd(14)} status=${o.status.padEnd(12)} orderType=${o.orderType} → details=${item.details.length}`
    );
    built++;

    if (!dryRun) {
      await Order.updateOne({ _id: o._id }, { $set: { orderItems: [item] } });
    }
  }

  console.log(
    `\n${dryRun ? "[DRY] " : ""}Kết quả: built=${built}, failed=${failed}`
  );

  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});