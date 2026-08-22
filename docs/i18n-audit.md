# i18n Audit Report

> Auto-generated bởi Prompt A — `verify-i18n-audit.js`.
> Ngày tạo: 2026-08-22.

## 1. Tổng quan

| Chỉ số | Giá trị |
|---|---|
| Tổng file .ts/.tsx có dùng i18n | **23** |
| Tổng label VN hardcode (ước lượng) | **8827** |
| Label đã được wrap (t() / getTranslated() / <Trans>) | **166** |
| Label chưa wrap | **8827** |
| **Coverage** | **1.8%** |
| Số key trong vi | **465** |
| Số key trong en | **465** |
| Số key trong mn | **463** |
| Key có trong vi nhưng thiếu trong en | **0** |
| Key có trong vi nhưng thiếu trong mn | **2** |
| Dead keys (có trong dict nhưng không tham chiếu) | **0** |

## 2. Phân loại file dùng i18n

| File | t() | getTranslated() | getTranslatedLabel() | <Trans> | Tổng |
|---|---:|---:|---:|---:|---:|
| `src/components/sale/leads/SaleLeadTable.tsx` | 0 | 40 | 0 | 0 | 40 |
| `src/components/product/product/ProductForm.tsx` | 0 | 28 | 0 | 0 | 28 |
| `src/app/(protected)/leads/page.tsx` | 0 | 14 | 0 | 0 | 14 |
| `src/components/sale/leads/ReassignLeadModal.tsx` | 0 | 14 | 0 | 0 | 14 |
| `src/components/sale/leads/SaleOrderModal.tsx` | 0 | 10 | 0 | 0 | 10 |
| `src/components/marketing/input/CheckCustomerForm.tsx` | 0 | 9 | 0 | 0 | 9 |
| `src/components/product/product/ProductManagementTable.tsx` | 0 | 8 | 0 | 0 | 8 |
| `src/components/sale/leads/SaleLeadsToolbar.tsx` | 0 | 6 | 0 | 0 | 6 |
| `src/hooks/useCustomerActivities.ts` | 0 | 6 | 0 | 0 | 6 |
| `src/hooks/useGifts.ts` | 0 | 6 | 0 | 0 | 6 |
| `src/components/common/table/TableToolbar.tsx` | 0 | 5 | 0 | 0 | 5 |
| `src/components/warehouse/inventory/AdjustInventoryModal.tsx` | 0 | 5 | 0 | 0 | 5 |
| `src/components/common/forms/DrawerForm.tsx` | 0 | 3 | 0 | 0 | 3 |
| `src/components/layout/Sidebar.tsx` | 3 | 0 | 0 | 0 | 3 |
| `src/components/product/category/CategoryPage.tsx` | 0 | 3 | 0 | 0 | 3 |
| `src/components/common/feedback/ConfirmDialog.tsx` | 0 | 2 | 0 | 0 | 2 |
| `src/components/common/table/DataTable.tsx` | 0 | 2 | 0 | 0 | 2 |
| `src/components/i18n/Trans.tsx` | 0 | 0 | 0 | 1 | 1 |
| `src/components/sale/leads/LeadStatusLegend.tsx` | 0 | 1 | 0 | 0 | 1 |
| `src/app/(protected)/settings/page.tsx` | 0 | 0 | 0 | 0 | 0 |
| `src/components/common/display/StatusBadge.tsx` | 0 | 0 | 0 | 0 | 0 |
| `src/components/common/filters/FilterInput.tsx` | 0 | 0 | 0 | 0 | 0 |
| `src/store/language.store.ts` | 0 | 0 | 0 | 0 | 0 |

## 3. Top 30 file có nhiều label hardcode nhất

| File | Số label VN hardcode |
|---|---:|
| `src/lib/i18n.ts` | 947 |
| `src/locales/mn/common.ts` | 338 |
| `src/locales/en/common.ts` | 335 |
| `src/locales/vi/common.ts` | 334 |
| `src/utils/validator.ts` | 255 |
| `src/locales/en/products.ts` | 111 |
| `src/locales/mn/products.ts` | 111 |
| `src/locales/vi/products.ts` | 110 |
| `src/components/marketing/input/MarketingInputSection.tsx` | 95 |
| `src/locales/en/validation.ts` | 92 |
| `src/locales/mn/validation.ts` | 92 |
| `src/locales/vi/validation.ts` | 92 |
| `src/db/seeds/orders.seed.ts` | 90 |
| `src/app/(protected)/orders/[id]/page.tsx` | 88 |
| `src/locales/mn/navigation.ts` | 80 |
| `src/app/(protected)/orders/page.tsx` | 72 |
| `src/locales/vi/navigation.ts` | 72 |
| `src/locales/en/status.ts` | 67 |
| `src/locales/mn/status.ts` | 67 |
| `src/locales/vi/status.ts` | 66 |
| `src/components/sale/leads/SaleLeadDetailView.tsx` | 63 |
| `src/app/(protected)/warehouse/transfers/page.tsx` | 61 |
| `src/locales/en/marketing.ts` | 58 |
| `src/locales/mn/marketing.ts` | 58 |
| `src/locales/vi/marketing.ts` | 58 |
| `src/components/marketing/leads/LeadDetailView.tsx` | 55 |
| `src/components/common/display/StatusBadge.tsx` | 52 |
| `src/db/seeds/leads.seed.ts` | 48 |
| `src/locales/en/orders.ts` | 48 |
| `src/locales/mn/orders.ts` | 48 |

## 4. Coverage theo route

| Route | Tổng VN | Wrapped | Unwrapped | Coverage |
|---|---:|---:|---:|---:|
| DASHBOARD | 102 | 0 | 102 | 0% |
| LAYOUT | 17 | 4 | 17 | 19% |
| COMMON | 78 | 12 | 78 | 13.3% |
| MKT | 1179 | 9 | 1179 | 0.8% |
| SALE | 325 | 85 | 325 | 20.7% |
| CUSTOMERS | 95 | 0 | 95 | 0% |
| ORDERS | 314 | 0 | 314 | 0% |
| PRODUCTS | 102 | 0 | 102 | 0% |
| ACCOUNTS | 258 | 0 | 258 | 0% |
| WAREHOUSE | 740 | 5 | 740 | 0.7% |
| SETTINGS | 233 | 0 | 233 | 0% |
| HOOKS | 86 | 12 | 86 | 12.2% |
| OTHER | 5298 | 39 | 5298 | 0.7% |

## 5. Key thiếu trong từng ngôn ngữ

### 5.1 Có trong vi nhưng thiếu trong en (0 keys)


### 5.2 Có trong vi nhưng thiếu trong mn (2 keys)

- `Admin`
- `Kho`

### 5.3 Có trong en/mn nhưng thiếu trong vi (0 keys)


## 6. Dead keys (không ai tham chiếu)

Có **0** key trong dictionary KHÔNG xuất hiện ở bất kỳ file .ts/.tsx nào.

Sample (top 30):


## 7. Nhận xét & đề xuất

1. **Coverage thấp (1.8%)** — đa số route page.tsx chưa import i18n.
2. **Phần lớn i18n nằm ở common component** (DataTable, TableToolbar, ConfirmDialog, StatusBadge, DrawerForm, FilterInput) — đã có sẵn pattern `getTranslated()`.
3. **Sidebars / header** đã wrap ~6 label.
4. **Các form lớn** (ProductForm 28 call, SaleLeadTable 40 call, ReassignLeadModal 14 call) đang wrap khá tốt.
5. **Các page.tsx lớn** (orders, marketing/input, leads, customers) chưa wrap.
6. **Dictionary bị lệch**: en có 465 key, mn có 463 key. Cần bổ sung 0 key vào en.

_Generated by Prompt A — 2026-08-22._
