/**
 * Pure-type mirror of the runtime shapes declared in
 * `@/lib/system-settings`. The runtime module imports the Mongoose
 * `Setting` model, which transitively pulls in `mongoose` and the
 * Node-only `async_hooks` module — bundling that for the browser
 * would explode. Client code MUST import the types from this file
 * instead, using `import type` so TypeScript erases the import at
 * build time and the runtime module is never even resolved.
 *
 * If a server-only shape needs to change, update both files (or have
 * the runtime file re-export from here) to keep them in sync.
 */

export const EXCHANGE_RATE_SETTING_KEY = "exchange_rate";

export interface ExchangeRateSettingValue {
  rate: number;
  fromCurrency: "MNT";
  toCurrency: "VND";
  /** ISO string */
  updatedAt?: string;
  /** employeeId string */
  updatedBy?: string | null;
}

export const DEFAULT_MNT_TO_VND_RATE = 7;

export const SHIPPING_FEE_SETTING_KEY = "shipping_fee";

export interface ShippingFeeSettingValue {
  fee: number;
  currency: "MNT" | "VND" | "USD";
  updatedAt?: string;
  updatedBy?: string | null;
}

export const DEFAULT_SHIPPING_FEE = 0;

export const LEAD_ASSIGNMENT_MODE_SETTING_KEY = "lead_assignment_mode";

export type LeadAssignmentMode = "AUTO" | "MANUAL";

export interface LeadAssignmentModeSettingValue {
  mode: LeadAssignmentMode;
  updatedAt?: string;
  updatedBy?: string | null;
}

export const DEFAULT_LEAD_ASSIGNMENT_MODE: LeadAssignmentMode = "MANUAL";