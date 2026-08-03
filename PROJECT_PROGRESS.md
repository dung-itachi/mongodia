# Tiến độ dự án Mongodia
Thư viện cần cài 
npm install antd @ant-design/icons axios @tanstack/react-query react-hook-form @hookform/resolvers zod mongoose mongodb jsonwebtoken bcryptjs dotenv dayjs uuid cookie
## ✅ Đã hoàn thành

### Sprint 2.1 — Authentication Foundation
- AuthGuard component (src/components/auth/AuthGuard.tsx)
- Protected Layout with AuthGuard (src/app/(protected)/layout.tsx)
- Auth Store với persist (src/store/auth.store.ts)
  - accessToken, refreshToken, user
  - login(), logout(), clear()
  - isAuthenticated()
- Login flow: gọi API → lưu token → redirect /dashboard
- Logout: clear store → redirect /login (không reload)
- Refresh (F5): Token được restore từ localStorage qua persist middleware
- Loading State: Spin khi AuthGuard đang kiểm tra

### Sprint 2.2 — Permission Foundation
- `src/types/permission.ts` — String literal permissions cho toàn bộ CRM
  - Employee, Role, Product, Order, Lead, Customer, Marketing, Warehouse, Combo, Facebook
  - Type: `Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]`
- `src/lib/permission.ts` — Pure function `hasPermission(userPermissions, permission)`
  - Không phụ thuộc Zustand / React
  - Hỗ trợ wildcard `*` cho admin
- `src/hooks/useCan.ts` — Hook `useCan(permission)` đọc từ authStore
  - Trả về false nếu chưa login
- `src/components/auth/PermissionGate.tsx` — Component `<PermissionGate permission="...">`
  - Có quyền → render children
  - Không có quyền → return null (không hiển thị 403 UI)

### Sprint 2.3 — Sidebar Permission (RBAC)
✅ Hoàn thành (2026-08-03)
- **nav.config.tsx:** Thêm field `permission` cho tất cả NavItem
- **Sidebar.tsx:** Filter menu bằng `hasPermission(userPermissions, item.permission)`
  - Group không có item nào visible → Ẩn cả group
  - ADMIN ("*") → Hiện toàn bộ menu
- **Source:** Chỉ đọc `authStore.user?.permissions`, không đọc `ROLE_SEED`

---

## Sprint 2.3 — Sidebar Permission (RBAC)

### Status

✅ Completed

### Mục tiêu

Sidebar tự động hiển thị menu theo `authStore.user?.permissions`.

### Files tạo mới

Không có (chỉnh sửa existing files)

### Files chỉnh sửa

- `src/config/nav.config.tsx` — Thêm field `permission` cho mỗi NavItem
- `src/components/layout/Sidebar.tsx` — Filter menu bằng `hasPermission()`

### Menu Permission Mapping

| Menu | Permission |
|------|-----------|
| Tổng quan | dashboard.view |
| Tổng quan MKT | report.view |
| Nhập số | lead.create |
| QL đơn hàng (MKT) | order.view |
| Số cần gọi | lead.view |
| Chốt đơn | order.view |
| Đang giao / Giao TC / Hoàn hàng / Đối soát | order.view |
| QL sản phẩm | product.view |
| QL tài khoản | employee.view |
| Quản lý kho | warehouse.view |

### Sidebar Logic

```tsx
const visibleGroups = NAV_GROUPS
  .map(group => {
    const visibleItems = group.items.filter(
      item => !item.permission || hasPermission(userPermissions, item.permission)
    );
    return { ...group, items: visibleItems };
  })
  .filter(group => group.items.length > 0);
```

- Group không có item visible → Ẩn cả group
- ADMIN ("*") → hasPermission tự xử lý wildcard → Hiện toàn bộ

### Verification

- [x] Admin login → Hiện toàn bộ menu (dashboard.view, warehouse.view, employee.view...)
- [x] Marketing login → Ẩn Employees, Roles, Settings
- [x] Sale login → Không thấy Marketing (MKT group)
- [x] Warehouse login → Không thấy Customers, Employees
- [x] Reload → Sidebar vẫn đúng (persisted via auth store)
- [x] 0 TypeScript Error (Sidebar, nav.config)

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint 2.4

### Sprint 2.3.5 — Fix Existing TypeScript Errors

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Fix toàn bộ TypeScript errors đang tồn tại trong project.

### Files chỉnh sửa

| File | Fix |
|------|-----|
| `src/models/Counter.ts` | Đổi `ICounter.value` → `ICounter.seq`, thêm `_id?: Types.ObjectId` |
| `src/app/login/page.tsx` | Fix `ZodError.errors` → `ZodError.issues`, import `ZodIssue` |
| `src/app/api/leads/[id]/route.ts` | Fix shorthand property `newValue` → `newSaleId`, cast `LeadStatus` |
| `src/app/api/inventories/route.ts` | Thêm `mapInventoryList` vào mapper |
| `src/app/api/inventory-adjustments/route.ts` | Fix Mongoose create typing với `(Model as any).create()` |
| `src/services/customer/customer.service.ts` | Fix `.value` → `.seq` |
| `src/lib/generateEmployeeCode.ts` | Fix `.value` → `.seq` |
| `src/db/seeds/leads.seed.ts` | Fix `.value` → `.seq` |
| `src/app/api/test-lead-transaction-*.ts` | Fix `.value` → `.seq` (3 files) |
| `src/services/import/leadImport.service.ts` | Fix `.value` → `.seq` |

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error
- [x] Không thêm lỗi mới
- [x] Không thay đổi logic runtime

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint 2.4

### 1. Backend Setup
- Next.js App Router
- MongoDB + Mongoose
- Kết nối DB (connectDB)
- Biến môi trường .env.local

### 2. Authentication & User Management
- JWT Authentication
- Middleware kiểm tra Bearer Token
- Phân quyền theo Permission (employee.view, employee.create...)
- getCurrentUser()

### 3. Employee Module
- Login + JWT
- GET danh sách (search, filter, sort, pagination)
- GET chi tiết
- POST (validate, check duplicate, hash password, generate code)
- PUT (validate, check duplicate)
- DELETE (soft delete)
- Reset password
- Validation (Zod)
- Mapper

### 4. Role Module
- GET danh sách (pagination, search)
- GET chi tiết
- POST (validate, check permissions, check duplicate)
- PUT (validate, check duplicate)
- DELETE (soft delete)
- Validation
- Mapper

### 5. Seed Database
- Countries, Areas, Departments, Teams
- Permissions, Roles, Employees, Counters

### 6. Counter (Auto-increment)
- Mã tự động: EMP000001, EMP000002...

### 7. Master Data
- Country, Area, Department, Team
- Role, Permission, Employee
- Setting, Counter

### 8. Product System
- Category
- Brand
- Product
- VariantOption
- VariantValue
- ProductVariant

### 9. Combo System (Đã hoàn thiện)
- Combo Model (code, name, categoryId, comboItems, sellingPrice, packageSize, image, description, isActive)
- ComboItem (productVariantId, quantity, isGift)
- Không lưu tên/giá Product, chỉ lưu reference
- ComboItem Schema với validation:
  - quantity >= 1
  - Không duplicate variant trong cùng combo
- API CRUD đầy đủ:
  - GET /api/combos (list với pagination)
  - GET /api/combos/:id (detail với populate Category, Product, ProductVariant)
  - POST /api/combos (validate, check duplicate code/name)
  - PUT /api/combos/:id (validate, check duplicate, không cho sửa inactive combo)
  - DELETE /api/combos/:id (soft delete - isActive=false)
- Validation:
  - sellingPrice >= 0
  - packageSize > 0
  - Combo phải có ít nhất 1 ComboItem
  - Không duplicate code
  - Không duplicate name
  - Tất cả variant phải tồn tại và active
- Business Rules:
  - Không cho sửa combo đã bị soft delete
  - Không cho chọn combo inactive
- Permissions: combo.view, combo.create, combo.update, combo.delete
- Roles có quyền:
  - ADMIN, MANAGER, MKT: Create, Update
  - LEADER, EMPLOYEE: View

### 10. Warehouse System
- Warehouse
- Inventory (Read Model - chỉ lưu quantity, reservedQuantity)
- InventoryAdjustment (Business Action)
- InventoryTransaction (được tính từ Transaction)

### 11. CRM
- Customer (chỉ lưu thông tin khách)
- CustomerAddress
- CustomerTag
- CustomerTimeline

### 12. Facebook Page
- FacebookPage
- FacebookPageAssignment

### 13. Database Patterns & Utilities
- Soft Delete (isActive = false)
- Pagination, Search, Filter, Sort
- Zod Validation
- Mapper Pattern
- Password Hashing (bcrypt)
- Response utilities (success, error)
- Snapshot Pattern (lưu trạng thái tại thời điểm tạo)

---

## 📊 Đánh giá hoàn thiện (theo ChatGPT)

| Module | Hoàn thiện |
|--------|------------|
| Authentication | 95% |
| Employee / Team / Role | 95% |
| Product | 90% |
| Combo | 100% |
| Warehouse | 80% |
| Inventory | 90% |
| Facebook Page | 95% |
| Customer | 90% |
| Order | 60% |
| Lead | 30% |
| Dashboard | 5% |
| Report | 15% |
| Notification | 0% |
| Workflow | 0% |

---

## 🗂️ Kiến trúc 10 Module chính

```
Authentication
        │
        ▼
Employee / Team / Role / Permission
        │
        ▼
Facebook Page
        │
        ▼
Marketing
        │
        ▼
Lead
        │
        ▼
Sales Pipeline
        │
        ▼
Order
        │
        ▼
Customer
        │
        ▼
Warehouse
        │
        ▼
Reconciliation
        │
        ▼
Report
```

---

## 📋 Kiến thức đã thực hành

- JWT Authentication
- Permission-based Authorization
- MongoDB Populate
- Soft Delete
- Pagination, Search, Filter, Sort
- Mapper Pattern
- Zod Validation
- Password Hashing (bcrypt)
- Counter Auto Increment
- REST API CRUD
- App Router API (Next.js)

---

## 🔄 Luồng hệ thống

```
Facebook Ads
      ↓
Lead
      ↓
Marketing xác nhận
      ↓
Import hàng loạt
      ↓
Auto chia Sale
      ↓
Sale gọi (Sales Pipeline)
      ↓
Chốt đơn
      ↓
Order
      ↓
Kho đóng gói
      ↓
Giao hàng
      ↓
Đối soát
      ↓
Report
```

---

## 📌 Pipeline Stages (Order Status)

```
NEW → ASSIGNED → CALLING → CONFIRMED → PACKING → SHIPPING → DELIVERED → RECONCILED
                  ↓
              NO_ANSWER / POTENTIAL / REJECTED
                                          
              SHIPPING → RETURNED
```

**Sale Call Status:**
- NO_ANSWER (KNM)
- POTENTIAL (tiềm năng)
- REJECTED (không cần)
- CONFIRMED (đã xác nhận)

---

## 📌 Kiến trúc Order (đã thiết kế)

**Order chứa:**
- customerId + Customer Snapshot (name, phone, address, facebookLink)
- Marketing Snapshot (marketingEmployeeId, facebookPageId, facebookPageAssignmentId)
- Sale Snapshot (saleEmployeeId)
- Combo Snapshot (comboId, comboName, comboPrice, comboWeight)
- Revenue Snapshot (productRevenue, marketingRevenue, saleRevenue)
- Exchange Rate Snapshot
- Weight Snapshot (estimatedWeight, actualWeight, weightUnit, packageCount, packageType)
- warehouseId
- shipmentId
- reconciliationId
- createdSource (MANUAL / IMPORT / API)
- callNoAnswerCount (số lần KNM)
- confirmed, confirmedAt

**OrderItem:**
- comboId
- quantity

**OrderStatusHistory:**
- Lưu ai đổi trạng thái, lúc nào

**OrderCallHistory:**
- Lưu lịch sử gọi (09:00 KNM, 14:00 máy bận, 17:00 hẹn mai)

**Shipment:**
- shippingProvider (GHN, J&T, EMS...)
- trackingNumber
- sentAt, receivedAt

**Payment:**
- COD, Chuyển khoản

---

## 📌 Kiến trúc Lead (đã thiết kế)

- LeadImportBatch (batch import để track lỗi, rollback)
- LeadHistory (Import → Đã liên hệ → Đã chuyển Order)

---

## 🔜 Cần làm tiếp

### Sprint 2.2 — Permission Foundation
✅ Hoàn thành (2026-08-03)
- Permission Engine: types, lib, hook, PermissionGate

### Sprint 2.3 — Tiếp theo
- CRUD (theo Sprint tiếp theo)

### Ưu tiên cao:
1. **Lead** (20%) - Module CRM quan trọng nhất
2. **Order** (60%) - Hoàn thiện Order CRUD + OrderItem + OrderStatusHistory + OrderCallHistory
3. **Sales Pipeline** - Quản lý việc Sale xử lý lead (gọi, KNM, tiềm năng...)

### Ưu tiên trung bình:
4. **Auto Assign Sale** - Tự động chia đơn cho Sale (Round Robin, Weighted, Manual, Priority)
5. **Shipment** - Quản lý vận chuyển
6. **Payment** - Quản lý thanh toán

### Ưu tiên thấp:
7. **Dashboard** (5%) - Marketing Dashboard, Sale Dashboard, Kho Dashboard
8. **Report** (15%) - Marketing Report, Sale Report, Warehouse Report, Finance Report
9. **Reconciliation** - Đối soát cuối ngày

### Tương lai:
10. **Notification** - Thông báo
11. **Workflow Engine** - Luồng xử lý có thể cấu hình
12. **Timeline / EventLog** - Lịch sử chung cho mọi thao tác
13. **Audit Log** - Log ai sửa gì, lúc nào, giá cũ, giá mới

---

## 📌 Các Module bổ sung đã đề xuất

1. **Organization** - Đa quốc gia (Mongolia, Japan, Thailand...)
2. **WarehouseLocation** - Kệ A, Kệ B...
3. **CustomerTag** - VIP, Scam, Đại lý, Blacklist...
4. **ExchangeRate** - Tỷ giá MNT → VND
5. **AssignmentRule** - Quy tắc chia Sale
6. **SaleDailyStatistic** - Cache KPI cho Dashboard
7. **InventoryDailySnapshot** - Snapshot tồn kho hàng ngày
8. **MarketingFundRequest** - Xin quỹ Marketing
9. **MarketingExpense** - Chi quỹ Marketing
10. **Campaign** - Chiến dịch quảng cáo
11. **Attachment** - File đính kèm (ảnh bill, ảnh hoàn hàng...)
12. **ShippingProvider** - GHN, J&T, EMS...

---

## 📌 Nguyên tắc kiến trúc

1. **Snapshot Pattern** - Lưu trạng thái tại thời điểm tạo
2. **Soft Delete** - Không xóa, chỉ đánh dấu isActive = false
3. **Enum chuẩn hóa** - UPPER_SNAKE_CASE (NO_ANSWER, POTENTIAL...)
4. **Không sửa dữ liệu quá khứ** - Mọi thay đổi tạo revision mới
5. **Permission theo Module** - module.action (employee.view, order.create...)
6. **Daily Statistic** - Dashboard đọc từ cache, không query trực tiếp
7. **Event Driven** - Một sự kiện kích hoạt nhiều hành động
8. **Master Data vs Transaction Data** - Tách rõ hai loại dữ liệu

---

## 📌 Thứ tự triển khai module mới (quy trình chuẩn)

1. Model
2. Mapper
3. Validator
4. Permissions
5. Roles
6. Seed
7. API CRUD
8. Test

---

# Mongolia CRM Development Progress

---

## MODULE: Combo

### Status

✅ Completed

### Models

- Combo

### APIs

- GET /api/combos
- GET /api/combos/:id
- POST /api/combos
- PUT /api/combos/:id
- DELETE /api/combos/:id (Soft Delete)

### Validation

- Quantity >=1
- PackageSize >=1
- SellingPrice >=0
- displayOrder >=0
- Duplicate Variant
- Duplicate Code
- Duplicate Name trong cùng Product

### Business Rules

- Product phải thuộc Category
- Variant phải thuộc Product
- Không sửa Combo inactive
- Soft Delete

### Permissions

- combo.view
- combo.create
- combo.update
- combo.delete

### Seed

- Category
- Product
- Variant
- Combo

### Index

- Unique(code)
- Unique(productId,name)
- Query(isActive,categoryId,displayOrder)
- Query(productId,displayOrder)

### Review

Reviewed by ChatGPT

Status: Ready for Lead Module

---

## MODULE: Lead

### Status

In Progress

### Models

- Lead
  - leadCode (auto-increment)
  - customerName, customerNewName
  - facebookLink, phone, phone2
  - address, province, district, ward
  - sourceType (LANDING_PAGE, FACEBOOK_COMMENT, FACEBOOK_INBOX, TIKTOK, ZALO, OTHER)
  - facebookPageId, facebookPageAssignmentId
  - marketingEmployeeId, saleEmployeeId (nullable)
  - categoryId, productId, comboId
  - quantity, unitPriceMNT, unitPriceVND, exchangeRate, estimatedWeight
  - status (NEW, ASSIGNED, CALLING, NO_ANSWER, POTENTIAL, REJECTED, ORDER_CREATED, CANCELLED)
  - note, isDuplicate, isActive

- LeadHistory
  - leadId, employeeId
  - action (CREATED, ASSIGNED_SALE, STATUS_CHANGED, UPDATED_*, ORDER_CREATED, CANCELLED...)
  - oldValue, newValue, note

### Constants

- LeadStatus Enum (8 status)
- SourceType const array
- LeadAction const array

### Mapper

- mapLead()
- mapLeadList()
- mapLeadHistory()
- mapLeadHistoryList()

### Validation

- createLeadSchema
  - customerName: required, max 200
  - phone: Vietnamese format regex (0[0-9]{9,10})
  - facebookLink: valid URL
  - sourceType: enum
  - quantity >= 1
  - prices >= 0

- updateLeadSchema
  - Same as create but all fields optional except partial required
  - Nullable for reference fields

### Permissions

- lead.view
- lead.create
- lead.update
- lead.delete
- lead.assign

### Roles có quyền Lead

- ADMIN, MANAGER, MKT: Create, Update, Assign
- LEADER: View
- EMPLOYEE: View

### Phase 1 Scope (Đã xong)

✅ Model: Lead, LeadHistory
✅ Enum: LeadStatus (8 status: NEW, ASSIGNED, PROCESSING, NO_ANSWER, POTENTIAL, ORDER_CREATED, REJECTED, CANCELLED)
✅ Enum: LeadAction (11 actions: CREATED, UPDATED, ASSIGNED, UNASSIGNED, STATUS_CHANGED, ORDER_CREATED, ORDER_CANCELLED, SALE_CHANGED, MARKETING_CHANGED, NOTE_UPDATED, DELETED)
✅ Mapper: mapLead, mapLeadList, mapLeadHistory, mapLeadHistoryList
✅ Validation: createLeadSchema, updateLeadSchema
✅ Permissions: lead.view, lead.create, lead.update, lead.delete, lead.assign

### Lead Model Updates

1. Thêm customerId (nullable, ref Customer) - khách hoàn toàn mới = null, khách quay lại = có giá trị
2. Thêm assignmentType (AUTO, MANUAL, nullable) - thống kê cách chia Sale
3. Thêm assignedAt (Date, nullable) - thời điểm Lead được giao cho Sale
4. Thêm latestRemark (String, nullable) - luôn lưu ghi chú mới nhất để hiển thị nhanh trong danh sách. Lịch sử ghi chú được lưu trong LeadHistory với action NOTE_UPDATED
5. LeadStatus: Bỏ CALLING, thêm PROCESSING - CALLING chỉ là hành động, không phải trạng thái
6. LeadHistory.action: Dùng Enum LeadAction thay vì String

### Phase 2: CRUD API (Đã xong)

✅ API CRUD đầy đủ:
- GET /api/leads (list với pagination, filter, search)
- GET /api/leads/:id (detail với populate đầy đủ)
- POST /api/leads (validate, generate code, tạo LeadHistory)
- PUT /api/leads/:id (validate, business rules, tạo LeadHistory)
- DELETE /api/leads/:id (soft delete, tạo LeadHistory)

✅ GET List Filters:
- page, limit, keyword
- status, marketingEmployeeId, saleEmployeeId
- facebookPageId, sourceType, isDuplicate, isActive
- createdFrom, createdTo
- Sort: createdAt DESC

✅ GET Detail Populate:
- customer, facebookPage, facebookPageAssignment.employee
- marketingEmployee, saleEmployee
- category, product, combo

✅ POST Business Rules:
- Validate: Product, Combo, Marketing Employee, Sale Employee, Customer (nếu có)
- **Business Rule 7**: leadCode dùng Counter Collection (đảm bảo không trùng khi nhiều người tạo cùng lúc)
- Status default: NEW
- assignedAt: null
- assignmentType: undefined (không set, sẽ do Auto Assign set AUTO)
- latestRemark: ""
- isDuplicate: false
- isActive: true
- Tạo LeadHistory(action: CREATED, employeeId)

✅ Search:
- **Business Rule 6**: keyword tìm theo: leadCode, customerName, customerNewName, phone, phone2, facebookLink (regex không phân biệt hoa thường)

✅ PUT Business Rules:
- Validate: Product, Combo, Marketing Employee, Sale Employee
- **Business Rule 1**: Không cho sửa Lead đã tạo Order (status = ORDER_CREATED) các field ảnh hưởng doanh thu (productId, comboId, quantity, unitPriceMNT, unitPriceVND, exchangeRate, marketingEmployeeId) → HTTP 409
- **Business Rule 2**: assignedAt chỉ set khi Sale từ null → có giá trị. Đổi Sale sau này không cập nhật assignedAt
- **Business Rule 3**: assignmentType luôn là MANUAL trong CRUD (Auto Assign sẽ tự set AUTO)
- **Business Rule 4**: Tất cả LeadHistory phải có employeeId
- Nếu latestRemark thay đổi: Tạo LeadHistory(NOTE_UPDATED, oldValue, newValue)
- Nếu status thay đổi: Tạo LeadHistory(STATUS_CHANGED, oldValue, newValue)
- Nếu saleEmployeeId thay đổi: Tạo LeadHistory(SALE_CHANGED, oldValue, newValue)
- Nếu marketingEmployeeId thay đổi: Tạo LeadHistory(MARKETING_CHANGED, oldValue, newValue)

✅ DELETE Business Rules:
- **Business Rule 5**: Không cho Delete Lead đã tạo Order (status = ORDER_CREATED) → HTTP 409
- Soft Delete: isActive = false
- Tạo LeadHistory(action: DELETED)

✅ Permissions:
- lead.view, lead.create, lead.update, lead.delete

✅ Response Format:
- Sử dụng mapper: mapLead(), mapLeadList()
- Response: { success, message, data }

✅ Transaction:
- **POST Lead**: Tạo Lead + Update Counter + Tạo LeadHistory trong 1 transaction
- **PUT Lead**: Update Lead + Tạo LeadHistory trong 1 transaction
- **DELETE Lead**: Soft Delete + Tạo LeadHistory trong 1 transaction
- Nếu bất kỳ bước nào lỗi → Rollback toàn bộ transaction

✅ Transaction Testing (Đã xong):
- **2026-07-31**: Kiểm thử POST, PUT, DELETE Transaction
- Tất cả 26 test cases đều PASS (8 basic + 5 error-based + 13 comprehensive)
- Commit và Rollback (real errors) hoạt động đúng
- Rollback triggered by: Validation Error, Duplicate Key, Required Field, Invalid Enum, Cast Error
- MongoDB Verification: Collections, indexes, data integrity verified
- Regression Test: 26/26 PASS
- Chi tiết: docs/testing/Lead_Transaction_Test_Report.txt

### Phase 3 (Đang làm)

✅ Lead Import
- **Phase 3.1 - Paste + Preview (Completed - 2026-07-31)**
- Component: LeadImportPreview
- Chức năng: Paste dữ liệu (Ctrl+V) → Parse TAB/newline → Mapping object (customerName, phone, combo, price, sourceType, date) → Hiển thị Table Preview
- Statistics: Hiển thị tổng số dòng đã parse
- Có nút Clear để xóa toàn bộ dữ liệu
- KHÔNG lưu Database, KHÔNG validate, KHÔNG duplicate, KHÔNG import
- File: src/app/components/LeadImportPreview.tsx
- **Lead Import Header Mapping Added**
- **Lead Import Flexible Header Mapping (2026-07-31)**
  - HEADER_MAP với nhiều alias cho mỗi field (tên/Tên KH/Khách Hàng/Name...)
  - Normalize: lowercase + trim + collapse spaces
  - Cột bắt buộc: Tên (customerName), SĐT (phone) - thiếu → không parse, hiển thị Alert lỗi
  - Cột dư: bỏ qua, không báo lỗi
- **Lead Import Architecture Refactor (2026-07-31)**
  - Header Mapping extracted → `src/constants/importHeaders.ts`
    - `LEAD_IMPORT_HEADER_MAP`
    - `LEAD_IMPORT_REQUIRED_FIELDS`
    - `LeadImportField` type
  - Parser extracted → `src/utils/import/leadParser.ts`
    - Public API: `parseLead(text) → LeadParseResult`
    - Internal helpers: `normalizeHeader`, `buildHeaderIndex`, `hasHeaderRow`, `parseRow`
  - Component `LeadImportPreview` chỉ UI: nhận paste → gọi `parseLead()` → render preview/stats/error
  - Ready for Customer / Product / Warehouse Import
- **Lead Import Validation (Phase 3.2) (2026-07-31)**
  - Row validation pipeline: Parse → Mapping → Validation → Result
  - Tái sử dụng `VIETNAMESE_PHONE_REGEX` từ `src/utils/validator.ts`
  - Mỗi row có `status: VALID | INVALID` và `errors: string[]`
  - Validate required: customerName, phone
  - Validate phone: regex Vietnamese (0xxxxxxxxx / 0xxxxxxxxxx)
  - Validate price: >= 0 (nếu có)
  - Validate date: parseable (nếu có)
  - Phase 3.3 sẽ handle: Combo / Product / Page / Marketing / Sale / Customer existence
  - Statistics: Tổng dòng / Hợp lệ / Không hợp lệ
  - Preview table thêm cột: Trạng thái ✔❌ + Lý do lỗi (errors)
- **Lead Validation Enhanced (2026-08-01)**
  - Error Code: `MISSING_NAME`, `MISSING_PHONE`, `PHONE_INVALID`,
    `PRICE_INVALID`, `PRICE_NEGATIVE`, `DATE_INVALID`, `SOURCE_TYPE_INVALID`
  - Validation Issue structure: `{ code, message, severity, field }`
  - Severity: `ERROR` (chặn import) vs `WARNING` (cho phép import, cảnh báo)
  - `SOURCE_TYPE_INVALID` là WARNING (vẫn ghi nhận)
  - Cell Highlight: đúng cell bị lỗi (đỏ) / cảnh báo (vàng), không chỉ highlight cả dòng
  - Tooltip per-cell liệt kê issues kèm code
  - Status pill: ✔ VALID / ⚠ WARNING / ❌ INVALID
  - Statistics: Tổng / Hợp lệ / Cảnh báo / Không hợp lệ
- **Lead Import Validation Architecture Refactor (2026-08-01)**
  - Tạo `src/services/import/leadImportValidation.service.ts`
    - `loadLeadImportContext()`: batch query Product/Combo/FacebookPage/Customer/Employee
    - In-memory `Map` cache (TTL 5 phút), concurrency-safe
    - `clearLeadImportContextCache()` + `emptyLeadImportContext()`
  - Parser `leadParser.ts` hoàn toàn DATABASE-FREE
    - Không import Mongoose / Model
    - Nhận optional `LeadImportContext` qua parameter
    - Phase 3.3 hook: `validateBusinessRow(row, context)` đã reserve
    - Reserved codes: `PRODUCT_NOT_FOUND`, `COMBO_NOT_FOUND`,
      `FACEBOOK_PAGE_NOT_FOUND`, `CUSTOMER_NOT_FOUND`, `EMPLOYEE_NOT_FOUND`
  - Flow: LeadImportPreview → load context (1 batch / domain) → parseLead(text, context)
  - Ready for: Duplicate Detection, Auto Create Customer, Auto Assign Sale, DB Import
- **Lead Duplicate Detection (2026-08-01)**
  - Phase 3.4: phát hiện trùng lặp KHÔNG chặn Import (INFO only)
  - Service mở rộng context:
    - `customersByPhone` (đã có) + `customersByFacebookLink` (reserved)
    - `leadsByPhone` + `leadsByFacebookLink` (Phase 3.4 batch queries)
  - Parser thêm `validateDuplicateRow(row, context)`:
    - Level 1: Phone → Customer → `duplicateType: PHONE` (Khách quay lại)
    - Level 1b: Phone → Lead → `duplicateType: PHONE` (Lead cũ - trùng SĐT)
    - Level 2: Facebook → Lead → `duplicateType: FACEBOOK` (Trùng Facebook)
    - Level 3/4: CUSTOMER / LEAD enum reserved
  - `ParsedLead` thêm fields: `isDuplicate`, `duplicateType`,
    `customerId` (link vào KH để Phase Import không phải tìm lại),
    `matchedCode` / `matchedId`
  - Severity: chỉ là INFO, KHÔNG ERROR / KHÔNG WARNING
  - Statistics: Tổng / Hợp lệ / Cảnh báo / Không hợp lệ / Khách mới /
    Khách quay lại + breakdown Trùng SĐT (Customer/Lead) / Trùng Facebook
  - Preview columns: Duplicate / Loại trùng / Khách hàng trùng (Customer.code)
  - KHÔNG làm: Merge Customer / Merge Lead / Auto Update Customer /
    Auto Assign Sale / Import DB
- **Lead Import Simulation (Phase 3.5) (2026-08-01)**
  - Tạo `src/services/import/leadImportSimulation.service.ts`
    - `simulateLeadImport(rows, context?) → LeadImportSimulation`
    - PURE FUNCTION: không ghi DB, không mở transaction, không tạo Customer, không tạo Lead
    - Nhận `ParsedLead[]` từ parser (cùng shape đang hiển thị ở bảng)
    - Trả về summary đầy đủ:
      * `totalRows`, `validRows`, `invalidRows`, `warningRows`
      * `leadsToCreate`, `customersToCreate`, `newCustomers`, `returningCustomers`
      * `duplicatePhone`, `duplicateFacebook`, `duplicateCustomer`
      * `errorCount`, `warningCount`
      * `readyToImport` (= `errorCount === 0 && leadsToCreate > 0`) - single source of truth cho Import button
      * `estimatedExecution: { leadCount, label }` - UX hint ("15 Lead → ~0.2s", "500 Lead → ~5s")
      * `skippedRowNumbers` (rowNumber của các dòng INVALID)
      * `issueSummary` (Record<code, count>)
    - Helper `describeIssueCode(code)` cho label tiếng Việt
  - Component `LeadImportPreview`:
    - Thêm Summary Card "Mô phỏng Import" phía trên bảng (nền xanh lá, tag Phase 3.5)
    - Header card có 2 tag mới:
      * `readyToImport` → "Sẵn sàng Import" (success) / "Chưa sẵn sàng" (default)
      * `estimatedExecution` → "⏱ 15 Lead → ~0.2s" (tooltip giải thích chỉ UX)
    - 11 ô Statistic: Tổng / Lead sẽ tạo / Customer sẽ tạo / Khách mới /
      Khách quay lại / Trùng SĐT / Trùng Facebook / Trùng Customer /
      Warning / Error / Dòng sẽ bỏ qua
    - Alert liệt kê rowNumber các dòng sẽ bị skip
    - Tóm tắt lỗi theo `LeadValidationCode` (sort theo count giảm dần)
    - `simulation` được memo bằng `useMemo` theo `[parsedRows, importContext]`
    - KHÔNG thêm nút Import / KHÔNG gọi API / KHÔNG tạo Customer / KHÔNG tạo Lead
    - Khi Phase 3.6 thêm nút Import: `disabled={!simulation.readyToImport}`
- **Lead Import DB (Phase 3.6) (2026-08-01)**
  - Tạo `src/services/import/leadImport.service.ts`
    - `importLeads(rows, context, opts)` - atomic DB import
    - **Guard bắt buộc**: phải gọi `simulateLeadImport` trước; `simulation.readyToImport === true` mới cho chạy
      (throw `LeadImportNotReadyError` nếu chưa sẵn sàng, có `skipSimulationGuard` cho internal caller)
    - Toàn bộ batch chạy trong **1 transaction** (`mongoose.startSession()` + `withTransaction`)
      - Bất kỳ dòng nào throw → rollback toàn bộ Customer / Lead / LeadHistory
    - Sequence per row:
      1. `customerId` (matched by parser) → reuse Customer, `reusedCustomer++`
         Ngược lại → `nextCustomerCode()` (Counter "CUSTOMER", `KH000001`...) → `Customer.create()` → `createdCustomer++`
      2. `nextLeadCode()` (Counter "LEAD", `LE000001`...) → `Lead.create()` với `status: NEW`, `sourceType: OTHER` (nếu rỗng), `unitPriceVND` parse từ `price`, `comboId` lookup từ context, `isDuplicate` propagate
      3. `LeadHistory.create(action: CREATED, newValue: NEW, note: "Tạo Lead từ Import")`
    - Defaults load một lần (Promise.all):
      - Area `PVD`, Team `SALE`, Employee `EMP_MKT001` (required fields cho Customer)
    - `parseNumericPrice` mirror lại parser (VN thousand separator)
    - `normalizeSourceType` rỗng / không hợp lệ → `OTHER` (enum-safe)
    - `resolveComboId` lookup từ `context.combosByCode` (case-insensitive)
    - Return:
      ```ts
      { createdLead, createdCustomer, reusedCustomer, elapsedTime }
      ```
    - **KHÔNG làm**: Auto Assign Sale / Commission / Order / Update existing Customer
  - Import Pipeline tổng thể (Phase 3.1 → 3.6):
    `paste → parseLead → validateDuplicateRow → simulateLeadImport → importLeads`
- **Lead Import DB - Refactor (Phase 3.6) (2026-08-01)**
  - Tách trách nhiệm rõ ràng, KHÔNG còn hardcode trong `leadImport.service.ts`:
  - **Không hardcode Area/Team/Marketing Employee**:
    - Tạo `src/services/import/leadImportDefaults.service.ts`
      - `loadLeadImportDefaults()` đọc 3 key từ collection `Setting`:
        * `IMPORT_DEFAULT_AREA_CODE`
        * `IMPORT_DEFAULT_TEAM_CODE`
        * `IMPORT_DEFAULT_MARKETING_EMPLOYEE_CODE`
      - Cache 60s, có `clearLeadImportDefaultsCache()`
      - Throw error rõ ràng khi thiếu key hoặc thiếu ref trong DB
  - **Không tự sửa sourceType**:
    - Parser cho gì thì `leadImport.service.ts` persist y nguyên
    - Chỉ fallback `OTHER` khi string rỗng (để thỏa schema `required`), không rewrite enum
  - **Không re-lookup Combo tại thời điểm Import**:
    - Bỏ `Combo.findOne(...)` trong service
    - `resolveComboIdFromContext(row.combo, context)` chỉ đọc `context.combosByCode` (đã được parser resolve)
    - Combo thiếu trong context → `comboId: undefined` (không throw)
  - **Customer qua CustomerService**:
    - Tạo `src/services/customer/customer.service.ts`
      - `createCustomer(input, opts?)` - allocate CustomerCode qua Counter "CUSTOMER"
      - Nhận `opts.session` để tham gia transaction của caller
      - CustomerCounter thuộc sở hữu hoàn toàn của CustomerService
    - `leadImport.service.ts` không còn đụng tới `Counter` cho Customer, không tự sinh code
  - **API layer thuần transport**:
    - Tạo `src/app/api/leads/import/route.ts` (POST)
      - Chỉ: auth (`getCurrentUser`) → authorize (`lead.create`) → parse body → load context → gọi `importLeads()` → trả kết quả
      - Bắt `LeadImportNotReadyError` → trả 409 kèm `errorCount` + `leadsToCreate` để UI biết lý do
      - KHÔNG chứa logic nghiệp vụ (Counter / Transaction / Defaults đều nằm trong service)
- **Order Module - Phase 1.1: Model Foundation (2026-08-01)**
  - Mở rộng `src/models/Order.ts` (đã tồn tại):
    - Thêm sub-type `IOrderPayment` + field `payments[]` (method/amount/currency/paidAt/transactionId)
    - Thêm sub-type `IOrderShipping` + field `shipping{}` (receiverName/Phone/address/province/district/ward/trackingNumber/carrier/estimatedDelivery/actualDelivery/shippingFee)
    - Thêm `estimatedWeight`, `actualWeight`
    - Thêm `warehouseId` (ref: Warehouse)
    - Thêm `revenueLocked` (Boolean, default: false)
    - Thêm `revenueOwnerOrderId` (ref: Order) - đơn đang chiếm slot revenue
    - Đổi `revenueLockReason` type từ `string` → `RevenueLockReason` enum (type-safe)
    - Thêm compound indexes: `(customerId, productId|comboId, revenueLocked, createdAt)` cho Revenue Lock
    - Thêm indexes: `(warehouseId, isActive)`, `(leadId)`
  - Tạo `src/models/OrderHistory.ts`
    - Schema: orderId / employeeId / action / oldValue / newValue / note / createdAt
    - Indexes: `(orderId, createdAt DESC)`, `(employeeId)`
  - Mở rộng `src/constants/orderStatus.ts` (đã tồn tại):
    - Thêm `OrderAction` enum (CREATED/UPDATED/STATUS_CHANGED/PAYMENT_ADDED/PAYMENT_REMOVED/SHIPPING_UPDATED/DELIVERED/CANCELLED/REJECTED/REVENUE_LOCKED/REVENUE_UNLOCKED/REVENUE_RECALCULATED/NOTE_UPDATED/DELETED)
    - Thêm `ORDER_ACTION_LABELS` map
  - Tạo `src/mappers/order.mapper.ts`
    - `OrderResponse`, `OrderListItem`, `OrderPaymentResponse`, `OrderShippingResponse`
    - `OrderHistoryResponse` + `Employee` populated
    - `mapOrder()`, `mapOrderList()`, `mapOrderHistory()`, `mapOrderHistoryList()`
  - Thêm `createOrderSchema` + `updateOrderSchema` vào `src/utils/validator.ts`
    - Nested `orderPaymentSchema` (method/amount/currency/paidAt/transactionId)
    - Nested `orderShippingSchema` (receiverName/Phone/address/province/district/ward/trackingNumber/carrier/estimatedDelivery/actualDelivery/shippingFee)
    - Full validation: OBJECT_ID regex, min/max, currency enum
  - KHÔNG làm: CRUD / API / Revenue Engine / Stock
- **Order Module - Phase 1.2: Classification + TotalPaid (2026-08-01)**
  - Thêm 3 enum vào `src/constants/orderStatus.ts`:
    - `OrderType` (NORMAL / COMBO / GIFT / EXCHANGE / REPLACEMENT)
      - NORMAL/COMBO: tính revenue, chiếm slot.
      - GIFT/EXCHANGE/REPLACEMENT: KHÔNG tính revenue, KHÔNG chiếm slot.
    - `OrderSource` (FACEBOOK / IMPORT / PHONE / WEBSITE / MANUAL)
      - Nguồn SALE chốt đơn, KHÁC `Lead.sourceType` (nguồn khách).
    - `NON_REVENUE_ORDER_TYPES` Set: { GIFT, EXCHANGE, REPLACEMENT }.
  - Thêm 3 fields vào `src/models/Order.ts`:
    - `orderType` (OrderType, default NORMAL, indexed)
    - `orderSource` (OrderSource, default MANUAL, indexed)
    - `totalPaid` (Number, min: 0) — cache sum(payments[].amount), update atomic khi add/remove payment.
    - Compound index: `(orderType, status, createdAt DESC)` + `(orderSource, createdAt DESC)` cho Dashboard.
  - Cập nhật `src/mappers/order.mapper.ts`:
    - Thêm `orderType` / `orderTypeLabel` / `orderSource` / `orderSourceLabel` / `totalPaid` vào `OrderResponse` + `mapOrder()`.
  - Cập nhật `src/utils/validator.ts`:
    - `createOrderSchema` + `updateOrderSchema` thêm `orderType` / `orderSource` / `totalPaid` (optional, backward-compat).
  - Cập nhật `src/services/order/orderRevenue.service.ts`:
    - `OrderLockInput` thêm field `orderType`.
    - `isSameProductFamily()`: nếu 1 trong 2 đơn là NON_REVENUE → return false (không cùng family, không lock).
    - `evaluateAndLock()` case (a-0): nếu subject là GIFT/EXCHANGE/REPLACEMENT → eligible=false, *_Final=0, reason=NONE (đánh dấu "không tính vì bản chất").
    - KHÔNG cần đoán `comboId != null` nữa - dùng `orderType` trực tiếp.
- **Order Module - Phase 2: CRUD API (2026-08-01)**
  - Tạo `src/app/api/orders/route.ts`
    - `GET /api/orders` — pagination + search + filter + sort
      - Search: `orderCode` / `customerName` / `phone` (lookup Customer rồi match `customerId`)
      - Filter: `status` / `warehouseId` / `orderType` / `orderSource` / `revenueLocked` / `createdAt range`
      - Sort: `createdAt DESC`
      - Permission: `order.view`
    - `POST /api/orders` — tạo đơn
      - Validate reference tồn tại: Customer / Lead / Product / Combo / Warehouse / Employee (parallel `Promise.all`)
      - Validate `orderType` + `orderSource` (qua Zod enum)
      - Default revenue: `revenueLocked=false`, `revenueOwnerOrderId=null`, `marketingRevenue*`=0, `saleRevenue*`=0, `totalPaid=0` (NO revenue engine call)
      - KHÔNG auto assign / KHÔNG commission / KHÔNG stock / KHÔNG shipment
      - Generate `orderCode` qua `Counter` (`OD + YYMMDD + seq`)
      - Tạo `OrderHistory` với `action=CREATED`, `newValue=status`, `employeeId=currentUser.employee._id`
      - Wrap trong transaction (`startSession` + `commitTransaction`)
      - Permission: `order.create`
  - Tạo `src/app/api/orders/[id]/route.ts`
    - `GET /api/orders/:id`
      - Populate: Customer / Lead / Product / Combo / Warehouse / Marketing Employee / Sale Employee
      - Trả về `histories[]` (populated Employee) từ `OrderHistory`
      - Permission: `order.view`
    - `PUT /api/orders/:id`
      - Status lock guard: COMPLETED / CANCELLED / REJECTED / FAILED → 409
      - Validate reference existence khi thay đổi
      - Change tracking → tạo OrderHistory entries:
        * `customerId`: action=UPDATED, old/new=id, note="Đổi khách hàng"
        * `productId`: action=UPDATED, note="Đổi sản phẩm"
        * `comboId`: action=UPDATED, note="Đổi combo"
        * `warehouseId`: action=SHIPPING_UPDATED, note="Đổi kho"
        * `status`: action=STATUS_CHANGED, old/new=label
        * `payments[]`: action=PAYMENT_ADDED, old/new=totalPaid sum
        * `shipping{}`: action=SHIPPING_UPDATED, note="Cập nhật vận chuyển"
      - Auto recompute `totalPaid = sum(payments[].amount)`
      - Wrap trong transaction
      - Permission: `order.update`
    - `DELETE /api/orders/:id`
      - Soft delete (`isActive = false`)
      - Block khi status = COMPLETED (409)
      - Tạo `OrderHistory` với `action=DELETED`
      - Wrap trong transaction
      - Permission: `order.delete`
  - KHÔNG làm: Revenue Engine / Warehouse Stock / Shipment / Commission / Dashboard
- **Order Module - Phase 2.1: Helper + fieldName (2026-08-01)**
  - Tạo `src/helpers/orderChange.ts`:
    - `isPaymentChanged(oldPayments, newPayments) → { changed, oldTotal, newTotal }`
      - Normalise (Date → ISO, strip undefined/null), so sánh canonical JSON.
      - Sum amount ngay trong helper để route không phải tính lại.
    - `isShippingChanged(oldShipping, newShipping) → { changed }`
      - Hỗ trợ cả "xóa shipping" (newShipping = null).
    - Dùng được cho Phase 2 hiện tại + Phase tiếp theo (Payment/Shipping service).
  - Mở rộng `src/models/OrderHistory.ts`:
    - Thêm field `fieldName?: string` (indexed) — UI Timeline dùng để hiển thị "Đã đổi <fieldName>".
  - Mở rộng `src/mappers/order.mapper.ts`:
    - `OrderHistoryResponse` thêm `fieldName?` + `mapOrderHistory()` include field.
  - Refactor `src/app/api/orders/[id]/route.ts` PUT:
    - `pushHistory()` đổi signature từ positional args → object `{ fieldName, oldValue, newValue, note }`.
    - Mọi history entry gắn `fieldName` cụ thể (customerId / customerName / productId / comboId / warehouseId / status / payments / shipping).
    - Thay `JSON.stringify` payments/shipping so sánh bằng helper `isPaymentChanged()` / `isShippingChanged()`.
  - GET `histories[]` sort `createdAt DESC` — UI không cần sort lại.
- **Order Module - Phase 3.1: Revenue Rule Design (2026-08-01)**
  - **KHÔNG viết API / CRUD / Engine thật.** Chỉ xây dựng Business Rule Layer (pure functions).
  - Tạo `src/constants/revenueRule.ts`:
    - `RevenueOwnerType` (SAME_PRODUCT_FAMILY / NON_REVENUE_ORDER / DIFFERENT_PRODUCT_FAMILY / DIFFERENT_CUSTOMER).
    - `RevenueLockReason` (NONE / WAITING_PREVIOUS_ORDER / PREPAID_PRIORITY / CUSTOMER_ALREADY_BUYING / ORDER_CANCELLED / NON_REVENUE_ORDER).
    - `RevenueUnlockReason` (PREVIOUS_ORDER_CANCELLED / NEXT_ORDER_PREPAID / ORDER_STATUS_UNLOCKED).
    - `RevenuePriority` (NONE / NORMAL / PREPAID / COMPLETED) — dùng để compareOrder trong cùng family.
    - `RevenueState` (ELIGIBLE / LOCKED / UNLOCKED / EXEMPTED) — độc lập với OrderStatus.
    - Helpers: `isNonRevenueOrderType()`, `isRevenueActiveStatus()`, `isRevenueUnlockStatus()`.
  - Tạo `src/services/order/revenueRule.service.ts` (PURE):
    - KHÔNG import mongoose / Model / DB.
    - Input: `OrderRuleInput` DTO (plain object, KHÔNG phải Document).
    - Hàm:
      * `getRevenueOwner(a, b)` — phân loại quan hệ giữa 2 Order.
      * `canLockRevenue(subject, other)` — có thể bị lock bởi other không?
      * `canUnlockRevenue(subject, previouslyActiveSibling)` — lý do unlock.
      * `shouldTransferRevenue(from, to)` — có nên transfer slot từ from → to không? (PREPAID takeover case).
      * `getRevenuePriority(input)` — lấy priority COMPLETED > PREPAID > NORMAL > NONE.
      * `getRevenueState(input)` — phân loại state nhanh (snapshot ban đầu).
      * `compareRevenuePriority(a, b)` — so sánh priority, tie-break createdAt ASC, cuối cùng _id.
      * `decideForOrder(subject, siblings)` — quyết định cuối cùng cho 1 Order.
      * `decideForAll(orders)` — bulk decide, sort createdAt ASC rồi map → decision.
    - Decision model 4 nhóm:
      * EXEMPTED (GIFT/EXCHANGE/REPLACEMENT) → reason=NON_REVENUE_ORDER
      * UNLOCKED (CANCELLED/REJECTED/FAILED) → reason=ORDER_CANCELLED
      * ELIGIBLE (là owner) → reason=NONE hoặc PREPAID_PRIORITY (nếu giành slot từ đơn trước)
      * LOCKED (chờ đơn trước) → reason=WAITING_PREVIOUS_ORDER
  - Engine Layer (Phase 4 - tương lai) sẽ wire rule layer này vào persist + transaction.
- **Order Module - Phase 3.2: Revenue Lock Engine (2026-08-01)**
  - Tạo `src/services/order/revenueEngine.service.ts`:
    - ĐỌC Mongo (Order collection).
    - DÙNG Transaction (`startTransaction` + `commitTransaction` / `abortTransaction`).
    - UPDATE Order (`revenueLocked` / `revenueOwnerOrderId` / `revenueLockReason` / `revenueCalculatedAt`).
    - GHI `OrderHistory` với action `REVENUE_LOCKED` / `REVENUE_UNLOCKED` / `REVENUE_RECALCULATED` + `fieldName="revenue"`.
  - **KHÔNG tự viết Rule.** Mọi quyết định gọi `decideForAll()` từ `revenueRule.service.ts`.
  - API:
    - `resolveCustomerRevenue(customerId, options?)`:
      * Load `Order.find({ customerId, isActive: true })`.
      * Map sang `OrderRuleInput` DTO.
      * `decideForAll()` → `Map<orderId, RevenueDecision>`.
      * Detect thay đổi so với DB (locked/owner/reason).
      * Persist batched trong transaction.
      * Ghi `OrderHistory` (khi có `actorEmployeeId`).
      * Skip order không đổi (trừ `options.force`).
    - `resolveAllCustomers(actorEmployeeId?)`:
      * Quét `Order.distinct("customerId")` + loop `resolveCustomerRevenue()`.
      * Cron / migration / manual trigger.
  - Hỗ trợ options:
    - `session?: mongoose.ClientSession` — caller truyền session riêng (POST/PUT wire).
    - `actorEmployeeId?: Types.ObjectId | null` — null = skip history (seed/migration).
    - `force?: boolean` — bỏ qua diff check.
  - **KHÔNG viết API. KHÔNG gọi từ Route.** Wire sẽ làm ở Phase 4.
  - Trả về `CustomerRevenueResult` (totals + persistedCount + changedCount + elapsedMs).
- **Order Module - Phase 4.1: Warehouse Foundation (2026-08-01)**
  - Mục tiêu: chuẩn bị nền tảng để Order giữ kho / trừ kho / hoàn kho ở Phase sau.
  - **KHÔNG làm:** Shipment / Stock Engine / Auto Reserve / Inventory Adjustment API / Dashboard / API trigger.
  - Tạo `src/constants/inventoryStatus.ts`:
    - `InventoryTransactionType` (INBOUND / OUTBOUND / TRANSFER / ADJUST).
    - `InventoryAction` (RESERVE / UNRESERVE / OUT / RETURN / INBOUND / ADJUST / TRANSFER_OUT / TRANSFER_IN).
    - `InventoryReason` (ORDER_RESERVED / ORDER_UNRESERVED / ORDER_OUT / ORDER_CANCELLED / ORDER_RETURNED / SUPPLIER_RECEIVED / SUPPLIER_RETURNED / WAREHOUSE_TRANSFER / WAREHOUSE_AUDIT / WAREHOUSE_DAMAGED / WAREHOUSE_LOST / WAREHOUSE_FOUND / SYSTEM_ADJUST / SYSTEM_MIGRATION).
    - `InventoryState` (AVAILABLE / RESERVED / SOLD / RETURNED / ADJUSTED / TRANSFERRED_OUT / TRANSFERRED_IN / LOST / DAMAGED).
    - `InventorySource` (MANUAL / ORDER / SUPPLIER_RECEIPT / STOCKTAKE / SYSTEM).
    - Helpers + mapping sets: `INBOUND_ACTIONS`, `OUTBOUND_ACTIONS`, `ORDER_REQUIRED_ACTIONS`, `TRANSACTION_TYPE_ACTIONS`.
  - Tạo `src/models/InventoryHistory.ts`:
    - Fields: warehouseId / productVariantId? / comboId? / orderId? / employeeId / transactionType / action / reason / source / beforeQuantity / changeQuantity / afterQuantity / note? / createdAt.
    - **Append-only log** (không UPDATE field khác ngoài `note` ở schema).
    - Indexes: `warehouseId`, `productVariantId`, `orderId`, `createdAt DESC`; compound `(warehouseId, productVariantId, createdAt DESC)`, `(warehouseId, comboId, createdAt DESC)`, `(orderId, createdAt DESC)`.
  - Tạo `src/mappers/inventory.mapper.ts`:
    - `InventoryHistoryResponse` DTO + 4 label records (`INVENTORY_TRANSACTION_TYPE_LABELS` / `INVENTORY_ACTION_LABELS` / `INVENTORY_REASON_LABELS` / `INVENTORY_SOURCE_LABELS`).
    - `mapInventoryHistory(doc)` + `mapInventoryHistoryList(docs)`.
    - Helper ép enum an toàn `asTransactionType/asAction/asReason/asSource` (chống string cũ trong DB).
  - `src/utils/validator.ts` thêm:
    - Import 4 enum từ `inventoryStatus.ts`.
    - `createInventoryHistorySchema` — Zod schema đầy đủ, ObjectId regex, `changeQuantity` không được 0.
    - `updateInventoryHistorySchema` — chỉ cho phép sửa `note` (append-only philosophy).
    - Types: `CreateInventoryHistoryForm`, `UpdateInventoryHistoryForm`.
  - **KHÔNG viết API. KHÔNG CRUD. KHÔNG Transaction. KHÔNG Stock Engine.** Phase 4.2+ sẽ wire.
  - **Phase 4.1 mở rộng (2026-08-01) — Reference Code & Type:**
    - `src/constants/inventoryStatus.ts` thêm:
      * `InventoryReferenceType` (ORDER / LEAD / PURCHASE / TRANSFER / ADJUSTMENT / SUPPLIER / MANUAL / SYSTEM).
      * `INVENTORY_REFERENCE_CODE_PREFIXES` map prefix `OD` / `LD` / `WH` / `TR` / `AD` / `SP` / `MN` / `SY`.
    - `src/models/InventoryHistory.ts` thêm fields: `referenceType` (optional enum, indexed) + `referenceCode` (optional string, indexed).
      * Compound indexes thêm: `(referenceCode, warehouseId)` + `(referenceType, createdAt DESC)`.
    - `src/mappers/inventory.mapper.ts`:
      * `INVENTORY_REFERENCE_TYPE_LABELS` record.
      * DTO thêm `referenceType` + `referenceTypeLabel` + `referenceCode`.
      * Helper `asReferenceType()` ép enum an toàn.
    - `src/utils/validator.ts` `createInventoryHistorySchema` thêm 2 field optional:
      * `referenceType` (enum 8 giá trị).
      * `referenceCode` (string 3-64 ký tự).
  - Mục đích: Timeline UI đọc mã người-đọc (`OD250801001`) làm anchor, không phải đoán qua `reason`.
- **Order Module - Phase 4.2: Stock Engine (2026-08-01)**
  - Tầng Infrastructure — quản lý tồn kho chuẩn. Phase sau chỉ cần gọi Stock Engine.
  - **KHÔNG làm:** Shipment / Dashboard / Commission / API Route / UI /
    Inventory Adjustment API / Warehouse CRUD / tự viết Business Rule.
  - Tạo `src/services/warehouse/stockEngine.errors.ts` — Chuẩn hoá error layer:
    - `StockEngineError` (abstract base) — `name` / `code` / `statusCode` / `context`.
    - `InsufficientStockError` (409) — `availableQuantity < requested`.
    - `InsufficientReservedStockError` (409) — `reservedQuantity < requested`.
    - `InsufficientQuantityError` (409) — `quantity < |signedChange|`.
    - `InventoryNotFoundError` (404) — row không tồn tại.
    - `WarehouseNotFoundError` (404) — warehouseId không tồn tại / inactive.
    - `InvalidStockInputError` (400) — input sai (lineItem, quantity, comboId chưa hỗ trợ, ...).
    - `UnsupportedActionError` (400) — action không qua đúng hàm.
    - API layer Phase sau chỉ cần `instanceof` → trả HTTP đúng.
  - Tạo `src/services/warehouse/stockEngine.service.ts`:
    - `reserveStock(warehouseId, items, ctx, options?) → StockChangeResult[]`
      * `RESERVE` — tăng `reservedQuantity`, throw `InsufficientStockError` nếu thiếu available.
      * `changeQuantity = 0` (RESERVE không đổi `quantity` tổng).
      * History: action=RESERVE, reason=ORDER_RESERVED.
    - `releaseReservedStock(warehouseId, items, ctx, options?) → StockChangeResult[]`
      * `UNRESERVE` — giảm `reservedQuantity`, throw `InsufficientReservedStockError`.
      * History: action=UNRESERVE, reason=ORDER_UNRESERVED.
    - `deductStock(warehouseId, items, ctx, options?) → StockChangeResult[]`
      * `OUT` — giảm `quantity` + `reservedQuantity` đồng thời.
      * Throw `InsufficientReservedStockError` hoặc `InsufficientQuantityError`.
      * History: action=OUT, reason=ORDER_OUT.
    - `returnStock(warehouseId, items, ctx, options?) → StockChangeResult[]`
      * `RETURN` — tăng `quantity`, upsert row nếu thiếu.
      * History: action=RETURN, reason=ORDER_RETURNED.
    - `adjustStock(warehouseId, inputs, ctx, options?) → StockChangeResult[]`
      * `ADJUST` — `signedQuantity` có dấu: dương = tăng, âm = giảm.
      * Upsert row nếu thiếu.
      * Reason mặc định: `WAREHOUSE_FOUND` (tăng) / `WAREHOUSE_AUDIT` (giảm); caller override được.
      * History: action=ADJUST, changeQuantity giữ dấu âm nếu giảm.
    - `transferStock(input, ctx, options?) → TransferStockResult[]`
      * Cặp `TRANSFER_OUT` (source) + `TRANSFER_IN` (destination) trong CÙNG transaction.
      * Source phải có sẵn row, destination upsert nếu thiếu.
      * Cùng `referenceType` + `referenceCode` để truy vết cặp.
      * History: action=TRANSFER_OUT / TRANSFER_IN, reason=WAREHOUSE_TRANSFER.
      * Throw `InvalidStockInputError` nếu source = destination.
  - Mỗi hàm:
    - Dùng `mongoose.startSession()` + `runInTransaction` helper (tự start/commit/abort nếu caller không truyền session).
    - Nhận `session?: mongoose.ClientSession` (optional) — caller truyền để share với transaction khác.
    - Rollback khi lỗi (abort + rethrow).
    - Kiểm tra tồn trước khi update (throw error class chuẩn hoá).
    - Append `InventoryHistory` trong CÙNG session (chỉ persist khi commit).
    - KHÔNG tự viết Business Rule — chỉ chuẩn hoá infrastructure.
  - Return type `StockChangeResult` (mỗi item) gồm:
    ```
    {
      warehouseId, productVariantId?, comboId?, action,
      before:  { quantity, reservedQuantity, availableQuantity },
      after:   { quantity, reservedQuantity, availableQuantity },
      changed: { quantity, reservedQuantity, availableQuantity },
      historyId  // trỏ về InventoryHistory row vừa tạo (audit link)
    }
    ```
    Caller (Dashboard / Audit / API) đọc trực tiếp, KHÔNG query lại DB.
  - `TransferStockResult` wrap cho TRANSFER: `{ item, out: StockChangeResult, in: StockChangeResult }`.
  - Public types:
    - `StockLineItem { productVariantId? | comboId?, quantity }` — đúng 1 trong 2 id.
    - `StockContext { actorEmployeeId, referenceType?, referenceCode?, orderId?, note?, source? }`.
    - `AdjustStockInput extends StockLineItem { signedQuantity, reason? }`.
    - `TransferStockInput { sourceWarehouseId, destinationWarehouseId, items[] }`.
  - Quy ước kỹ thuật:
    - Update Inventory dùng `$inc` (atomic) cho `quantity` / `reservedQuantity` + `$set` cho `availableQuantity`.
    - StockLineItem nếu dùng `comboId` → throw `InvalidStockInputError` (Inventory model hiện chưa hỗ trợ combo, Phase sau sẽ mở rộng schema).
    - Transaction type mặc định theo action (RESERVE/UNRESERVE/OUT → OUTBOUND, RETURN/ADJUST → ADJUST, TRANSFER_* → TRANSFER).
    - `reason` mặc định: ORDER_RESERVED / ORDER_UNRESERVED / ORDER_OUT / ORDER_RETURNED / WAREHOUSE_TRANSFER.
    - `source` mặc định: SYSTEM (caller override được).
  - **KHÔNG viết API. KHÔNG gọi từ Order CRUD.** Phase 4.3+ sẽ wire.
  - **Phase 4.2 Refactor (2026-08-01) — Standardize Error + Return Snapshot:**
    - Tách error ra file riêng `stockEngine.errors.ts` để API layer `instanceof` → HTTP code chuẩn.
    - Mỗi hàm giờ trả `StockChangeResult[]` (hoặc `TransferStockResult[]`) với `before` / `after` / `changed` + `historyId` — Dashboard / Audit không cần query lại DB.
- **Order Module - Phase 5.1: Order Permissions (2026-08-01)**
  - **Mục tiêu:** hoàn thiện Permission cho toàn bộ Order Module — chuẩn bị nền cho Phase 5.x (Confirm / Cancel API), Phase 6.x (Revenue UI), Phase 7.x (Shipment), v.v.
  - **KHÔNG làm:** API / CRUD / Revenue / Warehouse / Shipment / Dashboard / Seed.
  - **`src/constants/permissions.ts` — bổ sung 5 permission Order:**
    - `order.view`             — Xem đơn.
    - `order.create`           — Tạo đơn.
    - `order.update`           — Sửa đơn.
    - `order.delete`           — Xóa đơn.
    - `order.confirm`          — Xác nhận đơn (phase sau sẽ dùng).
    - `order.cancel`           — Hủy đơn (phase sau sẽ dùng).
    - `order.history`          — Xem OrderHistory timeline.
    - `order.revenue`          — Xem thông tin revenue (marketing/sale final, lock reason).
    - `order.reserve_stock`    — Giữ / trả chỗ kho cho đơn (do WAREHOUSE role dùng).
    - `permissions.seed.ts` tự động pick up khi seed (dùng `PERMISSIONS` constant — không cần sửa seeder).
  - **`src/constants/roles.ts` — phân quyền theo nghiệp vụ:**
    - `ADMIN`        → Full (wildcard `*`).
    - `MANAGER`      → Full Order (9 permission ở trên).
    - `SALE`         → `order.view / create / update / history` (chốt + sửa đơn, không xóa, không reserve/release kho).
    - `MKT`          → `order.view` (xem đơn phát sinh từ Lead — đánh giá conversion).
    - `WAREHOUSE`    → `order.view / reserve_stock / history` (giữ/trả chỗ kho).
    - `LEADER`       → giữ tương thích + thêm `order.confirm / cancel / history`.
    - `EMPLOYEE`     → `order.view / create` (giữ tương thích).
  - **Nguyên tắc áp dụng:**
    - Middleware / route **CHỈ check permission** — KHÔNG hardcode role name.
    - `currentUser.permissions.includes("order.<action>")` là pattern duy nhất.
    - SALE không xóa đơn (`order.delete`) — chỉ Manager trở lên.
    - WAREHOUSE không sửa thông tin đơn (`order.update`) — chỉ reserve/release kho qua Stock Engine.
    - MKT chỉ xem — không tạo đơn (do SALE chốt).
  - **Kiểm tra toàn bộ API Order (Phase 4.3 đã dùng đúng key):**
    - `GET /api/orders`        → `order.view`.
    - `GET /api/orders/[id]`   → `order.view`.
    - `POST /api/orders`       → `order.create`.
    - `PUT /api/orders/[id]`   → `order.update`.
    - `DELETE /api/orders/[id]`→ `order.delete`.
    - Không còn hardcode role name trong route layer.
  - **Phase sau (tham khảo):**
    - 5.2 Order Seed (sample data 18 đơn, đã có — xem bên dưới).
    - 5.3 Confirm Order API → dùng `order.confirm`.
    - 5.4 Cancel Order API → dùng `order.cancel`.
    - 5.5 OrderHistory UI → dùng `order.history`.
    - 5.6 Revenue UI / Dashboard → dùng `order.revenue`.
    - 5.7 Stock Reservation API (tách riêng) → dùng `order.reserve_stock`.
- **Order Module - Phase 5.2: Order Seed (2026-08-01)**
  - **Mục tiêu:** tạo dữ liệu mẫu để test toàn bộ backend Order — idempotent, chạy lại nhiều lần không sinh document trùng.
  - **KHÔNG làm:** API / CRUD / Revenue / Warehouse / Shipment / Dashboard.
  - **File mới: `src/db/seeds/orders.seed.ts`** — seed 18 Order, bao phủ đầy đủ:
    - **Status (7)**: `PENDING / CONFIRMED / PREPAID / SHIPPING / COMPLETED / CANCELLED / FAILED` — `REJECTED` không seed riêng (giống FAILED về revenue) nhưng enum vẫn nhận.
    - **OrderType (5)**: `NORMAL / COMBO / GIFT / EXCHANGE / REPLACEMENT`.
    - **OrderSource (5)**: `FACEBOOK / IMPORT / PHONE / WEBSITE / MANUAL`.
    - **Revenue Lock**: cả `revenueLocked=true` (#2, #3, #4, #5, #6, #13, #15) và `revenueLocked=false`.
    - **Stock Reservation (audit-only)**: `stockReservedAt` set cho 9 đơn, không set cho 9 đơn còn lại.
    - **Linked Documents**:
      - `customerId` — 5 đơn dùng Customer từ Lead seed (KH000001..005), 6 đơn tạo mới Customer KH-SPEC-* trong Order seed.
      - `leadId` — 6 đơn link trực tiếp tới Lead (#1, #2, #4, #13, #15, #17); các đơn khác bỏ qua (đơn Manual / Import / REPLACEMENT).
      - `productVariantId` / `comboId` — link theo từng orderType (NORMAL ↔ variant, COMBO/GIFT ↔ combo).
      - `warehouseId` — tự tạo 2 Warehouse `WH-PVD-01` / `WH-PVD-02` (chưa có seed Warehouse riêng) idempotent qua `Warehouse.findOneAndUpdate({ code })`.
      - `marketingEmployeeId` / `saleEmployeeId` — `EMP_MKT001/002`, `EMP_SALE001/002/003`.
    - **Payments**: phủ `CASH / BANK_TRANSFER / MOMO` (partial + full) trên các đơn đã thanh toán.
    - **Shipping**: 3 đơn VNPost, 3 đơn J&T, có `trackingNumber / carrier / estimatedDelivery / actualDelivery / shippingFee` đầy đủ.
  - **OrderHistory:**
    - Tất cả 18 đơn đều có 1 entry `CREATED`.
    - **Action extra** (đa dạng): `STATUS_CHANGED`, `PAYMENT_ADDED`, `SHIPPING_UPDATED`, `STOCK_RESERVED`, `REVENUE_LOCKED`, `REVENUE_UNLOCKED`, `DELETED`.
    - 6 đơn (#1, #2, #4, #10, #12, #13, #14, #15, #18) có `STOCK_RESERVED` để test audit-only Phase 4.3.
    - Idempotent qua `findOne({ orderId, action, note }).lean()` — chạy lại nhiều lần không thêm entry trùng.
  - **Idempotency strategy:**
    - Mỗi `spec.seedCode` deterministic theo `baseDateKey` (vd `OD2508010001`) → `Order.findOne({ orderCode })` trả cùng doc qua các lần seed.
    - Fallback `Order.findOne({ customerName, customerPhone, totalAmount, productVariantId / comboId, createdAt ±1h })` để an toàn khi các seed chạy ngày khác nhau.
    - **Warehouse**: tự upsert `code` (giống pattern Lead seed tự tạo Customer).
    - **Customer**: nếu `customerCode` không có → `ensureCustomer({ code: "KH-SPEC-..." })`.
    - `Counter` KHÔNG reset, không dùng để build orderCode (giữ route POST counter riêng).
  - **Constraints tuân thủ Phase 4.3 Refactor:**
    - KHÔNG set `stockReserved` (boolean) — đã bỏ khỏi model.
    - CHỈ set `stockReservedAt` cho đơn "từng chạm Stock Engine" (audit).
    - `stockReservedAt` ≠ `true` ngay cả khi set; audit field chỉ để biết "lần cuối Order reserve/release là khi nào".
  - **`src/db/seed.ts`** — gọi `await seedOrders()` SAU `seedLeads()` (vì Order seed dùng Customer mà Lead seed đã tạo).
  - **Verification khi chạy:**
    - In log: `Status:` (đếm theo status), `Type:`, `Source:`, `revenueLocked=true/false`, `unlock-status orders`.
    - Có thể `db.orders.find({ revenueLocked: true }).count()` / `db.orderhistories.countDocuments()`.
- **Order Module - Phase 4.3 Refactor (2026-08-01) — Drop `stockReserved` flag + Add STOCK_RESERVED/RELEASED actions**
  - **Vấn đề:**
    - `Order.stockReserved` (boolean) dễ lệch sau chuỗi Reserve ↓ Release ↓ Reserve. Nếu chỉ dựa vào flag, caller không biết thực sự còn giữ chỗ hay không → có thể reserve / release trùng.
    - OrderHistory chỉ có `UPDATED` chung chung → Timeline UI khó đọc (không phân biệt "đổi field" với "đã reserve/release kho").
  - **Giải pháp — InventoryHistory làm source of truth:**
    - Bỏ `Order.stockReserved` (boolean). Chỉ giữ `Order.stockReservedAt?: Date` cho **audit** (lần cuối Stock Engine được gọi cho Order này).
    - Thêm field `reservedChange: number` (signed, default 0) vào `InventoryHistory`:
      - `RESERVE` → `reservedChange = +qty` (input StockLineItem).
      - `UNRESERVE` → `reservedChange = −qty`.
      - Các action khác (`OUT` / `RETURN` / `INBOUND` / `ADJUST` / `TRANSFER_*`) → 0.
    - `orderStockWiring.helper.queryNetReserved(orderId, session)` aggregate `Σ reservedChange where orderId = X` theo `productVariantId` → `Map<variantId, netReserved>`.
    - Rule "đang giữ chỗ" = `netReserved >= oldOrder.quantity`.
  - **`OrderStockSnapshot` rút gọn:** bỏ field `stockReserved` (không còn dựa vào flag).
    - `buildStockWiringPlan(old, new, netMap)`, `buildStockWiringPlanForCreate(new)`, `buildStockWiringPlanForDelete(old, netMap)` — helper nhận `netMap` (hoặc rỗng cho POST) thay vì `stockReserved`.
  - **`OrderAction` mới:**
    - `STOCK_RESERVED = "STOCK_RESERVED"` (label: "Giữ chỗ tồn kho")
    - `STOCK_RELEASED = "STOCK_RELEASED"` (label: "Trả chỗ tồn kho")
    - `ORDER_ACTION_LABELS` được cập nhật tương ứng.
  - **POST /api/orders flow cập nhật:**
    - Bỏ `stockReserved: false` trong payload Order.create.
    - Sau `reserveStock` thành công → chỉ `$set stockReservedAt = now` (audit). KHÔNG set cờ.
    - `OrderHistory.create()` giờ emit **2 entry** (cùng session): `CREATED` + (nếu reserve) `STOCK_RESERVED`.
  - **PUT /api/orders/:id flow cập nhật:**
    - Trong transaction, `queryNetReserved(existedOrder._id, session)` trước khi tính plan.
    - `oldStockSnapshot` không còn `stockReserved`.
    - Sau `releaseReservedStock` → push history `STOCK_RELEASED` (note kèm qty).
    - Sau `reserveStock` → push history `STOCK_RESERVED` + `updateData.stockReservedAt = now` (audit).
    - Bỏ nhánh update `updateData.stockReserved` (đã bỏ field).
  - **DELETE /api/orders/:id flow cập nhật:**
    - Trong transaction, `queryNetReserved(...)` + `buildStockWiringPlanForDelete(snap, netMap)`.
    - Sau `releaseReservedStock` → emit history `STOCK_RELEASED`.
    - Soft delete: `$set isActive = false, stockReservedAt = undefined` (KHÔNG set cờ).
  - **Mapper (`order.mapper.ts`):** thêm `stockReservedAt?: string` (ISO) vào `OrderResponse` — cho frontend audit.
  - **Invariant đảm bảo:**
    - Không còn race condition giữa `Order.stockReserved` và `Inventory.reservedQuantity`.
    - `queryNetReserved` đọc CÙNG session với write → luôn thấy được trạng thái thực tại tính đến trước thời điểm gọi.
    - Reserve / Release / Reserve không bao giờ lệch.
  - **InventoryHistory schema mở rộng:** thêm `reservedChange: { type: Number, default: 0 }` (backward-compat với rows cũ — default 0 nên aggregate vẫn đúng).
- **Order Module - Phase 4.3: Wire Stock Engine + Revenue Engine (2026-08-01)**
  - Mục tiêu: wire Order CRUD với 2 service đã có (`stockEngine.service.ts` + `revenueEngine.service.ts`). KHÔNG sửa Business Rule, KHÔNG sửa Stock Engine, KHÔNG sửa Revenue Rule.
  - **KHÔNG làm:** Shipment / Dashboard / Commission / KPI / Notification / Auto Assign / UI.
  - **Order model mở rộng (chuẩn bị wiring):**
    - Thêm `productVariantId?: ObjectId` (ref ProductVariant) — key Stock Engine dùng để reserve / release.
    - Thêm `stockReservedAt?: Date` (audit-only) — KHÔNG dùng làm cờ boolean nữa. Source of truth cho "đang giữ chỗ" là `Σ reservedChange` trên InventoryHistory (xem Phase 4.3 Refactor).
    - Index `(productVariantId)` + duplicate `(warehouseId, isActive)` đã có.
  - **Validator mở rộng:**
    - `createOrderSchema` / `updateOrderSchema` thêm `productVariantId` (optional, nullable, ObjectId regex).
  - **Mapper mở rộng:**
    - `OrderResponse` + `mapOrder()` + `mapOrderList()` export `productVariantId`.
  - **Helper wiring (mới):**
    - `src/services/order/orderStockWiring.helper.ts` — pure helper, có aggregate DB call cho `netMap`.
      * `OrderStockSnapshot` — chỉ chứa field cần thiết (warehouseId / productVariantId / comboId / quantity / orderType). KHÔNG có `stockReserved` (đã bỏ).
      * `StockPlan { release: StockLineItem | null, reserve: StockLineItem | null }` — caller tự gọi Stock Engine.
      * `canHaveStockReserve()` — gate theo OrderType (non-revenue ⇒ skip) + presence (warehouse + variant/combo + qty).
      * `queryNetReserved(orderId, session)` — aggregate `Σ reservedChange` từ InventoryHistory (cùng session) → `Map<variantId, netReserved>`. Source of truth.
      * `buildStockWiringPlan(old, new, netMap)` — cho PUT:
        - Không đổi (warehouse/productVariant/combo/qty) → skip.
        - Đổi → release reserved (nếu `netMap[oldVariant] >= oldQty`) + reserve mới (nếu newOrder đủ điều kiện).
      * `buildStockWiringPlanForCreate(new)` — cho POST (không cần netMap).
      * `buildStockWiringPlanForDelete(old, netMap)` — cho DELETE.
  - **POST /api/orders — flow trong 1 transaction:**
    1. Validate + reference existence (Customer / Lead / Product / ProductVariant / Combo / Warehouse / Employee).
    2. Generate `orderCode` qua Counter (atomic).
    3. `Order.create()` với `stockReservedAt=undefined`, revenue defaults. KHÔNG set `stockReserved` (đã bỏ).
    4. `buildStockWiringPlanForCreate(snapshot)` → nếu `reserve != null` → `reserveStock({ session, ...)
       - Catch `StockEngineError` → abort transaction + trả HTTP statusCode từ error class.
       - Update `Order.stockReservedAt = now` (audit).
    5. `resolveCustomerRevenue(customerId, { session, actorEmployeeId })` — cùng session.
    6. `OrderHistory.create()` emit 2 entry: `CREATED` + (nếu reserve) `STOCK_RESERVED`.
    7. `session.commitTransaction()` — toàn bộ rollback nếu bất kỳ bước nào throw.
  - **PUT /api/orders/:id — flow trong 1 transaction:**
    1. Validate + status lock guard (COMPLETED/CANCELLED/REJECTED/FAILED → 409).
    2. Build `updateData` từ diff (customer / product / productVariant / combo / warehouse / status / payments / shipping / passthrough).
    3. Build `oldStockSnapshot` (từ existedOrder) + `newStockSnapshot` (từ updateData + old fallback). KHÔNG có `stockReserved`.
    4. `startTransaction()` + `queryNetReserved(existedOrder._id, session)` → netMap.
    5. `buildStockWiringPlan(old, new, netMap)` → plan.
    6. Trong transaction:
       - Nếu `release != null` → `releaseReservedStock({ session, ... })` + pushHistory(STOCK_RELEASED).
       - Nếu `reserve != null` → `reserveStock({ session, ... })` + pushHistory(STOCK_RESERVED) + set `updateData.stockReservedAt = now`.
       - `Order.updateOne(...)` + `OrderHistory.insertMany(...)`.
       - Nếu đổi customerId / productId / productVariantId / comboId / status / isPrepaid → `resolveCustomerRevenue(customerId, { session, actorEmployeeId })`.
    6. `session.commitTransaction()`.
  - **DELETE /api/orders/:id — flow trong 1 transaction:**
    1. Validate + status lock guard (COMPLETED → 409).
    2. `startTransaction()` + `queryNetReserved(...)` → netMap.
    3. Build `oldStockSnapshot` từ existedOrder + `buildStockWiringPlanForDelete(snap, netMap)`.
    4. Nếu `release != null` → `releaseReservedStock({ session, ... })`.
    5. `Order.updateOne(isActive=false, stockReservedAt=undefined)` (soft delete). KHÔNG set cờ `stockReserved`.
    6. `resolveCustomerRevenue(customerId, { session, actorEmployeeId })` — mở khóa slot cho đơn sau của cùng Customer.
    7. `OrderHistory.create()` emit 2 entry: `DELETED` + (nếu đã release) `STOCK_RELEASED`.
    8. `session.commitTransaction()`.
  - **Quy ước xuyên suốt:**
    - Order CRUD tự tạo `session` qua `mongoose.startSession()` + `startTransaction()`.
    - `Stock Engine` + `Revenue Engine` + `Order` + `OrderHistory` + `InventoryHistory` đều dùng CÙNG session — rollback toàn bộ nếu lỗi bất kỳ bước nào.
    - `StockEngineError` (statusCode 400/404/409) được catch + map sang HTTP tại route layer.
    - `referenceType = InventoryReferenceType.ORDER`, `referenceCode = orderCode` cho mọi `InventoryHistory` sinh ra từ Order CRUD.
    - `actorEmployeeId = currentUser.employee._id` cho cả Revenue Engine + Stock Engine.
    - KHÔNG duplicate reserve / duplicate release — `InventoryHistory.reservedChange` aggregate (queryNetReserved) + `buildStockWiringPlan` đảm bảo idempotent (xem Phase 4.3 Refactor).
    - KHÔNG tự viết Business Rule — chỉ gọi service.
    - KHÔNG hardcode logic — chỉ wire.
  - **Đã có chuẩn bị cho phase sau:**
    - `reserveStock` / `releaseReservedStock` trả `StockChangeResult[]` với `historyId` — Audit / Dashboard phase sau dùng trực tiếp, không query lại DB.
    - `resolveCustomerRevenue` đã ghi `OrderHistory(action=REVENUE_LOCKED/UNLOCKED/RECALCULATED)` tự động.
- **Order Module - Phase 4 (tương lai) — Wire Engine vào POST/PUT Orders**
  - Tạo `src/constants/orderStatus.ts`
    - `OrderStatus` (PENDING / CONFIRMED / PREPAID / SHIPPING / COMPLETED / CANCELLED / REJECTED / FAILED)
    - `REVENUE_UNLOCK_STATUSES` (CANCELLED / REJECTED / FAILED)
    - `RevenueLockReason` (NONE / WAITING_PREVIOUS_ORDER / CUSTOMER_ALREADY_BUYING / PREPAID_PRIORITY / ORDER_CANCELLED)
  - Tạo `src/models/Order.ts`
    - Revenue fields: `marketingRevenueRaw`, `marketingRevenueFinal`,
      `saleRevenueRaw`, `saleRevenueFinal`, `revenueEligible`,
      `revenueLockReason`, `revenueCalculatedAt`
    - Indexes: `(customerId, productId|comboId, status, createdAt)`
      để recalculate 1 query
  - Tạo `src/services/order/orderRevenue.service.ts`
    - `evaluateAndLock(order, customerOrders)` - pure evaluator
    - `recalculateForCustomer(customerId)` - 1 query + 1 bulkWrite
    - `recalculateForOrder(orderId)` - tiện cho update 1 đơn
    - `transitionStatusAndRecalculate(orderId, nextStatus)` - API layer hook
    - Sẵn sàng cho Order Update / Cancel / Completed / Refund
  - Rule đã cài:
    - Trùng Product/Combo: đơn đầu = eligible, đơn sau = locked (WAITING_PREVIOUS_ORDER)
    - Unlock: đơn trước sang CANCELLED/REJECTED/FAILED → mở cho đơn sau
    - Prepaid Priority: đơn sau trả trước → chiếm slot, đơn trước PREPAID_PRIORITY
    - Khác Product/Combo → không khóa
    - Đơn unlock-status → ORDER_CANCELLED
  - KHÔNG làm: API / Dashboard / KPI / Commission
- **Lead Seed Completed (2026-08-01)**
  - `src/db/seeds/leads.seed.ts` - 16 Lead bao phủ đủ 8 trạng thái:
    NEW / ASSIGNED / PROCESSING / NO_ANSWER / POTENTIAL /
    ORDER_CREATED / REJECTED / CANCELLED
  - Mỗi Lead kèm LeadHistory (CREATED → ASSIGNED → STATUS_CHANGED → NOTE_UPDATED)
  - Đa dạng tình huống:
    * Lead mới (1)
    * Trùng SĐT (Lead #9 trùng #3, #13 trùng #12)
    * Trùng Facebook (Lead #10 trùng #3)
    * Đã có Customer (Lead #3, #5, #6, #12, #15)
    * Chưa có Customer (Lead #1, #2, #4, #7, #8, #9, #11, #13, #14, #16)
    * Đã có Sale (Lead #2, #3, #4, #5, #6, #7, #8, #10, #12, #13, #14, #16)
    * Chưa có Sale (Lead #1, #9, #11, #15)
  - `LeadCode` lấy từ Counter `LEAD` (atomic `$inc`, padded 6 số)
  - `CUSTOMER` counter cũng được thêm vào `constants/counters.ts`
  - File `seed.ts` đã đăng ký `await seedLeads()`
  - Pre-create 5 Customer (KH000001..KH000005) để link cho "Lead đã có Customer"
- **Lead Import Parser + Preview Completed**


## Phase A — Foundation UI (2026-08-01)

### Status

✅ Completed

### Mục tiêu Phase A

- KHÔNG gọi API.
- KHÔNG CRUD.
- KHÔNG Revenue Engine / Warehouse Engine.
- KHÔNG mock business logic.
- Chỉ dựng khung giao diện (AppShell + Sidebar + Header + Route Group).

### Cấu trúc thư mục

```
src/
├── config/
│   ├── nav.config.tsx              # NAV_GROUPS + BRAND_NAME (static)
│   └── breadcrumb.config.ts        # buildBreadcrumbs(pathname)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx            # Flex wrapper: Sidebar + Header + Content
│   │   ├── Sidebar.tsx             # Logo + Nav groups + Collapse + Responsive
│   │   └── Header.tsx              # Breadcrumb + Search + Notification + User menu
│   └── placeholder/
│       └── PlaceholderPage.tsx     # Generic placeholder cho mọi route
└── app/
    ├── page.tsx                    # Redirect → /dashboard
    └── (admin)/                    # Route group: layout chứa AppShell
        ├── layout.tsx
        ├── dashboard/page.tsx
        ├── marketing/
        │   ├── dashboard/page.tsx
        │   ├── input/page.tsx
        │   └── orders/page.tsx
        ├── leads/page.tsx
        ├── customers/page.tsx
        ├── orders/page.tsx
        ├── products/page.tsx
        ├── warehouses/page.tsx
        ├── employees/page.tsx
        └── roles/page.tsx
```

### Components

#### `AppShell`
- Flex container với `h-screen`, `overflow-hidden`.
- Sidebar bên trái (sticky, fixed width khi mở rộng, collapsed width 64px).
- Header `h-14` bên trên + main scrollable `flex-1` bên dưới.
- Background `bg-gray-50`.

#### `Sidebar`
- AntD `Layout.Sider` với `collapsible`, `breakpoint="lg"`, `trigger={null}` (custom toggle).
- Brand: icon + "Mongolia CRM" (ẩn khi collapse).
- Nav groups 6 nhóm: `Tổng quan / Marketing / Bán hàng / Kho / Danh mục / Quản trị`.
- Active state: `bg-blue-50 text-blue-600 font-medium` dựa trên `usePathname()`.
- Tooltip label khi collapsed.
- Toggle button ở footer.

#### `Header`
- Breadcrumb (từ `buildBreadcrumbs()`).
- Search input (AntD `Search`, no-op).
- Notification badge (AntD `Badge`, disabled).
- User dropdown (AntD `Dropdown`, menu items disabled — Phase A placeholder).
- Avatar cố định "Admin" (placeholder).

#### `PlaceholderPage`
- Props: `title`, `description`, `badge`, `children`.
- Card với Title + Description + dashed div nội dung placeholder.
- Badge nhắc Sprint sẽ dựng.

### Các trang (route) — Phase A

| Route | Phase sau | Trạng thái |
|-------|-----------|------------|
| `/dashboard` | Sprint 4 | Placeholder |
| `/marketing/dashboard` | Sprint 4 | Placeholder (không có Ads report) |
| `/marketing/input` | Sprint 9 | Placeholder |
| `/marketing/orders` | Sprint 9 | Placeholder |
| `/leads` | Sprint 5 | Placeholder |
| `/customers` | Sprint 6 | Placeholder |
| `/orders` | Sprint 7-8 | Placeholder |
| `/products` | Sprint 10 | Placeholder |
| `/warehouses` | Sprint 11 | Placeholder |
| `/employees` | Sprint 12 | Placeholder |
| `/roles` | Sprint 12 | Placeholder |

### Domain logic KHÔNG động tới (Phase A)

- KHÔNG gọi API.
- KHÔNG CRUD / form submit.
- KHÔNG kết nối `useAuthStore` / `auth.store` (chưa cần guard).
- KHÔNG wire `React Query` (đã có provider, chưa dùng).
- KHÔNG gọi `LeadImportPreview.tsx` (chưa mount).
- KHÔNG sửa backend.

### Dependencies

- Không thêm dependency mới.
- Tái sử dụng: `antd`, `@ant-design/icons`, `next/navigation`, `next/link`.

### Deliverable

- Truy cập `/` → redirect `/dashboard`.
- Sidebar hiển thị đầy đủ nhóm nav, collapse/expand, responsive dưới `lg`.
- Header có breadcrumb, search, notification, user menu (placeholder).
- Click qua từng nav item → render trang placeholder với Title + badge Sprint.

---

## Phase A.1 — CSS Refactor (2026-08-01)

### Status

✅ Completed

### Mục tiêu Phase A.1

- Chuẩn hoá Foundation UI để sau này dựng toàn bộ CRM.
- Tách toàn bộ CSS của HTML gốc (`mongolia-crm (7).html`) thành các file theo phạm vi.
- **KHÔNG** thêm tính năng / Auth / API / CRUD / Sprint 2 / Dashboard thật.
- **KHÔNG** đổi màu / font / animation / spacing so với HTML gốc.
- **KHÔNG** dùng CSS-in-JS / styled-components / emotion / inline style.
- Component React chỉ dùng `className`. Tailwind chỉ dùng flex/grid/spacing utility nhỏ.

### Cấu trúc stylesheet mới

```
src/styles/
├── globals.css        # Tailwind directives + reset + font + theme + import custom
├── custom.css         # Import hub cho 14 file phạm vi bên dưới
├── layout.css         # .main, .content, .empty, .backdrop, .mob-open, .cnt
├── sidebar.css        # .sb, .brand, .ls/.lb, .rs/.rb, .nav, .ng/.ngs, .nh, .na, .nb, .ni, .pill, .sbf, .sb.col
├── header.css         # .topbar, .pt, .vb (variants), .srch, .tbr
├── card.css           # .card, .card-h, .card-body, .btn (+ variants), .btn-row, .btn-lg
├── table.css          # .tw, table, thead th, tbody td, tbody tr:hover td
├── modal.css          # .mo, .modal (+ h3), .fg, .ma
├── popup.css          # .kp, .kp.show, .kp h4, .ki (+ .kn/.kd)
├── toast.css          # .toast, .toast.show
├── dashboard.css      # .sr, .sc0 (+ sb1/sg/sa/srd/sp2/st2), .db-bar/.db-lb/.db-tr/.db-fl/.db-vl
├── marketing.css      # .prod-sel/.pc/.cl/.cr/.paste-tabs/.pz/.ph/.pw/.pwh/.pvb/.pwb/.rx/.pb/.ccb/.note-i/.ads-row/.ads-m/.nick-sel/.nk
├── orders.css         # .chip, .dot, .c-* (status), .ss, .s2 (+ colored .on), .kb, .role-badge, .role-*
├── warehouse.css      # .wg, .wi, .wi h4, .wi .wq, .wi .wd
├── animation.css      # @keyframes sp2 + .pb (referenced animation)
└── responsive.css     # @media (max-width: 768px) — full mobile overrides
```

### Thống kê

| Metric | Value |
|--------|-------|
| Số file CSS trong `src/styles/` | **16** (15 module + `custom.css`) |
| Tổng số dòng CSS | **1.514** |
| Số class unique được tái sử dụng | **148** (bao gồm state classes `.on`, `.col`, `.show`, `.ct`, `.lt`, `.done`, `.open`) |
| Mapping `globals.css` | Tailwind directives, reset, font, scrollbar, CSS Variables (theme), `@import custom.css` |
| Mapping `custom.css` | chỉ `@import` 14 file phạm vi bên dưới |

### Component ↔ Stylesheet mapping

| Component (TSX) | Stylesheet chính | Classes sử dụng |
|-----------------|------------------|-----------------|
| `AppShell.tsx` | `layout.css` | `.main`, `.content` |
| `Sidebar.tsx` | `sidebar.css` | `.sb`, `.brand`, `.ico`, `.brand-txt`, `.nm`, `.sub`, `.sb-tg`, `.ic-c`, `.ic-o`, `.nav`, `.ng`, `.ngs`, `.nh`, `.nl`, `.nb`, `.ni`, `.pill`, `.sbf`, `.ver`, `.sb.col` |
| `Header.tsx` | `header.css` | `.topbar`, `.pt`, `.vb`, `.vb-b`, `.srch`, `.tbr`, `.cnt`, `.btn`, `.btn-ghost`, `.btn-sm` |
| `PlaceholderPage.tsx` | `card.css` | `.card`, `.card-h`, `.card-body`, `.btn` |
| `src/app/page.tsx` (redirect) | n/a | — |

### Class names bảo tồn (mapping HTML gốc → React)

| HTML gốc | React component / Stylesheet |
|----------|------------------------------|
| `.sb`, `.brand`, `.ni`, `.pill` | `Sidebar.tsx` ↔ `sidebar.css` |
| `.topbar`, `.vb`, `.srch`, `.tbr`, `.cnt` | `Header.tsx` ↔ `header.css` |
| `.card`, `.btn`, `.btn-pri/sec/green/red/purple/ghost/sm/lg` | `PlaceholderPage.tsx`, `Header.tsx` ↔ `card.css` |
| `.sc0`, `.sb1`, `.sg`, `.sa`, `.srd`, `.sp2`, `.st2` | sẵn sàng cho Sprint 4 ↔ `dashboard.css` |
| `.chip`, `.dot`, `.c-new/knm/cls/pot/non/cmt/ladi/ok/ret/rec` | sẵn sàng cho Sprint 5/7 ↔ `orders.css` |
| `.kp`, `.ki` | sẵn sàng cho Sprint 5 (KNM popup) ↔ `popup.css` |
| `.modal`, `.fg`, `.ma` | sẵn sàng cho form Sprint 5+ ↔ `modal.css` |
| `.toast` | sẵn sàng cho feedback Sprint 5+ ↔ `toast.css` |
| `.pc`, `.cr`, `.paste-tab`, `.pz`, `.ph`, `.pw`, `.pb` | sẵn sàng cho Sprint 9 (MKT Input) ↔ `marketing.css` |
| `.wg`, `.wi`, `.wq`, `.wd` | sẵn sàng cho Sprint 11 (Kho) ↔ `warehouse.css` |
| `@keyframes sp2`, `.pb` | sẵn sàng cho push-sale banner ↔ `animation.css` |
| `@media (max-width: 768px)` | responsive sidebar / topbar / modal ↔ `responsive.css` |

### Quy tắc đã áp dụng

- **Class names bảo tồn 100%** so với HTML mẫu — Sprint sau chỉ cần mount JSX tương ứng.
- **Tailwind hạn chế ở utility**: chỉ `flex`, `h-screen`, `w-screen`, `overflow-hidden` trong `AppShell`; phần còn lại là class từ CSS module.
- **Không inline style** trong component Phase A — tất cả visual đi qua class.
- **Không sửa backend**, **không thêm route mới**, **không đổi hành vi** của 11 route placeholder.
- `src/app/globals.css` chỉ là bridge: `@import "../styles/globals.css"` để giữ convention của Next.js App Router.

### Verification

| Check | Kết quả |
|-------|---------|
| `tsc --noEmit` (Phase A files only) | 0 errors |
| `eslint` (16 Phase A files) | 0 errors, 0 warnings |
| Số route placeholder không đổi | 11/11 |
| Số component Phase A không đổi logic | 4/4 |
| Không thêm dependency mới | ✅ |

### Xác nhận

Foundation UI đã được chuẩn hoá với 16 stylesheet phạm vi + 148 class bảo tồn từ HTML mẫu. Sẵn sàng để bắt đầu Sprint 2.

---

⏳ LeadHistory API
⏳ Seed Data
⏳ Auto Assign Sale
⏳ Dashboard
⏳ Report
⏳ Sprint tiếp theo

---

## Sprint 2.2A — Migrate RBAC (Database becomes Source of Truth)

### Status

✅ Completed

### Kiến trúc MongoDB (Source of Truth)

```
roles          (code, name, description, isActive)
permissions    (code, name, module, description, isActive)
role_permissions (roleId, permissionId) — Junction table
employees      (roleId → roles._id)
```

### Files tạo mới

- `src/models/RolePermission.ts` — Junction table model
  - Indexes: `(roleId, permissionId)` unique, `(roleId)`, `(permissionId)`

### Files chỉnh sửa

- `src/models/Role.ts` — Bỏ embedded `permissions[]` array
- `src/db/seeds/permissions.seed.ts` — Thêm `module` field (Dashboard, Employee...)
- `src/db/seeds/roles.seed.ts` — Seed Roles + RolePermission junction table (idempotent)
- `src/lib/auth.ts` — getCurrentUser() fetch permissions qua RolePermission
- `src/app/api/auth/login/route.ts` — Login fetch permissions qua RolePermission

### Seed Order

```
Permissions → Roles → RolePermissions → Employees
```

### Auth Flow (Source of Truth: MongoDB)

```
Employee → Role → RolePermission → Permission → Response
```

### Verification

- [x] Roles collection: ADMIN, MANAGER, SALE, WAREHOUSE, MKT, LEADER, EMPLOYEE
- [x] Permissions collection: ~50 permissions đầy đủ modules
- [x] RolePermissions collection: Junction documents (roleId, permissionId)
- [x] Admin login → permissions đầy đủ (wildcard "*" → all permissions)
- [x] Manager login → permissions theo ROLES config
- [x] Sale login → permissions đúng (order.view, lead.view...)
- [x] Warehouse login → permissions đúng (inventory.view, order.reserve_stock...)
- [x] Marketing login → permissions đúng (facebook-page.view, lead.create...)
- [x] Frontend KHÔNG đọc `src/constants/roles.ts` sau login
- [x] `src/constants/roles.ts` chỉ là ROLE_SEED — chạy khi seed xong KHÔNG dùng lại
- [x] 0 TypeScript Error (RBAC files)

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint 2.4
