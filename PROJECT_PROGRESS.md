# Tiến độ dự án Mongodia

## ✅ Đã hoàn thành

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
- **Order Revenue Lock Engine (2026-08-01)**
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

⏳ LeadHistory API
⏳ Seed Data
⏳ Auto Assign Sale
⏳ Dashboard
