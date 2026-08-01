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
- **Lead Import Parser + Preview Completed**

⏳ LeadHistory API
⏳ Seed Data
⏳ Import Lead (Phase 3.2)
⏳ Auto Assign Sale
⏳ Duplicate Detection
⏳ Dashboard
