/**
 * ==================================================
 * COLUMN LAYOUTS — Sprint 8.x Nâng cấp dán số
 * ==================================================
 *
 * Định nghĩa các field có thể xuất hiện trong 1 dòng dán TAB-separated,
 * kèm default layout cho từng input mode.
 *
 * Mỗi MKT có thể tự cấu hình thứ tự cột qua Modal "Cấu hình cột" —
 * mapping được lưu vào localStorage theo user_id.
 *
 * Field keys (phải trùng với tên key dùng trong parser):
 *   - name: Tên khách hàng
 *   - phone: Số điện thoại (bắt buộc)
 *   - address: Địa chỉ
 *   - combo: Tên/giá combo (auto-detect)
 *   - product: Tên sản phẩm (auto-detect)
 *   - date: Ngày (Landing mode)
 *   - facebookPage: Facebook Page (override per-row)
 */

export type ColumnFieldKey =
  | "name"
  | "phone"
  | "address"
  | "combo"
  | "product"
  | "date"
  | "facebookPage";

export interface ColumnFieldSpec {
  key: ColumnFieldKey;
  label: string;
  /** Bắt buộc — không thể bỏ khỏi layout. */
  required: boolean;
  /** Có thể xuất hiện nhiều lần không (combo có thể vừa là tên vừa là giá). */
  multi?: boolean;
}

export const COLUMN_FIELDS: ColumnFieldSpec[] = [
  { key: "name", label: "Tên", required: false },
  { key: "phone", label: "SĐT", required: true },
  { key: "address", label: "Địa chỉ", required: false },
  { key: "combo", label: "Combo", required: false },
  { key: "product", label: "Sản phẩm", required: false },
  { key: "date", label: "Ngày", required: false },
  { key: "facebookPage", label: "FB Page", required: false },
];

/** Layout mặc định cho Comment mode (không có Ngày, không có FB Page riêng). */
export const DEFAULT_COMMENT_LAYOUT: ColumnFieldKey[] = [
  "name",
  "phone",
  "address",
  "combo",
  "product",
];

/** Layout mặc định cho Landing mode (có Ngày). */
export const DEFAULT_LANDING_LAYOUT: ColumnFieldKey[] = [
  "date",
  "name",
  "phone",
  "address",
  "combo",
  "product",
];

/**
 * Lấy layout mặc định theo input mode.
 */
export function getDefaultLayout(mode: "comment" | "ladi"): ColumnFieldKey[] {
  return mode === "comment" ? [...DEFAULT_COMMENT_LAYOUT] : [...DEFAULT_LANDING_LAYOUT];
}

/**
 * Normalize layout từ localStorage: loại bỏ duplicate, đảm bảo phone có mặt,
 * đảm bảo thứ tự hợp lệ. Nếu layout rỗng/sai thì trả default.
 */
export function normalizeLayout(
  raw: unknown,
  mode: "comment" | "ladi"
): ColumnFieldKey[] {
  const fallback = getDefaultLayout(mode);
  if (!Array.isArray(raw)) return fallback;

  const validKeys = new Set(COLUMN_FIELDS.map((f) => f.key));
  const seen = new Set<ColumnFieldKey>();
  const out: ColumnFieldKey[] = [];

  for (const item of raw) {
    if (typeof item !== "string") continue;
    const key = item as ColumnFieldKey;
    if (!validKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  // Đảm bảo phone luôn có mặt
  if (!seen.has("phone")) {
    out.push("phone");
  }

  return out.length > 0 ? out : fallback;
}