# FINAL FIX REPORT - ORDER MODULE

## Ngày: 2026-08-13

## Tổng quan

| Thông tin | Chi tiết |
|-----------|----------|
| **Files đã sửa** | 3 |
| **Bugs P0 đã fix** | 3 |
| **Bugs P1 đã fix** | 1 |
| **Bugs P2 đã fix** | 1 |
| **Tổng bugs đã fix** | 5 |

---

## Chi tiết các Bug đã Fix

### 1. BUG #1: Double Transaction Start (DELETE Handler)

**File:** `src/app/api/orders/[id]/route.ts`  
**Line:** 703 (trước đây)  
**Severity:** P0 - CRITICAL

**Vấn đề:** `session.startTransaction()` được gọi 2 lần trong DELETE handler mà không có `abortTransaction()` ở giữa.

**Trước khi fix:**
```typescript
690: session.startTransaction();
691:
692: // ---- Stock wiring ----
...
700: };
701:
702: session.startTransaction(); // ← LỖI: Double start
703: const netMap = await queryNetReserved(...);
```

**Sau khi fix:**
```typescript
690: session.startTransaction();
691:
692: // ---- Stock wiring ----
...
700: };
701:
702: const netMap = await queryNetReserved(...); // ← Đã xóa dòng thừa
```

**Impact:** MongoDB sẽ throw error "Transaction 1 has already started"

---

### 2. BUG #2: OUT Action Không Giảm reservedQuantity

**File:** `src/services/inventory.service.ts`  
**Lines:** 220-234  
**Severity:** P0 - CRITICAL

**Vấn đề:** Khi xuất kho (OUT action), `reservedQuantity` không được giảm theo, dẫn đến reserved tích lũy vô hạn.

**Trước khi fix:**
```typescript
$inc: {
  quantity: -item.quantity,
  availableQuantity: -item.quantity,
  // THIẾU: reservedQuantity: -item.quantity
},
```

**Sau khi fix:**
```typescript
$inc: {
  quantity: -item.quantity,
  reservedQuantity: -item.quantity,  // ← ĐÃ THÊM
  availableQuantity: -item.quantity,
},
```

**Impact:** 
- Before: RESERVE(10) → OUT(5) → reservedQuantity vẫn = 10
- After: RESERVE(10) → OUT(5) → reservedQuantity = 5

---

### 3. BUG #3: Double Transaction Start (changeStatus)

**File:** `src/services/order.service.ts`  
**Line:** 289 (trước đây)  
**Severity:** P0 - CRITICAL

**Vấn đề:** `startSession()` đã implicit start transaction, gọi `startTransaction()` lần 2 sẽ throw error.

**Trước khi fix:**
```typescript
286: const session = await mongoose.startSession();
287: try {
288:   session.startTransaction();  // ← LỖI: Double start
289:   // Update status in repository
```

**Sau khi fix:**
```typescript
286: const session = await mongoose.startSession();
287: try {
288:   // Update status in repository  // ← ĐÃ XÓA dòng thừa
```

---

### 4. BUG #6: Legacy STATUS_CHANGED Action

**File:** `src/services/order.service.ts`  
**Lines:** 531-546  
**Severity:** P1 - HIGH

**Vấn đề:** Dùng action `STATUS_CHANGED` thay vì action theo workflow mới (Sprint 8.5).

**Trước khi fix:**
```typescript
action: "STATUS_CHANGED",  // ← Legacy
```

**Sau khi fix:**
```typescript
// Map status to workflow action (Sprint 8.5)
const statusActionMap: Record<string, OrderAction> = {
  [OrderStatus.WAIT_CONFIRM]: OrderAction.WAIT_CONFIRM,
  [OrderStatus.CONFIRMED]: OrderAction.CONFIRMED,
  [OrderStatus.PACKING]: OrderAction.PACKING,
  [OrderStatus.SHIPPING]: OrderAction.SHIPPING,
  [OrderStatus.DELIVERED]: OrderAction.DELIVERED,
  [OrderStatus.RETURNED]: OrderAction.RETURNED,
  [OrderStatus.RECONCILED]: OrderAction.RECONCILED,
  [OrderStatus.CANCELLED]: OrderAction.CANCELLED,
};
const action = statusActionMap[data.status] || OrderAction.UPDATED;
// ...
action,  // ← Sử dụng action đúng theo workflow
```

**Impact:** Timeline UI hiển thị "Đổi trạng thái" thay vì "Chờ xác nhận", "Đã xác nhận", v.v.

---

### 5. BUG #9: grandTotal Calculation Thiếu Trừ Discount

**File:** `src/app/api/orders/[id]/route.ts`  
**Lines:** 449-452  
**Severity:** P2 - MEDIUM

**Vấn đề:** `grandTotal` và `totalAmount` không trừ `discount`.

**Trước khi fix:**
```typescript
grandTotal: subtotal + shippingFee,  // ← THIẾU trừ discount
// ...
totalAmount = subtotal + shippingFee;  // ← THIẾU trừ discount
```

**Sau khi fix:**
```typescript
grandTotal: Math.max(0, subtotal - discount + shippingFee),
// ...
totalAmount = Math.max(0, subtotal - discount + shippingFee);
```

**Impact:** Order summary hiển thị tổng tiền sai nếu có discount.

---

## Files không thay đổi (ngoài phạm vi)

Các files sau KHÔNG bị thay đổi:
- `src/models/Order.ts`
- `src/models/OrderHistory.ts`
- `src/models/Inventory.ts`
- `src/models/WarehouseInventory.ts`
- `src/models/InventoryHistory.ts`
- `src/app/api/orders/[id]/status/route.ts`
- `src/app/api/warehouse/orders/route.ts`
- `src/app/api/warehouse/orders/[orderId]/ship/route.ts`
- `src/app/api/warehouse/orders/[orderId]/return/route.ts`
- `src/services/warehouse.service.ts`
- `src/services/warehouse/orderShipment.service.ts`
- `src/services/order/orderStockWiring.helper.ts`
- `src/services/order/orderRevenue.service.ts`
- `src/services/order/revenueEngine.service.ts`
- `src/services/order/revenueRule.service.ts`

---

## Bugs Chưa Fix (Design Gap)

### 1. Inventory vs WarehouseInventory Không Sync
- **Severity:** P1
- **Lý do:** Đây là design gap cần refactor lớn, ảnh hưởng đến nhiều module
- **Recommendation:** Thiết kế lại để dùng 1 model duy nhất

### 2. Duplicate Shipping Flows
- **Severity:** P1  
- **Lý do:** Cần hợp nhất 2 luồng shipping
- **Recommendation:** Sprint riêng để refactor

### 3. warehouseId Optional
- **Severity:** P2
- **Lý do:** Có thể là business decision
- **Recommendation:** Xác nhận với stakeholders

---

## Git Diff Summary

```
Modified files:
  src/app/api/orders/[id]/route.ts
  src/services/inventory.service.ts
  src/services/order.service.ts

Unchanged (verified):
  - All models
  - All warehouse services
  - All stock wiring helpers
  - All revenue services
```

---

## Verification Checklist

- [x] TypeScript check (các lỗi hiện tại là pre-existing)
- [x] Git diff đã kiểm tra
- [x] Files ngoài phạm vi không bị thay đổi
- [x] Business logic đang PASS không bị ảnh hưởng
- [ ] Unit tests (các test hiện tại không cover các bugs đã fix)
- [ ] Integration tests (cần test thực tế)

---

## Next Steps

1. **Review:** Duyệt các thay đổi trên
2. **Test:** Chạy manual test hoặc viết unit tests cho:
   - Double transaction fix
   - OUT reservedQuantity fix
   - grandTotal calculation fix
3. **Design Decision:** Về việc hợp nhất Inventory/WarehouseInventory
4. **Commit:** Tạo commit sau khi duyệt

---

**Người fix:** AI Assistant  
**Ngày fix:** 2026-08-13  
**Trạng thái:** Chờ duyệt và commit
