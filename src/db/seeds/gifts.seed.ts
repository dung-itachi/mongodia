/**
 * Gifts Seed (Sprint 8.x - Gift Management)
 *
 * Seed dữ liệu QUÀ TẶNG riêng biệt với Product.
 * Idempotent: chạy nhiều lần không tạo duplicate (dùng name làm unique key).
 */

import Gift from "@/models/Gift";

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

export async function seedGifts() {
  for (const gift of GIFTS) {
    // Case-insensitive match để tránh duplicate "Dầu gội" vs "dầu gội"
    const existed = await Gift.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(gift.name)}$`, "i") },
    });

    if (existed) {
      // Update stock nếu cần, giữ nguyên isActive
      existed.stockQuantity = gift.stockQuantity;
      existed.isActive = true;
      await existed.save();
    } else {
      await Gift.create({
        name: gift.name,
        stockQuantity: gift.stockQuantity,
        isActive: true,
      });
    }
  }

  console.log("[OK] Gifts");
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
