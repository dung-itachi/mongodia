/**
 * System Settings helpers (Sprint Settings — Exchange Rate MNT→VND,
 * Shipping Fee)
 *
 * Centralized accessor for system-wide config rows stored in the
 * `Setting` collection. Today we store the active exchange rate
 * (1 MNT → VND) and the global shipping fee used for revenue reporting.
 *
 * Business Requirement:
 * - Order prices are stored in MNT (₮) — this is the system currency.
 * - Exchange rate converts MNT → VND for reporting purposes only.
 * - The shipping fee setting provides a single system-wide value used as
 *   a baseline (so future revenue aggregation can roll `combo product
 *   total + shipping fee` into order revenue).
 *
 * IMPORTANT: Reading the current shipping fee here does NOT mutate
 * existing Order snapshots — that is the responsibility of Order
 * creation code, which calls `getCurrentShippingFee()` exactly once
 * per order and persists the returned value onto the Order document.
 */

import Setting from "@/models/Setting";

/** Storage key used by both API and seed scripts. */
export const EXCHANGE_RATE_SETTING_KEY = "exchange_rate";

/**
 * Shape persisted in `Setting.value` for the `exchange_rate` key.
 * `rate` = VND per 1 MNT (e.g., rate = 7 means 1 MNT = 7 VND).
 */
export interface ExchangeRateSettingValue {
  rate: number;
  fromCurrency: "MNT";
  toCurrency: "VND";
  /** ISO string */
  updatedAt?: string;
  /** employeeId string */
  updatedBy?: string | null;
}

/** Default exchange rate: 1 MNT = 7 VND */
export const DEFAULT_MNT_TO_VND_RATE = 7;

/** @deprecated Use DEFAULT_MNT_TO_VND_RATE */
export const DEFAULT_EXCHANGE_RATE = DEFAULT_MNT_TO_VND_RATE;

export function isExchangeRateSettingValue(
  value: unknown,
): value is ExchangeRateSettingValue {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.rate === "number" && Number.isFinite(v.rate) && v.rate > 0;
}

/**
 * Get the current exchange rate (1 MNT → VND).
 *
 * Falls back to `DEFAULT_MNT_TO_VND_RATE` if no setting row exists yet
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
    rate: DEFAULT_MNT_TO_VND_RATE,
    fromCurrency: "MNT",
    toCurrency: "VND",
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
    fromCurrency: "MNT",
    toCurrency: "VND",
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? null,
  };

  await Setting.findOneAndUpdate(
    { key: EXCHANGE_RATE_SETTING_KEY },
    {
      $set: {
        key: EXCHANGE_RATE_SETTING_KEY,
        value,
        description: "Tỷ giá quy đổi 1 MNT → VND. Dùng để báo cáo doanh thu.",
        isPublic: false,
      },
    },
    { upsert: true, new: true },
  );

  return value;
}

// ============================================================================
// Shipping Fee (Sprint Settings — Phí ship)
// ============================================================================

/** Storage key used by both API and seed scripts. */
export const SHIPPING_FEE_SETTING_KEY = "shipping_fee";

/**
 * Shape persisted in `Setting.value` for the `shipping_fee` key.
 * `fee` is stored in the system currency (MNT). `currency` is captured
 * for forward-compatibility if we ever decide to charge in VND/USD too.
 */
export interface ShippingFeeSettingValue {
  /** Phí ship cộng vào tổng giá trị sản phẩm (combo) để ra doanh số đơn hàng. */
  fee: number;
  currency: "MNT" | "VND" | "USD";
  /** ISO string */
  updatedAt?: string;
  /** employeeId string */
  updatedBy?: string | null;
}

/** Default shipping fee when no setting row exists yet. */
export const DEFAULT_SHIPPING_FEE = 0;

export function isShippingFeeSettingValue(
  value: unknown,
): value is ShippingFeeSettingValue {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.fee === "number" && Number.isFinite(v.fee) && v.fee >= 0
  );
}

/**
 * Get the current shipping fee (system currency, MNT by default).
 *
 * Falls back to `DEFAULT_SHIPPING_FEE` (0) if no setting row exists yet
 * so callers don't crash on a brand-new install.
 */
export async function getCurrentShippingFee(): Promise<ShippingFeeSettingValue> {
  const row = await Setting.findOne({
    key: SHIPPING_FEE_SETTING_KEY,
  }).lean();

  if (row && isShippingFeeSettingValue(row.value)) {
    return row.value;
  }

  return {
    fee: DEFAULT_SHIPPING_FEE,
    currency: "MNT",
    updatedAt: new Date().toISOString(),
    updatedBy: null,
  };
}

/**
 * Persist a new shipping fee. This only writes the Setting row —
 * existing Orders are intentionally NOT touched.
 */
export async function setShippingFee(input: {
  fee: number;
  currency?: "MNT" | "VND" | "USD";
  updatedBy?: string | null;
}): Promise<ShippingFeeSettingValue> {
  if (!Number.isFinite(input.fee) || input.fee < 0) {
    throw new Error("Phí ship phải là số không âm");
  }

  const value: ShippingFeeSettingValue = {
    fee: input.fee,
    currency: input.currency ?? "MNT",
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? null,
  };

  await Setting.findOneAndUpdate(
    { key: SHIPPING_FEE_SETTING_KEY },
    {
      $set: {
        key: SHIPPING_FEE_SETTING_KEY,
        value,
        description:
          "Phí ship cố định cộng vào tổng giá trị combo để tính doanh số đơn hàng.",
        isPublic: false,
      },
    },
    { upsert: true, new: true },
  );

  return value;
}