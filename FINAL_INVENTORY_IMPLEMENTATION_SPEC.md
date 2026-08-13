# FINAL INVENTORY IMPLEMENTATION SPECIFICATION

**Project:** Mongodia  
**Date:** August 13, 2026  
**Architecture:** WarehouseInventory as Single Source of Truth  
**Reference Documents:**
- FINAL_INVENTORY_WAREHOUSE_INTEGRATION_AUDIT.md
- FINAL_INVENTORY_ARCHITECTURE_DESIGN.md

---

## TABLE OF CONTENTS

1. [Source of Truth](#1-source-of-truth)
2. [Define Inventory Invariants](#2-define-inventory-invariants)
3. [RESERVE](#3-reserve)
4. [UNRESERVE](#4-unreserve)
5. [SHIP RESERVED ORDER](#5-ship-reserved-order)
6. [SHIP NON-RESERVED ORDER](#6-ship-non-reserved-order)
7. [CANCEL / UNRESERVE](#7-cancel--unreserve)
8. [RETURN](#8-return)
9. [TRANSFER](#9-transfer)
10. [RANDOM GIFT](#10-random-gift)
11. [DOUBLE SHIPMENT](#11-double-shipment)
12. [RESERVE vs SHIP RACE CONDITION](#12-reserve-vs-ship-race-condition)
13. [TWO SHIPMENT PATHS](#13-two-shipment-paths)
14. [TRANSACTION BOUNDARY](#14-transaction-boundary)
15. [LEGACY INVENTORY](#15-legacy-inventory)
16. [API IMPACT](#16-api-impact)
17. [UI IMPACT](#17-ui-impact)
18. [MIGRATION STRATEGY](#18-migration-strategy)
19. [TEST MATRIX](#19-test-matrix)
20. [FINAL DECISION](#20-final-decision)

---

## 1. SOURCE OF TRUTH

### 1.1 Confirmation

**WarehouseInventory** is the **Single Source of Truth** for all inventory operations.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WAREHOUSEINVENTORY (SOURCE OF TRUTH)                  │
│                                                                             │
│  Collection: warehouse_inventory                                             │
│                                                                             │
│  Tracks ALL inventory by warehouse:                                         │
│    - Product stocks (by variantId)                                         │
│    - Gift stocks (by giftId with itemType="GIFT")                         │
│    - All stock quantities and states                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Legacy Status

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INVENTORY (LEGACY)                              │
│                                                                             │
│  Collection: inventory                                                     │
│                                                                             │
│  Status: TO BE MIGRATED                                                    │
│                                                                             │
│  Will be deprecated after migration is complete                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Required Fields in WarehouseInventory

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| warehouseId | ObjectId | Warehouse reference | YES |
| itemType | String | "PRODUCT" or "GIFT" | YES |
| productId | ObjectId | Product reference (for products) | NO |
| variantId | ObjectId | Variant reference (for products) | NO |
| giftId | ObjectId | Gift reference (for gifts) | NO |
| quantity | Number | Physical stock at warehouse | YES |
| availableQuantity | Number | quantity - reserved - inTransit | YES |
| reservedQuantity | Number | Reserved for orders | YES |
| inTransitQuantity | Number | In transfer to another warehouse | YES |
| shippedQuantity | Number | Historical shipped count (stats) | YES |
| isActive | Boolean | Soft delete flag | YES |

---

## 2. DEFINE INVENTORY INVARIANTS

### 2.1 Core Invariant Formula

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  availableQuantity = quantity - reservedQuantity - inTransitQuantity           │
│                                                                             │
│  INVARIANT: availableQuantity >= 0 at all times                            │
│  INVARIANT: quantity >= reservedQuantity >= 0                               │
│  INVARIANT: quantity >= inTransitQuantity >= 0                              │
│  INVARIANT: quantity >= shippedQuantity >= 0                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 State Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INVENTORY LIFECYCLE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │    INBOUND      │
                    │                 │
                    │ quantity += N   │
                    │ available += N  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
            ┌───────│   AVAILABLE     │───────┐
            │       │                 │       │
            │       │ quantity > 0    │       │
            │       │ reserved = 0    │       │
            │       │ inTransit = 0   │       │
            │       │ available = qty│       │
            │       └─────────────────┘       │
            │                 │                │
            │ RESERVE         │ UNRESERVE     │ SHIP
            │                 │                │
            ▼                 │                ▼
┌─────────────────┐          │      ┌─────────────────┐
│    RESERVED     │          │      │    SHIPPED      │
│                 │          │      │                 │
│ available -= N  │◀─────────┘      │ quantity -= N   │
│ reserved += N   │                 │ shipped += N    │
│                 │                 │                 │
└─────────────────┘                 └─────────────────┘

            │                 ▲
            │                 │
            │ SHIP            │ RETURN
            │                 │
            ▼                 │
┌─────────────────┐          │
│ QUANTITY OUT    │──────────┘
│                 │
│ quantity -= N   │
│ reserved -= N   │
│ (available stays)│
└─────────────────┘
```

### 2.3 Transfer State

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRANSFER STATES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

SOURCE WAREHOUSE:                      DESTINATION WAREHOUSE:
┌─────────────────┐                 ┌─────────────────┐
│ TRANSFER_OUT     │                 │ IN_TRANSIT      │
│                 │                 │                 │
│ quantity -= N   │ ───────────────▶│ inTransit += N  │
│ available -= N  │   transferring  │                 │
│                 │                 │ quantity = 0     │
└─────────────────┘                 │ available = 0    │
                                     └────────┬────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │ TRANSFER_IN     │
                                     │ (RECEIVED)      │
                                     │                 │
                                     │ quantity += N   │
                                     │ inTransit -= N  │
                                     │ available += N  │
                                     └─────────────────┘
```

---

## 3. RESERVE

### 3.1 Operation Definition

RESERVE is used to hold inventory for a specific order before shipping.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RESERVE                                       │
│                                                                             │
│  Purpose: Hold stock for a specific order                                  │
│  Trigger: Order creation or update with warehouse assignment                │
│  Precondition: availableQuantity >= requested quantity                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 State Transition Example

**Before RESERVE:**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 100
reservedQuantity: 20
inTransitQuantity: 0
availableQuantity: 80  ← 100 - 20 - 0
```

**RESERVE 10 units:**

**After RESERVE:**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 100           ← UNCHANGED
reservedQuantity: 30    ← 20 + 10
inTransitQuantity: 0    ← UNCHANGED
availableQuantity: 70  ← 100 - 30 - 0
```

### 3.3 Implementation Requirements

```typescript
// RESERVE Operation
async function reserve(
  warehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  session?: ClientSession
): Promise<ReserveResult> {
  
  // 1. Build filter
  const filter = buildFilter(warehouseId, item, {
    availableQuantity: { $gte: item.quantity },  // Condition check
    isActive: true
  });
  
  // 2. Atomic update with condition
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        availableQuantity: -item.quantity,
        reservedQuantity: item.quantity
      }
    },
    { new: true, session }
  );
  
  // 3. Check result
  if (!result) {
    throw new InsufficientStockError({
      warehouseId,
      available: currentAvailable,
      requested: item.quantity
    });
  }
  
  // 4. Create movement record
  await WarehouseStockMovement.create([{
    warehouseId,
    itemType: item.giftId ? "GIFT" : "PRODUCT",
    variantId: item.variantId,
    giftId: item.giftId,
    type: "RESERVE",
    quantity: item.quantity,
    referenceType: "ORDER",
    referenceId: orderId,
    createdBy: employeeId
  }], { session });
  
  return { success: true, result };
}
```

### 3.4 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| quantity NOT decreased | REQUIRED | Physical stock unchanged |
| reservedQuantity increases | REQUIRED | Hold for order |
| availableQuantity decreases | REQUIRED | Cannot be oversold |
| Atomic condition: availableQuantity >= qty | REQUIRED | Prevents oversell |
| Transaction boundary | REQUIRED | MongoDB session |
| Warehouse scope | REQUIRED | Per warehouse reservation |
| Order warehouseId | REQUIRED | Must specify target warehouse |

### 3.5 Error Conditions

| Error | Condition | Action |
|-------|-----------|--------|
| InsufficientStock | availableQuantity < qty | Throw error, no change |
| InventoryNotFound | No record for warehouse+variant | Create or throw based on upsert flag |
| NegativeResult | Update results in negative | Reject operation |

---

## 4. UNRESERVE

### 4.1 Operation Definition

UNRESERVE releases previously reserved stock back to available pool.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             UNRESERVE                                     │
│                                                                             │
│  Purpose: Release held stock when order cancelled or modified               │
│  Trigger: Order cancellation, quantity reduction, warehouse change          │
│  Precondition: reservedQuantity >= requested quantity                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 State Transition Example

**Before UNRESERVE:**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 100
reservedQuantity: 30
inTransitQuantity: 0
availableQuantity: 70
```

**UNRESERVE 10 units:**

**After UNRESERVE:**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 100           ← UNCHANGED
reservedQuantity: 20    ← 30 - 10
inTransitQuantity: 0    ← UNCHANGED
availableQuantity: 80   ← 100 - 20 - 0
```

### 4.3 Implementation Requirements

```typescript
// UNRESERVE Operation
async function unreserve(
  warehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  session?: ClientSession
): Promise<UnreserveResult> {
  
  // 1. Build filter with reserved check
  const filter = buildFilter(warehouseId, item, {
    reservedQuantity: { $gte: item.quantity },  // Condition check
    isActive: true
  });
  
  // 2. Atomic update
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        availableQuantity: item.quantity,
        reservedQuantity: -item.quantity
      }
    },
    { new: true, session }
  );
  
  // 3. Check result
  if (!result) {
    throw new InsufficientReservedStockError({
      warehouseId,
      reserved: currentReserved,
      requested: item.quantity
    });
  }
  
  // 4. Create movement record
  await WarehouseStockMovement.create([{
    warehouseId,
    itemType: item.giftId ? "GIFT" : "PRODUCT",
    variantId: item.variantId,
    giftId: item.giftId,
    type: "UNRESERVE",
    quantity: item.quantity,
    referenceType: "ORDER",
    referenceId: orderId,
    createdBy: employeeId
  }], { session });
  
  return { success: true, result };
}
```

### 4.4 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| reservedQuantity >= qty check | REQUIRED | Cannot unreserve more than reserved |
| quantity NOT changed | REQUIRED | Physical stock unchanged |
| availableQuantity increases | REQUIRED | Stock returns to available pool |
| reservedQuantity decreases | REQUIRED | Release the hold |
| Rollback-safe | REQUIRED | Transaction must be atomic |

---

## 5. SHIP RESERVED ORDER

### 5.1 Operation Definition

SHIP removes physical stock from warehouse when order is shipped.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SHIP RESERVED ORDER                               │
│                                                                             │
│  Purpose: Deduct physical stock when order ships                           │
│  Trigger: Warehouse ships the order                                         │
│  Precondition: reservedQuantity >= qty AND quantity >= qty                  │
│                                                                             │
│  IMPORTANT: This operation assumes stock was previously RESERVED            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 State Transition Example

**Before SHIP (order was RESERVED):**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 100
reservedQuantity: 30
inTransitQuantity: 0
availableQuantity: 70  ← 100 - 30 - 0
```

**SHIP 10 units (from reserved stock):**

**After SHIP:**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 90          ← 100 - 10
reservedQuantity: 20    ← 30 - 10
inTransitQuantity: 0
availableQuantity: 70  ← UNCHANGED! (90 - 20 - 0 = 70)
```

### 5.3 Why availableQuantity Does NOT Change

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  EXPLANATION: Why availableQuantity stays the same after SHIP              │
│                                                                             │
│  Before SHIP:                                                              │
│    available = quantity - reserved - inTransit                             │
│    available = 100 - 30 - 0 = 70                                          │
│                                                                             │
│  After SHIP (reserved order):                                              │
│    quantity -= 10                                                          │
│    reserved -= 10                                                          │
│    available = (100-10) - (30-10) - 0                                     │
│    available = 90 - 20 - 0 = 70                                           │
│                                                                             │
│  Result: availableQuantity UNCHANGED (70 → 70)                             │
│                                                                             │
│  This is CORRECT because:                                                  │
│  1. The stock was already deducted from available when RESERVED             │
│  2. SHIP only changes ownership, not pool availability                      │
│  3. availableQuantity was 70 before ship, stays 70 after ship              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Implementation Requirements

```typescript
// SHIP Reserved Order
async function shipReserved(
  warehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  session?: ClientSession
): Promise<ShipResult> {
  
  // 1. Build filter with double condition
  const filter = buildFilter(warehouseId, item, {
    reservedQuantity: { $gte: item.quantity },  // Must have reserved
    quantity: { $gte: item.quantity },         // Must have physical stock
    isActive: true
  });
  
  // 2. Atomic update
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        quantity: -item.quantity,
        reservedQuantity: -item.quantity,
        shippedQuantity: item.quantity
        // availableQuantity unchanged (already 0 from reserve)
      }
    },
    { new: true, session }
  );
  
  // 3. Check result
  if (!result) {
    throw new ShipError("Không thể xuất kho - reserved không đủ hoặc tồn kho vật lý không đủ");
  }
  
  // 4. Create movement record
  await WarehouseStockMovement.create([{
    warehouseId,
    itemType: item.giftId ? "GIFT" : "PRODUCT",
    variantId: item.variantId,
    giftId: item.giftId,
    type: "ORDER_OUT",
    quantity: item.quantity,
    referenceType: "ORDER",
    referenceId: orderId,
    referenceCode: orderCode,
    createdBy: employeeId
  }], { session });
  
  return { success: true, result };
}
```

### 5.5 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| reservedQuantity >= qty check | REQUIRED | Must have reserved stock |
| quantity >= qty check | REQUIRED | Must have physical stock |
| quantity decreases | REQUIRED | Physical stock out |
| reservedQuantity decreases | REQUIRED | Release the reservation |
| availableQuantity UNCHANGED | REQUIRED | Already deducted at reserve |
| shippedQuantity increases | REQUIRED | Tracking stat |
| Idempotency check | REQUIRED | Prevent double ship |

---

## 6. SHIP NON-RESERVED ORDER

### 6.1 Decision Required

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  QUESTION: Does the system allow SHIP without prior RESERVE?                │
│                                                                             │
│  CURRENT BEHAVIOR:                                                         │
│    - Path A (warehouseService): Requires prior reserve (uses exportOrder)   │
│    - Path B (orderShipmentService): Allows direct ship                      │
│                                                                             │
│  RECOMMENDATION:                                                           │
│    REJECT non-reserved shipment - all orders must reserve first              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 If ALLOWED - State Transition

**Before SHIP (no prior reserve):**
```
quantity: 100
reservedQuantity: 20
inTransitQuantity: 0
availableQuantity: 80
```

**SHIP 10 units (non-reserved):**

**After SHIP:**
```
quantity: 90          ← 100 - 10
reservedQuantity: 20  ← UNCHANGED
inTransitQuantity: 0
availableQuantity: 70  ← 80 - 10 = 70 (DEDUCTED!)
```

### 6.3 If ALLOWED - Implementation

```typescript
// SHIP Non-Reserved Order (ONLY if allowed)
async function shipNonReserved(
  warehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  session?: ClientSession
): Promise<ShipResult> {
  
  // Check available instead of reserved
  const filter = buildFilter(warehouseId, item, {
    availableQuantity: { $gte: item.quantity },
    quantity: { $gte: item.quantity },
    isActive: true
  });
  
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        quantity: -item.quantity,
        availableQuantity: -item.quantity,
        shippedQuantity: item.quantity
        // reservedQuantity unchanged
      }
    },
    { new: true, session }
  );
  
  // ... rest of implementation
}
```

### 6.4 Final Decision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  FINAL DECISION: NON-RESERVED SHIPMENT IS NOT ALLOWED                       │
│                                                                             │
│  RATIONALE:                                                                │
│  1. Consistency with RESERVE → SHIP flow                                   │
│  2. Prevents overselling                                                   │
│  3. Clear audit trail (must reserve before ship)                            │
│  4. Matches real-world warehouse operations                                 │
│                                                                             │
│  ENFORCEMENT:                                                              │
│  - SHIP operations must verify reservedQuantity > 0                      │
│  - If reservedQuantity = 0, reject with clear error                        │
│  - Error: "Đơn hàng chưa được reserve. Vui lòng reserve trước khi ship."   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. CANCEL / UNRESERVE

### 7.1 Operation Definition

CANCEL releases reserved stock when an order is cancelled.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CANCEL / UNRESERVE                               │
│                                                                             │
│  Purpose: Release reserved stock when order is cancelled                    │
│  Trigger: Order cancelled by user or system                                │
│  Effect: UNRESERVE operation (see Section 4)                               │
│                                                                             │
│  IMPORTANT: CANCEL never touches quantity - only releases reservation         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Full Order Lifecycle Trace

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ORDER LIFECYCLE                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐
│ CREATED  │ (quantity unchanged, no reserve yet)
└────┬─────┘
     │ assign warehouseId
     ▼
┌──────────┐     ┌──────────┐
│ PENDING  │────▶│CONFIRMED│
└────┬─────┘     └────┬─────┘
     │                 │
     │ RESERVE         │ RESERVE
     │                 │
     ▼                 ▼
┌──────────────────────────┐
│     RESERVED            │
│                          │
│ quantity: 100 (unchanged)│
│ reserved: 30 (increased) │
│ available: 70 (reduced) │
└───────────┬──────────────┘
            │
            │ CANCEL
            │ (UNRESERVE)
            ▼
┌──────────────────────────┐
│     CANCELLED            │
│                          │
│ quantity: 100 (unchanged)│
│ reserved: 0 (released)   │
│ available: 100 (restored)│
└──────────────────────────┘

--- OR ---

┌──────────────────────────┐
│     RESERVED            │
│                          │
│ reserved: 30            │
└───────────┬──────────────┘
            │
            │ SHIP
            │ (reserved order)
            ▼
┌──────────────────────────┐
│     SHIPPED             │
│                          │
│ quantity: 70 (deducted) │
│ reserved: 0 (released)   │
│ available: 70 (unchanged)│
└──────────────────────────┘
```

### 7.3 Implementation Requirements

```typescript
// CANCEL Order - releases reservation
async function cancelOrder(
  orderId: string,
  session?: ClientSession
): Promise<CancelResult> {
  
  // 1. Get order with current reservation
  const order = await Order.findById(orderId);
  if (!order) throw new Error("Order not found");
  
  // 2. UNRESERVE all items
  for (const item of order.orderItems) {
    await unreserve(
      order.warehouseId,
      { variantId: item.variantId, quantity: item.quantity },
      session
    );
  }
  
  // 3. Update order status
  await Order.updateOne(
    { _id: orderId },
    { status: OrderStatus.CANCELLED },
    { session }
  );
  
  // 4. Create history
  await OrderHistory.create([{
    orderId,
    action: "CANCELLED",
    note: "Đơn bị hủy - stock released"
  }], { session });
  
  return { success: true };
}
```

---

## 8. RETURN

### 8.1 Operation Definition

RETURN adds physical stock back to warehouse when customer returns items.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RETURN                                         │
│                                                                             │
│  Purpose: Add returned stock back to warehouse                              │
│  Trigger: Customer returns items after delivery                             │
│  Effect: quantity += qty, availableQuantity += qty                          │
│                                                                             │
│  IMPORTANT: Returns go directly to available, not reserved                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 State Transition Example

**Before RETURN:**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 90           ← After shipping 10
reservedQuantity: 0
inTransitQuantity: 0
availableQuantity: 90
```

**RETURN 10 units:**

**After RETURN:**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 100          ← 90 + 10
reservedQuantity: 0    ← UNCHANGED
inTransitQuantity: 0   ← UNCHANGED
availableQuantity: 100  ← 90 + 10
```

### 8.3 Implementation Requirements

```typescript
// RETURN Operation
async function returnStock(
  warehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  session?: ClientSession
): Promise<ReturnResult> {
  
  // 1. Upsert - create if not exists
  const filter = buildFilter(warehouseId, item, { isActive: true });
  
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        quantity: item.quantity,
        availableQuantity: item.quantity
      },
      $setOnInsert: {
        warehouseId,
        itemType: item.giftId ? "GIFT" : "PRODUCT",
        variantId: item.variantId ?? null,
        giftId: item.giftId ?? null,
        reservedQuantity: 0,
        inTransitQuantity: 0,
        shippedQuantity: 0,
        isActive: true
      }
    },
    { upsert: true, new: true, session }
  );
  
  // 2. Create movement record
  await WarehouseStockMovement.create([{
    warehouseId,
    itemType: item.giftId ? "GIFT" : "PRODUCT",
    variantId: item.variantId,
    giftId: item.giftId,
    type: "ORDER_RETURN",
    quantity: item.quantity,
    referenceType: "ORDER",
    referenceId: orderId,
    referenceCode: orderCode,
    createdBy: employeeId
  }], { session });
  
  return { success: true, result };
}
```

### 8.4 WarehouseStockMovement Type

| Field | Value for RETURN |
|-------|------------------|
| type | "ORDER_RETURN" |
| referenceType | "ORDER" |
| referenceId | orderId |
| referenceCode | orderCode |

### 8.5 Requirements Checklist

| Requirement | Status | Notes |
|------------|--------|-------|
| quantity increases | REQUIRED | Physical stock returned |
| availableQuantity increases | REQUIRED | Stock available for sale |
| reservedQuantity unchanged | REQUIRED | Returns go to available pool |
| Creates movement record | REQUIRED | Audit trail |
| Upsert if not exists | REQUIRED | Handle new warehouse |

---

## 9. TRANSFER

### 9.1 Operation Definition

TRANSFER moves stock between warehouses.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRANSFER                                       │
│                                                                             │
│  Purpose: Move stock between warehouses                                     │
│  Trigger: Warehouse transfer request                                       │
│  Stages: DRAFT → SENT → RECEIVED                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 9.2 TRANSFER_OUT (Send) - State Transition

**SOURCE Before TRANSFER:**
```
warehouseId: "WH001"
variantId: "VAR001"
quantity: 100
reservedQuantity: 0
inTransitQuantity: 0
availableQuantity: 100
```

**DESTINATION Before TRANSFER:**
```
warehouseId: "WH002"
variantId: "VAR001"
quantity: 50
reservedQuantity: 0
inTransitQuantity: 0
availableQuantity: 50
```

**TRANSFER 30 units from WH001 → WH002:**

**SOURCE After TRANSFER_OUT:**
```
warehouseId: "WH001"
quantity: 70           ← 100 - 30
reservedQuantity: 0
inTransitQuantity: 0   ← No inTransit for direct transfer
availableQuantity: 70  ← 100 - 30
```

**DESTINATION After TRANSFER_OUT:**
```
warehouseId: "WH002"
quantity: 50           ← UNCHANGED (not yet received)
reservedQuantity: 0
inTransitQuantity: 0   ← UNCHANGED
availableQuantity: 50  ← UNCHANGED
```

### 9.3 Implementation - TRANSFER_OUT

```typescript
// TRANSFER_OUT - Source warehouse
async function transferOut(
  sourceWarehouseId: ObjectId,
  destWarehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  transferId: ObjectId,
  session?: ClientSession
): Promise<TransferOutResult> {
  
  // Check source has enough available
  const filter = buildFilter(sourceWarehouseId, item, {
    availableQuantity: { $gte: item.quantity },
    isActive: true
  });
  
  // Deduct from source
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        quantity: -item.quantity,
        availableQuantity: -item.quantity
      }
    },
    { new: true, session }
  );
  
  if (!result) {
    throw new TransferError("Source warehouse không đủ tồn kho");
  }
  
  // Create transfer record
  await WarehouseStockMovement.create([{
    warehouseId: sourceWarehouseId,
    itemType: item.giftId ? "GIFT" : "PRODUCT",
    variantId: item.variantId,
    giftId: item.giftId,
    type: "TRANSFER_OUT",
    quantity: item.quantity,
    referenceType: "TRANSFER",
    referenceId: transferId,
    createdBy: employeeId
  }], { session });
  
  return { success: true };
}
```

### 9.4 RECEIVE (Complete Transfer) - State Transition

**If COMPLETED transfer:**

**DESTINATION After RECEIVE:**
```
warehouseId: "WH002"
quantity: 80           ← 50 + 30
reservedQuantity: 0
inTransitQuantity: 0   ← UNCHANGED
availableQuantity: 80   ← 50 + 30
```

### 9.5 Implementation - RECEIVE

```typescript
// RECEIVE - Destination warehouse
async function receiveTransfer(
  destWarehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  transferId: ObjectId,
  session?: ClientSession
): Promise<ReceiveResult> {
  
  const filter = buildFilter(destWarehouseId, item, { isActive: true });
  
  // Add to destination
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        quantity: item.quantity,
        availableQuantity: item.quantity
      },
      $setOnInsert: {
        warehouseId: destWarehouseId,
        itemType: item.giftId ? "GIFT" : "PRODUCT",
        variantId: item.variantId ?? null,
        giftId: item.giftId ?? null,
        reservedQuantity: 0,
        inTransitQuantity: 0,
        shippedQuantity: 0,
        isActive: true
      }
    },
    { upsert: true, new: true, session }
  );
  
  // Create transfer in record
  await WarehouseStockMovement.create([{
    warehouseId: destWarehouseId,
    itemType: item.giftId ? "GIFT" : "PRODUCT",
    variantId: item.variantId,
    giftId: item.giftId,
    type: "TRANSFER_IN",
    quantity: item.quantity,
    referenceType: "TRANSFER",
    referenceId: transferId,
    createdBy: employeeId
  }], { session });
  
  return { success: true };
}
```

### 9.6 Partial Receive Handling

```typescript
// RECEIVE with partial quantity
async function receiveTransferPartial(
  destWarehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; sentQuantity: number; receivedQuantity: number },
  transferId: ObjectId,
  session?: ClientSession
): Promise<ReceiveResult> {
  
  // receivedQuantity may be less than sentQuantity
  // difference is logged but not automatically adjusted
  
  const filter = buildFilter(destWarehouseId, item, { isActive: true });
  
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        quantity: item.receivedQuantity,
        availableQuantity: item.receivedQuantity
      }
    },
    { upsert: true, new: true, session }
  );
  
  // Log discrepancy
  const difference = item.sentQuantity - item.receivedQuantity;
  if (difference > 0) {
    // Log for manual investigation
    await TransferDiscrepancy.create([{
      transferId,
      item,
      sentQuantity: item.sentQuantity,
      receivedQuantity: item.receivedQuantity,
      difference,
      createdBy: employeeId,
      note: "Partial receive discrepancy"
    }], { session });
  }
  
  return { success: true, result, difference };
}
```

### 9.7 Requirements Checklist

| Requirement | Status | Notes |
|------------|--------|-------|
| SOURCE: quantity -= qty | REQUIRED | Physical stock leaves source |
| SOURCE: available -= qty | REQUIRED | Cannot use transferred stock |
| DEST: quantity += receivedQty | REQUIRED | Physical stock arrives |
| DEST: available += receivedQty | REQUIRED | Available after receive |
| Create movement for each | REQUIRED | Full audit trail |
| Partial receive support | REQUIRED | Handle difference |
| Transaction boundary | REQUIRED | Atomic transfer |

---

## 10. RANDOM GIFT

### 10.1 Gift Handling Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GIFT HANDLING                                   │
└─────────────────────────────────────────────────────────────────────────────┘

WarehouseInventory tracks gifts via:
  - itemType: "GIFT"
  - giftId: ObjectId (reference to Gift collection)
  - quantity: gift stock at this warehouse

Gift collection (gift model):
  - name: gift name
  - stockQuantity: TOTAL across all warehouses (legacy)
  - isActive: status

IMPORTANT: Gift.stockQuantity is summary only.
Real-time stock is in WarehouseInventory by warehouse.
```

### 10.2 RANDOM Gift Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            RANDOM GIFT FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

ORDER ITEM:
  ├── comboId: "COMBO001"
  ├── comboQuantity: 1
  ├── giftQuantity: 1
  ├── giftMode: "RANDOM"
  └── giftSelections: []  ← EMPTY for RANDOM

    │
    │ User creates order with RANDOM gift
    │
    ▼
ORDER SAVED:
  ├── giftMode: "RANDOM"
  └── giftSelections: []
  
    │
    │ Order ships - warehouse employee must SELECT the gift
    │
    ▼
SHIP REQUEST:
  ├── orderId: "ORD001"
  └── actualShipments: [
        {
          itemType: "GIFT",
          giftId: "GIFT001",  ← SELECTED BY EMPLOYEE
          quantity: 1
        }
      ]
  
    │
    │ System validates and deducts
    │
    ▼
WAREHOUSE INVENTORY:
  WarehouseInventory {
    itemType: "GIFT",
    giftId: "GIFT001",
    quantity: 99,
    availableQuantity: 99
  }
```

### 10.3 Implementation Requirements

```typescript
// RANDOM Gift Shipment
async function shipRandomGift(
  orderId: string,
  actualShipments: Array<{
    itemType: "GIFT";
    giftId: string;
    quantity: number;
  }>,
  session?: ClientSession
): Promise<ShipGiftResult> {
  
  // Validate all gifts exist
  for (const gift of actualShipments) {
    const giftExists = await Gift.exists({ _id: gift.giftId, isActive: true });
    if (!giftExists) {
      throw new Error(`Gift không tồn tại: ${gift.giftId}`);
    }
  }
  
  // Deduct from warehouse
  for (const gift of actualShipments) {
    await deductGiftFromWarehouse(
      order.warehouseId,
      gift.giftId,
      gift.quantity,
      session
    );
  }
  
  // Create movement records
  for (const gift of actualShipments) {
    await WarehouseStockMovement.create([{
      warehouseId: order.warehouseId,
      itemType: "GIFT",
      giftId: gift.giftId,
      type: "ORDER_OUT",
      quantity: gift.quantity,
      referenceType: "ORDER",
      referenceId: orderId,
      createdBy: employeeId,
      note: "RANDOM gift selected by warehouse"
    }], { session });
  }
  
  return { success: true };
}
```

### 10.4 CUSTOMER_SELECTED Gift Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CUSTOMER_SELECTED GIFT FLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

ORDER ITEM:
  ├── comboId: "COMBO001"
  ├── comboQuantity: 1
  ├── giftQuantity: 1
  ├── giftMode: "CUSTOMER_SELECTED"
  └── giftSelections: [
        { giftProductId: "GIFT002", quantity: 1 }
      ]
  
    │
    │ Ship - use exact giftId from selections
    │
    ▼
WAREHOUSE INVENTORY:
  WarehouseInventory {
    itemType: "GIFT",
    giftId: "GIFT002",
    quantity: 50,
    availableQuantity: 50
  }
```

### 10.5 Implementation - CUSTOMER_SELECTED Gift

```typescript
// CUSTOMER_SELECTED Gift Shipment
async function shipCustomerSelectedGift(
  order: Order,
  session?: ClientSession
): Promise<ShipGiftResult> {
  
  for (const item of order.orderItems) {
    if (item.giftMode === "CUSTOMER_SELECTED" && item.giftSelections?.length) {
      for (const selection of item.giftSelections) {
        // Use exact giftId from customer selection
        await deductGiftFromWarehouse(
          order.warehouseId,
          selection.giftProductId.toString(),
          selection.quantity,
          session
        );
        
        await WarehouseStockMovement.create([{
          warehouseId: order.warehouseId,
          itemType: "GIFT",
          giftId: selection.giftProductId,
          type: "ORDER_OUT",
          quantity: selection.quantity,
          referenceType: "ORDER",
          referenceId: order._id,
          createdBy: employeeId,
          note: "CUSTOMER_SELECTED gift"
        }], { session });
      }
    }
  }
  
  return { success: true };
}
```

### 10.6 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| RANDOM: employee selects actual giftId | REQUIRED | Cannot auto-select |
| RANDOM: caller must provide actualShipments | REQUIRED | Error if not provided |
| CUSTOMER_SELECTED: use exact giftId | REQUIRED | From giftSelections |
| Validate gift exists | REQUIRED | Check Gift collection |
| Validate warehouse has gift | REQUIRED | Check WarehouseInventory |
| Deduct from WarehouseInventory | REQUIRED | By giftId |
| Create movement record | REQUIRED | With giftId |

### 10.7 Gift Validation

```typescript
// Validate gift available in warehouse
async function validateGiftShipment(
  warehouseId: ObjectId,
  giftId: string,
  quantity: number,
  session?: ClientSession
): Promise<void> {
  
  const inventory = await WarehouseInventory.findOne({
    warehouseId,
    itemType: "GIFT",
    giftId: new ObjectId(giftId),
    isActive: true
  }).session(session);
  
  if (!inventory) {
    throw new Error(`Quà không tồn tại trong kho này: ${giftId}`);
  }
  
  if (inventory.availableQuantity < quantity) {
    throw new Error(
      `Không đủ tồn kho cho quà ${giftId}: cần ${quantity}, có ${inventory.availableQuantity}`
    );
  }
}
```

---

## 11. DOUBLE SHIPMENT

### 11.1 Problem Definition

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  PROBLEM: Duplicate shipment requests                                        │
│                                                                             │
│  Scenario:                                                                 │
│    Order A, status = PACKING                                               │
│                                                                             │
│    Request #1: SHIP Order A ────────▶ SUCCESS                             │
│                                                                             │
│    Request #2: SHIP Order A ────────▶ Should REJECT                        │
│                                         (already shipped)                   │
│                                                                             │
│  WITHOUT idempotency:                                                     │
│    - Request #1: deducts 10 units                                         │
│    - Request #2: deducts another 10 units                                 │
│    - Result: 20 units deducted instead of 10 (DOUBLE DEDUCTION)           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Idempotency Mechanism

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IDEMPOTENCY DESIGN                               │
└─────────────────────────────────────────────────────────────────────────────┘

Strategy: Order Status + Movement Check

Before SHIP:
  1. Check Order.status === "PACKING" or "CONFIRMED"
     → If SHIPPING or SHIPPED → REJECT
  
  2. Check WarehouseStockMovement for existing shipment
     → If exists with type="ORDER_OUT" for this order → REJECT
  
  3. Start transaction

During SHIP:
  4. Update Order.status → SHIPPING
  
  5. Deduct stock
  
  6. Create WarehouseStockMovement

After SHIP:
  7. Commit transaction

Result: Second request finds Order.status = SHIPPING and REJECTS
```

### 11.3 Implementation

```typescript
// Idempotent SHIP
async function shipOrder(
  orderId: string,
  actualShipments?: ShipmentItem[],
  session?: ClientSession
): Promise<ShipResult> {
  
  const order = await Order.findById(orderId);
  
  // IDEMPOTENCY CHECK #1: Order status
  if (order.status === OrderStatus.SHIPPING || 
      order.status === OrderStatus.SHIPPED ||
      order.status === OrderStatus.DELIVERED) {
    throw new Error("Đơn hàng đã được xuất kho");
  }
  
  // IDEMPOTENCY CHECK #2: Existing shipment movement
  const existingShipment = await WarehouseStockMovement.findOne({
    referenceId: new ObjectId(orderId),
    referenceType: "ORDER",
    type: "ORDER_OUT"
  });
  
  if (existingShipment) {
    throw new Error("Đơn hàng đã được xuất kho - movement tồn tại");
  }
  
  // PROCEED WITH SHIPMENT
  await session.withTransaction(async () => {
    
    // 1. Update order status (lock)
    await Order.updateOne(
      { _id: orderId, status: { $nin: [OrderStatus.SHIPPING, OrderStatus.SHIPPED] } },
      { status: OrderStatus.SHIPPING },
      { session }
    );
    
    // 2. Deduct all items
    const shipments = actualShipments || await buildShipmentDemands(order);
    
    for (const item of shipments) {
      await deductFromWarehouse(order.warehouseId, item, session);
    }
    
    // 3. Create movements
    for (const item of shipments) {
      await WarehouseStockMovement.create([{
        warehouseId: order.warehouseId,
        itemType: item.itemType,
        variantId: item.variantId,
        giftId: item.giftId,
        type: "ORDER_OUT",
        quantity: item.quantity,
        referenceType: "ORDER",
        referenceId: order._id,
        referenceCode: order.orderCode,
        createdBy: employeeId
      }], { session });
    }
    
    // 4. Update final status
    await Order.updateOne(
      { _id: orderId },
      { status: OrderStatus.SHIPPED },
      { session }
    );
  });
  
  return { success: true };
}
```

### 11.4 Alternative: Unique Constraint

```typescript
// Alternative: Use unique index on WarehouseStockMovement
// (referenceType + referenceId) should be unique for ORDER_OUT type

// Schema change
WarehouseStockMovementSchema.index(
  { referenceType: 1, referenceId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "ORDER_OUT" } }
);

// During shipment
try {
  await WarehouseStockMovement.create([...]);
} catch (error) {
  if (error.code === 11000) { // Duplicate key
    throw new Error("Đơn hàng đã được xuất kho");
  }
  throw error;
}
```

### 11.5 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Check Order status before ship | REQUIRED | Prevent shipped order re-ship |
| Check existing movement | REQUIRED | Backup check |
| Atomic status update | REQUIRED | Use transaction |
| Clear error message | REQUIRED | Explain why rejected |
| Idempotent response | REQUIRED | Same error for same reason |

---

## 12. RESERVE vs SHIP RACE CONDITION

### 12.1 Race Scenarios Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RACE CONDITION SCENARIOS                             │
└─────────────────────────────────────────────────────────────────────────────┘

SCENARIO A: RESERVE and SHIP simultaneously
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Thread 1│     │ Thread 2│     │ Result  │
│ RESERVE │     │ SHIP    │     │         │
│   30    │     │   30    │     │         │
└────┬────┘     └────┬────┘     └────┬────┘
     │                │                │
     │ check: qty=100│                │
     │ available=100 │                │
     │                │                │
     │         check: qty=100         │
     │         available=100          │
     │                │                │
     │                │                │
     │ UPDATE:         │                │
     │ available=70    │                │
     │ reserved=30    │                │
     │                │                │
     │         UPDATE:                │
     │         (check: reserved=30)  │
     │         reserved=0              │
     │         quantity=70            │
     │                │                │
     ▼                ▼                ▼
   SUCCESS          SUCCESS        CONSISTENT
   Reserve OK       Ship OK       (but risky timing)

SCENARIO B: Two RESERVE simultaneously
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Thread 1│     │ Thread 2│     │ Result  │
│ RESERVE │     │ RESERVE  │     │         │
│   60    │     │   60     │     │         │
└────┬────┘     └────┬────┘     └────┬────┘
     │                │                │
     │ check: qty=100│                │
     │ available=100 │                │
     │                │                │
     │         check: qty=100        │
     │         available=100         │
     │                │                │
     │ UPDATE:         │                │
     │ available=40    │                │
     │ reserved=60    │                │
     │                │                │
     │         UPDATE:                │
     │         (check: available=40) │
     │         available=40, < 60!    │
     │                │                │
     ▼                ▼                ▼
   SUCCESS          FAILURE        CONSISTENT
   Reserve OK       Rejected       (one fails)
```

### 12.2 Solution: Optimistic Locking with Conditional Updates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  SOLUTION: Use MongoDB atomic findOneAndUpdate with conditional check       │
│                                                                             │
│  RESERVE:                                                                  │
│    Filter: { availableQuantity: { $gte: qty } }                             │
│    Update: { $inc: { availableQuantity: -qty, reservedQuantity: qty } }     │
│    If no doc matches → InsufficientStock                                    │
│                                                                             │
│  SHIP:                                                                     │
│    Filter: { reservedQuantity: { $gte: qty }, quantity: { $gte: qty } }   │
│    Update: { $inc: { quantity: -qty, reservedQuantity: -qty } }           │
│    If no doc matches → No reservation or insufficient stock                  │
│                                                                             │
│  Result: One operation succeeds, other fails - NO OVERDEDUCTION            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.3 Implementation - Race-Safe Operations

```typescript
// RESERVE with race protection
async function reserveRaceSafe(
  warehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  session?: ClientSession
): Promise<ReserveResult> {
  
  const filter = buildFilter(warehouseId, item, {
    // CRITICAL: Conditional check in filter
    availableQuantity: { $gte: item.quantity },
    isActive: true
  });
  
  // Atomic update - only succeeds if condition in filter matches
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        availableQuantity: -item.quantity,
        reservedQuantity: item.quantity
      }
    },
    { new: true, session }
  );
  
  if (!result) {
    // Either not found OR availableQuantity < qty at time of update
    // Re-query to determine cause
    const current = await WarehouseInventory.findOne(buildFilter(warehouseId, item));
    
    if (!current) {
      throw new InventoryNotFoundError();
    }
    
    throw new InsufficientStockError({
      warehouseId,
      available: current.availableQuantity,
      requested: item.quantity
    });
  }
  
  return { success: true, result };
}

// SHIP with race protection
async function shipRaceSafe(
  warehouseId: ObjectId,
  item: { variantId?: ObjectId; giftId?: ObjectId; quantity: number },
  session?: ClientSession
): Promise<ShipResult> {
  
  const filter = buildFilter(warehouseId, item, {
    // CRITICAL: Both conditions in filter
    reservedQuantity: { $gte: item.quantity },
    quantity: { $gte: item.quantity },
    isActive: true
  });
  
  const result = await WarehouseInventory.findOneAndUpdate(
    filter,
    {
      $inc: {
        quantity: -item.quantity,
        reservedQuantity: -item.quantity,
        shippedQuantity: item.quantity
      }
    },
    { new: true, session }
  );
  
  if (!result) {
    const current = await WarehouseInventory.findOne(buildFilter(warehouseId, item));
    
    if (!current) {
      throw new InventoryNotFoundError();
    }
    
    if (current.reservedQuantity < item.quantity) {
      throw new Error("Chưa reserve hoặc reserve không đủ");
    }
    
    if (current.quantity < item.quantity) {
      throw new Error("Tồn kho vật lý không đủ");
    }
    
    throw new Error("Cập nhật thất bại - vui lòng thử lại");
  }
  
  return { success: true, result };
}
```

### 12.4 Invariant Enforcement

```typescript
// Post-update invariant check (safety net)
function validateInvariants(doc: WarehouseInventoryDocument): void {
  if (doc.quantity < 0) {
    throw new Error(`INVARIANT VIOLATION: quantity < 0: ${doc.quantity}`);
  }
  if (doc.reservedQuantity < 0) {
    throw new Error(`INVARIANT VIOLATION: reservedQuantity < 0: ${doc.reservedQuantity}`);
  }
  if (doc.inTransitQuantity < 0) {
    throw new Error(`INVARIANT VIOLATION: inTransitQuantity < 0: ${doc.inTransitQuantity}`);
  }
  
  const calculatedAvailable = doc.quantity - doc.reservedQuantity - doc.inTransitQuantity;
  if (Math.abs(calculatedAvailable - doc.availableQuantity) > 0.001) {
    throw new Error(
      `INVARIANT VIOLATION: availableQuantity mismatch. ` +
      `Expected: ${calculatedAvailable}, Actual: ${doc.availableQuantity}`
    );
  }
}
```

### 12.5 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Atomic RESERVE with condition | REQUIRED | availableQuantity >= qty |
| Atomic SHIP with condition | REQUIRED | reservedQuantity >= qty |
| Error handling | REQUIRED | Clear error messages |
| Invariant validation | REQUIRED | Safety net |
| Retry logic | RECOMMENDED | Client can retry |

---

## 13. TWO SHIPMENT PATHS

### 13.1 Current State Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CURRENT SHIPMENT PATHS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

PATH A: warehouse.service.ts
├─ Trigger: WarehouseTask status → SHIPPED
├─ Service: warehouseService.changeStatus()
├─ Updates: Inventory collection (legacy)
└─ Status: DEPRECATED (uses legacy Inventory)

PATH B: orderShipment.service.ts  
├─ Trigger: POST /api/warehouse/orders/:orderId/ship
├─ Service: orderShipmentService.shipOrder()
├─ Updates: WarehouseInventory collection
└─ Status: ACTIVE (uses correct collection)
```

### 13.2 Decision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  FINAL DECISION:                                                           │
│                                                                             │
│  KEEP: Path B (orderShipmentService.shipOrder())                          │
│  DEPRECATE: Path A (warehouseService → Inventory.exportOrder)              │
│                                                                             │
│  RATIONALE:                                                                │
│  1. Path B uses WarehouseInventory (SoT)                                    │
│  2. Path A uses Inventory (legacy)                                        │
│  3. Cannot have two paths that update different collections                 │
│  4. Path A must be removed to prevent confusion                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.3 Migration Steps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PATH MIGRATION STEPS                                  │
└─────────────────────────────────────────────────────────────────────────────┘

Step 1: Update warehouseService.changeStatus()
├─ When status → SHIPPED:
│  └─ Instead of calling inventoryService.exportOrder()
│     └─ Call orderShipmentService.shipOrder()
│
Step 2: Remove inventoryService.exportOrder() call
├─ warehouseService.changeStatus() should NOT directly update inventory
│
Step 3: Verify warehouseService still updates:
├─ Order status → SHIPPING
├─ WarehouseTask status
├─ History records
│
Step 4: Delete inventoryService.exportOrder() method
│  (After verifying no other callers)
│
Step 5: Delete inventoryService.rollbackExport() method
│  (If not used elsewhere)
```

### 13.4 Updated warehouseService.changeStatus()

```typescript
// UPDATED warehouseService.changeStatus()
async function changeStatus(
  data: { taskId: string; newStatus: string; employeeId: string; note?: string }
): Promise<ChangeStatusResult | ChangeStatusError> {
  
  // ... validation ...
  
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    
    // Update task status
    const updatedTask = await warehouseRepository.changeStatus(taskId, newStatus, session);
    
    // RECORD HISTORY
    await warehouseHistoryService.createStatusChangeHistory({...}, session);
    
    // SYNC: Warehouse SHIPPED → Order SHIPPING
    if (newStatus === WarehouseStatus.SHIPPED) {
      
      // Get order
      const orderDoc = await getOrderDocument(task.orderId.toString());
      if (!orderDoc) {
        await session.abortTransaction();
        return { success: false, error: "Không tìm thấy đơn hàng" };
      }
      
      // USE UNIFIED SHIPMENT SERVICE (Path B)
      const shipmentResult = await orderShipmentService.shipOrder({
        orderId: task.orderId.toString(),
        employeeId: data.employeeId,
        note: data.note || "Xuất kho khi warehouse SHIPPED"
      }, session);
      
      if (!shipmentResult.success) {
        await session.abortTransaction();
        return { success: false, error: `Xuất kho thất bại: ${shipmentResult.error}` };
      }
    }
    
    await session.commitTransaction();
    return { success: true, task: updatedTask };
    
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
```

### 13.5 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Single SHIP path | REQUIRED | No ambiguity |
| orderShipmentService is SoT | REQUIRED | Uses WarehouseInventory |
| warehouseService delegates | REQUIRED | No direct Inventory updates |
| Same idempotency | REQUIRED | Same checks |
| Same movement records | REQUIRED | WarehouseStockMovement |

---

## 14. TRANSACTION BOUNDARY

### 14.1 Transaction Requirements by Operation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TRANSACTION BOUNDARIES                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┬───────────────────────────────────────────────────────┐
│   OPERATION    │                    BOUNDARY                            │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                       │
│ RESERVE         │ ┌─────────────────────────────────────────────┐      │
│                 │ │ TRANSACTION START                            │      │
│                 │ │  ├─► Update WarehouseInventory              │      │
│                 │ │  ├─► Create WarehouseStockMovement          │      │
│                 │ │  └─► Commit / Rollback                      │      │
│                 │ └─────────────────────────────────────────────┘      │
│                 │                                                       │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                       │
│ UNRESERVE       │ ┌─────────────────────────────────────────────┐      │
│                 │ │ TRANSACTION START                            │      │
│                 │ │  ├─► Update WarehouseInventory              │      │
│                 │ │  ├─► Create WarehouseStockMovement          │      │
│                 │ │  └─► Commit / Rollback                      │      │
│                 │ └─────────────────────────────────────────────┘      │
│                 │                                                       │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                       │
│ CANCEL          │ ┌─────────────────────────────────────────────┐      │
│                 │ │ TRANSACTION START                            │      │
│                 │ │  ├─► UNRESERVE WarehouseInventory           │      │
│                 │ │  ├─► Update Order status                    │      │
│                 │ │  ├─► Create OrderHistory                     │      │
│                 │ │  └─► Commit / Rollback                      │      │
│                 │ └─────────────────────────────────────────────┘      │
│                 │                                                       │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                       │
│ SHIP            │ ┌─────────────────────────────────────────────┐      │
│                 │ │ TRANSACTION START                            │      │
│                 │ │  ├─► Idempotency check (Order status)      │      │
│                 │ │  ├─► Update WarehouseInventory              │      │
│                 │ │  ├─► Update Order status                    │      │
│                 │ │  ├─► Create WarehouseStockMovement          │      │
│                 │ │  └─► Commit / Rollback                      │      │
│                 │ └─────────────────────────────────────────────┘      │
│                 │                                                       │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                       │
│ RETURN          │ ┌─────────────────────────────────────────────┐      │
│                 │ │ TRANSACTION START                            │      │
│                 │ │  ├─► Update WarehouseInventory              │      │
│                 │ │  ├─► Create WarehouseStockMovement          │      │
│                 │ │  └─► Commit / Rollback                      │      │
│                 │ └─────────────────────────────────────────────┘      │
│                 │                                                       │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                       │
│ TRANSFER        │ ┌─────────────────────────────────────────────┐      │
│                 │ │ TRANSACTION START                            │      │
│                 │ │  ├─► Create WarehouseTransfer record         │      │
│                 │ │  ├─► Update SOURCE WarehouseInventory         │      │
│                 │ │  ├─► Create WarehouseStockMovement (OUT)    │      │
│                 │ │  ├─► Update DEST WarehouseInventory (IN)    │      │
│                 │ │  ├─► Create WarehouseStockMovement (IN)     │      │
│                 │ │  └─► Commit / Rollback                      │      │
│                 │ └─────────────────────────────────────────────┘      │
│                 │                                                       │
├─────────────────┼───────────────────────────────────────────────────────┤
│                 │                                                       │
│ RECEIVE         │ ┌─────────────────────────────────────────────┐      │
│                 │ │ TRANSACTION START                            │      │
│                 │ │  ├─► Update WarehouseTransfer status        │      │
│                 │ │  ├─► Update WarehouseInventory (DEST)        │      │
│                 │ │  ├─► Create WarehouseStockMovement (IN)     │      │
│                 │ │  └─► Commit / Rollback                      │      │
│                 │ └─────────────────────────────────────────────┘      │
│                 │                                                       │
└─────────────────┴───────────────────────────────────────────────────────┘
```

### 14.2 Multi-Collection Transaction Example

```typescript
// SHIP - Full transaction with multiple collections
async function shipOrderWithTransaction(
  orderId: string,
  actualShipments: ShipmentItem[],
  session?: ClientSession
): Promise<ShipResult> {
  
  // Use provided session or create new
  const sess = session || await mongoose.startSession();
  const ownsSession = !session;
  
  try {
    if (ownsSession) sess.startTransaction();
    
    // 1. IDEMPOTENCY CHECK
    const order = await Order.findById(orderId).session(sess);
    if (!order) throw new Error("Order not found");
    if (order.status === OrderStatus.SHIPPING || 
        order.status === OrderStatus.SHIPPED) {
      throw new Error("Đơn đã được xuất kho");
    }
    
    // 2. UPDATE ORDER STATUS (lock the order)
    await Order.updateOne(
      { _id: orderId, status: { $nin: [OrderStatus.SHIPPING, OrderStatus.SHIPPED] } },
      { status: OrderStatus.SHIPPING },
      { session: sess }
    );
    
    // 3. DEDUCT FROM WAREHOUSEINVENTORY (SoT)
    for (const item of actualShipments) {
      await deductFromWarehouse(order.warehouseId, item, sess);
    }
    
    // 4. CREATE MOVEMENT RECORDS (audit)
    for (const item of actualShipments) {
      await WarehouseStockMovement.create([{
        warehouseId: order.warehouseId,
        itemType: item.itemType,
        variantId: item.variantId,
        giftId: item.giftId,
        type: "ORDER_OUT",
        quantity: item.quantity,
        referenceType: "ORDER",
        referenceId: order._id,
        referenceCode: order.orderCode,
        createdBy: employeeId
      }], { session: sess });
    }
    
    // 5. UPDATE FINAL ORDER STATUS
    await Order.updateOne(
      { _id: orderId },
      { status: OrderStatus.SHIPPED },
      { session: sess }
    );
    
    // 6. COMMIT
    if (ownsSession) await sess.commitTransaction();
    
    return { success: true };
    
  } catch (error) {
    if (ownsSession) await sess.abortTransaction();
    throw error;
  } finally {
    if (ownsSession) sess.endSession();
  }
}
```

### 14.3 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| All operations in transaction | REQUIRED | Atomicity |
| Order + WarehouseInventory in same TX | REQUIRED | Consistency |
| Movement records in same TX | REQUIRED | Audit trail |
| Rollback on any failure | REQUIRED | Data integrity |
| Session reuse | RECOMMENDED | Performance |

---

## 15. LEGACY INVENTORY

### 15.1 Legacy Inventory Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEGACY INVENTORY                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Collection: inventory

Schema:
  warehouseId: ObjectId          ← REQUIRED
  productVariantId: ObjectId     ← REQUIRED
  quantity: Number
  reservedQuantity: Number
  availableQuantity: Number      ← computed: quantity - reservedQuantity
  isActive: Boolean

KEY OBSERVATION:
  - Inventory HAS warehouseId field
  - BUT it was not being used consistently
  - It only tracks Product Variants, NOT Gifts
```

### 15.2 Migration Mapping

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    INVENTORY → WAREHOUSEINVENTORY MAPPING                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐       ┌─────────────────────────────────────────────┐
│   Inventory         │       │   WarehouseInventory                        │
├─────────────────────┤       ├─────────────────────────────────────────────┤
│                     │       │                                             │
│ warehouseId         │──────▶│ warehouseId                                │
│ (same)              │       │ (same)                                     │
│                     │       │                                             │
│ productVariantId     │──────▶│ variantId                                 │
│ (required)          │       │ (required for PRODUCT)                    │
│                     │       │                                             │
│ quantity            │──────▶│ quantity                                   │
│ (physical stock)    │       │ (physical stock)                           │
│                     │       │                                             │
│ reservedQuantity    │──────▶│ reservedQuantity                           │
│ (held for orders)   │       │ (held for orders)                          │
│                     │       │                                             │
│ availableQuantity   │──────▶│ availableQuantity                          │
│ (computed)          │       │ (must recompute: qty - reserved - transit)│
│                     │       │                                             │
│ isActive            │──────▶│ isActive                                   │
│                     │       │                                             │
│                     │       │ ADDITIONAL FIELDS (initialize to 0):       │
│                     │       │  - inTransitQuantity: 0                    │
│                     │       │  - shippedQuantity: 0                      │
│                     │       │  - itemType: "PRODUCT"                     │
│                     │       │  - productId: null                        │
│                     │       │  - giftId: null                           │
│                     │       │                                             │
└─────────────────────┘       └─────────────────────────────────────────────┘
```

### 15.3 Migration Script Design

```typescript
// Migration Script: Inventory → WarehouseInventory
async function migrateInventoryToWarehouseInventory(
  options: { dryRun?: boolean; batchSize?: number }
): Promise<MigrationResult> {
  
  const { dryRun = false, batchSize = 1000 } = options;
  const results = {
    processed: 0,
    migrated: 0,
    skipped: 0,
    errors: [] as string[]
  };
  
  // Get all Inventory documents
  const cursor = Inventory.find({ isActive: true }).cursor({ batchSize });
  
  for await (const inv of cursor) {
    results.processed++;
    
    try {
      // Check if corresponding WarehouseInventory exists
      const existing = await WarehouseInventory.findOne({
        warehouseId: inv.warehouseId,
        variantId: inv.productVariantId,
        isActive: true
      });
      
      if (existing) {
        // MERGE: Add quantities
        // Only migrate if Inventory has more recent update
        if (inv.updatedAt > existing.updatedAt) {
          if (!dryRun) {
            await WarehouseInventory.updateOne(
              { _id: existing._id },
              {
                $set: {
                  quantity: inv.quantity,
                  reservedQuantity: inv.reservedQuantity,
                  availableQuantity: inv.availableQuantity
                }
              }
            );
          }
          results.migrated++;
        } else {
          results.skipped++;
        }
      } else {
        // CREATE new WarehouseInventory
        if (!dryRun) {
          await WarehouseInventory.create([{
            warehouseId: inv.warehouseId,
            itemType: "PRODUCT",
            productId: null,
            variantId: inv.productVariantId,
            giftId: null,
            quantity: inv.quantity,
            availableQuantity: inv.availableQuantity,
            reservedQuantity: inv.reservedQuantity,
            inTransitQuantity: 0,
            shippedQuantity: 0,
            isActive: true
          }]);
        }
        results.migrated++;
      }
      
    } catch (error) {
      results.errors.push(`Error processing ${inv._id}: ${error.message}`);
    }
  }
  
  return results;
}
```

### 15.4 Verification Queries

```typescript
// Verify migration accuracy
async function verifyMigration(): Promise<VerificationResult> {
  
  const results = {
    inventoryCount: 0,
    warehouseCount: 0,
    matches: 0,
    mismatches: [] as MismatchDetail[]
  };
  
  // Count documents
  results.inventoryCount = await Inventory.countDocuments({ isActive: true });
  results.warehouseCount = await WarehouseInventory.countDocuments({ 
    itemType: "PRODUCT", 
    isActive: true 
  });
  
  // Find mismatches
  const inventoryItems = await Inventory.find({ isActive: true });
  
  for (const inv of inventoryItems) {
    const wh = await WarehouseInventory.findOne({
      warehouseId: inv.warehouseId,
      variantId: inv.productVariantId
    });
    
    if (!wh) {
      results.mismatches.push({
        type: "MISSING_IN_WAREHOUSE",
        inventory: inv
      });
    } else if (
      inv.quantity !== wh.quantity ||
      inv.reservedQuantity !== wh.reservedQuantity
    ) {
      results.mismatches.push({
        type: "QUANTITY_MISMATCH",
        inventory: inv,
        warehouse: wh
      });
    } else {
      results.matches++;
    }
  }
  
  return results;
}
```

### 15.5 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| WarehouseId mapping | REQUIRED | Same field name |
| VariantId mapping | REQUIRED | productVariantId → variantId |
| Quantity mapping | REQUIRED | Direct copy |
| Reserved mapping | REQUIRED | Direct copy |
| Available recompute | REQUIRED | qty - reserved - transit |
| Gift handling | N/A | Inventory doesn't track gifts |
| Incremental migration | RECOMMENDED | Batch processing |
| Dry-run mode | RECOMMENDED | Verify before apply |

---

## 16. API IMPACT

### 16.1 API Changes Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API IMPACT ANALYSIS                               │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
  🔴 BREAKING: Request/response format changes
  🟡 MINOR: Internal behavior changes (no API contract change)
  🟢 NO CHANGE: No modifications needed
```

### 16.2 Detailed API Changes

| API | Current Behavior | New Behavior | Impact | Notes |
|-----|------------------|--------------|--------|-------|
| POST /api/orders | Reserve via stockEngine → Inventory | Reserve via stockEngine → WarehouseInventory | 🟡 Minor | Same API, different internal target |
| PATCH /api/orders/:id | Reserve/Unreserve via stockEngine | Same, target WarehouseInventory | 🟡 Minor | Same API, different internal target |
| DELETE /api/orders/:id | Release via stockEngine | Same, target WarehouseInventory | 🟡 Minor | Same API, different internal target |
| POST /api/warehouse/orders/:orderId/ship | Uses orderShipmentService → WarehouseInventory | Same (this is the chosen path) | 🟢 No change | Already correct |
| POST /api/warehouse/orders/:orderId/return | Updates WarehouseInventory | Same | 🟢 No change | Already correct |
| POST /api/warehouse/transfers | Updates WarehouseInventory | Same | 🟢 No change | Already correct |
| POST /api/warehouse/transfers/:id/receive | Updates WarehouseInventory | Same | 🟢 No change | Already correct |
| WarehouseService.changeStatus | Calls inventoryService.exportOrder() | Should delegate to orderShipmentService | 🔴 Breaking | Must change internal call |

### 16.3 Request/Response Changes

#### POST /api/orders
```
Request Body: NO CHANGE
Response Body: NO CHANGE
Internal: stockEngine now writes to WarehouseInventory
```

#### POST /api/warehouse/orders/:orderId/ship
```
Request Body: NO CHANGE
Response Body: NO CHANGE
Internal: Already writes to WarehouseInventory (SoT)
```

#### warehouseService.changeStatus() → SHIPPED
```
OLD Behavior:
  └─► inventoryService.exportOrder()
        └─► Updates Inventory (legacy)

NEW Behavior:
  └─► orderShipmentService.shipOrder()
        └─► Updates WarehouseInventory (SoT)
```

### 16.4 Permission Changes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION IMPACT                                    │
└─────────────────────────────────────────────────────────────────────────────┘

No changes to permissions required.

Current permissions remain:
  - order.create
  - order.update  
  - order.delete
  - warehouse.ship
  - warehouse.return
  - warehouse.transfer
```

### 16.5 Transaction Changes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TRANSACTION CHANGES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Before:
  - RESERVE: Updates Inventory only
  - SHIP (Path B): Updates WarehouseInventory only
  - Two collections, two transaction scopes

After:
  - RESERVE: Updates WarehouseInventory (SoT)
  - SHIP (Path B): Updates WarehouseInventory (SoT)
  - Single collection, single transaction scope

No API contract changes - all internal implementation details.
```

### 16.6 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| API contracts unchanged | REQUIRED | External interface stable |
| Internal implementation updated | REQUIRED | Use WarehouseInventory |
| Error messages updated | RECOMMENDED | Reflect new behavior |
| Permission checks unchanged | REQUIRED | No new auth needed |
| Transaction scope verified | REQUIRED | Single collection |

---

## 17. UI IMPACT

### 17.1 UI Components Analysis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            UI IMPACT ANALYSIS                               │
└─────────────────────────────────────────────────────────────────────────────┘

UI Components that read inventory data:
  - Warehouse Inventory Table
  - Order Detail View
  - Shipment Form
  - Transfer Form
  - Dashboard Stats

UI Components that write inventory data:
  - Ship Order Button
  - Return Order Button
  - Create Transfer Button
  - Receive Transfer Button
```

### 17.2 No UI Changes Required

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  CONCLUSION: No UI changes required                                        │
│                                                                             │
│  REASON:                                                                  │
│  1. UI already reads from WarehouseInventory via hooks                     │
│  2. UI already calls orderShipmentService (ship/return)                   │
│  3. No changes to user-facing workflows                                   │
│  4. Backend changes are transparent to users                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 17.3 Components Using WarehouseInventory

| Component | Hook/Service Used | Impact |
|-----------|-------------------|--------|
| WarehouseInventoryTable | useWarehouseInventory | No change |
| ShipDrawer | orderShipmentService | No change |
| TransferForm | warehouseWorkflowService | No change |
| Dashboard Stats | useWarehouseInventory | No change |

### 17.4 Components That May Need Updates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     POTENTIAL UI UPDATES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

1. Order Detail - Stock Info Display
   └─► Currently shows Inventory.reservedQuantity
   └─► Should show WarehouseInventory.reservedQuantity
   └─► Impact: LOW (just display field name)

2. Error Messages
   └─► May need to update error messages to reflect new SoT
   └─► Impact: MINIMAL (cosmetic)

3. Debug/Dev Tools
   └─► Any admin tools showing Inventory collection
   └─► Impact: LOW (internal tools only)
```

### 17.5 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| No UI redesign | REQUIRED | Already using correct hooks |
| Hooks unchanged | REQUIRED | useWarehouseInventory works |
| Error message updates | RECOMMENDED | Reflect new SoT |
| Admin tools update | OPTIONAL | Internal only |

---

## 18. MIGRATION STRATEGY

### 18.1 Phased Migration Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MIGRATION PHASES                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: Schema & Index Updates (Week 1)
Phase 2: Dual-Write Migration (Week 2)
Phase 3: Switch Write Path (Week 3)
Phase 4: Verification & Reconciliation (Week 4)
Phase 5: Disable Legacy Reads (Week 5)
Phase 6: Cleanup & Documentation (Week 6)
```

### 18.2 Phase 1: Schema & Index Updates

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1: SCHEMA & INDEX UPDATES                                         │
│  Duration: 1 week                                                         │
│  Risk: LOW                                                                │
│  Downtime: NONE                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

Tasks:
  □ Add reservedQuantity field to WarehouseInventory (if missing)
  □ Add inTransitQuantity field (verify exists)
  □ Add shippedQuantity field (verify exists)
  □ Ensure all required indexes exist:
    - { warehouseId: 1, variantId: 1 }
    - { warehouseId: 1, giftId: 1 }
    - { warehouseId: 1, itemType: 1 }
  
  □ Verify WarehouseInventory schema supports all operations

Rollback: Revert schema migration
```

### 18.3 Phase 2: Dual-Write Migration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2: DUAL-WRITE MIGRATION                                           │
│  Duration: 1 week                                                         │
│  Risk: MEDIUM                                                             │
│  Downtime: NONE (shadow write)                                            │
└─────────────────────────────────────────────────────────────────────────────┘

Strategy:
  1. Modify stockEngine to write to BOTH Inventory AND WarehouseInventory
  2. Run parallel - no change to existing behavior
  3. Monitor for discrepancies
  
Tasks:
  □ Update stockEngine.applyItem() to write to WarehouseInventory
  □ Keep existing Inventory writes (dual write)
  □ Monitor both collections for consistency
  □ Fix any discrepancies found
  
Verification:
  □ Compare counts between Inventory and WarehouseInventory
  □ Log any mismatches for investigation
```

### 18.4 Phase 3: Switch Write Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3: SWITCH WRITE PATH                                              │
│  Duration: 1 week                                                         │
│  Risk: MEDIUM-HIGH                                                        │
│  Downtime: NONE (gradual switch)                                          │
└─────────────────────────────────────────────────────────────────────────────┘

Strategy:
  1. Stop writing to Inventory (inventoryService calls)
  2. Direct all writes to WarehouseInventory (stockEngine)
  3. warehouseService.changeStatus() delegates to orderShipmentService
  
Tasks:
  □ Update warehouseService.changeStatus() to use orderShipmentService
  □ Remove inventoryService.exportOrder() from warehouse flow
  □ Update stockEngine to only write WarehouseInventory
  □ Remove dual-write logic from stockEngine
  
Verification:
  □ All SHIP operations use orderShipmentService
  □ All RESERVE operations use stockEngine → WarehouseInventory
  □ No direct Inventory writes from Order flow
```

### 18.5 Phase 4: Verification & Reconciliation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4: VERIFICATION & RECONCILIATION                                   │
│  Duration: 1 week                                                         │
│  Risk: MEDIUM                                                             │
│  Downtime: NONE                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

Tasks:
  □ Run verification queries (see Section 15.4)
  □ Compare Inventory vs WarehouseInventory
  □ Reconcile any differences:
    - If WarehouseInventory < Inventory → Investigate missing writes
    - If WarehouseInventory > Inventory → OK (may have been created directly)
  □ Update any orphaned Inventory records
  
Verification Queries:
  □ Σ Inventory.quantity by warehouse = Σ WarehouseInventory.quantity?
  □ Σ Inventory.reservedQuantity by warehouse = Σ WarehouseInventory.reservedQuantity?
  □ All WarehouseInventory have matching Inventory?
  □ All Inventory have matching WarehouseInventory?
```

### 18.6 Phase 5: Disable Legacy Reads

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5: DISABLE LEGACY READS                                           │
│  Duration: 1 week                                                         │
│  Risk: MEDIUM                                                             │
│  Downtime: NONE (gradual)                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

Tasks:
  □ Audit all code reading from Inventory collection
  □ Update reads to use WarehouseInventory instead
  □ Mark Inventory as deprecated in code comments
  □ Update documentation
  
Warning: This is the point of no return for Inventory reads.
```

### 18.7 Phase 6: Cleanup & Documentation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 6: CLEANUP & DOCUMENTATION                                         │
│  Duration: 1 week                                                         │
│  Risk: LOW                                                                │
│  Downtime: NONE                                                          │
└─────────────────────────────────────────────────────────────────────────────┘

Tasks:
  □ Archive or delete old inventoryService.exportOrder() method
  □ Archive or delete old inventoryService.rollbackExport() method
  □ Update API documentation
  □ Update architecture diagrams
  □ Mark Inventory collection as deprecated
  □ Keep Inventory collection (for rollback capability for 30 days)
  □ Create rollback plan documentation
```

### 18.8 Rollback Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ROLLBACK PLAN                                   │
└─────────────────────────────────────────────────────────────────────────────┘

If issues found during migration:

Phase 1 Rollback:
  - Revert schema changes
  - No data loss (additive changes only)

Phase 2 Rollback:
  - Revert dual-write changes
  - Resume single-write to Inventory

Phase 3 Rollback:
  - Restore direct Inventory writes in stockEngine
  - Revert warehouseService changes

Phase 4+ Rollback:
  - ⚠️ Complex - requires data reconciliation
  - Run backward migration script (WarehouseInventory → Inventory)
  - Verify counts match before resuming

Recommendation: Don't proceed to Phase 4+ without thorough testing.
```

### 18.9 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Phase 1: Schema updates | REQUIRED | Foundation |
| Phase 2: Dual-write | RECOMMENDED | Safety net |
| Phase 3: Switch path | REQUIRED | Core change |
| Phase 4: Verify | REQUIRED | Ensure correctness |
| Phase 5: Disable legacy | OPTIONAL | Can keep as archive |
| Rollback plan | REQUIRED | Before Phase 3 |
| No immediate Inventory deletion | REQUIRED | Keep for rollback |

---

## 19. TEST MATRIX

### 19.1 Test Cases

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TEST MATRIX                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
  P0: Critical - Must pass
  P1: High - Should pass
  P2: Medium - Nice to have
```

### 19.2 Core Operations Tests

| Test Case | Description | Priority | Status |
|-----------|-------------|----------|--------|
| RESERVE_001 | Reserve when availableQuantity >= qty | P0 | |
| RESERVE_002 | Reserve when availableQuantity < qty (should fail) | P0 | |
| RESERVE_003 | Reserve changes availableQuantity correctly | P0 | |
| RESERVE_004 | Reserve changes reservedQuantity correctly | P0 | |
| RESERVE_005 | Reserve does NOT change quantity | P0 | |
| RESERVE_006 | Reserve creates WarehouseStockMovement | P1 | |
| UNRESERVE_001 | Unreserve when reservedQuantity >= qty | P0 | |
| UNRESERVE_002 | Unreserve when reservedQuantity < qty (should fail) | P0 | |
| UNRESERVE_003 | Unreserve restores availableQuantity | P0 | |
| UNRESERVE_004 | Unreserve reduces reservedQuantity | P0 | |
| CANCEL_001 | Cancel releases all reservations | P0 | |
| CANCEL_002 | Cancel does NOT change quantity | P0 | |

### 19.3 Shipment Tests

| Test Case | Description | Priority | Status |
|-----------|-------------|----------|--------|
| SHIP_RESERVED_001 | Ship reserved order successfully | P0 | |
| SHIP_RESERVED_002 | Ship reduces quantity correctly | P0 | |
| SHIP_RESERVED_003 | Ship reduces reservedQuantity | P0 | |
| SHIP_RESERVED_004 | Ship does NOT change availableQuantity | P0 | |
| SHIP_RESERVED_005 | Ship reserved order without reservation (should fail) | P0 | |
| SHIP_NON_RESERVED_001 | Ship non-reserved (if allowed) | P1 | |
| SHIP_NON_RESERVED_002 | Ship non-reserved changes availableQuantity | P1 | |
| IDEMPOTENCY_001 | Duplicate ship rejected | P0 | |
| IDEMPOTENCY_002 | Second ship after first fails | P0 | |

### 19.4 Return Tests

| Test Case | Description | Priority | Status |
|-----------|-------------|----------|--------|
| RETURN_001 | Return adds to quantity | P0 | |
| RETURN_002 | Return adds to availableQuantity | P0 | |
| RETURN_003 | Return does NOT change reservedQuantity | P0 | |
| RETURN_004 | Return creates WarehouseStockMovement | P1 | |
| RETURN_005 | Return to warehouse without stock (upsert) | P0 | |

### 19.5 Transfer Tests

| Test Case | Description | Priority | Status |
|-----------|-------------|----------|--------|
| TRANSFER_001 | Transfer deducts from source | P0 | |
| TRANSFER_002 | Transfer adds to destination | P0 | |
| TRANSFER_003 | Source availableQuantity reduced | P0 | |
| TRANSFER_004 | Partial receive handles difference | P1 | |
| TRANSFER_005 | Receive creates WarehouseStockMovement | P1 | |
| TRANSFER_006 | Transfer when source insufficient (should fail) | P0 | |

### 19.6 Gift Tests

| Test Case | Description | Priority | Status |
|-----------|-------------|----------|--------|
| GIFT_RANDOM_001 | RANDOM gift requires actualShipments | P0 | |
| GIFT_RANDOM_002 | RANDOM gift with valid giftId deducts | P0 | |
| GIFT_CUSTOMER_001 | CUSTOMER_SELECTED uses giftSelections | P0 | |
| GIFT_CUSTOMER_002 | CUSTOMER_SELECTED deducts correct giftId | P0 | |
| GIFT_VALIDATION_001 | Invalid giftId rejected | P0 | |
| GIFT_VALIDATION_002 | Gift not in warehouse rejected | P0 | |
| GIFT_STOCK_001 | Insufficient gift stock rejected | P0 | |

### 19.7 Concurrency Tests

| Test Case | Description | Priority | Status |
|-----------|-------------|----------|--------|
| CONCURRENT_RESERVE_001 | Two reserves, one may fail | P0 | |
| CONCURRENT_RESERVE_002 | No overselling | P0 | |
| CONCURRENT_SHIP_001 | Two ships, one may fail | P0 | |
| CONCURRENT_SHIP_002 | No double deduction | P0 | |
| CONCURRENT_RACE_001 | RESERVE and SHIP race | P0 | |
| CONCURRENT_RACE_002 | RESERVE and CANCEL race | P1 | |

### 19.8 Integration Tests

| Test Case | Description | Priority | Status |
|-----------|-------------|----------|--------|
| INT_ORDER_CREATE_001 | Order create reserves stock | P0 | |
| INT_ORDER_UPDATE_001 | Order update changes reservation | P0 | |
| INT_ORDER_CANCEL_001 | Order cancel releases reservation | P0 | |
| INT_ORDER_SHIP_001 | Order ship deducts stock | P0 | |
| INT_ORDER_RETURN_001 | Order return adds stock | P0 | |
| INT_TRANSFER_COMPLETE_001 | Transfer flow end-to-end | P0 | |

### 19.9 Requirements Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| All P0 tests pass | REQUIRED | Before production |
| Concurrency tests pass | REQUIRED | Race condition verification |
| Integration tests pass | REQUIRED | End-to-end scenarios |
| Performance tests | RECOMMENDED | Load testing |

---

## 20. FINAL DECISION

### 20.1 Summary of Decisions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FINAL DECISION SUMMARY                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **SOURCE OF TRUTH** | `WarehouseInventory` | Already supports all required fields, used by warehouse operations |
| **LEGACY** | `Inventory` | Will be deprecated after migration |
| **SHIP PATH** | `orderShipmentService.shipOrder()` | Uses WarehouseInventory (SoT) |
| **RESERVE PATH** | `stockEngine.reserveStock()` | Will be updated to target WarehouseInventory |
| **TRANSACTION MODEL** | Single collection transaction | MongoDB session for atomic operations |
| **IDEMPOTENCY** | Order status check + movement check | Prevents duplicate shipments |
| **NON-RESERVED SHIP** | NOT ALLOWED | All orders must reserve first |
| **GIFT SUPPORT** | WarehouseInventory (itemType="GIFT", giftId) | Already supported |
| **MIGRATION** | Phased approach | 6 phases, no immediate deletion |

### 20.2 Source of Truth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  SOURCE OF TRUTH: WarehouseInventory                                        │
│                                                                             │
│  Collection: warehouse_inventory                                             │
│                                                                             │
│  All inventory operations read/write this collection                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.3 Legacy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  LEGACY: Inventory                                                          │
│                                                                             │
│  Collection: inventory                                                      │
│                                                                             │
│  Status: TO BE MIGRATED                                                    │
│  Timeline: 6 weeks                                                         │
│  After migration: Archive/deprecate                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.4 Ship Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  SHIP PATH: orderShipmentService.shipOrder()                              │
│                                                                             │
│  File: src/services/warehouse/orderShipment.service.ts                     │
│                                                                             │
│  warehouseService.changeStatus() will delegate to this service            │
│                                                                             │
│  DEPRECATE: inventoryService.exportOrder()                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.5 Reserve Path

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  RESERVE PATH: stockEngine.reserveStock()                                │
│                                                                             │
│  File: src/services/warehouse/stockEngine.service.ts                      │
│                                                                             │
│  Will be updated to target WarehouseInventory instead of Inventory         │
│                                                                             │
│  Current: Inventory.findOneAndUpdate()                                     │
│  New: WarehouseInventory.findOneAndUpdate()                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.6 Transaction Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  TRANSACTION MODEL: Single Collection with MongoDB Session                  │
│                                                                             │
│  Each operation:                                                           │
│    1. Start MongoDB session                                                │
│    2. Start transaction (if not already in one)                            │
│    3. Update WarehouseInventory                                             │
│    4. Create WarehouseStockMovement                                        │
│    5. Update Order (if applicable)                                         │
│    6. Commit or rollback                                                   │
│                                                                             │
│  All operations atomic within their scope                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.7 Idempotency

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  IDEMPOTENCY: Order Status + Movement Check                                │
│                                                                             │
│  Before SHIP:                                                              │
│    1. Check Order.status (must be PACKING or CONFIRMED)                    │
│    2. Check WarehouseStockMovement for existing ORDER_OUT                   │
│    3. If either fails → REJECT                                            │
│                                                                             │
│  Within SHIP:                                                              │
│    1. Update Order.status → SHIPPING (with condition)                      │
│    2. Deduct stock                                                         │
│    3. Create movement                                                     │
│    4. Update Order.status → SHIPPED                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.8 Migration Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  MIGRATION: 6-Phase Phased Approach                                       │
│                                                                             │
│  Phase 1: Schema & Index Updates (Week 1)                                 │
│  Phase 2: Dual-Write Migration (Week 2)                                    │
│  Phase 3: Switch Write Path (Week 3)                                       │
│  Phase 4: Verification & Reconciliation (Week 4)                           │
│  Phase 5: Disable Legacy Reads (Week 5)                                     │
│  Phase 6: Cleanup & Documentation (Week 6)                                │
│                                                                             │
│  Total Duration: 6 weeks                                                   │
│  Expected Downtime: 0 weeks                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.9 Invariants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  CORE INVARIANTS (Must Always Hold):                                       │
│                                                                             │
│  availableQuantity = quantity - reservedQuantity - inTransitQuantity        │
│                                                                             │
│  CONSTRAINTS:                                                              │
│    • quantity >= 0                                                          │
│    • reservedQuantity >= 0                                                 │
│    • inTransitQuantity >= 0                                                │
│    • shippedQuantity >= 0                                                  │
│    • availableQuantity >= 0                                                 │
│    • reservedQuantity <= quantity                                          │
│    • inTransitQuantity <= quantity                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 20.10 Final Verdict

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                          FINAL VERDICT                                     ║
║                                                                           ║
║                    ┌─────────────────────────────┐                         ║
║                    │                             │                         ║
║                    │   READY FOR IMPLEMENTATION │                         ║
║                    │                             │                         ║
║                    └─────────────────────────────┘                         ║
║                                                                           ║
║  REQUIREMENTS MET:                                                        ║
║    ✅ Source of Truth defined (WarehouseInventory)                         ║
║    ✅ All operations designed (RESERVE, UNRESERVE, SHIP, etc.)             ║
║    ✅ Idempotency mechanism specified                                     ║
║    ✅ Race condition solutions documented                                  ║
║    ✅ Transaction boundaries defined                                       ║
║    ✅ Migration strategy planned                                           ║
║    ✅ Test matrix created                                                  ║
║    ✅ API/UI impact assessed                                             ║
║                                                                           ║
║  NEXT STEPS:                                                              ║
║    1. Stakeholder review and approval                                    ║
║    2. Set up staging environment                                          ║
║    3. Begin Phase 1 implementation                                        ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## APPENDIX: KEY FILES TO MODIFY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FILES TO MODIFY                                  │
└─────────────────────────────────────────────────────────────────────────────┘

CORE CHANGES:
├── src/models/WarehouseInventory.ts          [Verify all fields exist]
├── src/services/warehouse/stockEngine.service.ts    [Update to use WarehouseInventory]
├── src/services/warehouse/orderShipment.service.ts  [Add idempotency]
├── src/services/warehouse/warehouseWorkflow.service.ts [Verify consistency]
├── src/services/warehouse.service.ts        [Delegate to orderShipmentService]

MIGRATION:
├── scripts/migrate-inventory-to-warehouse-inventory.ts [New migration script]
├── scripts/verify-migration.ts              [New verification script]

TESTS:
├── src/tests/inventory/*.test.ts           [New test files]
├── src/tests/warehouse/*.test.ts           [Update existing tests]

DOCUMENTATION:
├── docs/inventory-architecture.md           [Update architecture docs]
├── FINAL_INVENTORY_IMPLEMENTATION_SPEC.md  [This document]
```

---

**Document Version:** 1.0  
**Created:** August 13, 2026  
**Author:** Claude Code  
**Status:** COMPLETE - READY FOR IMPLEMENTATION
