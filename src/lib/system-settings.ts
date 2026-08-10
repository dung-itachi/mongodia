/**
 * System Settings helpers (Sprint Settings — Exchange Rate)
 *
 * Centralized accessor for system-wide config rows stored in the
 * `Setting` collection. Today we only store the active exchange rate
 * (1 USD → MNT) but the API is generic enough to host future keys
 * like `DEFAULT_AREA_CODE`, `DEFAULT_TEAM_CODE`, etc.
 *
 * IMPORTANT: Reading the current exchange rate here does NOT mutate
 * existing Order snapshots — that is the responsibility of Order
 * creation code, which calls `getCurrentExchangeRate()` exactly once
 * per order and persists the returned value onto the Order document.
 */

import Setting from "@/models/Setting";

/** Storage key used by both API and seed scripts. */
export const EXCHANGE_RATE_SETTING_KEY = "exchange_rate";

/**
 * Shape persisted in `Setting.value` for the `exchange_rate` key.
 * `rate` is MNT per 1 USD.
 */
export interface ExchangeRateSettingValue {
  rate: number;
  currency: "MNT";
  /** ISO string */
  updatedAt?: string;
  /** employeeId string */
  updatedBy?: string | null;
}

export const DEFAULT_EXCHANGE_RATE = 3500;

export function isExchangeRateSettingValue(
  value: unknown,
): value is ExchangeRateSettingValue {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.rate === "number" && Number.isFinite(v.rate) && v.rate > 0;
}

/**
 * Get the current exchange rate (1 USD → MNT).
 *
 * Falls back to `DEFAULT_EXCHANGE_RATE` if no setting row exists yet
 * so callers don't crash on a brand-new install.
 */
export async function getCurrentExchangeRate(): Promise<ExchangeRateSettingValue> {
  const row = await Setting.findOne({
    key: EXCHANGE_RATE_SETTING_KEY,
  }).lean();

  if (row && isExchangeRateSettingValue(row.value)) {
    return row.value;
  }

  return {
    rate: DEFAULT_EXCHANGE_RATE,
    currency: "MNT",
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  };
}

/**
 * Persist a new exchange rate. This only writes the Setting row —
 * existing Orders are intentionally NOT touched (see Sprint Settings
 * requirement #3 / #10 in the spec).
 */
export async function setExchangeRate(input: {
  rate: number;
  updatedBy?: string | null;
}): Promise<ExchangeRateSettingValue> {
  if (!Number.isFinite(input.rate) || input.rate <= 0) {
    throw new Error("Tỷ giá phải là số dương");
  }

  const value: ExchangeRateSettingValue = {
    rate: input.rate,
    currency: "MNT",
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? null,
  };

  await Setting.findOneAndUpdate(
    { key: EXCHANGE_RATE_SETTING_KEY },
    {
      $set: {
        key: EXCHANGE_RATE_SETTING_KEY,
        value,
        description: "Tỷ giá quy đổi 1 USD → MNT (Tugrik). Snapshot vào Order tại thời điểm tạo.",
        isPublic: false,
      },
    },
    { upsert: true, new: true },
  );

  return value;
}