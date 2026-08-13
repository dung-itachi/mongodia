# FINAL INVENTORY-WAREHOUSE INTEGRATION AUDIT REPORT

**Project:** Mongodia  
**Audit Date:** August 13, 2026  
**Auditor:** Claude Code  
**Scope:** Order → Inventory → WarehouseInventory → Shipment Flow

---

## EXECUTIVE SUMMARY

**VERDICT: FAIL**

Hệ thống có **2 collection tồn kho độc lập** (`Inventory` và `WarehouseInventory`) nhưng **KHÔNG có cơ chế đồng bộ** giữa hai collection này. Điều này dẫn đến nhiều bug nghiêm trọng về data integrity và khả năng xảy ra double deduction.

---

## PART 1: ARCHITECTURE ANALYSIS

### 1.1 Two Independent Inventory Collections

| Aspect | `Inventory` | `WarehouseInventory` |
|--------|-------------|----------------------|
| **Collection Name** | `inventory` | `warehouse_inventory` |
| **Key Fields** | `warehouseId`, `productVariantId` | `warehouseId`, `itemType`, `productId`, `variantId`, `giftId` |
| **Quantity Fields** | `quantity`, `reservedQuantity`, `availableQuantity` | `quantity`, `inTransitQuantity`, `shippedQuantity`, `reservedQuantity`, `availableQuantity` |
| **Item Types** | Product variants only | Products AND Gifts |
| **Primary Use** | Order stock reservation (Phase 4.3) | Warehouse operations, shipments |
| **Model File** | `src/models/Inventory.ts` | `src/models/WarehouseInventory.ts` |

**Conclusion:** Hai collection này là **hai nguồn dữ liệu độc lập hoàn toàn**, không có foreign key reference hay trigger đồng bộ.

---

## PART 2: FLOW TRACE

### 2.1 RESERVE Flow (Order tạo mới / cập nhật)

```
API: POST /api/orders (route.ts)
  │
  ├─► buildStockWiringPlanForCreate() 
  │     └─► reserveStock() [stockEngine.service.ts:600]
  │
  └─► reserveStock() 
        └─► applyItem() → Inventory.findOneAndUpdate()
              ├─ availableQuantity -= qty
              └─ reservedQuantity += qty
```

**Affected Collection:** `Inventory` **ONLY**

**Code Evidence:**
```typescript
// src/services/warehouse/stockEngine.service.ts:600-652
export async function reserveStock(...) {
  // Chỉ update Inventory collection
  await applyItem(wid, item, InventoryAction.RESERVE, session);
  // ...
}
```

**WarehouseInventory Status After RESERVE:** 
- ❌ **UNCHANGED** - `WarehouseInventory` không được cập nhật khi RESERVE

---

### 2.2 UNRESERVE Flow (Order hủy / trả chỗ)

```
API: PATCH /api/orders/:id (route.ts)
  │
  ├─► queryNetReserved() → InventoryHistory
  │
  ├─► buildStockWiringPlan()
  │
  └─► releaseReservedStock() [stockEngine.service.ts:665]
        └─► applyItem() → Inventory.findOneAndUpdate()
              ├─ availableQuantity += qty
              └─ reservedQuantity -= qty
```

**Affected Collection:** `Inventory` **ONLY**

**WarehouseInventory Status After UNRESERVE:** 
- ❌ **UNCHANGED** - `WarehouseInventory` không được cập nhật

---

### 2.3 SHIP Flow - CÓ 2 CODE PATHS

#### Path A: Via Warehouse Service (Old Path)

```
API: Warehouse Task Status → SHIPPED
  │
  └─► warehouse.service.ts:changeStatus()
        │
        └─► inventoryService.exportOrder()
              └─► Inventory.findOneAndUpdate()
                    ├─ quantity -= qty
                    ├─ reservedQuantity -= qty
                    └─ availableQuantity -= qty
```

**Affected Collection:** `Inventory` **ONLY**

#### Path B: Via Order Shipment Service (New Path)

```
API: POST /api/warehouse/orders/:orderId/ship
  │
  └─► orderShipmentService.shipOrder()
        │
        └─► adjustInventoryForShip()
              └─► WarehouseInventory.findOneAndUpdate()
                    ├─ quantity -= qty
                    └─ availableQuantity -= qty
```

**Affected Collection:** `WarehouseInventory` **ONLY**

---

### 2.4 Return Flow

```
API: POST /api/warehouse/orders/:orderId/return
  │
  └─► orderShipmentService.returnOrder()
        │
        └─► adjustInventoryForReturn()
              └─► WarehouseInventory.findOneAndUpdate()
                    ├─ quantity += qty
                    └─ availableQuantity += qty
```

**Affected Collection:** `WarehouseInventory` **ONLY**

**Note:** `Inventory` rollback dùng `inventoryService.rollbackExport()` - một method riêng biệt.

---

### 2.5 Transfer Flow

#### Transfer qua WarehouseInventory (warehouseWorkflowService)

```
API: POST /api/warehouse/transfers
  │
  └─► warehouseWorkflowService.createTransfer()
        │
        ├─► Source: adjustInventory() → WarehouseInventory
        │     └─ quantity -= qty
        │
        └─► Destination: adjustInventory() → WarehouseInventory
              └─ quantity += qty (hoặc inTransitQuantity += qty nếu status=SENT)
```

**Affected Collection:** `WarehouseInventory` **ONLY**

#### Transfer qua Inventory (stockEngine - nếu có ai đó gọi)

```
API: (Internal call - not exposed)
  │
  └─► transferStock() [stockEngine.service.ts:1004]
        │
        ├─► Source: applyItem(TRANSFER_OUT) → Inventory
        └─► Destination: applyItem(TRANSFER_IN) → Inventory
```

**Affected Collection:** `Inventory` **ONLY**

**Note:** `stockEngine.transferStock()` tồn tại nhưng KHÔNG được exposed qua API. Tuy nhiên code vẫn có thể gọi trực tiếp.

---

### 2.6 Gift Flow

#### Gift Model

```typescript
// src/models/Gift.ts
interface IGift {
  name: string;
  stockQuantity: number;  // ← Tồn kho riêng của Gift
  isActive: boolean;
}
```

#### Gift Tracking

| Collection | Tracks Gift? | Key Field |
|-----------|-------------|-----------|
| `Inventory` | ❌ NO | `productVariantId` only |
| `WarehouseInventory` | ✅ YES | `giftId` |
| `Gift` | ✅ YES (summary) | N/A - lưu `stockQuantity` |

#### Gift Shipment Flow

```
orderShipmentService.shipOrder()
  │
  ├─► validateGiftShipment()
  │     └─► WarehouseInventory.findOne({ itemType: "GIFT", giftId })
  │
  └─► adjustInventoryForShip()
        └─► WarehouseInventory - Giảm quantity cho giftId cụ thể
```

**RANDOM Gift vs CUSTOMER_SELECTED:**

- **CUSTOMER_SELECTED:** 
  - Lấy từ `orderItems[].giftSelections[]`
  - Đã có `giftId` cụ thể
  - Validate trực tiếp vào `WarehouseInventory`

- **RANDOM Gift:**
  - Không có `giftId` trong order
  - `buildProductDemands()` throw error: "Quà RANDOM cần được chỉ định cụ thể từ kho"
  - Caller phải cung cấp `actualShipments` với giftId đã chọn

---

## PART 3: CRITICAL BUGS ANALYSIS

### BUG #1: CRITICAL DATA INTEGRITY BUG

**Title:** Inventory và WarehouseInventory Không Đồng Bộ Sau RESERVE/UNRESERVE

**Severity:** CRITICAL

**Description:**
Khi Order RESERVE, chỉ có `Inventory` được cập nhật. `WarehouseInventory` không biết gì về việc reservation này.

**Scenario:**
```
1. WarehouseInventory.availableQuantity = 100 (cho variant X)
2. Inventory.availableQuantity = 100 (cho variant X)  
3. Order A RESERVE 50 units
   → Inventory.availableQuantity = 50
   → WarehouseInventory.availableQuantity = 100 (UNCHANGED!)
4. User nhìn WarehouseInventory, thấy còn 100 → tạo Order B đặt 100 units
5. Order B RESERVE 100 units → FAIL vì Inventory chỉ còn 50
   → Nhưng WarehouseInventory UI vẫn hiển thị 100!
```

**Actual Behavior:** 
- `Inventory` giảm reserved, `WarehouseInventory` không thay đổi
- UI hiển thị `WarehouseInventory` → inconsistent với thực tế

**Expected Behavior:**
- RESERVE phải cập nhật cả hai collection, HOẶC
- UI phải đọc từ `Inventory` thay vì `WarehouseInventory`

**Files Involved:**
- `src/services/warehouse/stockEngine.service.ts:600-652` (RESERVE)
- `src/services/warehouse/stockEngine.service.ts:665-717` (UNRESERVE)

**Fix Suggestion:**
Thêm logic đồng bộ vào `stockEngine.service.ts` để cập nhật `WarehouseInventory` khi RESERVE/UNRESERVE, hoặc loại bỏ `WarehouseInventory` và dùng `Inventory` làm single source of truth.

---

### BUG #2: CRITICAL CONCURRENCY BUG

**Title:** Double Deduction Khi SHIP Qua Cả Hai Paths

**Severity:** CRITICAL

**Description:**
Có 2 code path để SHIP order, mỗi path update một collection khác nhau. Nếu cả hai path được gọi cho cùng một order, tồn kho sẽ bị trừ 2 lần.

**Scenario:**
```
1. Order đang ở trạng thái PACKING
2. Admin gọi warehouseService.changeStatus() → WarehouseTask SHIPPED
   → inventoryService.exportOrder() → Inventory.quantity -= 10
3. Admin KHÔNG BIẾT đã SHIP rồi, gọi tiếp orderShipmentService.shipOrder()
   → WarehouseInventory.quantity -= 10
4. KẾT QUẢ: Tồn kho bị trừ 20 thay vì 10!
```

**Actual Behavior:**
- SHIP qua `warehouse.service.ts`: Chỉ trừ `Inventory`
- SHIP qua `orderShipmentService.shipOrder()`: Chỉ trừ `WarehouseInventory`
- Không có kiểm tra để ngăn gọi 2 lần

**Expected Behavior:**
- Chỉ một code path SHIP, HOẶC
- Có idempotency check trước khi SHIP

**Files Involved:**
- `src/services/warehouse.service.ts:201-267` (Path A)
- `src/services/warehouse/orderShipment.service.ts:193-238` (Path B)

**Fix Suggestion:**
1. Xóa một trong hai code path SHIP
2. Hoặc thêm idempotency check: kiểm tra order đã shipped chưa trước khi SHIP
3. Hoặc update cả hai collection trong cùng một transaction

---

### BUG #3: CRITICAL DESIGN GAP

**Title:** Inventory Nói Còn Hàng, WarehouseInventory Nói Hết Hàng**

**Severity:** CRITICAL

**Description:**
Do hai collection không đồng bộ, có thể xảy ra trường hợp:

```
Inventory.availableQuantity = 50
WarehouseInventory.availableQuantity = 0

→ RESERVE 50 units: SUCCESS (Inventory còn 50)
→ Nhưng WarehouseInventory hiển thị 0 → SHIP sẽ FAIL
```

**Actual Behavior:**
- `Inventory` và `WarehouseInventory` có thể show số khác nhau
- Business logic có thể pass ở một layer và fail ở layer khác

**Expected Behavior:**
- Một nguồn dữ liệu tồn kho duy nhất
- Hoặc có cơ chế reconcile định kỳ

**Fix Suggestion:**
Xác định rõ `Inventory` hay `WarehouseInventory` là source of truth và migrate tất cả logic về một collection.

---

### BUG #4: CRITICAL DESIGN GAP

**Title:** WarehouseInventory Giảm Nhưng Inventory Không Giảm

**Severity:** CRITICAL

**Description:**
Khi `orderShipmentService.shipOrder()` được gọi:
- `WarehouseInventory.quantity` giảm
- `Inventory.quantity` KHÔNG giảm

**Scenario:**
```
1. Order RESERVE 10 units
   → Inventory.availableQuantity = 90
   → WarehouseInventory.availableQuantity = 100 (unchanged)
2. Admin SHIP qua orderShipmentService
   → WarehouseInventory.quantity -= 10
   → WarehouseInventory.availableQuantity = 90
3. KẾT QUẢ:
   → Inventory.availableQuantity = 90 (chưa OUT)
   → Inventory.reservedQuantity = 10 (chưa giảm)
   → WarehouseInventory.quantity = 90 (đã trừ)
   
→ RESERVE mới check Inventory.availableQuantity = 90
→ Nhưng thực tế WarehouseInventory chỉ còn 90 tổng cộng!
```

**Actual Behavior:**
- SHIP chỉ trừ `WarehouseInventory`
- `Inventory.reservedQuantity` không được giải phóng

**Expected Behavior:**
- SHIP phải update cả hai collection trong transaction
- Hoặc loại bỏ `Inventory` và dùng `WarehouseInventory`

**Files Involved:**
- `src/services/warehouse/orderShipment.service.ts:84-95`

**Fix Suggestion:**
Trong `orderShipmentService.shipOrder()`, sau khi update `WarehouseInventory`, cũng phải call `inventoryService.exportOrder()` hoặc tương đương để update `Inventory`.

---

### BUG #5: CONCURRENCY BUG

**Title:** Race Condition Giữa RESERVE và SHIP

**Severity:** HIGH

**Description:**
RESERVE và SHIP có thể race với nhau nếu gọi đồng thời.

**Scenario:**
```
1. Inventory.availableQuantity = 50
2. Order A RESERVE 30 (t1): check availableQuantity >= 30 ✓
3. Order B SHIP 30 (t2): check availableQuantity >= 30 ✓
4. Order A RESERVE commit (t3): availableQuantity = 20
5. Order B SHIP commit (t4): availableQuantity = 20
   
→ Mặc dù cả hai operations đều check thành công,
→ Tổng deduction = 60 > 50 (OVER-SELL!)
```

**Protection hiện tại:**
- RESERVE dùng optimistic locking: `availableQuantity: { $gte: qty }`
- SHIP (Path A) dùng optimistic locking
- SHIP (Path B) dùng optimistic locking: `availableQuantity: { $gte: quantity }`

**Vấn đề:**
- Cả hai check đều OK, nhưng race condition vẫn xảy ra vì không có global lock
- Thứ tự commit quyết định kết quả cuối cùng

**Fix Suggestion:**
Thêm distributed lock per (warehouseId, variantId) để serialize RESERVE và SHIP operations.

---

### BUG #6: DESIGN GAP

**Title:** Transfer Không Ảnh Hưởng Inventory

**Severity:** MEDIUM

**Description:**
Transfer qua `warehouseWorkflowService.createTransfer()` chỉ update `WarehouseInventory`, không ảnh hưởng `Inventory`.

**Scenario:**
```
1. Warehouse A: Inventory.quantity = 100, WarehouseInventory.quantity = 100
2. Warehouse A: Inventory.quantity = 100, WarehouseInventory.quantity = 100
3. Transfer 50 units từ A → B (qua warehouseWorkflowService)
   → WarehouseInventory(A).quantity = 50
   → WarehouseInventory(B).quantity = 150
4. KẾT QUẢ:
   → Inventory(A).quantity = 100 (UNCHANGED!)
   → Inventory(B).quantity = 100 (UNCHANGED!)
```

**Actual Behavior:**
- Transfer chỉ ảnh hưởng `WarehouseInventory`
- `Inventory` không biết về transfer

**Expected Behavior:**
- Transfer nên update cả hai collections, HOẶC
- Chỉ dùng một collection làm source of truth

**Files Involved:**
- `src/services/warehouse/warehouseWorkflow.service.ts:152-182`

**Fix Suggestion:**
Nếu `Inventory` là source of truth cho orders, thì `warehouseWorkflowService` phải gọi `stockEngine.transferStock()` thay vì trực tiếp update `WarehouseInventory`.

---

### BUG #7: DESIGN GAP

**Title:** Return Order Chỉ Cập Nhật WarehouseInventory

**Severity:** MEDIUM

**Description:**
`orderShipmentService.returnOrder()` chỉ update `WarehouseInventory`, không update `Inventory`.

**Scenario:**
```
1. Order shipped:
   → Inventory.quantity -= 10, reservedQuantity -= 10
   → WarehouseInventory.quantity -= 10
2. Customer return 5 units
   → WarehouseInventory.quantity += 5 (returnOrder)
   → Inventory.quantity KHÔNG += 5
```

**Actual Behavior:**
- Return chỉ ảnh hưởng `WarehouseInventory`
- `Inventory` không biết về return

**Fix Suggestion:**
Thêm logic update `Inventory` trong `orderShipmentService.returnOrder()`, hoặc dùng `inventoryService.rollbackExport()`.

---

### BUG #8: DESIGN GAP

**Title:** Gift Không Được Track Trong Inventory

**Severity:** MEDIUM

**Description:**
`Inventory` collection không track gifts. Gift chỉ được track trong:
1. `Gift.stockQuantity` (tổng số)
2. `WarehouseInventory` (theo warehouse)

**Implication:**
- RESERVE/UNRESERVE không áp dụng cho gifts
- Gifts chỉ được validate khi SHIP qua `orderShipmentService`

**Fix Suggestion:**
Mở rộng `Inventory` model để support `giftId`, HOẶC thống nhất dùng `WarehouseInventory` cho tất cả inventory operations.

---

## PART 4: TRANSACTION ANALYSIS

### 4.1 Transaction Coverage

| Operation | Transaction | Scope | Protection |
|----------|-------------|-------|------------|
| POST /api/orders | ✅ Session | `Inventory`, `Order` | Full ACID within scope |
| PATCH /api/orders/:id (stock) | ✅ Session | `Inventory`, `Order` | Full ACID within scope |
| DELETE /api/orders/:id | ✅ Session | `Inventory`, `Order` | Full ACID within scope |
| warehouseService.changeStatus (SHIP) | ✅ Session | `Inventory` | Only `Inventory` |
| orderShipmentService.shipOrder | ✅ Session | `WarehouseInventory` | Only `WarehouseInventory` |
| orderShipmentService.returnOrder | ✅ Session | `WarehouseInventory` | Only `WarehouseInventory` |
| warehouseWorkflowService.createTransfer | ✅ Session | `WarehouseInventory` | Only `WarehouseInventory` |

### 4.2 Cross-Collection Atomicity

**ISSUE:** Không có transaction nào bảo vệ cả hai collections cùng lúc.

**Example:**
```
Transaction A: warehouseService.changeStatus (SHIP)
  ├─► update Inventory ✓
  ├─► update Order ✓
  └─► (WarehouseInventory NOT updated!)

Transaction B: orderShipmentService.shipOrder
  ├─► update WarehouseInventory ✓
  └─► (Inventory NOT updated!)
```

**Fix Suggestion:**
Tạo một unified shipment service update cả hai collections trong cùng một transaction, hoặc chọn một collection duy nhất.

---

## PART 5: ANSWERS TO SPECIFIC QUESTIONS

### Q1: Inventory và WarehouseInventory có phải 2 nguồn dữ liệu tồn kho độc lập không?

**✅ YES.** Chúng là hoàn toàn độc lập:
- Khác collection
- Khác schema
- Khác code paths update
- Không có trigger đồng bộ

### Q2: Khi Order RESERVE thì tồn kho nào bị giảm/khóa?

**Chỉ `Inventory`** bị ảnh hưởng:
- `Inventory.availableQuantity` giảm
- `Inventory.reservedQuantity` tăng
- `WarehouseInventory` **KHÔNG thay đổi**

### Q3: Khi UNRESERVE thì tồn kho nào được trả lại?

**Chỉ `Inventory`** được trả lại:
- `Inventory.availableQuantity` tăng
- `Inventory.reservedQuantity` giảm
- `WarehouseInventory` **KHÔNG thay đổi**

### Q4: Khi Order SHIP thì Inventory và WarehouseInventory có cùng được cập nhật không?

**DEPENDS on which code path:**
- Path A (`warehouseService.changeStatus`): Chỉ `Inventory` được update
- Path B (`orderShipmentService.shipOrder`): Chỉ `WarehouseInventory` được update

**❌ NO** - Không có path nào update cả hai collections.

### Q5: Có trường hợp Inventory nói còn hàng nhưng WarehouseInventory nói hết hàng không?

**✅ YES.** Đây là bug #3.

### Q6: Có trường hợp WarehouseInventory giảm nhưng Inventory không giảm không?

**✅ YES.** Xảy ra khi SHIP qua `orderShipmentService.shipOrder()`.

### Q7: Transfer giữa warehouse có ảnh hưởng Inventory không?

**❌ NO.** `warehouseWorkflowService.createTransfer()` chỉ update `WarehouseInventory`.

### Q8: Return order cập nhật những collection nào?

**Chỉ `WarehouseInventory`** được update qua `orderShipmentService.returnOrder()`.

### Q9: RANDOM gift và CUSTOMER_SELECTED gift đi qua collection nào?

- **Cả hai:** `WarehouseInventory` (với `itemType: "GIFT"`, `giftId`)
- **Không:** `Inventory` (không support gift)

### Q10: Có race condition giữa RESERVE và SHIP không?

**✅ YES.** Bug #5 - Có thể over-sell nếu RESERVE và SHIP race.

### Q11: Có double deduction không?

**✅ YES.** Bug #2 - Nếu cả hai SHIP paths được gọi cho cùng order.

### Q12: Có transaction nào chỉ bảo vệ một trong hai collections không?

**✅ YES.** Tất cả transactions hiện tại chỉ bảo vệ một collection duy nhất:
- `stockEngine` operations: Chỉ `Inventory`
- `warehouseWorkflowService`: Chỉ `WarehouseInventory`

---

## PART 6: SUMMARY BY CATEGORY

### CRITICAL BUGS (Must Fix)

| ID | Bug | File(s) | Line(s) |
|----|-----|---------|---------|
| C1 | Inventory/WarehouseInventory không đồng bộ sau RESERVE | `stockEngine.service.ts` | 600-652 |
| C2 | Double deduction khi SHIP qua cả 2 paths | `warehouse.service.ts`, `orderShipment.service.ts` | 201-267, 193-238 |
| C3 | Inventory vs WarehouseInventory show số khác nhau | Multiple | N/A |

### HIGH PRIORITY BUGS

| ID | Bug | File(s) | Line(s) |
|----|-----|---------|---------|
| H1 | Race condition RESERVE vs SHIP | `stockEngine.service.ts` | 433-445, 460-481 |

### MEDIUM PRIORITY (Design Gaps)

| ID | Bug | File(s) | Line(s) |
|----|-----|---------|---------|
| M1 | Transfer không ảnh hưởng Inventory | `warehouseWorkflow.service.ts` | 152-182 |
| M2 | Return chỉ cập nhật WarehouseInventory | `orderShipment.service.ts` | 240-279 |
| M3 | Gift không track trong Inventory | `Inventory.ts` | N/A |

---

## FINAL VERDICT

# **FAIL**

Hệ thống có **nghiêm trọng data integrity issues** do kiến trúc 2 collection độc lập mà không có cơ chế đồng bộ.

### Root Cause
- `Inventory` và `WarehouseInventory` được thiết kế như 2 standalone systems
- Không có clear "source of truth" duy nhất
- Multiple code paths (SHIP A vs SHIP B) tạo ra inconsistency

### Recommended Actions (Priority Order)

1. **Immediate:** Chọn `Inventory` hoặc `WarehouseInventory` làm **single source of truth** cho tồn kho orders
2. **Immediate:** Xóa hoặc deprecate code path SHIP không sử dụng
3. **Short-term:** Thêm cross-collection sync khi RESERVE/UNRESERVE/SHIP/TRANSFER
4. **Medium-term:** Thêm distributed lock per (warehouseId, variantId) để prevent race conditions
5. **Long-term:** Migrate tất cả operations về một collection duy nhất

---

**Report Generated:** August 13, 2026  
**Auditor:** Claude Code  
**Files Analyzed:** 25+ files  
**Bugs Found:** 8 (3 Critical, 1 High, 4 Medium)
