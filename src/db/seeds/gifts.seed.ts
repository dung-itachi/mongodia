/**
 * Gifts Seed (Sprint 8.x - Gift Management + Parallel C Foundation)
 *
 * Seed dữ liệu QUÀ TẶNG riêng biệt với Product.
 * Idempotent: chạy nhiều lần không tạo duplicate (dùng name làm unique key).
 *
 * Foundation note: mọi tồn kho đều được back-fill một history `INITIAL`
 * để đảm bảo ràng buộc "không thay đổi tồn mà không có history".
 */

import mongoose from "mongoose";

import Gift from "@/models/Gift";
import GiftInventoryHistory, {
  GiftInventoryHistoryType,
} from "@/models/GiftInventoryHistory";

const GIFTS = [
  { name: "Dầu gội", stockQuantity: 100 },
  { name: "Khăn mặt", stockQuantity: 80 },
  { name: "Lược", stockQuantity: 120 },
  { name: "Túi mỹ phẩm", stockQuantity: 50 },
  { name: "Son mini", stockQuantity: 60 },
  { name: "Kem dưỡng mini", stockQuantity: 70 },
  { name: "Mặt nạ giấy", stockQuantity: 150 },
  { name: "Băng đô", stockQuantity: 90 },
];

const SYSTEM_CREATED_BY = new mongoose.Types.ObjectId();

export async function seedGifts() {
  for (const gift of GIFTS) {
    const existed = await Gift.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(gift.name)}$`, "i") },
    });

    if (existed) {
      // Không sửa tồn cũ để tránh ghi đè lịch sử. Chỉ đảm bảo còn active.
      existed.isActive = true;
      await existed.save();
      await ensureInitialHistory(existed._id, existed.stockQuantity);
      continue;
    }

    const created = await Gift.create({
      name: gift.name,
      stockQuantity: gift.stockQuantity,
      isActive: true,
    });
    await ensureInitialHistory(created._id, created.stockQuantity);
  }

  console.log("[OK] Gifts");
}

async function ensureInitialHistory(
  giftId: mongoose.Types.ObjectId,
  stockQuantity: number
) {
  const hasHistory = await GiftInventoryHistory.exists({
    giftId,
    type: GiftInventoryHistoryType.INITIAL,
  });
  if (hasHistory) return;

  await GiftInventoryHistory.create({
    giftId,
    type: GiftInventoryHistoryType.INITIAL,
    quantityBefore: 0,
    quantityChange: stockQuantity,
    quantityAfter: stockQuantity,
    createdBy: SYSTEM_CREATED_BY,
    note: "Backfill từ seed ban đầu",
  });
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}