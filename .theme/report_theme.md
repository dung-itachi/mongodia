# 📋 BÁO CÁO PHÂN TÍCH GIAO DIỆN VÀ KẾ HOẠCH CHUYỂN SANG HỆ THỐNG CRM HIỆN TẠI

> **File nguồn HTML:** `.theme/mongolia-crm (7).html`
> **Trạng thái:** Phân tích kiến trúc — **KHÔNG sinh code, KHÔNG chuyển HTML sang JSX.**
> **Người duyệt:** Bạn (chờ phê duyệt trước khi dựng bất kỳ Sprint nào).

---

## 1. PHÂN TÍCH TOÀN BỘ GIAO DIỆN (HTML mẫu)

### 1.1. Layout tổng thể
- **Wrapper** (`body`): `display:flex`, nền `--bg`, không cho overflow.
- **Sidebar** (`aside.sb`): cố định bên trái, có 2 trạng thái **mở rộng** (mặc định) / **thu gọn** (`.col`) và **di động overlay** (`< 768px`, `position:fixed` + `translateX`).
- **Main** (`div.main`): chiếm phần còn lại, gồm **header.topbar** + **main.content**.
- **Các lớp nổi (overlay)**: `div.kp` (key popup), `div.mo` (modal overlay với `.modal` bên trong), `div.toast` (thông báo nổi).

### 1.2. Sidebar
- **Brand**: Logo + tên hệ thống + nút thu gọn/mở rộng (`.sb-tg`).
- **Language switcher** (`.ls`): 3 ngôn ngữ vi / en / mn (i18n).
- **Role switcher** (`.rs`): 4 role demo `Admin / MKT / Sale / Kho` (còn `vAdmin` ở form tạo tài khoản).
- **Counter dạng chip** (`.cnt`): hiển thị tổng (top header).
- **Search global** (`.srch`): input tìm kiếm đa tab.
- **Nav group** (`.ngs` có `data-role`): ẩn/hiện tuỳ role. Mỗi `.ni` (nav item) có icon SVG + label + pill đếm (nếu có).
- **Footer sidebar** (`.sbf`): phiên bản / thông tin phụ.

### 1.3. Header (`header.topbar`)
- **Nút mở sidebar mobile** (`.mob-open`).
- **Page title** (`.pt`): tiêu đề + sub-title.
- **Status badge** (`.vb`): dải trạng thái động.
- **Search box**.
- **Counter** (`.cnt`): hiển thị trên cùng bên phải.

### 1.4. Danh sách 14 màn hình chính (route `go(...)`)

| # | Route HTML | Tên màn hình | Phân quyền mặc định |
|---|---|---|---|
| 1 | `dash` | **Dashboard tổng quan (Admin)** | `admin`, `vadmin` |
| 2 | `mkt-dash` | **Dashboard MKT** | `mkt` |
| 3 | `mkt` | **MKT Input** (paste comment / ladi) | `mkt` |
| 4 | `mkt-orders` | **QL đơn hàng MKT** | `mkt` |
| 5 | `leads` | **Số cần gọi (Leads)** | `sale` |
| 6 | `closed` | **Chốt đơn (Closed)** | `sale` |
| 7 | `ship` | **Đang giao (Ship)** | `kho` |
| 8 | `ok` | **Giao TC (Delivered)** | `kho` |
| 9 | `ret` | **Hoàn hàng (Return)** | `kho` |
| 10 | `rec` | **Đối soát (Reconciliation)** | `admin`, `vadmin` |
| 11 | `products` | **QL sản phẩm (Product/Category + Combo)** | admin/vadmin/mkt |
| 12 | `accounts` | **QL tài khoản (Employee)** | `admin`, `vadmin` |
| 13 | `wh` | **Quản lý kho (Warehouse)** | `kho` + admin |
| — | (chưa có) | **Permission**, **Setting** | — |

### 1.5. Phân tích từng màn hình

#### `#dash` — Dashboard tổng quan (Admin)
- **Section thanh top**: 7 stat-card gradient (`.sr .sc0`): Tổng / Mới / KNM / Chốt / Đang giao / Hoàn / Doanh thu.
- **Biểu đồ cột** (`.db-tr`): so sánh 6 pipeline theo dải màu.
- **Pipeline ratio**: bar chart đếm `new / knm / closed / ship / ok / ret`.
- **Card** đếm riêng (không có chi tiết record).
- **Tỉ giá** (`.exR`: input `1₮ = x₫`) — lưu local.
- **2 KPI bổ sung**: Lead mới hôm nay, Số cần gọi.

#### `#mkt-dash` — Dashboard MKT
- **Bộ chọn MKT** (`.accSel`): chọn tài khoản MKT đang xem.
- **3 stat-card** (`.sc0`): Tổng Lead / Lead tiềm năng / Tỷ lệ chốt + 1 card "Tổng TN" (₫).
- **Bảng báo cáo Ads** (`.adsT`): 14 cột — Ngày / Chi / Đơn Hoàn / Sáng / Chiều / Đơn Sáng / Đơn Chiều / Tổng đơn / Số video / Spent / Morning / Afternoon / Urgent / Revenue — chỉnh sửa inline.
- **Lead list** (`.led`): chỉ hiện lead của MKT được chọn.

#### `#mkt` — MKT Input
- **2 paste tab** (`.paste-tab.ct` / `.paste-tab.lt`): Comment / Ladi Page.
- **Textarea paste** (`.pz textarea`): textarea 90px nhập dữ liệu thô.
- **Bảng review** (`.pwb`): STT / Nguồn / SP / Tên / SĐT / Combo / Giá / SL — nút xoá từng dòng.
- **Nút "Đẩy về Sale"** (`.pwa`): đẩy dữ liệu từ `stg` → `D` (lead).

#### `#mkt-orders` — QL đơn hàng MKT
- **Bộ chọn MKT** (`.accSel`).
- **Card** đếm `.sc0` chia 3 trạng thái `closed / ship / dlv`.
- **Bảng** (`.tw table`): Nguồn / SP / Ngày / Tên / SĐT / Combo / Giá ₫ Giá / Trạng thái.

#### `#leads` — Số cần gọi
- **Filter chips** (`.btn-sm`): All / Mới / KNM / Tiềm năng.
- **Search input**.
- **Bảng** (12 cột): STT / Nguồn / SP / Tên / SĐT / Địa chỉ / Combo / Giá ₫ / Giá / Trạng thái / KNM / Ghi chú / Hành động.
- **Hành động tuỳ hàng**: gọi KNM (`setSt`), chốt (`setSt`), hẹn gọi lại, popup KNM (`.kp`), sửa đơn (`editOrder`).

#### `#closed` — Chốt đơn
- **Card riêng** (border-left xanh) + **bảng**: SP / Tên / SĐT / Địa chỉ / Combo / Giá / Xác nhận cuộc gọi (checkbox) / Hành động.
- **Hành động**: xác nhận gọi, gửi kho.

#### `#ship` — Đang giao
- **Card** (border-left vàng) + **bảng** 10 cột: SP / Tên / SĐT / Địa chỉ / Combo / SL / Giá / Hành động.
- **Hành động**: giao thành công (`doDeliver`), hoàn (`doReturn`).

#### `#ok` — Giao TC
- **Card** (border-left xanh) + **bảng** 9 cột: SP / Tên / SĐT / Combo / SL / Giá / Ngày.
- **Hành động**: xem chi tiết, *không chỉnh sửa*.

#### `#ret` — Hoàn hàng
- **Card** (border-left cam) + **bảng** 8 cột: SP / Tên / SĐT / Combo / SL / Ngày hoàn / Trạng thái kho (đã nhận / chưa) / Hành động.
- **Hành động**: `doConfirmWh` — xác nhận đã nhận lại kho.

#### `#rec` — Đối soát
- **3 stat-card** (`.sc0`): Số đã giao / Số hoàn / Số đối soát.
- **Bảng** summary: STT / SP / Tên / SĐT / Combo / SL / Giá / Trạng thái.
- **Tổng tiền** (`.tp`): tính tổng theo nhóm.

#### `#products` — QL sản phẩm
- **Card** + **bảng** (admin): STT / Tên / Combo / Combos (số) / SL nhập / Tồn kho / Ngày nhập / Ngày kho / Đơn chốt / Hành động.
- **Hành động admin**: chỉnh sửa sản phẩm (mở modal `editCat`).
- **Hành động MKT**: chọn sản phẩm để paste vào MKT input.
- **Nút +** (`.btn-pri`): `showNewCat` — tạo product mới (MKT: name + color + combo; Admin: + inventory).

#### `#accounts` — QL tài khoản
- **Card** + **bảng** 6 cột: STT / Tên NV / Role / Team / Company / Hành động.
- **Hành động**: thêm (`showAddAcc`), sửa (`editAcc`).
- **Lưu ý**: HTML dùng `team` (string) và `company` (string), **không** liên kết `Team` model backend.

#### `#wh` — Quản lý kho
- **6 stat-card** (`.sr .sc0`): Tổng SP / Tồn kho / Đang giao / Đang hoàn / Đã giao / Đã hoàn kho.
- **Card** + **grid** (`.wg`): từng kho `.wi` với 4 ô chỉ số (Nhập / Tồn / Shipping / Returning / Delivered / Returned) + nút **Nhập kho** (`showIm`).
- **Nút +** (`.btn-pri`): `showAW` — thêm kho mới.

### 1.6. Phân tích UI Component xuyên suốt

#### **Popup (không phải modal)**
- **Key popup KNM** (`.kp`): hiển thị lịch sử cuộc gọi của khách, neo theo `event.clientX/Y`, tự dismiss khi click ngoài.

#### **Drawer**
- **KHÔNG có** — HTML không dùng drawer.

#### **Modal** (`.modal` trong `.mo`)
| Modal | Hàm tạo | Mục đích | Form fields |
|---|---|---|---|
| Thêm tài khoản | `showAddAcc` | Tạo employee | name, role, team, company |
| Sửa tài khoản | `editAcc` | Cập nhật employee | name, role, team, company |
| Tạo sản phẩm | `showNewCat` | Tạo category + combos | name, color, combo (mô tả, giá, SL) |
| Sửa sản phẩm | `editCat` | Cập nhật sản phẩm + combos | name, color, + `addComboField` |
| Thêm combo | `showAddCb` | Thêm combo cho sản phẩm | description, price, qty |
| Sửa đơn | `editOrder` | Sale đổi giá, SL cho lead | product, combo, price, qty |
| Thêm kho | `showAW` | Tạo warehouse | name, qty |
| Nhập kho | `showIm` | Nhập hàng cho 1 kho | qty |

#### **Table** (`.tw > table`)
- Chung: `thead th` sticky, `tbody tr:hover`, `min-width: 580px` (responsive scroll ngang).
- **KHÔNG có pagination** (HTML load full); chỉ có `length` count.
- **Search** dùng `doSearch(value)` lọc chung nhiều tab.

#### **Form** (`.fg`)
- Mỗi field = `.fg` (form-group) gồm `<label>` + `<input>` / `<select>` / `<textarea>`.
- `.ma` (modal actions) = container cho nút Hủy / Lưu.
- **Tabs** (`.paste-tab`) ở MKT Input, hành vi `paste-tab.on` đổi nền theo loại.

#### **Card** (`.card`)
- Tiêu đề (`.card-h`) gồm `<h2>` + `<small>` (count) + optional `.btn-row`.
- Border-left 3 màu: `green` (closed/ok), `amber` (ship), `orange` (ret), `red` (knm) — dùng để phân biệt nhanh.

#### **Tabs**: chỉ dùng ở MKT Input (2 tab Comment / Ladi) — **không** dùng cho các màn khác.

#### **Stat-card** (`.sr .sc0`)
- 6-7 card gradient, dùng ở Dashboard admin, MKT Dashboard, MKT Orders, Warehouse.

#### **Chips / Badge**
- `.chip.c-cmt` (comment), `.chip.c-ladi` (ladi) cho nguồn Lead.
- `.pvb.pv-ok` (validation OK), `.pvb.pv-bad` (validation BAD).
- `.role-admin / .role-vadmin / .role-mkt / .role-sale / .role-kho` cho role pill.

#### **Toast** (`.toast`)
- API: `toast(msg)` → show 2.2s rồi tự ẩn.

### 1.7. I18n
- Đối tượng `T = { vi: {...}, en: {...}, mn: {...} }` + hàm `t(key)`.
- Khoảng **60+ key** dịch (UI labels + placeholder + chips).

### 1.8. Data demo trong HTML (state `D`, `stg`, `accs`, `cats`, `WH`)
- `D`: ~40 lead/đơn phẳng — `id, src, prod, cb, nm, ph, ad, pr, qt, st, os, dt, whReturned, retDt, kh[callHistory], note`.
- `stg`: staging buffer trước khi "đẩy về sale".
- `accs`: `{ id, nm, role, team, company }` — **không có password / username / email / phone**.
- `cats`: `{ id, nm, color, cb: [{id, d, p, q}] }` — sản phẩm gộp combo inline.
- `WH`: `{ id, nm, stk, imp, shipping, returning, delivered, returned }`.
- `exRate`: tỉ giá số local.

> **Quan trọng:** Toàn bộ state là JS thuần (in-memory). Sau khi refresh, mất hết.

---

## 2. MAPPING VỚI HỆ THỐNG CRM HIỆN TẠI

### 2.1. Tổng quan Backend hiện có

| Lớp | Files | Đánh giá |
|---|---|---|
| **Models** | 37 file trong `src/models/` | Phong phú, có quan hệ chặt, có audit log |
| **API routes** | 48 file trong `src/app/api/` | CRUD + many-to-many đầy đủ |
| **Constants** | 18 file enums/labels | Chuẩn hoá |
| **Services** | 11 file (Stock engine, Revenue engine, Order wiring, Customer, Lead import …) | Engine phức tạp, dùng Mongo session |
| **Providers** | `QueryProvider` (TanStack Query), `ThemeProvider` (AntD ConfigProvider), `AuthProvider` (Zustand auth.store) | Sẵn sàng |
| **Components** | Chỉ 1 component `LeadImportPreview.tsx` (chưa kết nối route) | Rất sơ khai |
| **Pages** | `app/page.tsx` (test AntD), `app/login/page.tsx` | Chỉ trang login placeholder |

### 2.2. Bảng mapping chi tiết

| Module HTML | Screen(s) | Backend Model | Backend API | Mức độ phù hợp | Ghi chú & chỗ không khớp |
|---|---|---|---|---|---|
| **Dashboard tổng quan** | `#dash` | — | `KHÔNG CÓ` dashboard API | ❌ Thiếu | Cần thống kê tổng từ Lead/Order/Inventory. Phase tiếp theo có thể thêm route `/api/dashboard/summary` (chưa có). |
| **Dashboard MKT** | `#mkt-dash` | — | `KHÔNG CÓ` (chỉ liên quan tới `Lead`, `Order`) | ❌ Thiếu + không phù hợp | **Bảng "Ads report"** (chi / đơn / morning / afternoon / urgent / revenue) không có model backend. **Không map được** — là dữ liệu marketing riêng, không thuộc domain CRM hiện tại. |
| **MKT Input** | `#mkt` | `Lead` | `POST /api/leads`, `POST /api/leads/import` | ✅ Phù hợp | Có sẵn `LeadImportPreview.tsx` đã dùng `Lead` + `Order` + `Product` + `Combo` + `LeadImportField`. Cách tiếp cận HTML "paste comment/ladi" tương đương `loadLeadImportContext` + `parseLead`. |
| **MKT Orders** | `#mkt-orders` | `Order` | `GET /api/orders?status=...` | ✅ Phù hợp | Filter theo `marketingEmployeeId` đã được List API support. |
| **Leads (Số cần gọi)** | `#leads` | `Lead` | `GET /api/leads`, `PATCH /api/leads/[id]` | ✅ Phù hợp | Trạng thái HTML `new / knm / potential / closed` map sang `LeadStatus.NEW / NO_ANSWER / POTENTIAL / ORDER_CREATED`. Filter `leadStatus` đã có. |
| **Closed (Chốt đơn)** | `#closed` | `Lead` (status ORDER_CREATED) + `Order` | `GET /api/leads?status=ORDER_CREATED` | ✅ Phù hợp | Hành động "xác nhận gọi" / "gửi kho" map sang `POST /api/orders` (tạo Order từ Lead). |
| **Ship** | `#ship` | `Order` SHIPPING | `GET /api/orders?status=SHIPPING`, cập nhật status | ✅ Phù hợp | Cần extension transition: `SHIPPING → COMPLETED` (chưa thấy endpoint riêng). |
| **OK (Giao TC)** | `#ok` | `Order` COMPLETED | `GET /api/orders?status=COMPLETED` | ✅ Phù hợp | Read-only, không có hành động. |
| **Return** | `#ret` | `Order` CANCELLED/FAILED/RETURNED | `POST /api/orders/[id]` cập nhật status + Inventory adjustment | ✅ Phù hợp | Backend `InventoryAction.RETURN` + `InventoryReason.ORDER_RETURNED` đã sẵn. HTML `whReturned` map sang `InventoryHistory.type` đã có. |
| **Reconciliation** | `#rec` | `Order` COMPLETED + Return | `GET /api/orders` filter | ⚠️ Một phần | "Đối soát" là view *aggregate* — không có API / model riêng. Sẽ phải tính tổng từ Order tại UI. |
| **Products / Category / Combo** | `#products` | `Category`, `Product`, `Combo`, `ProductVariant`, `VariantOption`, `VariantValue` | `GET/POST /api/categories`, `/api/products`, `/api/combos`, `/api/product-variants`, `/api/variant-options`, `/api/variant-values` | ✅ Phù hợp (giàu hơn) | HTML gộp Combo inline trong Category. Backend tách rời Product ↔ Combo ↔ Variant → **cần UI phức tạp hơn** (form chọn Variant, quản lý items). |
| **Accounts (Employee)** | `#accounts` | `Employee` | `GET/POST /api/employees`, `PUT/DELETE /api/employees/[id]` | ✅ Phù hợp | HTML `team` (string) → backend `Team` model + `teamId` (FK). HTML `company` → không khớp, cần bỏ qua hoặc map vào `Department`. |
| **Warehouse** | `#wh` | `Warehouse`, `Inventory`, `InventoryAdjustment`, `InventoryHistory`, `InventoryTransaction` | `GET/POST /api/warehouses`, `GET /api/inventories`, `GET/POST /api/inventory-adjustments` | ✅ Phù hợp (sâu hơn) | HTML gộp 1 product = 1 record. Backend luật hoá **Inventory = (warehouse, productVariant)** unique, có `quantity / reservedQuantity / availableQuantity`. Nhập kho (`showIm`) map sang `POST /api/inventory-adjustments` với `type: IN/OUT/ADJUST`. |
| **Permission** | (không có UI) | `Permission` | `KHÔNG CÓ` route quản lý | ❌ Thiếu API | Permission hiện chỉ được **gán cho Role** (`Role.permissions`). UI cho Permission = danh sách module/CRUD **hiện không có** trong HTML. Theo lệnh *không thêm module mới* → chỉ hiện Permission như là danh sách *read-only* trong trang Role. |
| **Role** | (không có UI) | `Role` | `GET/POST /api/roles`, `PUT/DELETE /api/roles/[id]` | ✅ Phù hợp | Cần thêm màn **Role CRUD** (vì HTML demo không có nhưng backend có). |
| **Setting** | (không có UI) | `Setting` | `KHÔNG CÓ` route | ❌ Thiếu API | Model `Setting { key, value, isPublic }` đã có. **Không có route CRUD**. Theo lệnh *không thêm module mới* → tạm bỏ qua Setting UI ở giai đoạn này, hoặc chỉ hiện cảnh báo "chưa hỗ trợ". |
| **Facebook Page** | (không có UI) | `FacebookPage`, `FacebookPageAssignment` | `GET/POST /api/facebook-page-assignments` | ⚠️ Chưa cần | Không có UI trong HTML. Theo lệnh không thêm module → **bỏ qua**. |
| **Supplier** | (không có UI) | `Supplier` | `GET/POST /api/suppliers` | ⚠️ Chưa cần | Không có UI trong HTML. Bỏ qua. |
| **Department** | (không có UI) | `Department` | `GET/POST /api/departments` | ⚠️ Chưa cần | HTML `company` có thể map. UI chỉ cần nhỏ trong form Employee. |
| **Notification** | (không có UI) | `Notification` | `KHÔNG CÓ` API | ❌ | Bỏ qua. |
| **AuditLog / LoginHistory** | (không có UI) | `AuditLog`, `LoginHistory` | `KHÔNG CÓ` API | ❌ | Bỏ qua. |
| **Ad Report (MKT riêng)** | `#mkt-dash` (bảng Ads) | — | — | ❌ Không map | **KHÔNG có model backend** dành cho ads report. Theo lệnh không thêm → **bỏ cột này khỏi MKT Dashboard** trong version đầu. |

### 2.3. Mapping trạng thái (HTML → Backend enum)

| HTML key | Mô tả HTML | Backend constant | Enum |
|---|---|---|---|
| Lead `st='new'` | Mới | `LeadStatus.NEW` | `NEW` |
| Lead `st='knm'` | Không nghe máy | `LeadStatus.NO_ANSWER` | `NO_ANSWER` |
| Lead `st='potential'` | Tiềm năng | `LeadStatus.POTENTIAL` | `POTENTIAL` |
| Lead `st='closed'` | Chốt đơn | `LeadStatus.ORDER_CREATED` | `ORDER_CREATED` |
| Lead `st='processing'` | Đang xử lý | `LeadStatus.ASSIGNED` / `PROCESSING` | `ASSIGNED` / `PROCESSING` |
| Lead `st='no_need'` | Không nhu cầu | `LeadStatus.REJECTED` / `CANCELLED` | `REJECTED` / `CANCELLED` |
| Order `os='none'` | Chưa khởi tạo | `OrderStatus.PENDING` | `PENDING` |
| Order `os='pending'` | Chờ xử lý | `OrderStatus.CONFIRMED` / `PREPAID` | `CONFIRMED` / `PREPAID` |
| Order `os='shipped'` | Đang giao | `OrderStatus.SHIPPING` | `SHIPPING` |
| Order `os='delivered'` | Đã giao | `OrderStatus.COMPLETED` | `COMPLETED` |
| Order `os='returned'` | Hoàn | `OrderStatus.CANCELLED` | `CANCELLED` |
| Order `os='reconciled'` | Đối soát | `OrderStatus.COMPLETED` (read-only) | `COMPLETED` |
| Inventory `WH.stk` | Tồn kho | `Inventory.quantity` | field |
| Inventory `WH.imp` | Đã nhập | Sum(InventoryHistory.type=INBOUND) | derived |
| Inventory `WH.shipping` | Đang giao | Sum(InventoryHistory SHIPPING) | derived |
| Inventory `WH.returning` | Đang hoàn | derived ORDER_RETURNED | derived |
| Inventory `WH.delivered` | Đã giao | Status COMPLETED | derived |
| Inventory `WH.returned` | Đã hoàn | Status RETURNED | derived |

> ⚠️ **Lưu ý:** HTML dùng các "counter" (shipping, returning, …) làm field tĩnh. Backend chỉ lưu **transaction log**; các con số này phải **tính lại bằng aggregate query** (chứ không tồn tại dạng denormalized).

### 2.4. Phát hiện chỗ KHÔNG phù hợp (cần dánh dấu rõ)

1. **Dashboard / MKT Dashboard**: Không có API backend. **Phải chờ bạn quyết định** (xây route mới trước, hay thay bằng list thống kê từ API sẵn có). Vì yêu cầu *không thêm module mới* → đề xuất: **chỉ render trang thống kê từ các API sẵn** (Lead + Order + Inventory). Bảng Ads report **bỏ**.
2. **Permission UI**: Model tồn tại nhưng không có API list. **Hiển thị read-only** bằng cách suy ra từ `Role.permissions[]` (populate lúc GET roles).
3. **Setting UI**: Không có API. **Bỏ qua** giai đoạn này.
4. **Facebook Page / Supplier / Notification / Department UI**: Không có trong HTML. **Bỏ qua** (có thể bổ sung sau nếu bạn yêu cầu).
5. **HTML `team` (string) vs backend `teamId` (FK)**: Cần form Employee cho chọn Team qua API.
6. **HTML `company` (string) vs backend Department**: Không có field backend trùng tên. **Bỏ trường `company`** ở UI, hoặc map vào `Employee.email` domain, hoặc thêm field sau (ngoài phạm vi).
7. **HTML `kh` (callHistory) inline trên Lead**: Backend có `LeadHistory` đúng pattern. UI Lead sẽ lấy qua `GET /api/leads/[id]` (cần check endpoint đã expose history chưa).
8. **HTML `prod-sel` (chọn product khi paste)**: Backend tách rời, cần dropdown 2 cấp Category → Product → Variant.
9. **HTML "đẩy về Sale" (MKT Input → D)**: Không có action backend tương ứng ngoài `POST /api/leads` (đã có) và `POST /api/leads/import` (đã có).
10. **HTML `doShip / doDeliver / doReturn / doConfirmWh`**: Cần thêm các transition endpoint trên Order (hiện chỉ PUT chung). Hiện backend `PUT /api/orders/[id]` đã chặn khi `LOCKED_STATUSES` (COMPLETED/CANCELLED/REJECTED/FAILED) → flow "ship"→"complete"→"return" cần check rule cụ thể.

---

## 3. ĐỀ XUẤT CẤU TRÚC NEXT.JS (App Router)

> Nguyên tắc: **chỉ đề xuất, KHÔNG tạo file**. Tận dụng `providers/` và `services/` đã có.

### 3.1. Layout gốc
```
src/app/
├── layout.tsx                          # Đã có — QueryProvider > ThemeProvider > AuthProvider
├── globals.css
├── page.tsx                            # Test button (giữ nguyên hoặc redirect /dashboard)
├── login/
│   └── page.tsx                        # Đã có
└── (admin)/                            # Route group: layout chứa Sidebar + Header
    ├── layout.tsx                      # Auth guard + Shell (Sidebar + Header + Content)
    ├── dashboard/page.tsx              # /dashboard
    ├── leads/page.tsx                  # /leads
    ├── leads/import/page.tsx           # /leads/import  (Kế thừa LeadImportPreview)
    ├── customers/page.tsx              # /customers
    ├── orders/page.tsx                 # /orders (list + filter)
    ├── orders/[id]/page.tsx            # /orders/:id (chi tiết + history)
    ├── products/page.tsx               # /products (Category + Product)
    ├── products/[id]/page.tsx          # /products/:id (edit + combos)
    ├── combos/page.tsx                 # /combos
    ├── warehouses/page.tsx             # /warehouses
    ├── warehouses/[id]/page.tsx        # /warehouses/:id (inventory)
    ├── employees/page.tsx              # /employees
    ├── employees/[id]/page.tsx         # /employees/:id
    ├── roles/page.tsx                  # /roles
    ├── marketing/                      # Nhóm MKT
    │   ├── dashboard/page.tsx          # /marketing/dashboard
    │   ├── input/page.tsx              # /marketing/input (paste + import)
    │   └── orders/page.tsx             # /marketing/orders
    └── settings/                       # (để trống — chưa có API)
        └── page.tsx                    # /settings (placeholder)
```

### 3.2. Cấu trúc component (theo vùng UI)
```
src/components/
├── layout/
│   ├── AppShell.tsx                    # Body flex: Sidebar + Main
│   ├── Sidebar.tsx                     # brand + role-switch + nav groups
│   ├── SidebarNavGroup.tsx             # 1 nav group (.ngs)
│   ├── SidebarNavItem.tsx              # 1 nav item + pill
│   ├── Header.tsx                      # title + search + counter
│   └── MobileMenuTrigger.tsx
├── common/
│   ├── StatCard.tsx                    # .sc0
│   ├── Card.tsx                        # .card (border-left variant)
│   ├── DataTable.tsx                   # Encapsulate AntD Table + pagination
│   ├── SearchInput.tsx                 # .srch
│   ├── StatusBadge.tsx                 # .vb
│   ├── RolePill.tsx
│   ├── PaymentMethodTag.tsx
│   ├── CurrencyTag.tsx                 # ₫ / ₮
│   ├── EmptyState.tsx                  # .empty
│   ├── ConfirmModal.tsx
│   └── Drawer.tsx                      # (nếu cần sau)
├── modal/
│   ├── EmployeeFormModal.tsx
│   ├── ProductFormModal.tsx
│   ├── ComboFormModal.tsx
│   ├── WarehouseFormModal.tsx
│   ├── InventoryImportModal.tsx
│   ├── OrderEditModal.tsx
│   └── RoleFormModal.tsx
├── popup/
│   ├── KnmHistoryPopup.tsx             # .kp floating
│   └── ToastHost.tsx                   # .toast
├── leads/
│   ├── LeadListTable.tsx
│   ├── LeadStatusChip.tsx
│   ├── LeadSourceChip.tsx
│   ├── LeadHistoryTimeline.tsx
│   └── LeadImportPreview.tsx           # Đã có — chuyển từ app/components/
├── orders/
│   ├── OrderListTable.tsx
│   ├── OrderStatusChip.tsx
│   ├── OrderDetailPanel.tsx
│   ├── OrderPaymentBlock.tsx
│   ├── OrderShippingBlock.tsx
│   ├── OrderHistoryTimeline.tsx
│   └── OrderTransitionButtons.tsx      # ship / deliver / return
├── warehouse/
│   ├── WarehouseCard.tsx               # .wi
│   ├── WarehouseInventoryTable.tsx
│   └── InventoryAdjustmentList.tsx
└── dashboard/
    ├── PipelineFunnel.tsx              # .db-tr
    ├── DashboardKpiGrid.tsx
    └── MarketingKpiGrid.tsx
```

### 3.3. Cấu trúc hooks / services (sử dụng lại `services/` có sẵn)
```
src/hooks/                              # Mới — TanStack Query wrappers
├── useLeads.ts
├── useLead.ts
├── useLeadImport.ts
├── useOrders.ts
├── useOrder.ts
├── useOrderTransitions.ts
├── useProducts.ts
├── useCombos.ts
├── useWarehouses.ts
├── useInventories.ts
├── useInventoryAdjustments.ts
├── useEmployees.ts
├── useRoles.ts
└── usePermissions.ts                   # chỉ đọc từ Role.permissions populate
```

### 3.4. Cấu trúc i18n
```
src/i18n/
├── vi.ts
├── en.ts
├── mn.ts
└── useT.ts                             # hook t(k)
```
> Lưu ý: HTML dùng `t(key)` global + `data-t="..."` switch. Trong Next.js nên dùng `next-intl` hoặc tự dựng (đề xuất **tự dựng** để tránh thêm dependency).

### 3.5. Cấu trúc phân quyền (dùng `currentUser.permissions`)
```
src/hooks/useCan.ts                     # useCan("order.create")
src/components/common/PermissionGate.tsx
```
- Sử dụng pattern hiện tại: `currentUser.permissions.includes("order.view")`.

---

## 4. CHIA THÀNH CÁC SPRINT (độc lập, có thể merge tuỳ ý)

### **Sprint 1 — Foundation: Layout + Sidebar + Header**
**Phụ thuộc:** Không.
- AppShell layout (`.main` flex).
- Sidebar: brand, ngôn ngữ, role switcher, nav group + nav item + pill.
- Header: mobile trigger, page title, status badge, search global, counter.
- Responsive 768px (sidebar overlay).
- I18n keys + `useT` hook.
- **Permission gate không cần** ở sprint này (route cứng).
- **Deliverable:** Truy cập `/` thấy shell rỗng + đổi route qua query string để xem các màn placeholder.

### **Sprint 2 — Auth & Phân quyền nền**
**Phụ thuộc:** Sprint 1.
- AuthGuard: nếu thiếu token → redirect `/login`.
- Lấy `currentUser` qua `GET /api/auth/me` → cache trong `auth.store`.
- `useCan(permission)` + `<PermissionGate permission="...">`.
- Menu sidebar ẩn item nếu user không có permission tương ứng (`*.view`).

### **Sprint 3 — Common UI Kit**
**Phụ thuộc:** Sprint 1.
- `StatCard`, `Card`, `DataTable`, `SearchInput`, `StatusBadge`, `RolePill`, `EmptyState`, `ToastHost`, `KnmHistoryPopup`, `ConfirmModal`.
- Tất cả AntD-based + Tailwind utility cho spacing.
- **Không** cần API.

### **Sprint 4 — Dashboard tổng quan (Admin)**
**Phụ thuộc:** Sprint 2 + 3.
- `GET /api/leads?aggregate=true` (cần **bổ sung API** hoặc dùng filter => nếu bạn không cho thêm API, dùng `GET /api/leads?status=NEW` rồi đếm — chính xác nhưng tốn N request).

  ⚠️ **Vướng:** Không có dashboard API. Hai lựa chọn:
  - **A.** Dùng các GET filter hiện có (gồm N+1 query).
  - **B.** Bổ sung `GET /api/dashboard/summary` (mới, ngoài phạm vi).
  - Chờ bạn chọn.

- PipelineFunnel chart (CSS bar — không dùng chart lib).
- Exchange rate input (lưu localStorage).

### **Sprint 5 — Leads (Số cần gọi)**
**Phụ thuộc:** Sprint 2 + 3.
- Route `/leads`.
- Filter chip: All / NEW / NO_ANSWER / POTENTIAL.
- Search (search by name/phone).
- `LeadListTable` + `LeadStatusChip` + `LeadSourceChip`.
- Hành động: set NO_ANSWER (lưu LeadHistory), set POTENTIAL, set ORDER_CREATED (mở flow chốt đơn).
- `KnmHistoryPopup` (lịch sử cuộc gọi → `GET /api/leads/[id]` cần expose history).
- Bulk actions (chuyển sale) — nếu có.

### **Sprint 6 — Customers**
**Phụ thuộc:** Sprint 2 + 3.
- Route `/customers`.
- `GET /api/customers` + filter area/team/marketingEmployee.
- Form CRUD (modal).
- Màn khách hàng: chỉ read + edit cơ bản.

### **Sprint 7 — Orders (List + Detail)**
**Phụ thuộc:** Sprint 2 + 3.
- Route `/orders` (list + filter status/type/source/warehouse).
- `OrderListTable` + filter theo `marketingEmployeeId` (cho MKT).
- Route `/orders/[id]` (detail + history timeline).
- `OrderPaymentBlock`, `OrderShippingBlock`.
- `OrderStatusChip` đa trạng thái.

### **Sprint 8 — Orders (Status Transitions & Closed/Ship/OK/Return/Rec)**
**Phụ thuộc:** Sprint 7.
- 5 màn phụ `/orders?status=...` (closed / ship / ok / ret / rec) hoặc giữ 1 list + filter.
- `OrderTransitionButtons` (Ship → Complete, Return).
- Khi Return → gọi `InventoryAction.RETURN` + `InventoryReason.ORDER_RETURNED` qua `POST /api/inventory-adjustments` (nếu API này hỗ trợ; hiện API chỉ có 1 dòng inventory-level, **cần xác nhận** có hỗ trợ order-driven không).
- Trang Reconciliation `/orders/reconciliation` (nếu tách).

### **Sprint 9 — Marketing (MKT Input + MKT Orders)**
**Phụ thuộc:** Sprint 2 + 3, Sprint 5 (form tạo Lead).
- Route `/marketing/input`.
- Reuse `LeadImportPreview.tsx` (paste tab Comment / Ladi + table preview + submit).
- Route `/marketing/orders` (filtered by `marketingEmployeeId`).
- **Bỏ** bảng Ads report (không có model).

### **Sprint 10 — Products (Category + Product + Combo + Variant)**
**Phụ thuộc:** Sprint 2 + 3.
- Route `/products` (list + create product).
- Route `/products/[id]` (edit + combo list).
- Modal `ProductFormModal`, `ComboFormModal`.
- Variant dropdown 2 cấp (Category → Product → Variant).

### **Sprint 11 — Warehouse + Inventory**
**Phụ thuộc:** Sprint 2 + 3.
- Route `/warehouses` (grid WarehouseCard).
- `WarehouseInventoryTable` (quantity / reservedQuantity / availableQuantity).
- `InventoryImportModal` (nhập kho → `POST /api/inventory-adjustments`).
- `InventoryAdjustmentList` (audit log).

### **Sprint 12 — Employees + Roles**
**Phụ thuộc:** Sprint 2 + 3.
- Route `/employees`: list + CRUD form. Field `teamId` chọn qua `GET /api/teams`.
- Route `/roles`: list + CRUD. Hiển thị `permissions[]` (read-only từ `GET /api/permissions` nếu có, hoặc dropdown enum cứng).
- Role form cho chọn `permissions` qua danh sách module có sẵn trong `src/constants/permissions.ts`.

### **Sprint 13 — Tinh chỉnh & Polish**
**Phụ thuộc:** Tất cả trên.
- Audit lại toàn bộ flow Lead → Order → Ship → Return.
- Hoàn thiện search global.
- Hoàn thiện mobile breakpoint.
- README cập nhật domain.

---

## 5. TỔNG HỢP ĐIỂM CHƯA PHÙ HỢP (theo lệnh **không tự ý thêm**)

| # | Vấn đề | Trạng thái | Hành động đề xuất |
|---|---|---|---|
| 1 | `Dashboard` không có API | ❌ Thiếu | Dùng các GET filter hiện có → chậm N+1. Chờ bạn quyết định có thêm route summary không. |
| 2 | `MKT Dashboard - bảng Ads report` | ❌ Không có model | **Bỏ** hoàn toàn. |
| 3 | `Permission` không có API list | ❌ Thiếu | Hiển thị trực tiếp từ `Role.permissions[]` đã populate. |
| 4 | `Setting` không có API | ❌ Thiếu | **Bỏ UI** Setting trong phase này. |
| 5 | `Facebook Page / Supplier / Notification / Department` không có UI trong HTML | ⚠️ Bỏ | Không dựng ở giai đoạn này. |
| 6 | `Employee.team` (string) vs `Team.id` | ⚠️ Lệch | UI Employee chọn Team qua API. |
| 7 | `Employee.company` (string) | ⚠️ Không map | Bỏ trường này. |
| 8 | `Inventory` HTML `WH.imp/shipping/returning/delivered/returned` là field, backend là derived | ⚠️ Cách tính khác | Tính lại qua `InventoryHistory` / `Order` pages. |
| 9 | `Order` transitions (ship → complete, return) | ⚠️ Cần check rule | `PUT /api/orders/[id]` đã có, nhưng cần xác nhận flow SHIPPING → COMPLETED. |
| 10 | `Lead` popup hiển thị history | ⚠️ | `GET /api/leads/[id]` cần trả LeadHistory (cần check). |
| 11 | `Role` UI trong HTML chỉ là select-option | ⚠️ HTML không có trang Role | Bổ sung UI Role CRUD (vì backend có). |
| 12 | `Department` UI trong HTML | ⚠️ HTML không có | Bỏ UI riêng. |

---

## 6. CÂU HỎI CHỜ BẠN DUYỆT (trước khi sang Sprint)

Trước khi tôi viết bất kỳ file component/page nào, tôi cần xác nhận các điểm sau:

1. **Dashboard API:** Có cho phép thêm route `/api/dashboard/summary` (trả về count theo status)? Hay dùng N+1 GET filter?
2. **MKT Dashboard — Bảng Ads report:** Xác nhận **bỏ** hoàn toàn?
3. **Permission UI:** Chỉ hiển thị read-only qua populate Role, đúng không?
4. **Setting UI:** Bỏ trong phase này, đúng không?
5. **Role UI:** HTML không có, nhưng backend có — bạn muốn tôi **dựng** màn Role CRUD hay **bỏ**?
6. **Module Facebook Page / Supplier / Notification / Department:** Bỏ qua khoảng này, đúng không?
7. **Mapping trạng thái:** Bảng mapping ở mục 2.3 đã đúng ý chưa? (đặc biệt `LeadStatus.NO_ANSWER` = KNM, `cancel` = hoàn).
8. **Order Transition:** Bạn có muốn tôi viết 1 action cố định (vd: `transitionOrder(id, "SHIPPING")`) thay vì dùng PUT chung, hay giữ PUT chung hiện có?
9. **Bảng Reuse `LeadImportPreview.tsx`:** Có nên tách thành component dùng chung ở `/marketing/input` và `/leads/import` không?
10. **i18n:** Tự dựng (3 file `vi/en/mn`) hay cài `next-intl`?

---

## 7. CAM KẾT VỀ PHẠM VI (theo yêu cầu của bạn)

✅ **Đã làm:** Phân tích toàn bộ HTML, mapping với backend, đề xuất cấu trúc Next.js, chia 13 sprint, liệt kê điểm chưa phù hợp.

❌ **Chưa làm & sẽ không làm** cho đến khi bạn duyệt:
- Không viết component React.
- Không chuyển HTML sang JSX.
- Không sửa UI / tối ưu UI.
- Không kết nối API.
- Không dùng mock data.
- Không sinh code.

---

**📌 Trạng thái:** **DỪNG** — chờ bạn duyệt để sang Sprint 1 (Foundation Layout).
