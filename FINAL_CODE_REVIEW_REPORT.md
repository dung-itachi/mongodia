# FINAL CODE REVIEW REPORT

## Ngày: 2026-08-13

---

## Tổng quan

| Metric | Count |
|--------|-------|
| Bugs Fixed | 5 |
| Bugs PASS | 3 |
| Bugs FAIL | 2 |
| New Issues Found | 0 |
| Regression | 0 |

---

## Chi tiết Review

### ✅ BUG 1 - DELETE Handler (PASS)

**File:** `src/app/api/orders/[id]/route.ts`

| Check | Status |
|-------|--------|
| Transaction start 1 lần | ✅ PASS (line 690) |
| Duplicate start removed | ✅ PASS (đã xóa line 703) |
| Session truyền xuyên suốt | ✅ PASS |
| Rollback khi lỗi | ✅ PASS (line 728-732) |
| Commit ở cuối | ✅ PASS (line 777) |

**Verification:**
```typescript
690: session.startTransaction();  // ← Chỉ 1 lần
...
703: const netMap = await queryNetReserved(existedOrder._id, session);  // ← Đã xóa duplicate startTransaction()
```

**Conclusion:** ✅ PASS - Không có regression, fix đúng.

---

### ✅ BUG 2 - INVENTORY OUT (PASS)

**File:** `src/services/inventory.service.ts`

| Check | Status |
|-------|--------|
| reservedQuantity được giảm | ✅ PASS |
| availableQuantity đúng | ✅ PASS |
| quantity không âm | ✅ PASS (check $gte) |
| Atomic update | ✅ PASS |

**Verification:**
```typescript
$inc: {
  quantity: -item.quantity,
  reservedQuantity: -item.quantity,  // ← ĐÃ THÊM
  availableQuantity: -item.quantity,
}
```

**Math Verification:**
- Before: `availableQuantity = quantity - reservedQuantity`
- After OUT: `availableQuantity = (q - i) - (r - i) = q - r` ✅

**Conclusion:** ✅ PASS - Fix đúng logic kinh doanh.

---

### ✅ BUG 3 - changeStatus (PASS)

**File:** `src/services/order.service.ts`

| Check | Status |
|-------|--------|
| Transaction start 1 lần | ✅ PASS (session.startSession() implicit) |
| Duplicate start removed | ✅ PASS (đã xóa line 289) |
| Status transition đúng | ✅ PASS |
| Rollback khi lỗi | ✅ PASS |

**Verification:**
```typescript
286: const session = await mongoose.startSession();  // ← startSession() implicit start transaction
287: try {
288:   // Update status in repository  // ← Không có startTransaction() thừa
```

**Conclusion:** ✅ PASS - Fix đúng.

---

### ❌ BUG 4 - STATUS_CHANGED (FAIL)

**File:** `src/app/api/orders/[id]/route.ts`

**Vấn đề:** Line 360 trong PATCH handler vẫn dùng `OrderAction.STATUS_CHANGED` thay vì action theo workflow mới.

**Current Code:**
```typescript
358:    // status
359:    if (data.status !== undefined && data.status !== existedOrder.status) {
360:      pushHistory(OrderAction.STATUS_CHANGED, {  // ← VẪN SAI!
361:        fieldName: "status",
362:        oldValue: ORDER_STATUS_LABELS[existedOrder.status as OrderStatus],
363:        newValue: ORDER_STATUS_LABELS[data.status as OrderStatus],
364:        note: "Đổi trạng thái",
365:      });
366:      updateData.status = data.status;
367:    }
```

**Fix trong `order.service.ts`:** Chỉ sửa `update()` method, không ảnh hưởng đến PATCH handler trong route.ts.

**Nguyên nhân:** PATCH route xử lý history trực tiếp (sử dụng `pushHistory()`) thay vì gọi `orderService.update()`.

**Impact:** Khi update order qua PATCH API và có thay đổi status, vẫn tạo ra `STATUS_CHANGED` thay vì `WAIT_CONFIRM`, `CONFIRMED`, v.v.

**Severity:** P1 - HIGH

**Actual behavior:** Timeline hiển thị "Đổi trạng thái" thay vì "Chờ xác nhận", "Đã xác nhận", v.v.

**Expected behavior:** Dùng action đúng theo workflow (Sprint 8.5).

**Proposed fix:**
```typescript
// Thêm map ở đầu PATCH handler
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

// Trong status block:
const action = statusActionMap[data.status as string] || OrderAction.UPDATED;
pushHistory(action, { ... });
```

**Conclusion:** ❌ FAIL - Cần fix thêm tại line 360.

---

### ⚠️ BUG 5 - grandTotal (PARTIAL PASS)

**File:** `src/app/api/orders/[id]/route.ts` (PATCH - ✅ PASS)

**File:** `src/app/api/orders/route.ts` (POST - ❌ FAIL)

**PATCH Handler (✅):**
```typescript
grandTotal: Math.max(0, subtotal - discount + shippingFee),  // ✅ Đúng
```

**POST Handler (❌):**
```typescript
grandTotal:
  validatedOrderItems.reduce((sum, item) => sum + item.subtotal, 0) +
  (data.shipping?.shippingFee ?? 0),
  // ← THIẾU trừ discount!
```

**Vấn đề:** POST route cũng thiếu trừ discount giống như PATCH route.

**Severity:** P2 - MEDIUM

**Impact:** Order mới tạo có discount sẽ hiển thị tổng tiền sai.

**Proposed fix:**
```typescript
const subtotal = validatedOrderItems.reduce((sum, item) => sum + item.subtotal, 0);
const discount = validatedOrderItems.reduce((sum, item) => sum + item.discount, 0);
// ...
grandTotal: Math.max(0, subtotal - discount + (data.shipping?.shippingFee ?? 0)),
```

**Conclusion:** ⚠️ PARTIAL PASS - PATCH đúng, POST cần fix.

---

## Regression Check

| Area | Status |
|------|--------|
| Transaction flow | ✅ Không regression |
| Inventory calculations | ✅ Không regression |
| Status transitions | ✅ Không regression |
| History actions | ⚠️ BUG 4 chưa fix hết |
| Pricing calculations | ⚠️ POST route cần fix |

---

## Files Changed Summary

```
Modified:
  src/app/api/orders/[id]/route.ts
  src/services/inventory.service.ts
  src/services/order.service.ts

No external changes (verified with git status)
```

---

## ESLint & TypeScript

| Check | Errors | Warnings |
|-------|--------|----------|
| ESLint | 0 | 4 (pre-existing) |
| TypeScript | 0 (pre-existing errors) | - |

---

## Summary

| Bug | Status | Ghi chú |
|-----|--------|---------|
| #1 DELETE | ✅ PASS | Double transaction đã fix |
| #2 INVENTORY OUT | ✅ PASS | reservedQuantity đã fix |
| #3 changeStatus | ✅ PASS | Double transaction đã fix |
| #4 STATUS_CHANGED | ❌ FAIL | PATCH route line 360 chưa fix |
| #5 grandTotal | ⚠️ PARTIAL | PATCH đúng, POST cần fix |

---

## Final Conclusion

### ❌ FAIL

**Lý do:**
1. **BUG 4:** PATCH route (line 360) vẫn dùng `STATUS_CHANGED` - chưa fix triệt để
2. **BUG 5:** POST route (`src/app/api/orders/route.ts`) cũng có bug grandTotal thiếu trừ discount

**Cần fix thêm:**
1. `src/app/api/orders/[id]/route.ts` line 360: Thêm status action map
2. `src/app/api/orders/route.ts`: Thêm discount vào grandTotal calculation

**Đã pass:**
- 3/5 bugs fix đúng
- Không có regression mới
- Không ảnh hưởng files ngoài phạm vi

---

**Reviewer:** AI Assistant  
**Date:** 2026-08-13  
**Status:** Chờ fix thêm 2 issues trước khi PASS
