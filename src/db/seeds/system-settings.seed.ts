/**
 * System Settings seed (Sprint Settings — Exchange Rate)
 *
 * Idempotently inserts/updates the single `exchange_rate` row used by the
 * Settings UI. Existing Order documents are intentionally untouched —
 * see `lib/system-settings.ts` for the snapshot guarantee.
 */

import Setting from "@/models/Setting";
import {
  DEFAULT_EXCHANGE_RATE,
  EXCHANGE_RATE_SETTING_KEY,
} from "@/lib/system-settings";

export async function seedSystemSettings() {
  await Setting.findOneAndUpdate(
    { key: EXCHANGE_RATE_SETTING_KEY },
    {
      $set: {
        key: EXCHANGE_RATE_SETTING_KEY,
        value: {
          rate: DEFAULT_EXCHANGE_RATE,
          currency: "MNT",
          updatedAt: new Date().toISOString(),
          updatedBy: null,
        },
        description:
          "Tỷ giá quy đổi 1 USD → MNT (Tugrik). Snapshot vào Order tại thời điểm tạo.",
        isPublic: false,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  console.log("[OK] System Settings (exchange rate)");
}