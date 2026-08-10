/**
 * System Settings seed (Sprint Settings — Exchange Rate MNT→VND)
 *
 * Idempotently inserts/updates the single `exchange_rate` row used by the
 * Settings UI. Existing Order documents are intentionally untouched —
 * see `lib/system-settings.ts` for the snapshot guarantee.
 *
 * Business: Exchange rate = VND per 1 MNT (e.g., rate = 7 means 1 MNT = 7 VND).
 */

import Setting from "@/models/Setting";
import {
  DEFAULT_MNT_TO_VND_RATE,
  EXCHANGE_RATE_SETTING_KEY,
} from "@/lib/system-settings";

export async function seedSystemSettings() {
  await Setting.findOneAndUpdate(
    { key: EXCHANGE_RATE_SETTING_KEY },
    {
      $set: {
        key: EXCHANGE_RATE_SETTING_KEY,
        value: {
          rate: DEFAULT_MNT_TO_VND_RATE,
          fromCurrency: "MNT",
          toCurrency: "VND",
          updatedAt: new Date().toISOString(),
          updatedBy: null,
        },
        description:
          "Tỷ giá quy đổi 1 MNT → VND. Dùng để báo cáo doanh thu.",
        isPublic: false,
      },
    },
    { upsert: true, returnDocument: "after" },
  );

  console.log("[OK] System Settings (exchange rate MNT→VND)");
}