/**
 * ==================================================
 * IMPORT HEADER MAPPING
 * ==================================================
 *
 * Centralized header alias mapping for bulk import features.
 * Each entry: alias (header text in pasted/imported data) → canonical field key.
 *
 * Normalization rules (applied by the parser):
 *   - lowercase
 *   - trim whitespace
 *   - collapse multiple spaces
 *
 * Extend this file when adding new import domains:
 *   - LEAD_IMPORT_HEADER_MAP (current)
 *   - CUSTOMER_IMPORT_HEADER_MAP (future)
 *   - PRODUCT_IMPORT_HEADER_MAP (future)
 *   - WAREHOUSE_IMPORT_HEADER_MAP (future)
 * ==================================================
 */

/**
 * Canonical lead field keys.
 * Keep this type in sync with ParsedLead in the parser.
 */
export type LeadImportField =
  | "customerName"
  | "phone"
  | "combo"
  | "price"
  | "sourceType"
  | "date";

/**
 * Fields required for a successful lead import.
 * If any of these are missing from the header row, the parser
 * must abort and surface a validation error.
 */
export const LEAD_IMPORT_REQUIRED_FIELDS: LeadImportField[] = [
  "customerName",
  "phone",
];

/**
 * Header alias → canonical field map for Lead Import.
 *
 * Examples of recognized headers (case- and whitespace-insensitive):
 *   - customerName: "Tên", "Ten", "Tên KH", "Tên Khách Hàng",
 *                    "Khách Hàng", "KH", "Name", "Customer Name",
 *                    "Full Name", "Họ Tên"
 *   - phone:        "SĐT", "SDT", "Số Điện Thoại", "Điện Thoại",
 *                    "Phone", "Tel", "Mobile"
 *   - combo:        "Combo", "Gói", "Gói Combo", "Package",
 *                    "Dịch Vụ", "Service"
 *   - price:        "Giá", "Gia", "Giá Combo", "Price", "Số Tiền",
 *                    "Amount", "Thành Tiền"
 *   - sourceType:   "Loại", "Loại Nguồn", "Type", "Source",
 *                    "Nguồn", "Channel"
 *   - date:         "Ngày", "Ngày Tạo", "Ngày Đăng Ký", "Date",
 *                    "Created"
 */
export const LEAD_IMPORT_HEADER_MAP: Record<string, LeadImportField> = {
  // customerName
  "tên": "customerName",
  "ten": "customerName",
  "tên kh": "customerName",
  "ten kh": "customerName",
  "tên khách hàng": "customerName",
  "ten khach hang": "customerName",
  "khách hàng": "customerName",
  "khach hang": "customerName",
  "kh": "customerName",
  "name": "customerName",
  "customer name": "customerName",
  "customer": "customerName",
  "fullname": "customerName",
  "full name": "customerName",
  "họ tên": "customerName",
  "ho ten": "customerName",

  // phone
  "sđt": "phone",
  "sdt": "phone",
  "số điện thoại": "phone",
  "so dien thoai": "phone",
  "điện thoại": "phone",
  "dien thoai": "phone",
  "đt": "phone",
  "dt": "phone",
  "phone": "phone",
  "tel": "phone",
  "mobile": "phone",
  "số dt": "phone",
  "so dt": "phone",

  // combo
  "combo": "combo",
  "gói": "combo",
  "goi": "combo",
  "gói combo": "combo",
  "goi combo": "combo",
  "package": "combo",
  "dịch vụ": "combo",
  "dich vu": "combo",
  "service": "combo",

  // price
  "giá": "price",
  "gia": "price",
  "giá combo": "price",
  "gia combo": "price",
  "price": "price",
  "số tiền": "price",
  "so tien": "price",
  "amount": "price",
  "total": "price",
  "thành tiền": "price",
  "thanh tien": "price",

  // sourceType
  "loại": "sourceType",
  "loai": "sourceType",
  "loại nguồn": "sourceType",
  "loai nguon": "sourceType",
  "type": "sourceType",
  "source": "sourceType",
  "nguồn": "sourceType",
  "nguon": "sourceType",
  "sourcetype": "sourceType",
  "source type": "sourceType",
  "channel": "sourceType",

  // date
  "ngày": "date",
  "ngay": "date",
  "ngày tạo": "date",
  "ngay tao": "date",
  "ngày đăng ký": "date",
  "ngay dang ky": "date",
  "date": "date",
  "created": "date",
  "created at": "date",
  "created_date": "date",
};

// ==================================================
// FUTURE EXTENSIONS (placeholder - not implemented yet)
// ==================================================
//
// export const CUSTOMER_IMPORT_HEADER_MAP: Record<string, ...> = { ... };
// export const PRODUCT_IMPORT_HEADER_MAP: Record<string, ...> = { ... };
// export const WAREHOUSE_IMPORT_HEADER_MAP: Record<string, ...> = { ... };