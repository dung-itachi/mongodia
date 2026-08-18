/**
 * Simple i18n for Mongolia CRM
 *
 * Translation keys are the Vietnamese labels (default language).
 * Add new keys here and use t() throughout the app.
 */

import { Language } from "@/store/language.store";

type TranslationSet = Record<string, string>;

const translations: Record<Language, TranslationSet> = {
  vi: {},

  en: {
    // Brand
    "Quản lý đơn hàng": "Order Management",

    // Navigation items
    "Tổng quan": "Dashboard",
    "Thông báo": "Notifications",
    "Tổng quan MKT": "MKT Dashboard",
    "Nhập số": "Input Leads",
    "QL đơn hàng": "Order Tracking",
    "Facebook Pages": "Facebook Pages",
    "Campaigns": "Campaigns",
    "Số cần gọi": "Leads",
    "Khách hàng": "Customers",
    "Chốt đơn": "Closed Deals",
    "Đang giao": "Shipping",
    "Giao TC": "Delivered",
    "Hoàn hàng": "Returns",
    "Đối soát": "Reconcile",
    "Tất cả đơn hàng": "All Orders",
    "QL sản phẩm": "Products",
    "Danh mục": "Categories",
    "Biến thể": "Variants",
    "Combo": "Combos",
    "Quà tặng": "Gifts",
    "QL tài khoản": "Accounts",
    "QL Teams": "Teams",
    "QL Leaders": "Leaders",
    "Sơ đồ tổ chức": "Org Chart",
    "Tài khoản của tôi": "My Account",
    "Vai trò & Phân quyền": "Roles & Permissions",
    "Quản lý kho": "Warehouse",
    "Tồn kho": "Inventory",
    "Chuyển kho": "Transfers",
    "Nhập kho": "Import",
    "Lịch sử kho": "History",
    "Xuất kho": "Export",
    "Điều chỉnh tồn kho": "Adjustments",
    "Tỷ giá tiền tệ": "Exchange Rate",
    "Phí ship": "Shipping Fee",
    "Quản lý thông báo": "Notifications",
    "Ngôn ngữ": "Language",
    "Marketing": "Marketing",
    "Sản phẩm": "Products",
    "Đơn hàng": "Orders",
    "Tài khoản": "Accounts",

    // Group labels
    "Cài đặt hệ thống": "System Settings",

    // Role labels
    "Admin": "Admin",
    "MKT": "MKT",
    "Sale": "Sale",
    "Kho": "Warehouse",

    // Common
    "Đăng xuất": "Logout",
    "Expand": "Expand",
    "Collapse": "Collapse",
  },

  mn: {
    // Brand
    "Quản lý đơn hàng": "Захиалгын удирдлага",

    // Navigation items
    "Tổng quan": "Хяналтын самбар",
    "Thông báo": "Мэдэгдэл",
    "Tổng quan MKT": "MKT самбар",
    "Nhập số": "Дугаар оруулах",
    "QL đơn hàng": "Захиалга хянах",
    "Facebook Pages": "Facebook хуудас",
    "Campaigns": "Кампанит ажил",
    "Số cần gọi": "Залгах дугаар",
    "Khách hàng": "Харилцагчид",
    "Chốt đơn": "Баталсан",
    "Đang giao": "Хүргэж буй",
    "Giao TC": "Хүргэсэн",
    "Hoàn hàng": "Буцаасан",
    "Đối soát": "Тооцоо",
    "Tất cả đơn hàng": "Бүх захиалга",
    "QL sản phẩm": "Бүтээгдэхүүн",
    "Danh mục": "Ангилал",
    "Biến thể": "Хувилбарууд",
    "Combo": "Комбо",
    "Quà tặng": "Бэлэг",
    "QL tài khoản": "Хэрэглэгч",
    "QL Teams": "Багууд",
    "QL Leaders": "Удирдагчид",
    "Sơ đồ tổ chức": "Байгууллагын схем",
    "Tài khoản của tôi": "Миний данс",
    "Vai trò & Phân quyền": "Үүрэг & Зөвшөөрөл",
    "Quản lý kho": "Агуулах",
    "Tồn kho": "Үлдэгдэл",
    "Chuyển kho": "Шилжүүлэг",
    "Nhập kho": "Оруулах",
    "Lịch sử kho": "Түүх",
    "Xuất kho": "Гаргах",
    "Điều chỉnh tồn kho": "Тохиргоо",
    "Tỷ giá tiền tệ": "Валютын ханш",
    "Phí ship": "Хүргэлтийн төлбөр",
    "Quản lý thông báo": "Мэдэгдэл",
    "Ngôn ngữ": "Хэл",
    "MKT": "МКТ",
    "Marketing": "Маркетинг",
    "Sản phẩm": "Бүтээгдэхүүн",
    "Đơn hàng": "Захиалга",
    "Tài khoản": "Хэрэглэгч",

    // Group labels
    "Cài đặt hệ thống": "Системийн тохиргоо",

    // Common
    "Đăng xuất": "Гарах",
    "Expand": "Дэлгэх",
    "Collapse": "Хураах",
  },
};

/**
 * Get translation for a key in the current language.
 * Falls back to Vietnamese if key not found.
 */
export function t(key: string, lang: Language): string {
  return translations[lang]?.[key] ?? translations.vi[key] ?? key;
}

/**
 * Get all translations for a language (useful for bulk operations).
 */
export function getTranslations(lang: Language): TranslationSet {
  return translations[lang];
}
