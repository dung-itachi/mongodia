# 🌳 Cấu trúc Sidebar → Trang → Form/Modal/Drawer

> Cây trực quan toàn bộ dự án Mongolia CRM. Mỗi nhánh là một route, mỗi lá là một Form / Modal / Drawer.
>
> **Chú thích ký hiệu:**
> - `(display only)` — node chỉ hiển thị dữ liệu, không có form/modal/drawer nhập liệu. **KHÔNG có nghĩa là "chưa có dữ liệu thật"** — tất cả đều đang nối với API qua React Query/SWR.
> - `(button)` / `(loading)` — có tương tác nhưng không phải form nhập liệu.
> - Không ghi gì → component có form/modal/drawer nhập liệu (liệt kê chi tiết bên dưới).

---

## 0. Tổng quan Sidebar

```
Mongolia CRM (v6.0)
│
├── Dashboard (standalone)               →  /dashboard
│
├── Nhóm MKT                             →  MKT
│   ├── Tổng quan MKT                    →  /marketing/dashboard
│   ├── Nhập số                          →  /marketing/input
│   ├── QL đơn hàng                      →  /marketing/orders
│   ├── Facebook Pages                   →  /facebook-pages
│   ├── Campaigns                        →  /campaigns
│   └── Chi phí Marketing                →  /marketing/expense
│
├── Nhóm SALE                            →  SALE
│   ├── Số cần gọi                       →  /leads
│   └── Chốt đơn                         →  /orders?status=CONFIRMED
│
├── Nhóm CUSTOMERS (chỉ role sale)      →  CUSTOMERS
│   └── Khách hàng                       →  /customers
│
├── Nhóm ORDERS                          →  ORDERS
│   ├── Đang giao                        →  /orders?status=SHIPPING
│   ├── Giao TC                          →  /orders?status=DELIVERED
│   ├── Hoàn hàng                        →  /orders?status=RETURNED
│   ├── Đối soát                         →  /orders?status=RECONCILED
│   └── Tất cả đơn hàng                  →  /orders
│
├── Nhóm PRODUCTS                        →  PRODUCTS
│   ├── QL sản phẩm                      →  /products
│   ├── Danh mục                         →  /products/categories
│   ├── Biến thể                         →  /products/variants
│   ├── Combo                            →  /products/combos
│   └── Quà tặng                         →  /gifts
│
├── Nhóm ACCOUNTS                        →  ACCOUNTS
│   ├── QL tài khoản                     →  /accounts
│   ├── QL Teams                         →  /teams
│   ├── QL Leaders                       →  /leaders
│   ├── Sơ đồ tổ chức                    →  /employees
│   ├── Tài khoản của tôi                →  /account/profile
│   └── Lịch sử đăng nhập                →  /accounts/login-history
│
├── Nhóm WAREHOUSE                       →  WAREHOUSE
│   ├── Quản lý kho                      →  /warehouses
│   ├── Tồn kho                          →  /warehouse/inventory
│   ├── Chuyển kho                       →  /warehouse/transfers
│   ├── Nhập kho                         →  /warehouse/receipts
│   ├── Lịch sử kho                      →  /warehouse/movements
│   ├── Xuất kho                         →  /warehouse/shipments
│   └── Điều chỉnh tồn kho               →  /warehouse/adjustments
│
└── Nhóm SETTINGS                        →  SETTINGS
    ├── Vai trò & Phân quyền             →  /roles
    ├── Tỷ giá tiền tệ                   →  /settings/exchange-rate
    ├── Phí ship                         →  /settings/shipping-fee
    ├── Quản lý thông báo                →  /settings/notifications
    └── Thông báo                        →  /notifications
```

---

## 1. Dashboard (standalone)

```
/dashboard                                    src/app/(protected)/dashboard/page.tsx
│
├── (chỉ filter + hiển thị, không có form/modal nhập liệu)
│
├── DashboardFilters                          "Bộ lọc kỳ thống kê"
│   └── Segmented: 1 ngày / 3 ngày / 7 ngày / Đầu tháng / Tháng trước
│
├── DashboardStatsGrid                        (display only)
├── DashboardCharts                           (display only)
├── DashboardWidgets                          (display only)
├── DashboardRefreshButton                    (button)
└── StatsSkeleton                             (loading)
```

---

## 2. Nhóm MKT — Marketing

### 2.1. `/marketing/dashboard` — Tổng quan MKT

```
/marketing/dashboard                         src/app/(protected)/marketing/dashboard/page.tsx
│
├── MarketingDashboardFilters                 "Bộ lọc thời gian Marketing"
│   └── Segmented: 1 ngày / 3 ngày / 7 ngày / Đầu tháng / 1 tháng / 30 ngày / 90 ngày
│
├── MarketingDashboardAdvancedFilters         "Bộ lọc nâng cao Marketing"
│   ├── DatePicker.RangePicker  (khoảng ngày)
│   ├── Select                  Facebook Page
│   ├── Select                  NV Marketing
│   ├── Select                  Campaign
│   ├── Select                  Nguồn
│   └── Select                  Trạng thái
│
├── MarketingDashboardDrillDownDrawer        "Drawer chi tiết Drill-down" (chỉ xem)
│   ├── Tab: Khách hàng
│   ├── Tab: Chi phí
│   └── Tab: Doanh thu
│
└── Inline (chỉ Admin)
    ├── Select  Khu vực
    ├── Select  Team
    └── Select  MKT
```

### 2.2. `/marketing/input` — Nhập số (route có nhiều form nhất)

```
/marketing/input                             src/app/(protected)/marketing/input/page.tsx
│
├── MarketingInputSection                    "Form nhập số liệu Marketing" (section chính)  [✓ i18n]
│   ├── Card chọn trang Facebook (Select)
│   ├── Card chọn sản phẩm + combos (custom buttons)
│   │
│   ├── Modal "Nhập đơn hàng thủ công"       (inline trong MarketingInputSection)
│   │   ├── FB Page, tên, SĐT, địa chỉ
│   │   ├── orderDate
│   │   ├── sản phẩm, combo
│   │   └── ghi chú
│   │
│   ├── Modal "Sửa đơn hàng trong staging"   (inline)
│   │
│   ├── CheckCustomerForm                     "Form check khách hàng đơn lẻ"
│   │   ├── Input + Button
│   │   └── Modal kết quả
│   │
│   ├── BatchCheckCustomersModal             "Modal check khách loạt"
│   │
│   ├── QuickProductDrawer                    "Drawer thêm nhanh sản phẩm"
│   │   ├── Form.List combos
│   │   └── Modal tạo danh mục nhanh (nested)
│   │
│   ├── QuickComboDrawer                      "Drawer thêm combo nhanh"
│   │
│   └── ColumnMappingModal                    "Modal cấu hình cột paste"
│
├── LeadDrawer                                "Drawer thêm/sửa Lead Marketing" (RHF + Zod)
│   ├── Tên, SĐT, email, nguồn
│   ├── FB Page, trạng thái
│   ├── Sản phẩm, combo
│   ├── orderDate, receivedDate
│   └── Địa chỉ, ghi chú
│
├── MarketingLeadToolbar                     "Thanh filter khách hàng"
│   ├── SearchInput
│   └── Select filters
│
├── Modal "Xác nhận đẩy sang Sale"           (inline trong page)
└── ConfirmDialog                             "Confirm xóa Lead"
```

### 2.3. `/marketing/orders` — QL đơn hàng

```
/marketing/orders                            src/app/(protected)/marketing/orders/page.tsx
│
├── LeadDrawer (re-import từ marketing/input) "Drawer thêm/sửa đơn hàng MKT"
│
├── MarketingLeadToolbar                      "Thanh filter đơn MKT"
│
├── ConfirmDialog                             "Confirm xóa đơn hàng"
│
├── Modal "Chi tiết đơn hàng" (inline, width=900)
│   ├── LeadDetailView                        "View chi tiết Lead" (5 tab)  [✓ i18n]
│   │   ├── Tab: Thông tin
│   │   ├── Tab: Lịch sử
│   │   ├── Tab: Timeline
│   │   ├── Tab: Cuộc gọi
│   │   ├── Tab: File đính kèm
│   │   └── Buttons: Sửa / Giao Sale / Chuyển đổi
│   │
│   ├── AssignSaleDrawer                      "Drawer giao Sale"
│   │   └── AsyncSelect chọn NV Sale
│   │
│   └── ConvertConfirmModal (nested)          "Modal xác nhận chuyển đổi Lead → Order"
│
└── OrdersStatsCard                           (display only)
```

### 2.4. `/facebook-pages` — Facebook Pages

```
/facebook-pages                              src/app/(protected)/facebook-pages/page.tsx
│
├── FacebookPageDrawer                        "Drawer tạo/sửa Facebook Page"
│   ├── code, name, pageUrl
│   ├── avatarUrl
│   ├── facebookPageId, businessManager
│   ├── currency, timezone
│   ├── status
│   ├── NV Marketing
│   ├── Ngày bắt đầu
│   ├── Mô tả, ghi chú
│   └── Kích hoạt
│
└── FacebookPagesToolbar                      "Thanh tìm kiếm & filter"
```

### 2.5. `/campaigns` — Campaigns

```
/campaigns                                   src/app/(protected)/campaigns/page.tsx
│
├── CampaignDrawer                            "Drawer tạo/sửa Campaign"
│   ├── code, name
│   ├── facebookPageId (AsyncSelect)
│   ├── objective
│   ├── startDate, endDate
│   ├── dailyBudget, lifetimeBudget
│   ├── status
│   └── note
│
└── CampaignsToolbar                          "Thanh tìm kiếm & filter Campaign"
```

### 2.6. `/marketing/expense` — Chi phí Marketing

```
/marketing/expense                           src/app/(protected)/marketing/expense/page.tsx
│
├── MarketingExpenseDrawer                    "Drawer tạo/sửa chi phí MKT"
│   ├── MarketingExpenseForm (RHF + Zod)      "Form lõi"
│   │   ├── reportDate (DatePicker)
│   │   ├── channel (Select)
│   │   ├── vendor
│   │   ├── amount, currency
│   │   ├── description (TextArea)
│   │   ├── BudgetAllocationTable (Form.List)
│   │   ├── AsyncSelect FB Page
│   │   └── AsyncSelect NV MKT
│   │
│   └── MarketingExpenseWorkflowBar           "Thanh workflow duyệt chi phí"
│
├── MarketingExpenseToolbar                   "Thanh search + filter"
│
└── MarketingExpenseTable                     "Bảng + actions"
```

### 2.7. `/marketing/expense/[id]` — Chi tiết chi phí Marketing *(sub-route)*

```
/marketing/expense/[id]                      src/app/(protected)/marketing/expense/[id]/page.tsx
│
├── MarketingExpenseDetail                    "Trang chi tiết" (read-mostly)
│   ├── MarketingExpenseForm (khi edit)       "Form chỉnh sửa"
│   ├── MarketingExpenseWorkflowBar           "Thanh workflow"
│   ├── MarketingExpenseAuditCard             "Card lịch sử thay đổi"
│   └── MarketingExpenseTimeline              "Timeline hoạt động"
```

### 2.8. `/marketing/input/[id]` — Chi tiết Lead MKT *(sub-route)*

```
/marketing/input/[id]                        src/app/(protected)/marketing/input/[id]/page.tsx
│
├── LeadDetailView                            "View chi tiết Lead" (5 tab)  [✓ i18n]
│   ├── Tab: Thông tin
│   ├── Tab: Lịch sử
│   ├── Tab: Timeline
│   ├── Tab: Cuộc gọi
│   ├── Tab: File đính kèm
│   └── Buttons: Sửa / Xóa
│
└── ConfirmDialog                             "Confirm xóa Lead"
```

---

## 3. Nhóm SALE — Sale

### 3.1. `/leads` — Số cần gọi (route có nhiều modal nhất)

```
/leads                                       src/app/(protected)/leads/page.tsx
│
├── SaleOrderModal                            "Modal chốt đơn"  [✓ i18n]
│   ├── Select combo
│   ├── OrderProductDetail                    (chọn biến thể)
│   │   ├── InputNumber (SL / Giá / Giảm giá)
│   │   ├── VariantDetailRow
│   │   ├── Radio.Group (preset / dropdown)
│   │   └── GiftSelectionSection
│   │       ├── Radio.Group (RANDOM / CUSTOMER_SELECTED)
│   │       ├── Select (chọn quà)
│   │       └── InputNumber SL
│   └── ...
│
├── ReassignLeadModal                         "Modal phân công Khách hàng cho Sale"  [✓ i18n]
│
├── EditLeadModal                             "Modal sửa đơn hàng" (Form lớn)  [✓ i18n]
│   ├── KH, SP, combo, variant
│   ├── Giá, tỷ giá, trạng thái
│   └── ...
│
├── LogCallModal                              "Modal ghi nhận cuộc gọi"  [✓ i18n]
│   ├── Select kết quả
│   └── Ghi chú
│
├── LeadStatusLegend                          "Modal ý nghĩa trạng thái"  [✓ i18n]
│
├── BulkReassignToolbar                       "Thanh phân công hàng loạt"  [✓ i18n]
│   ├── Select multi
│   └── Modal xác nhận
│
├── SaleLeadsToolbar                          "Thanh filter Số cần gọi"  [✓ i18n]
│
├── Modal "Chi tiết Số cần gọi" (inline, fullscreen overlay)
│   ├── SaleLeadDetailView                    "View chi tiết Số cần gọi" (4 tab)  [✓ i18n]
│   │   ├── Tab: Thông tin
│   │   ├── Tab: Lịch sử
│   │   ├── Tab: Timeline
│   │   ├── Tab: Cuộc gọi
│   │   └── Buttons: Sửa / Phân công lại / Gọi khách / Chuyển đổi
│   │
│   └── ConvertConfirmModal (nested)          "Modal xác nhận chuyển đổi"
│
├── LeadAssignmentModeToggle                  "Toggle phân công tự động/thủ công" (chỉ Admin/Manager)
│   └── Modal xác nhận (nested)
│
└── CheckCustomerForm                         "Form check khách hàng"
```

### 3.2. `/orders?status=CONFIRMED` — Chốt đơn

```
/orders?status=CONFIRMED                     (cùng route /orders, chỉ khác query)
│
└── (xem 5.5 — Tất cả đơn hàng)
```

---

## 4. Nhóm CUSTOMERS

### 4.1. `/customers` — Khách hàng

```
/customers                                   src/app/(protected)/customers/page.tsx
│
├── Inline filter
│   ├── Input.Search                          "Ô tìm khách hàng"
│   └── Select                                "Trạng thái"
│
├── ConfirmDialog                             "Confirm xóa khách hàng"
│
└── Dropdown action menu (không phải form)
    ├── Xem chi tiết  → /customers/[id]
    ├── Chỉnh sửa    → /customers/[id]/edit
    └── Xóa          (ConfirmDialog)
```

### 4.2. `/customers/[id]` — Chi tiết khách hàng *(sub-route)*

```
/customers/[id]                              src/app/(protected)/customers/[id]/page.tsx
│
├── (read-mostly, không có form nhập liệu trực tiếp)
│   ├── Card: Trạng thái
│   ├── Tabs (4 tab)
│   │   ├── Tab: Thông tin chung
│   │   │   ├── Thông tin liên hệ
│   │   │   ├── Địa chỉ
│   │   │   └── Ghi chú
│   │   ├── Tab: Nguồn Lead (FB Page, Campaign, Lead)
│   │   ├── Tab: Sale
│   │   └── Tab: Lịch sử (orders)
│   │
│   ├── CustomerTimeline                      "Timeline hoạt động CRM"
│   │
│   └── Buttons
│       ├── Chỉnh sửa  → /customers/[id]/edit
│       └── Xóa
```

---

## 5. Nhóm ORDERS

### 5.1. `/orders` — Tất cả đơn hàng

```
/orders                                      src/app/(protected)/orders/page.tsx
│
├── FilterBar                                 "Bộ lọc"
│   ├── Select          Trạng thái
│   └── DateRange       Ngày tạo
│
├── TableToolbar + SearchInput                "Ô tìm mã đơn, tên khách hàng..."
│
├── ConfirmDialog (xóa đơn hàng)             src/components/common/feedback/ConfirmDialog.tsx
│
├── ConfirmDialog (hành động nhanh)          "Xác nhận giao/hoàn/hủy đơn"
│
├── OrderStatisticsModal                      "Modal thống kê đơn hàng"
│   ├── Phễu CONFIRMED → RECONCILED
│   └── Tỷ lệ thành công / hoàn / hủy
│
├── Checkbox "Xác nhận"                       (cột bảng cho status=CONFIRMED)
│
└── Khi URL có ?status=RECONCILED:
    └── ReconciliationPanel                   "Panel đối soát"
        ├── ReconciliationStats
        ├── Card "Đã giao ↦ Đối soát"
        │   ├── Checkbox "Chọn tất cả"
        │   ├── Checkbox từng dòng
        │   └── Button "Đối soát"
        └── Card "Đã hoàn ↦ Đối soát"
            ├── Checkbox "Chọn tất cả"
            ├── Checkbox từng dòng
            └── Button "Đối soát"
```

### 5.2. `/orders?status=SHIPPING` — Đang giao

```
/orders?status=SHIPPING                      (cùng /orders, filter SHIPPING)
└── (xem 5.1)
```

### 5.3. `/orders?status=DELIVERED` — Giao TC

```
/orders?status=DELIVERED                     (cùng /orders, filter DELIVERED)
└── (xem 5.1)
```

### 5.4. `/orders?status=RETURNED` — Hoàn hàng

```
/orders?status=RETURNED                      (cùng /orders, filter RETURNED)
└── (xem 5.1)
```

### 5.5. `/orders?status=RECONCILED` — Đối soát

```
/orders?status=RECONCILED                    (cùng /orders, bật ReconciliationPanel)
└── (xem 5.1)
```

### 5.6. `/orders/[id]` — Chi tiết đơn hàng *(sub-route)*

```
/orders/[id]                                 src/app/(protected)/orders/[id]/page.tsx
│
├── Modal "Sửa đơn hàng" (Ant Design Modal)  ← Form lớn
│   ├── Input          "Tên khách hàng"      (required)
│   ├── Input          "SĐT"
│   ├── Select         "Trạng thái"
│   ├── Select         "Loại đơn"
│   ├── Select         "Nguồn đơn"
│   ├── Select showSearch  "Sale phụ trách"     (load useEmployees)
│   ├── Select showSearch  "Marketing phụ trách"
│   ├── Checkbox       "Cần giao hàng"          (gate block giao hàng)
│   │
│   ├── Khi tick "Cần giao hàng":
│   │   ├── Input          "Người nhận"        (required)
│   │   ├── Input          "SĐT người nhận"    (required)
│   │   ├── Input.TextArea "Địa chỉ"
│   │   ├── Input          "Đơn vị vận chuyển"
│   │   ├── Input          "Mã vận đơn"
│   │   └── InputNumber    "Phí vận chuyển"
│   │
│   ├── OrderProductDetail                    "Form sửa combo/sản phẩm/quà"  [✓ i18n]
│   │   ├── InputNumber      (SL combo, Giá combo, Giảm giá)
│   │   ├── VariantDetailRow (Select dropdown hoặc preset SKU)
│   │   ├── Radio.Group      (preset / dropdown)
│   │   └── GiftSelectionSection
│   │       ├── Radio.Group  (RANDOM / CUSTOMER_SELECTED)
│   │       ├── Select       (chọn quà)
│   │       └── InputNumber  SL
│   │
│   └── Input.TextArea "Ghi chú"
│
├── ConfirmDialog "Xóa đơn hàng"
└── ConfirmDialog "Xác nhận đổi trạng thái"
```

### 5.7. `/orders/quick-import` — Nhập đơn nhanh *(sub-route)*

```
/orders/quick-import                         src/app/(protected)/orders/quick-import/page.tsx
│
├── Card "Dữ liệu nguồn"
│   ├── Input.TextArea   paste dữ liệu
│   ├── Button           "Phân tích dữ liệu"
│   ├── Button           "Phân tích lại"
│   ├── Button           "Xóa"
│   └── Alert            tỷ giá MNT → VND
│
├── Card "Stats" (Badge)
│   ├── Đã phân tích / Hợp lệ / Cần kiểm tra
│   ├── Lỗi / Khách mới / Khách cũ
│   └── Tổng tiền
│
└── Card "Preview" (bảng nhập liệu inline edit — KHÔNG phải modal/drawer)
    ├── Input          "Khách hàng"       (editableCustomerName)
    ├── Input          "SĐT"               (editablePhone)
    ├── Input          "Địa chỉ"           (editableAddress)
    ├── Select         "Sản phẩm"          (editableProductId)
    ├── Select         "Combo"             (editableComboId)
    ├── InputNumber    "SL"                (editableQuantity, 1-99)
    ├── InputNumber    "Giá"               (editablePrice, thousand-sep)
    ├── Tag            "Trạng thái"        (Hợp lệ / Lỗi / Cảnh báo / Khách mới)
    └── Button         "Xóa dòng"
```

---

## 6. Nhóm PRODUCTS

### 6.1. `/products` — QL sản phẩm

```
/products                                    src/app/(protected)/products/page.tsx
│                                            → <ProductPage />
│
├── ProductForm (Drawer)                      "Drawer Form sản phẩm"
│   ├── Input          "Mã sản phẩm"           (auto-gen nếu trống)
│   ├── Input          "Tên sản phẩm"          (required, 2-200 ký tự)
│   ├── Select         "Danh mục"              (required)
│   │   └── Inline dropdown mini-form          "Tạo danh mục nhanh"
│   │       ├── Input  "Mã"
│   │       ├── Input  "Tên"
│   │       └── Button "Tạo" / "Hủy"
│   ├── Input          "URL hình ảnh"
│   ├── Input.TextArea "Mô tả"                 (max 500)
│   └── Switch         "Kích hoạt"             (chỉ khi edit)
│
├── FilterBar
│   ├── Input          "Tên sản phẩm"
│   ├── Select         "Danh mục"
│   ├── Select         "Kho"
│   └── DateRange      "Ngày nhập"
│
└── ProductManagementTable                    (bảng + actions)
```

### 6.2. `/products/categories` — Danh mục

```
/products/categories                         src/app/(protected)/products/categories/page.tsx
│                                            → <CategoryPage />
│
└── CategoryForm (Drawer)                     "Drawer Form danh mục"  [✓ i18n]
    ├── Input          "Mã danh mục"          (required, 2-20 ký tự, disabled khi edit)
    ├── Input          "Tên danh mục"         (required, 2-100 ký tự)
    ├── Input.TextArea "Mô tả"                 (max 500)
    ├── InputNumber    "Thứ tự hiển thị"      (min 0)
    └── Switch         "Kích hoạt"             (chỉ khi edit)
```

### 6.3. `/products/variants` — Biến thể

```
/products/variants                           src/app/(protected)/products/variants/page.tsx
│                                            → <VariantPage />
│
├── Tabs
│   │
│   ├── Tab "Thuộc tính & Giá trị"
│   │   ├── VariantOptionForm (Drawer)         "Drawer Form thuộc tính"
│   │   │   ├── Input          "Mã thuộc tính"
│   │   │   ├── Input          "Tên thuộc tính"
│   │   │   ├── InputNumber    "Thứ tự"
│   │   │   ├── Switch         "Kích hoạt"
│   │   │   └── Input.TextArea "Quick values"  (mỗi dòng = 1 giá trị nhanh)
│   │   │
│   │   └── VariantValueForm (Drawer)          "Drawer Form giá trị thuộc tính"
│   │       ├── Select         "Thuộc tính"
│   │       ├── Input          "Mã"
│   │       ├── Input          "Tên"
│   │       ├── InputNumber    "Thứ tự"
│   │       └── Switch         "Kích hoạt"
│   │
│   └── Tab "Biến thể"
│       ├── ProductVariantForm (Drawer)        "Drawer Form biến thể sản phẩm"
│       │   ├── Select         "Sản phẩm"     (required)
│       │   ├── Input          "SKU"          (auto-gen)
│       │   ├── Input          "Barcode"
│       │   ├── Select ×N      "Thuộc tính"   (động theo variantOptions)
│       │   ├── InputNumber    "Giá vốn"
│       │   ├── InputNumber    "Trọng lượng (g)"
│       │   ├── InputNumber    "Thứ tự"
│       │   └── Switch         "Kích hoạt"
│       │
│       ├── Select             "Chọn sản phẩm"
│       └── Select             "Tìm variant SKU"
```

### 6.4. `/products/combos` — Combo

```
/products/combos                             src/app/(protected)/products/combos/page.tsx
│                                            → <ComboPage />
│
├── ComboForm (Drawer)                        "Drawer Form combo"  [✓ i18n]
│   ├── Input          "Mã combo"             (auto-gen {Mã SP}C01)
│   ├── Input          "Tên combo"            (required)
│   ├── Select         "Sản phẩm"             (required, có thể bị lock)
│   ├── Input          "Danh mục"             (readonly) hoặc Alert
│   ├── InputNumber    "Số lượng SP / combo"  (required, min 1)
│   ├── InputNumber    "Số lượng quà / combo" (min 0)
│   ├── InputNumber    "Giá bán (₮)"          (required, thousand-sep)
│   ├── InputNumber    "Thứ tự hiển thị"
│   ├── Input          "URL hình ảnh"
│   ├── Input.TextArea "Mô tả"
│   └── Switch         "Kích hoạt"            (chỉ khi edit)
│
├── Inline
│   ├── Select         "Lọc theo danh mục"
│   ├── Input.Search   "Tìm kiếm sản phẩm..."
│   └── modal.confirm  "Xóa combo?"
```

### 6.5. `/products/[productId]/combos` — Combo theo sản phẩm *(sub-route)*

```
/products/[productId]/combos                 src/app/(protected)/products/[productId]/combos/page.tsx
│
├── ComboForm (Drawer, lockProductSelection=true)   (tái sử dụng từ ComboPage)
│
├── Inline filter
│   ├── DatePicker.RangePicker "Từ ngày / Đến ngày"
│   ├── Input.Search            "Tìm tên, mã combo..."
│   └── Segmented               "Tất cả / Hoạt động / Không hoạt động"
│
└── modal.confirm "Xóa combo?"
```

### 6.6. `/gifts` — Quà tặng

```
/gifts                                       src/app/(protected)/gifts/page.tsx
│                                            → <GiftPage />
│
├── GiftForm (Drawer)                         "Drawer Form quà tặng"  [✓ i18n]
│   ├── Input          "Tên quà"              (required, 2-100 ký tự)
│   ├── InputNumber    "Tồn kho ban đầu"      (chỉ khi tạo mới, required, min 0)
│   └── Switch         "Trạng thái"           (chỉ khi edit)
│
├── GiftInventoryDrawer (Drawer, 3 chế độ)    "Drawer tồn kho quà"
│   │
│   ├── Mode "IMPORT"                          "Nhập tồn quà tặng"
│   │   ├── InputNumber    "Số lượng nhập"
│   │   └── Input.TextArea "Ghi chú"
│   │
│   ├── Mode "ADJUSTMENT"                      "Điều chỉnh tồn quà tặng"
│   │   ├── Radio.Group     "Tăng / Giảm"
│   │   ├── InputNumber     "Số lượng"
│   │   └── Input.TextArea  "Ghi chú"
│   │
│   └── Mode "HISTORY"                         "Lịch sử tồn quà tặng"
│       └── Table                              (read-only)
│
└── SearchInput                                "Tìm kiếm quà tặng..."
```

---

## 7. Nhóm ACCOUNTS

### 7.1. `/accounts` — QL tài khoản

```
/accounts                                    src/app/(protected)/accounts/page.tsx
│
├── AccountCreateDrawer                       "Drawer tạo / sửa / xem tài khoản"  [✓ i18n]
│   │                                          (mode: create / edit / view)
│   ├── Avatar (upload Cloudinary)
│   ├── username, password
│   ├── fullName, email, phone
│   ├── role, team, department, area, leader
│   ├── Thông tin ngân hàng
│   └── ImageSizeErrorModal (nested)          "Modal ảnh vượt quá 5MB"
│
├── Inline Drawer "Đặt lại mật khẩu"          (trong accounts/page.tsx)
│   └── Input × 2 (password mới + xác nhận)
│
└── Inline filter
    ├── Select              "Trạng thái/role..."
    └── DatePicker.RangePicker
```

### 7.2. `/teams` — QL Teams

```
/teams                                       src/app/(protected)/teams/page.tsx
│
└── Inline Drawer "Tạo / sửa Team"           (mode: create / edit / view)
    ├── Input          "Mã team"              (code)
    ├── Input          "Tên team"             (name)
    ├── Select         "Phòng ban"            (departmentCode)
    ├── Select         "Khu vực"              (areaCode)
    ├── Select         "Leader"               (leaderCode)
    ├── Select         "Manager"              (managerCode)
    └── Input.TextArea "Ghi chú"
```

### 7.3. `/leaders` — QL Leaders

```
/leaders                                     src/app/(protected)/leaders/page.tsx
│
└── AccountCreateDrawer (shared)              "Drawer tạo tài khoản Leader"  [✓ i18n]
    │                                          (default roleCode = "LEADER")
    ├── (xem 7.1 AccountCreateDrawer)
```

### 7.4. `/employees` — Sơ đồ tổ chức

```
/employees                                   src/app/(protected)/employees/page.tsx
│
├── OrganizationChart                         "Sơ đồ tổ chức" (zoom/pan/search, không phải form)
│   └── AccountCreateDrawer (nested)          "Drawer tạo tài khoản từ sơ đồ (anh/chị/em)"  [✓ i18n]
│       └── (xem 7.1 AccountCreateDrawer)
```

### 7.5. `/account/profile` — Tài khoản của tôi *(sub-route cá nhân)*

```
/account/profile                             src/app/(protected)/account/profile/page.tsx
│
├── Inline Form "Cập nhật thông tin cá nhân"  (profileForm)
│   ├── Avatar (upload)
│   └── Các field cá nhân
│
├── Inline Form "Đổi mật khẩu"               (khi !canEditProfile)
│
├── Modal "Đổi mật khẩu" (Ant Design Modal)  ← Form đổi mật khẩu
│   ├── Input.Password    "Mật khẩu hiện tại"
│   ├── Input.Password    "Mật khẩu mới"
│   └── Input.Password    "Xác nhận mật khẩu mới"
│
└── ImageSizeErrorModal                       "Modal ảnh vượt quá 5MB"
```

### 7.6. `/accounts/login-history` — Lịch sử đăng nhập

```
/accounts/login-history                      src/app/(protected)/accounts/login-history/page.tsx
│
├── SuspiciousLoginConfirmModal               "Modal xác nhận đăng nhập lạ + đổi mật khẩu"
│   ├── (cảnh báo)
│   └── Form
│       ├── Input.Password  "Mật khẩu mới"
│       └── Input.Password  "Xác nhận mật khẩu mới"
│
└── Inline filter
    ├── Select              "User / thiết bị..."
    └── DatePicker.RangePicker
```

---

## 8. Nhóm WAREHOUSE — Kho

### 8.1. `/warehouses` — Quản lý kho (danh sách task)

```
/warehouses                                  src/app/(protected)/warehouses/page.tsx
│
├── QuickCreateProductDrawer                  "Drawer tạo sản phẩm nhanh (3 bước)"
│   ├── Step 1: SP → Form tạo sản phẩm
│   ├── Step 2: Variant → Form tạo biến thể
│   └── Step 3: Nhập kho → Form nhập tồn
│
├── ImportStockModal                          "Modal nhập thêm tồn kho cho variant"
│   ├── Select          Variant
│   ├── InputNumber     "Số lượng nhập"
│   └── Input.TextArea  "Ghi chú"
│
├── WarehouseProductDetailDrawer              "Drawer chi tiết sản phẩm theo variant"
│
├── WarehouseStatsGrid                        (display only)
├── WarehouseOverviewCard                     (display)
│   └── (dùng ImportStockModal + WarehouseProductDetailDrawer)
├── WarehouseOverviewFilters                  (filter UI)
└── WarehouseQuickPick                        (filter picker)
```

### 8.2. `/warehouses/[id]` — Chi tiết task kho *(sub-route)*

```
/warehouses/[id]                             src/app/(protected)/warehouses/[id]/page.tsx
│
├── Inline Modal "Xác nhận đổi trạng thái warehouse task"
│
├── InventorySection                          "Lịch sử movement" (read-only)
│
└── (actions: cập nhật trạng thái, xem chi tiết)
```

### 8.3. `/warehouse` — Tổng quan kho *(dashboard phụ)*

```
/warehouse                                   src/app/(protected)/warehouse/page.tsx
│
├── WarehouseStats                            "Hiển thị thống kê"
├── LowStockAlert                             "Cảnh báo tồn kho thấp"
└── Inline Select filter                      "Chọn kho"
```

### 8.4. `/warehouse/inventory` — Tồn kho

```
/warehouse/inventory                         src/app/(protected)/warehouse/inventory/page.tsx
│
├── WarehouseInventoryFilters                 "Bộ lọc tồn kho"
│   ├── Select         (Kho / Trạng thái)
│   └── Input.Search
│
├── WarehouseInventoryTable                   (bảng; nút "Sửa" mở AdjustInventoryModal)
│
└── AdjustInventoryModal                      "Modal điều chỉnh tồn kho"
    ├── InputNumber      "newQuantity"
    ├── Select           "Lý do"
    └── Input.TextArea   "Ghi chú"
```

### 8.5. `/warehouse/transfers` — Chuyển kho

```
/warehouse/transfers                         src/app/(protected)/warehouse/transfers/page.tsx
│
├── Inline Modal "Tạo phiếu chuyển kho"       (lines 555-855)
│   ├── Select         "Kho nguồn"
│   ├── Select         "Kho đích"
│   ├── Dynamic rows
│   │   ├── Select         "Sản phẩm"
│   │   ├── InputNumber    "Số lượng"
│   │   └── InputNumber    "Đã nhận"
│   └── Input.TextArea "Ghi chú"
│
└── Inline Modal "Nhận phiếu chuyển kho"      (lines 858-951)
    ├── InputNumber per row (SL nhận)
    └── Input.TextArea "Ghi chú nhận"
```

### 8.6. `/warehouse/receipts` — Nhập kho

```
/warehouse/receipts                          src/app/(protected)/warehouse/receipts/page.tsx
│
└── Inline Modal "Tạo phiếu nhập kho"        (lines 211-262)
    ├── Select         "Kho nhập"
    ├── Select         "Nhà cung cấp"
    ├── Dynamic rows
    │   ├── Select         "Sản phẩm" hoặc "Quà tặng"
    │   ├── InputNumber    "Số lượng"
    │   └── InputNumber    "Giá nhập"
    └── Input.TextArea "Ghi chú"
```

### 8.7. `/warehouse/movements` — Lịch sử kho

```
/warehouse/movements                         src/app/(protected)/warehouse/movements/page.tsx
│
└── Filter only (không có form/modal)
    ├── Input.Search
    ├── Select              "Kho"
    ├── Select              "Loại movement"
    ├── DatePicker.RangePicker
    └── WarehouseQuickPick
```

### 8.8. `/warehouse/shipments` — Xuất kho

```
/warehouse/shipments                         src/app/(protected)/warehouse/shipments/page.tsx
│
└── ShipDrawer                                "Drawer xác nhận xuất kho"
    ├── Combo items table                     (read-only)
    ├── Select         "Chọn quà RANDOM"
    └── Input.TextArea "Ghi chú xuất kho"
```

### 8.9. `/warehouse/adjustments` — Điều chỉnh tồn kho

```
/warehouse/adjustments                       src/app/(protected)/warehouse/adjustments/page.tsx
│
└── Inline Modal "Điều chỉnh tồn kho"        (lines 302-460)
    ├── Select         "Kho"
    ├── Dynamic rows
    │   ├── Select         "Sản phẩm"
    │   ├── InputNumber    "Số lượng"
    │   ├── Select         "Lý do (tăng/giảm)"
    │   └── Input.TextArea "Lý do chi tiết"
    └── Input.TextArea "Ghi chú"
```

### 8.10. `/inventory/movements` — Inventory Movements *(sub-route lịch sử)*

```
/inventory/movements                         src/app/(protected)/inventory/movements/page.tsx
│
└── Filter only (không có form/modal)
    ├── Input.Search
    └── Select              "Loại movement"
```

---

## 9. Nhóm SETTINGS — Cài đặt hệ thống

### 9.1. `/settings` — Hub Cài đặt

```
/settings                                    src/app/(protected)/settings/page.tsx
│
├── Tabs (điều hướng)
│   ├── Tab "Tỷ giá tiền tệ"   → /settings/exchange-rate
│   ├── Tab "Phí ship"          → /settings/shipping-fee
│   └── Tab "Ngôn ngữ"
│       └── Dropdown chọn ngôn ngữ (Inline, không phải form)
│           ├── 🇻🇳 Tiếng Việt
│           ├── 🇺🇸 English
│           └── 🇲🇳 Монгол хэл
│
└── (chỉ là hub, các form nằm ở sub-route)
```

### 9.2. `/settings/exchange-rate` — Tỷ giá tiền tệ

```
/settings/exchange-rate                      src/app/(protected)/settings/exchange-rate/page.tsx
│
└── PermissionGate "system-settings.manage"
    └── Card "Cập nhật tỷ giá"               "Form cập nhật tỷ giá"
        ├── Alert cảnh báo snapshot
        ├── InputNumber    "Tỷ giá (1 MNT sang VND)"   (required, min 0.01, step 0.5)
        ├── Button         "Lưu tỷ giá"
        └── Button         "Hủy"
```

### 9.3. `/settings/shipping-fee` — Phí ship

```
/settings/shipping-fee                       src/app/(protected)/settings/shipping-fee/page.tsx
│
└── PermissionGate "system-settings.manage"
    └── Card "Cập nhật phí ship"             "Form cập nhật phí ship"
        ├── Alert cảnh báo snapshot
        ├── InputNumber    "Phí ship"                    (required, min 0, step 1000)
        ├── Select         "Loại tiền tệ"
        │   ├── MNT - Mongolian Tugrik
        │   ├── VND - Vietnamese Dong
        │   └── USD - US Dollar
        ├── Button         "Lưu phí ship"
        └── Button         "Hủy"
```

### 9.4. `/settings/notifications` — Quản lý thông báo *(Admin/Manager)*

```
/settings/notifications                      src/app/(protected)/settings/notifications/page.tsx
│                                            → <NotificationManagementPage />
│
├── Button         "Tạo thông báo"
│
├── Stats Cards (display)
│   ├── Tổng thông báo
│   ├── Hôm nay
│   ├── Đã ghim
│   └── Đang hoạt động
│
├── NotificationTable                         (bảng + actions: edit / delete / pin)
│
└── NotificationFormDrawer (Drawer)           "Drawer tạo/sửa thông báo"
    ├── Input          "Tiêu đề"
    ├── Input.TextArea "Nội dung"
    ├── Select         "Loại" (type)
    ├── Select         "Danh mục" (category)
    ├── RecipientSelector                     "Chọn người nhận thông báo"
    │   ├── Multi-select roles
    │   ├── Multi-select users
    │   └── Multi-select teams
    ├── Input          "Link liên kết"
    ├── Switch         "Ghim"
    ├── Switch         "Kích hoạt"
    ├── DatePicker     "Ngày bắt đầu"
    └── DatePicker     "Ngày kết thúc"
```

### 9.5. `/notifications` — Thông báo (Hub xem của user)

```
/notifications                               src/app/(protected)/notifications/page.tsx
│
├── (Filter only — không có form nhập liệu)
│   ├── Segmented    "1 ngày / 3 ngày / 7 ngày / Tất cả"
│   ├── Tabs         "Hoạt động / Không hoạt động / Tất cả"
│   ├── Tabs         "Tất cả / Chưa đọc"
│   └── Button       "Đọc tất cả"
│
└── NotificationItemRow                       "Dòng thông báo" (click → mark read + navigate)
```

### 9.6. `/roles` — Vai trò & Phân quyền *(Phase 9 — RBAC)*

```
/roles                                       src/app/(protected)/roles/page.tsx
│                                            → <PermissionTreePage />
│
├── Alert khi không có quyền "role.permission.manage"
│
├── Sidebar danh sách vai trò (Left panel)
│   └── Input search "Tìm vai trò"
│
├── Main panel
│   ├── Input search "Tìm quyền"
│   ├── Permission Tree (Checkbox tri-state)
│   │   ├── ☑ Full  ▣ Partial  ☐ None        (cho từng bucket)
│   │   ├── Bucket: Marketing
│   │   │   ├── lead.view
│   │   │   ├── lead.create
│   │   │   └── ...
│   │   ├── Bucket: Sale
│   │   ├── Bucket: Customers
│   │   ├── Bucket: Orders
│   │   ├── Bucket: Products
│   │   ├── Bucket: Warehouse
│   │   ├── Bucket: Settings
│   │   └── ... (tất cả modules)
│   │
│   ├── VisibleGroups panel (chỉ non-ADMIN, non-LEADER)
│   │   └── Checkbox cho từng sidebar group:
│   │       ├── DASHBOARD
│   │       ├── MKT
│   │       ├── SALE
│   │       ├── CUSTOMERS
│   │       ├── ORDERS
│   │       ├── PRODUCTS
│   │       ├── ACCOUNTS
│   │       ├── WAREHOUSE
│   │       └── SETTINGS
│   │
│   ├── Button         "Lưu phân quyền"
│   └── Button         "Hủy"
│
└── ConfirmDialog                             "Xác nhận cập nhật phân quyền"
```

---

## 10. Thống kê tổng hợp

```
Tổng số route trong sidebar       : 35
├── Standalone                     :  1  (Dashboard)
├── Nhóm MKT                       :  6
├── Nhóm SALE                      :  2
├── Nhóm CUSTOMERS                 :  1
├── Nhóm ORDERS                    :  5
├── Nhóm PRODUCTS                  :  5
├── Nhóm ACCOUNTS                  :  6
├── Nhóm WAREHOUSE                 :  7
└── Nhóm SETTINGS                  :  4

Tổng số Form / Modal / Drawer     : ~70
├── Tách component riêng           : ~50
└── Inline trong page.tsx          : ~20

Top 3 route form-heavy:
├── /marketing/input               : 11 form/modal/drawer
├── /leads                         :  9 form/modal/drawer
└── /orders/[id]                   :  8 form/modal/drawer

Component dùng chung nhiều nơi:
├── AccountCreateDrawer            : 4 nơi (/accounts, /leaders, /employees, ImageSizeErrorModal)
├── ConfirmDialog                  : hầu hết các trang có hành động xóa
├── OrderProductDetail             : /orders/[id], /leads
├── LeadDetailView / SaleLeadDetailView : 2 nơi mỗi loại  [✓ i18n]
├── ComboForm                      : /products/combos, /products/[productId]/combos  [✓ i18n]
└── MarketingLeadToolbar           : /marketing/input, /marketing/orders

Route không có form/modal (chỉ filter + display):
├── /dashboard
├── /customers/[id]
├── /warehouse/movements
├── /inventory/movements
└── /notifications (hub user)
```

---

## 11. Trạng thái i18n (đến 22/08/2026)

Audit `t()` calls (`@/lib/i18n`) trên tất cả Form/Modal/Drawer components.

```
25 / 73 Form/Modal/Drawer files DONE (34.2%) — nhóm A + nhóm B
36 / 39 Pages wrapped (page.tsx) — nhóm C
├── Pages DONE:   dashboard, marketing/{dashboard,orders,expense,input,input/[id],expense/[id]},
│                 customers/{page,[id]}, orders/{page,[id],quick-import},
│                 products/{page,categories,variants,combos,[productId]/combos},
│                 gifts, accounts/{page,login-history}, teams, leaders, employees,
│                 account/profile, warehouses/{page,[id]}, warehouse/{page,shipments,
│                 inventory,transfers,adjustments,receipts,movements}, inventory/movements,
│                 settings/{page,notifications,exchange-rate,shipping-fee},
│                 roles, notifications, facebook-pages, campaigns, leads
└── Pages SKIP:    3 (settings/page.tsx + leads/page.tsx đã wrap từ trước;
                     login page + 403 page là page protected/auth không wrap)
```

Chi tiết (Form/Modal/Drawer):
[✓] MarketingInputSection.tsx                 — DONE (88 t())
[✓] LeadDetailView.tsx                       — DONE (47 t())
[✓] OrderProductDetail.tsx                   — DONE (43 t())
[✓] SaleLeadDetailView.tsx                   — DONE (30 t())
[✓] SaleOrderModal.tsx                       — DONE (10 t())
[✓] EditLeadModal.tsx                        — DONE (39 t())
[✓] ComboForm.tsx                            — DONE (34 t())
[✓] CategoryForm.tsx                         — DONE (19 t())
[✓] GiftForm.tsx                             — DONE (12 t())
[✓] AccountCreateDrawer.tsx                  — DONE (38 t())
[✓] SaleLeadTable.tsx                        — DONE (40 t())
[✓] SaleLeadsToolbar.tsx                     — DONE (6 t())
[✓] SaleLeadsStatsCard.tsx                   — DONE (11 t())
[✓] LeadStatusLegend.tsx                     — DONE (3 t())
[✓] BulkReassignToolbar.tsx                  — DONE (16 t())
[✓] LogCallModal.tsx                         — DONE (21 t())
[✓] ReassignLeadModal.tsx                    — DONE (14 t())
[✓] LeadDetailModal.tsx                      — DONE (30 t())
[✓] CallLogTimeline.tsx                      — DONE (4 t())
[✓] ProductTable.tsx                         — DONE (12 t())
[✓] ComboTable.tsx                           — DONE (12 t())
[✓] CategoryTable.tsx                        — DONE (11 t())
[✓] ProductVariantTable.tsx                  — DONE (10 t())
[✓] ProductVariantsList.tsx                  — DONE (25 t())
[✓] GiftTable.tsx                            — DONE (14 t())
[✓] OrdersPage (/orders) (1234 dòng)         — DONE (153 t*)
[✓] OrderDetailPage (/orders/[id]) (868 dòng) — DONE trong Prompt D
[✓] MarketingOrdersPage (/marketing/orders) — DONE (PageHeader + confirm/delete/modal)
[✓] MarketingInputPage (/marketing/input)   — DONE (PageHeader + push-to-sale modal)
[✓] MarketingExpenseListPage (/marketing/expense) — DONE (PageHeader + stats)
[✓] MarketingDashboardPage (/marketing/dashboard) — DONE (filters + export)
[✓] MarketingExpenseDetailPage (/marketing/expense/[id]) — DONE (fallback)
[✓] MarketingInputLeadDetailPage (/marketing/input/[id]) — DONE (page + DeleteConfirmModal)
[✓] CustomersPage (/customers) + CustomerDetailPage — DONE (table columns + tabs)
[✓] ProductsPage + Categories/Variants/Combos wrappers — DONE
[✓] GiftsPage (re-export) — DONE
[✓] AccountsPage + LoginHistoryPage + LeadersPage + TeamsPage + EmployeesPage
[✓] ProfilePage (/account/profile) — DONE
[✓] WarehousesPage (/warehouses + /warehouses/[id]) + Warehouse list pages (8) — DONE
[✓] Settings pages (4) + RolesPage + NotificationsPage + FacebookPagesPage + CampaignsPage — DONE
[✓] LeadsPage (/leads) + QuickImport orders — DONE
[ ] CheckCustomerForm.tsx                    — NOT_DONE
[ ] QuickProductDrawer.tsx                   — NOT_DONE
[ ] QuickComboDrawer.tsx                     — NOT_DONE
[ ] BatchCheckCustomersModal.tsx             — NOT_DONE
[ ] ColumnMappingModal.tsx                   — NOT_DONE
[ ] FieldOrderPreview.tsx                    — NOT_DONE
[ ] AssignSaleDrawer.tsx                     — NOT_DONE
[ ] MarketingLeadTrackingTable.tsx           — NOT_DONE
[ ] MarketingExpenseDrawer.tsx               — NOT_DONE
[ ] MarketingExpenseDetail.tsx               — NOT_DONE
[ ] MarketingExpenseTimeline.tsx             — NOT_DONE
[ ] MarketingExpenseSummaryCard.tsx          — NOT_DONE
[ ] BudgetAllocationTable.tsx                — NOT_DONE
[ ] ProductManagementTable.tsx               — NOT_DONE
[ ] CategoryPage.tsx                         — NOT_DONE
[ ] ComboPage.tsx                            — NOT_DONE
[ ] ProductComboList.tsx                     — NOT_DONE
[ ] ProductVariantForm.tsx                   — NOT_DONE
[ ] VariantOptionForm.tsx                    — NOT_DONE
[ ] VariantValueForm.tsx                     — NOT_DONE
[ ] VariantPage.tsx                          — NOT_DONE
[ ] GiftPage.tsx                             — NOT_DONE
[ ] GiftInventoryDrawer.tsx                  — NOT_DONE
[ ] ActivityDrawer.tsx                       — NOT_DONE
[ ] CustomerTimeline.tsx                     — NOT_DONE
[ ] NotificationFormDrawer.tsx               — NOT_DONE
[ ] NotificationTable.tsx                    — NOT_DONE
[ ] NotificationManagementPage.tsx           — NOT_DONE
[ ] OrganizationChart.tsx                    — NOT_DONE
[ ] OrgNodeCard.tsx                          — NOT_DONE

EN translations:
[✓] 234 keys refined (was heuristic, now curated)
[✓] 0 TS errors sau khi fix double-quote bug
```

---

*Cập nhật: 22/08/2026 — nhóm C (39 pages) DONE: 36/39 pages đã wrap i18n (PageHeader, toolbar text, table columns, alert/messages, modal titles). 3 pages skip là login/403 (auth) và 2 pages đã wrap trước đó. Nhóm A (6 forms) + nhóm B (15 tables) + nhóm C (36 pages) gộp lại ~60 components/đã wrap.*
