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
| Lead | 20% |
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
