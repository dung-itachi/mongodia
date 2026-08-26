/**
 * Migration: Dọn `Warehouse.areaId` cho tất cả warehouse.
 *
 * Lý do: Warehouse trước đây bị gắn `areaId` (do seed cũ dùng `Area.findOne()`
 * đầu tiên trong bảng) — điều này sai về mặt ngữ nghĩa vì Area chỉ dành cho
 * nhân viên. Hai kho KHO1 / KHO2 được định danh bằng `code` (hard-coded),
 * không qua Area.
 *
 * Migration này `$unset` field `areaId` cho mọi Warehouse (idempotent).
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/scripts/migrate-warehouse-areas.ts
 *   npx tsx --env-file=.env.local src/scripts/migrate-warehouse-areas.ts --apply
 */
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Warehouse from "../models/Warehouse";

async function main() {
  const dryRun = !process.argv.includes("--apply");
  console.log(
    `🔄 Drop warehouse.areaId (warehouses are NOT scoped by Area)  (${
      dryRun ? "DRY RUN" : "APPLY"
    })\n`
  );

  await connectDB();

  // Tìm warehouses còn areaId để báo cáo.
  const withArea = await Warehouse.find({ areaId: { $exists: true, $ne: null } })
    .select("_id code name areaId")
    .lean();

  if (withArea.length === 0) {
    console.log("  ✓ Không có warehouse nào còn areaId — sạch sẵn rồi.");
    await mongoose.disconnect();
    return;
  }

  for (const wh of withArea) {
    if (dryRun) {
      console.log(
        `  ${wh.code} (${wh.name}): areaId=${wh.areaId ?? "?"}  →  sẽ $unset`
      );
    } else {
      await Warehouse.updateOne(
        { _id: wh._id },
        { $unset: { areaId: "" } }
      );
      console.log(`  ✅ ${wh.code}: $unset areaId`);
    }
  }

  if (dryRun) {
    console.log("\nRun with --apply flag to write changes.");
  } else {
    console.log("\n[DONE] Migration applied.");
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});