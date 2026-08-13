# FINAL INVENTORY ARCHITECTURE DESIGN REVIEW

**Project:** Mongodia  
**Date:** August 13, 2026  
**Purpose:** Architecture Design Review to resolve inventory data integrity issues  
**Reference:** FINAL_INVENTORY_WAREHOUSE_INTEGRATION_AUDIT.md

---

## PART 0: BUSINESS FLOW TRACE

### 0.1 ORDER CREATE Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/orders                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Validate inputs (customerId, productId, warehouseId, etc.)             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Generate orderCode (Counter)                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. START TRANSACTION                                                      │
│      └─► Create Order document                                             │
│      └─► buildStockWiringPlanForCreate() → Check if can reserve           │
│           └─► canHaveStockReserve(orderType, warehouseId, variantId)       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. IF can reserve:                                                        │
│      └─► reserveStock() [stockEngine.service.ts:600]                       │
│           └─► Inventory.findOneAndUpdate()                                 │
│                ├─ availableQuantity -= qty                                  │
│                └─ reservedQuantity += qty                                  │
│      └─► Update Order.stockReservedAt                                      │
│      └─► Create OrderHistory (STOCK_RESERVED)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. resolveCustomerRevenue() - Revenue Lock Engine                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  6. COMMIT TRANSACTION                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

AFFECTED COLLECTIONS:
  ✅ Order
  ✅ Inventory (if reserve)
  ✅ OrderHistory
  ❌ WarehouseInventory (NOT UPDATED)
```

### 0.2 RESERVE/UNRESERVE Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PATCH /api/orders/:id (status change or field update)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. START TRANSACTION                                                     │
│      └─► Query existedOrder from database                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. queryNetReserved(orderId) → InventoryHistory aggregate                 │
│      └─► Σ reservedChange where action = RESERVE/UNRESERVE               │
│      └─► Returns Map<variantId, netReserved>                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. buildStockWiringPlan(oldOrder, newOrder, netMap)                      │
│      ├─► Check if oldOrder can reserve + is currently holding             │
│      ├─► Check if newOrder can reserve                                    │
│      └─► Determine: release? reserve? skip?                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
              ┌───────────────────┐   ┌───────────────────┐
              │ IF release needed │   │ IF reserve needed │
              │ releaseReservedStock│  │ reserveStock()    │
              │ [stockEngine:665] │   │ [stockEngine:600] │
              │                   │   │                   │
              │ Inventory:        │   │ Inventory:        │
              │ available += qty  │   │ available -= qty  │
              │ reserved -= qty   │   │ reserved += qty   │
              └───────────────────┘   └───────────────────┘
                          │                   │
                          └─────────┬─────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. Update Order document (fields + stockReservedAt if reserved)           │
│  5. resolveCustomerRevenue() if needed                                    │
│  6. Create OrderHistory entries                                           │
│  7. COMMIT TRANSACTION                                                    │
└─────────────────────────────────────────────────────────────────────────────┘

AFFECTED COLLECTIONS:
  ✅ Inventory
  ✅ Order
  ✅ OrderHistory
  ✅ InventoryHistory (via reserveStock/releaseReservedStock)
  ❌ WarehouseInventory (NOT UPDATED)
```

### 0.3 SHIP Flow - TWO PATHS

#### PATH A: Via Warehouse Task Status Change

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Warehouse Task status → SHIPPED                                           │
│  API: WarehouseService.changeStatus()                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. START TRANSACTION                                                     │
│      └─► Update WarehouseTask status                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. IF newStatus == SHIPPED:                                               │
│      ├─► Get Order document (with orderItems)                             │
│      └─► inventoryService.exportOrder()                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  inventoryService.exportOrder():                                            │
│      └─► For each item:                                                   │
│           ├─► Check availableQuantity >= qty                                │
│           └─► Inventory.findOneAndUpdate()                                 │
│                ├─ quantity -= qty                                          │
│                ├─ reservedQuantity -= qty                                 │
│                └─ availableQuantity -= qty                                 │
│      └─► Create InventoryMovement documents                               │
│      └─► Create InventoryHistory documents                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. Update Order status → SHIPPING                                        │
│  4. COMMIT TRANSACTION                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

AFFECTED COLLECTIONS (PATH A):
  ✅ WarehouseTask
  ✅ Inventory
  ✅ InventoryMovement
  ✅ InventoryHistory
  ✅ Order
  ❌ WarehouseInventory (NOT UPDATED)
```

#### PATH B: Via Order Shipment Service

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/warehouse/orders/:orderId/ship                                 │
│  API: orderShipmentService.shipOrder()                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. START TRANSACTION                                                     │
│      └─► Get Order document (check warehouseId exists)                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. buildProductDemands(orderId) OR use actualShipments                   │
│      ├─► For combo items: resolve to variantId                             │
│      ├─► For simple items: resolve to variantId                            │
│      └─► For CUSTOMER_SELECTED gifts: use giftSelections[]                 │
│      └─► For RANDOM gifts: ERROR (must provide actualShipments)          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. For each shipment item:                                               │
│      ├─► IF GIFT: validateGiftShipment()                                  │
│      │     └─► WarehouseInventory.findOne({giftId})                       │
│      │     └─► Check availableQuantity >= qty                              │
│      │                                                           │
│      └─► adjustInventoryForShip()                                         │
│            └─► WarehouseInventory.findOneAndUpdate()                       │
│                 ├─ quantity -= qty                                          │
│                 └─ availableQuantity -= qty                                │
│      └─► Create WarehouseStockMovement documents                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. COMMIT TRANSACTION                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

AFFECTED COLLECTIONS (PATH B):
  ✅ WarehouseInventory
  ✅ WarehouseStockMovement
  ❌ Inventory (NOT UPDATED)
  ❌ InventoryMovement (NOT CREATED)
  ❌ InventoryHistory (NOT CREATED)
```

### 0.4 RETURN Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/warehouse/orders/:orderId/return                               │
│  API: orderShipmentService.returnOrder()                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. START TRANSACTION                                                     │
│      └─► Get Order document (check warehouseId)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. For each return item:                                                 │
│      ├─► resolveProductLine() or resolveGift()                           │
│      └─► adjustInventoryForReturn()                                        │
│            └─► WarehouseInventory.findOneAndUpdate()                       │
│                 ├─ quantity += qty                                         │
│                 └─ availableQuantity += qty                                │
│      └─► Create WarehouseStockMovement documents                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. COMMIT TRANSACTION                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

AFFECTED COLLECTIONS:
  ✅ WarehouseInventory
  ✅ WarehouseStockMovement
  ❌ Inventory (NOT UPDATED)
```

### 0.5 TRANSFER Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/warehouse/transfers                                             │
│  API: warehouseWorkflowService.createTransfer()                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. START TRANSACTION                                                     │
│      └─► Validate source ≠ destination                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. Create WarehouseTransfer document                                      │
│      └─► Status: DRAFT | SENT | COMPLETED                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. IF status != DRAFT:                                                    │
│      ├─► For each item:                                                   │
│      │     └─► adjustInventory(source, -qty)                              │
│      │           └─► WarehouseInventory.findOneAndUpdate()                 │
│      │                ├─ quantity -= qty                                  │
│      │                └─ availableQuantity -= qty                          │
│      │     └─► Create WarehouseStockMovement (TRANSFER_OUT)              │
│      │                                                           │
│      ├─► IF COMPLETED:                                                   │
│      │     └─► adjustInventory(dest, +qty)                                │
│      │           └─► WarehouseInventory.findOneAndUpdate()               │
│      │                ├─ quantity += qty                                  │
│      │                └─ availableQuantity += qty                          │
│      │                                                           │
│      ├─► IF SENT (not COMPLETED):                                       │
│      │     └─► adjustInventory(dest, +qty, "inTransitQuantity")           │
│      │           └─► WarehouseInventory.findOneAndUpdate()                │
│      │                └─ inTransitQuantity += qty                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. COMMIT TRANSACTION                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

AFFECTED COLLECTIONS:
  ✅ WarehouseTransfer
  ✅ WarehouseInventory (source: -qty, dest: +qty or inTransit)
  ✅ WarehouseStockMovement
  ❌ Inventory (NOT UPDATED)
```

### 0.6 RECEIVE TRANSFER Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POST /api/warehouse/transfers/:id/receive                                 │
│  API: warehouseWorkflowService.receiveTransfer()                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. START TRANSACTION                                                     │
│      └─► Get WarehouseTransfer (status must be SENT)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. For each item:                                                        │
│      ├─► Check receivedQty <= sentQty                                     │
│      ├─► adjustInventory(dest, -sentQty, "inTransitQuantity")              │
│      │     └─► WarehouseInventory: inTransitQuantity -= sentQty           │
│      │                                                           │
│      ├─► IF receivedQty > 0:                                             │
│      │     └─► adjustInventory(dest, +receivedQty)                        │
│      │           └─► WarehouseInventory: quantity += receivedQty           │
│      │                                                           │
│      ├─► Update transfer item: receivedQuantity, difference               │
│      └─► Create WarehouseStockMovement (TRANSFER_IN)                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. Update WarehouseTransfer status → RECEIVED                            │
│  4. COMMIT TRANSACTION                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

AFFECTED COLLECTIONS:
  ✅ WarehouseTransfer
  ✅ WarehouseInventory
  ✅ WarehouseStockMovement
  ❌ Inventory (NOT UPDATED)
```

---

## PART 1: PRODUCT / VARIANT / GIFT FLOW ANALYSIS

### 1.1 PRODUCT Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   Product   │────▶│ProductVariant│────▶│  Inventory           │
│             │     │             │     │  (by variantId)      │
└─────────────┘     └─────────────┘     └─────────────────────┘
                            │                      │
                            │                      ▼
                            │            ┌─────────────────────┐
                            └───────────▶│ WarehouseInventory   │
                                         │ (by variantId)      │
                                         └─────────────────────┘
```

**Tracking:**
- `Product`: Metadata (name, code, category, etc.)
- `ProductVariant`: SKU, attributes, price
- `Inventory`: Stock by variant + warehouse (quantity, reserved, available)
- `WarehouseInventory`: Stock by variant + warehouse (quantity, inTransit, available, shipped)

### 1.2 GIFT Flow

```
┌─────────────┐     ┌─────────────────────────────────────┐
│    Gift     │────▶│  WarehouseInventory (itemType=GIFT)  │
│             │     │  (by giftId)                        │
└─────────────┘     └─────────────────────────────────────┘
        │
        │ (summary stock)
        ▼
┌─────────────┐
│ Gift.stockQuantity │ (summary only, NOT per warehouse)
└─────────────┘
```

**Tracking:**
- `Gift`: Name, summary stockQuantity (NOT per warehouse)
- `WarehouseInventory`: Stock by gift + warehouse (itemType="GIFT", giftId)
- `Inventory`: **NOT TRACKED** - no giftId field

### 1.3 RANDOM vs CUSTOMER_SELECTED Gift

```
ORDER ITEM
    │
    ├─► giftMode: "RANDOM"
    │     └─► giftSelections: [] (empty)
    │           └─► shipOrder() ERROR: "RANDOM gift must be specified"
    │           └─► Caller must provide actualShipments with specific giftId
    │
    └─► giftMode: "CUSTOMER_SELECTED"
          └─► giftSelections: [{giftProductId, quantity}]
                └─► shipOrder() uses giftProductId from selections
```

---

## PART 2: ARCHITECTURE OPTIONS ANALYSIS

### OPTION A: Inventory as Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        INVENTORY                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Collection: inventory                                               │   │
│  │  Fields:                                                            │   │
│  │    warehouseId: ObjectId                                            │   │
│  │    productVariantId: ObjectId (or null for gift)                   │   │
│  │    giftId: ObjectId (NEW - support gift)                            │   │
│  │    quantity: number                                                 │   │
│  │    reservedQuantity: number                                          │   │
│  │    availableQuantity: number                                        │   │
│  │    inTransitQuantity: number (NEW - for transfers)                  │   │
│  │    shippedQuantity: number (NEW - for tracking)                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌─────────────────────┐                               ┌─────────────────────┐
│    WarehouseInventory │                               │   Legacy View       │
│    (DEPRECATED)      │                               │   (Read-only)       │
│                     │                               │                     │
│  Can be removed     │                               │  Optional: keep as   │
│  or used as         │                               │  materialized view  │
│  projection for     │                               │  for UI backwards   │
│  backwards compat   │                               │  compatibility      │
└─────────────────────┘                               └─────────────────────┘
```

#### OPTION A Analysis

| Question | Answer |
|----------|--------|
| **1. Source of Truth** | `Inventory` collection |
| **2. Inventory still needed?** | YES - This IS the SoT |
| **3. WarehouseInventory still needed?** | NO - Can be deprecated/removed |
| **4. RESERVE updates** | `Inventory.availableQuantity -= qty`, `Inventory.reservedQuantity += qty` |
| **5. UNRESERVE updates** | `Inventory.availableQuantity += qty`, `Inventory.reservedQuantity -= qty` |
| **6. SHIP updates** | `Inventory.quantity -= qty`, `Inventory.reservedQuantity -= qty`, `Inventory.shippedQuantity += qty` |
| **7. RETURN updates** | `Inventory.quantity += qty`, `Inventory.availableQuantity += qty` |
| **8. TRANSFER updates** | Source: `Inventory.quantity -= qty`, `Inventory.inTransitQuantity += qty` |
| **9. RECEIVE updates** | Source: `Inventory.inTransitQuantity -= qty`, Dest: `Inventory.quantity += qty` |
| **10. Gift handling** | Add `giftId` field to Inventory schema |
| **11. RANDOM Gift** | Order contains no giftId → shipOrder must receive actualShipments with giftId |
| **12. CUSTOMER_SELECTED Gift** | Use `giftSelections[].giftProductId` from Order |
| **13. Double shipment prevention** | Check `shippedQuantity > 0` OR `status === SHIPPED` on Order |
| **14. Race condition prevention** | Optimistic locking with `reservedQuantity >= qty` check |
| **15. Transaction boundary** | All operations in single MongoDB transaction |
| **16. Available quantity validation** | `availableQuantity >= 0` enforced by business logic |
| **17. Data migration** | Migrate WarehouseInventory data to Inventory |
| **18. Downtime** | Zero downtime with shadow-write approach |
| **19. API/UI impact** | Minimal - update query to use Inventory instead |
| **20. Order model changes** | None required |

#### OPTION A Issues

1. **WarehouseInventory removal**: May break existing UI components
2. **New giftId field**: Requires schema migration
3. **InventoryMovement vs InventoryHistory**: Consolidate or maintain both?

---

### OPTION B: WarehouseInventory as Single Source of Truth

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WAREHOUSEINVENTORY                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Collection: warehouse_inventory                                      │   │
│  │  Fields:                                                            │   │
│  │    warehouseId: ObjectId                                             │   │
│  │    itemType: "PRODUCT" \| "GIFT"                                    │   │
│  │    productId: ObjectId (optional)                                    │   │
│  │    variantId: ObjectId (optional)                                    │   │
│  │    giftId: ObjectId (optional)                                       │   │
│  │    quantity: number                                                  │   │
│  │    availableQuantity: number                                          │   │
│  │    inTransitQuantity: number                                         │   │
│  │    shippedQuantity: number                                           │   │
│  │    reservedQuantity: number (EXISTING)                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
┌─────────────────────┐                               ┌─────────────────────┐
│      Inventory      │                               │   Legacy Service     │
│     (DEPRECATED)    │                               │                     │
│                     │                               │  Keep stockEngine    │
│  Can be removed     │                               │  for RESERVE logic  │
│  but reserveStock  │                               │  but target         │
│  uses it...        │                               │  WarehouseInventory │
└─────────────────────┘                               └─────────────────────┘
```

#### OPTION B Analysis

| Question | Answer |
|----------|--------|
| **1. Source of Truth** | `WarehouseInventory` collection |
| **2. Inventory still needed?** | NO - Can be deprecated, but need to migrate reserved logic |
| **3. WarehouseInventory still needed?** | YES - This IS the SoT |
| **4. RESERVE updates** | `WarehouseInventory.availableQuantity -= qty`, `WarehouseInventory.reservedQuantity += qty` |
| **5. UNRESERVE updates** | `WarehouseInventory.availableQuantity += qty`, `WarehouseInventory.reservedQuantity -= qty` |
| **6. SHIP updates** | `WarehouseInventory.quantity -= qty`, `WarehouseInventory.reservedQuantity -= qty` |
| **7. RETURN updates** | `WarehouseInventory.quantity += qty`, `WarehouseInventory.availableQuantity += qty` |
| **8. TRANSFER updates** | Source: `quantity -= qty`, `inTransitQuantity += qty` |
| **9. RECEIVE updates** | Source: `inTransitQuantity -= qty`, Dest: `quantity += qty` |
| **10. Gift handling** | Already supported via `itemType="GIFT"`, `giftId` |
| **11. RANDOM Gift** | Order has no giftId → shipOrder must receive actualShipments |
| **12. CUSTOMER_SELECTED Gift** | Use `giftSelections[].giftProductId` |
| **13. Double shipment prevention** | Check `shippedQuantity > 0` OR `status === SHIPPED` |
| **14. Race condition prevention** | Optimistic locking with `reservedQuantity >= qty` |
| **15. Transaction boundary** | All operations in single MongoDB transaction |
| **16. Available quantity validation** | `availableQuantity >= 0` enforced by business logic |
| **17. Data migration** | Migrate Inventory.reservedQuantity to WarehouseInventory |
| **18. Downtime** | Zero downtime with shadow-write approach |
| **19. API/UI impact** | Update all queries to use WarehouseInventory |
| **20. Order model changes** | None required |

#### OPTION B Issues

1. **Inventory deprecation**: Need to ensure no code depends on Inventory collection
2. **stockEngine.service.ts**: Must be updated to target WarehouseInventory
3. **Existing InventoryMovement/InventoryHistory**: May need to consolidate with WarehouseStockMovement

---

### OPTION C: Single Source of Truth with Event Sourcing/Projection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     INVENTORY (SoT)                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Collection: inventory                                               │   │
│  │  Purpose: Single source of truth for all inventory operations        │   │
│  │  Supports: Products, Variants, Gifts, Reservations, Transfers        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Write Operations
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMMAND LAYER                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  InventoryCommandService                                            │   │
│  │    ├─► reserveStock()                                               │   │
│  │    ├─► releaseStock()                                               │   │
│  │    ├─► shipStock()                                                  │   │
│  │    ├─► returnStock()                                                │   │
│  │    ├─► transferStock()                                              │   │
│  │    └─► adjustStock()                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Emit Events
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EVENT STORE                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  InventoryMovement (existing)                                        │   │
│  │  WarehouseStockMovement (existing)                                   │   │
│  │  OR: Unified InventoryEvent collection                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Projections
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     READ MODELS (Projections)                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐   │
│  │ WarehouseInventory   │  │ OrderStockSummary   │  │ GiftStockSummary │   │
│  │ (warehouse view)     │  │ (order summary)     │  │ (gift summary)   │   │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### OPTION C Analysis

| Question | Answer |
|----------|--------|
| **1. Source of Truth** | `Inventory` collection (write model) |
| **2. Inventory still needed?** | YES - Write model/SoT |
| **3. WarehouseInventory still needed?** | YES - Read model/projection |
| **4-9. All write operations** | Target `Inventory` collection |
| **10. Gift handling** | Add `giftId` to Inventory schema |
| **11-12. Gift selection** | Same as OPTION A |
| **13-14. Prevention** | Optimistic locking + Order status check |
| **15. Transaction boundary** | Write to Inventory in transaction, emit event |
| **16. Available quantity** | Business logic validation |
| **17. Data migration** | Initialize projections from Inventory |
| **18. Downtime** | Zero - projections built incrementally |
| **19. API/UI impact** | Read from projections, write to Inventory |
| **20. Order model changes** | None required |

#### OPTION C Issues

1. **Complexity**: Event sourcing adds complexity
2. **Eventual consistency**: Projections may lag
3. **Two-phase commit risk**: If event emission fails after Inventory update

---

## PART 3: CRITICAL ANALYSIS - WHY NOT SIMPLE SYNC?

### The "Sync Both" Approach Doesn't Work

Many would suggest:
```
RESERVE → Update both Inventory AND WarehouseInventory
SHIP → Update both Inventory AND WarehouseInventory
```

**THIS APPROACH FAILS because:**

#### Problem 1: Semantic Mismatch

```
RESERVE semantics:
  - availableQuantity -= qty  (can sell = available)
  - reservedQuantity += qty    (held for specific order)
  - quantity unchanged         (physical stock unchanged)

WarehouseInventory has:
  - quantity: physical stock
  - inTransitQuantity: transferring
  - shippedQuantity: shipped out
  - availableQuantity = quantity - inTransit - reserved

These semantics are DIFFERENT!
```

#### Problem 2: Double Deduction Risk

```
Scenario:
1. RESERVE 10 units
   ├─► Inventory: available -= 10, reserved += 10
   └─► WarehouseInventory: available -= 10 (WRONG!)

2. SHIP via Path B (orderShipmentService)
   └─► WarehouseInventory: quantity -= 10, available -= 10

Result:
  - Inventory: quantity unchanged (correct!)
  - WarehouseInventory: quantity -= 10 (WRONG!)

If we sync BOTH:
  - Inventory: quantity -= 10, reserved -= 10 (DOUBLE DEDUCTION!)
  - WarehouseInventory: quantity -= 10
```

#### Problem 3: Different Update Patterns

```
WarehouseInventory.adjustInventoryForShip():
  - quantity -= qty
  - availableQuantity -= qty

Inventory.exportOrder():
  - quantity -= qty
  - reservedQuantity -= qty
  - availableQuantity -= qty

These update DIFFERENT fields with DIFFERENT semantics!
```

---

## PART 4: RECOMMENDED ARCHITECTURE

### **FINAL RECOMMENDATION: OPTION B (WarehouseInventory as SoT)**

**Rationale:**

1. **WarehouseInventory already supports:**
   - Products (via variantId)
   - Gifts (via giftId with itemType="GIFT")
   - Reservations (via reservedQuantity - EXISTS!)
   - In-transit (via inTransitQuantity)
   - Shipped tracking (via shippedQuantity)

2. **WarehouseInventory already used by:**
   - Shipment operations (orderShipmentService)
   - Transfer operations (warehouseWorkflowService)
   - Return operations
   - Warehouse UI components

3. **Inventory is redundant for:**
   - Warehouse operations (never used by warehouse workflow)
   - Gift tracking (doesn't support giftId)

4. **Migration path:**
   - Migrate `reservedQuantity` from Inventory to WarehouseInventory
   - Update stockEngine to target WarehouseInventory
   - Remove Inventory collection usage from Order flow
   - Keep Inventory for backward compatibility OR deprecate

---

## PART 5: RECOMMENDED ARCHITECTURE DETAILS

### 5.1 SOURCE OF TRUTH

**Single Source of Truth: `WarehouseInventory`**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WAREHOUSEINVENTORY                                 │
│                                                                             │
│  Primary collection for all inventory operations                            │
│  - Product stock (by variantId)                                           │
│  - Gift stock (by giftId with itemType="GIFT")                            │
│  - Reservations (reservedQuantity)                                         │
│  - In-transit (inTransitQuantity for transfers)                            │
│  - Shipping (shippedQuantity)                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 TRANSACTION MODEL

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     UNIFIED INVENTORY TRANSACTION                           │
│                                                                             │
│  All inventory operations wrapped in MongoDB transaction:                   │
│                                                                             │
│  BEGIN TRANSACTION                                                         │
│    ├─► Update WarehouseInventory                                           │
│    ├─► Update Order status (if applicable)                                │
│    ├─► Update WarehouseTask status (if applicable)                        │
│    ├─► Create WarehouseStockMovement (audit log)                          │
│    └─► [Optional] Update InventoryHistory                                  │
│  COMMIT / ROLLBACK                                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 ORDER LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORDER LIFECYCLE                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────┐    ┌──────────┐    ┌────────┐    ┌──────────┐    ┌───────────┐
│ PENDING │───▶│CONFIRMED │───▶│ PACKING │───▶│ SHIPPING │───▶│ DELIVERED │
└─────────┘    └──────────┘    └────────┘    └──────────┘    └───────────┘
     │              │              │              │
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STOCK OPERATIONS                                                          │
│                                                                           │
│  PENDING/CONFIRMED:                                                       │
│    └─► RESERVE → WarehouseInventory.reservedQuantity += qty               │
│    └─► WarehouseInventory.availableQuantity -= qty                        │
│                                                                           │
│  PACKING:                                                                 │
│    └─► (Reservation already held)                                         │
│                                                                           │
│  SHIPPING:                                                                │
│    └─► WarehouseInventory.quantity -= qty                                  │
│    └─► WarehouseInventory.reservedQuantity -= qty                         │
│    └─► WarehouseInventory.availableQuantity -= qty (already 0)          │
│    └─► WarehouseInventory.shippedQuantity += qty                         │
│                                                                           │
│  DELIVERED:                                                               │
│    └─► (No more stock operations)                                         │
│                                                                           │
│  CANCEL (from PENDING/CONFIRMED):                                        │
│    └─► UNRESERVE → WarehouseInventory.reservedQuantity -= qty             │
│    └─► WarehouseInventory.availableQuantity += qty                         │
│                                                                           │
│  RETURN (after SHIPPING/DELIVERED):                                       │
│    └─► WarehouseInventory.quantity += qty                                  │
│    └─► WarehouseInventory.availableQuantity += qty                        │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 INVENTORY LIFECYCLE (WarehouseInventory)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WAREHOUSEINVENTORY LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  QUANTITY FORMULA:                                                          │
│    availableQuantity = quantity - inTransitQuantity - reservedQuantity       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌──────────┐
│   INBOUND   │───▶│   AVAILABLE     │◀───│   UNRESERVE     │    │ RESERVED │
│ (receipt,   │    │                 │    │                 │    │          │
│  return)    │    │ quantity > 0    │    │ release hold    │    │ held for │
│             │    │ inTransit = 0   │    │ for order       │    │ specific │
│             │    │ reserved = 0    │    │                 │    │ order    │
└─────────────┘    └────────┬────────┘    └─────────────────┘    └────┬─────┘
                            │                                        │
                            │ RESERVE                                │ SHIP
                            ▼                                        ▼
                   ┌─────────────────┐                      ┌──────────────┐
                   │  RESERVATION     │                      │   SHIPPED    │
                   │                  │                      │              │
                   │ available -= qty │                      │ quantity -= qty
                   │ reserved += qty  │                      │ shipped += qty
                   └────────┬─────────┘                      └──────────────┘
                            │
                            │ SHIP
                            ▼
                   ┌─────────────────┐
                   │  QUANTITY -= qty │
                   │  RESERVED -= qty │
                   │  (physical out)  │
                   └─────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  TRANSFER FLOW:                                                            │
│                                                                             │
│  SOURCE WAREHOUSE:                  DESTINATION WAREHOUSE:                │
│    quantity -= qty                    (status = SENT)                      │
│    inTransitQuantity += qty ──────▶   inTransitQuantity += qty            │
│                                                                             │
│    (status = COMPLETED)               (status = COMPLETED)                  │
│    quantity -= qty ─────────────────▶ quantity += qty                      │
│    inTransitQuantity -= qty           inTransitQuantity -= qty             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.5 WAREHOUSE LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WAREHOUSE LIFECYCLE                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  Each warehouse has independent WarehouseInventory:                          │
│                                                                             │
│  Warehouse A                    Warehouse B                                │
│  ┌──────────────────┐          ┌──────────────────┐                       │
│  │ variantId: X     │          │ variantId: X     │                       │
│  │ quantity: 100    │          │ quantity: 50     │                       │
│  │ available: 80    │          │ available: 50    │                       │
│  │ reserved: 20     │          │ reserved: 0      │                       │
│  └──────────────────┘          └──────────────────┘                       │
│                                                                             │
│  Order with warehouseId=A will reserve/ship from Warehouse A only           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 6: MIGRATION PLAN

### Phase 0: Pre-Migration (Week 1)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TASKS:                                                                    │
│  1. Audit all code that reads/writes Inventory collection                  │
│  2. Add warehouseId index to WarehouseInventory (if missing)               │
│  3. Add variantId index to WarehouseInventory (if missing)               │
│  4. Add giftId index to WarehouseInventory (if missing)                    │
│  5. Create backup scripts for all collections                               │
│  6. Set up monitoring for inventory discrepancies                          │
└─────────────────────────────────────────────────────────────────────────────┘

DOWNtime: None
RISK: Low
```

### Phase 1: Add Missing Fields to WarehouseInventory (Week 2)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Add reservedQuantity field (if not exists):                           │
│     Schema: { reservedQuantity: { type: Number, min: 0, default: 0 } }    │
│                                                                             │
│  2. Ensure inTransitQuantity field exists:                                 │
│     Schema: { inTransitQuantity: { type: Number, min: 0, default: 0 } }    │
│                                                                             │
│  3. Ensure shippedQuantity field exists:                                  │
│     Schema: { shippedQuantity: { type: Number, min: 0, default: 0 } }      │
└─────────────────────────────────────────────────────────────────────────────┘

Migration: Schema only, no data movement
DOWNtime: None
RISK: Low
```

### Phase 2: Migrate Reservation Data (Week 3)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Create migration script:                                                │
│                                                                             │
│     FOR EACH Inventory document:                                            │
│       IF reservedQuantity > 0:                                              │
│         FIND corresponding WarehouseInventory:                               │
│           (warehouseId, variantId)                                          │
│         UPDATE WarehouseInventory:                                          │
│           reservedQuantity += Inventory.reservedQuantity                     │
│           availableQuantity -= Inventory.reservedQuantity                   │
│                                                                             │
│  2. Verify counts match:                                                   │
│     Σ Inventory.reservedQuantity (by warehouse) ==                           │
│     Σ WarehouseInventory.reservedQuantity (by warehouse)                   │
│                                                                             │
│  3. Log discrepancies for manual review                                    │
└─────────────────────────────────────────────────────────────────────────────┘

DOWNtime: None (can run in background)
RISK: Medium - verify data integrity
```

### Phase 3: Update stockEngine.service.ts (Week 4)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Update findOrCreateInventory() to use WarehouseInventory:               │
│                                                                             │
│     OLD: Inventory.findOne({ warehouseId, productVariantId })               │
│     NEW: WarehouseInventory.findOne({ warehouseId, variantId })            │
│                                                                             │
│  2. Update applyItem() to use WarehouseInventory:                          │
│                                                                             │
│     OLD: Inventory.findOneAndUpdate()                                      │
│     NEW: WarehouseInventory.findOneAndUpdate()                             │
│                                                                             │
│  3. Update all InventoryAction handlers:                                   │
│     - RESERVE: availableQuantity -= qty, reservedQuantity += qty         │
│     - UNRESERVE: availableQuantity += qty, reservedQuantity -= qty       │
│     - OUT: quantity -= qty, reservedQuantity -= qty                        │
│     - RETURN: quantity += qty, availableQuantity += qty                   │
│     - TRANSFER_OUT: quantity -= qty, inTransitQuantity += qty              │
│     - TRANSFER_IN: quantity += qty, inTransitQuantity -= qty               │
│                                                                             │
│  4. Add giftId support:                                                   │
│     - For itemType="GIFT": filter by giftId instead of variantId           │
└─────────────────────────────────────────────────────────────────────────────┘

DOWNtime: None (old code still works during transition)
RISK: Medium - test thoroughly
```

### Phase 4: Unify SHIP Paths (Week 5)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Deprecate Path A (warehouseService.changeStatus → exportOrder):        │
│                                                                             │
│     OLD behavior (Path A):                                                  │
│       - Updates Inventory only                                               │
│                                                                             │
│     NEW behavior:                                                           │
│       - Call orderShipmentService.shipOrder() instead                      │
│       - OR: Update WarehouseInventory directly                              │
│                                                                             │
│  2. Ensure orderShipmentService.shipOrder():                               │
│     - Updates WarehouseInventory correctly                                  │
│     - Creates WarehouseStockMovement                                       │
│     - Handles idempotency (check if already shipped)                        │
│                                                                             │
│  3. Add Order status update to shipOrder():                                │
│     - Update Order status → SHIPPING after successful ship                  │
│                                                                             │
│  4. Remove duplicate Path A implementation                                 │
└─────────────────────────────────────────────────────────────────────────────┘

DOWNtime: None (can switch in-flight)
RISK: High - affects active orders, test in staging
```

### Phase 5: Update All Operations (Week 6)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Update TRANSFER operations:                                           │
│     - Use WarehouseInventory instead of separate logic                      │
│     - Ensure consistent TRANSFER_OUT/TRANSFER_IN semantics                  │
│                                                                             │
│  2. Update RETURN operations:                                              │
│     - Ensure WarehouseInventory.quantity increases correctly                │
│     - Create WarehouseStockMovement                                         │
│                                                                             │
│  3. Update RECEIVE TRANSFER:                                               │
│     - Move from inTransitQuantity to quantity                              │
│     - Create WarehouseStockMovement                                         │
└─────────────────────────────────────────────────────────────────────────────┘

DOWNtime: None
RISK: Medium
```

### Phase 6: Cleanup and Deprecation (Week 7-8)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. Remove Inventory collection reads from Order flow:                      │
│     - DELETE: inventory.repository.ts usage in order routes                 │
│     - DELETE: inventory.service.ts usage in warehouse routes               │
│                                                                             │
│  2. Keep or deprecate Inventory collection:                                │
│     OPTION A: Keep for audit/history purposes                              │
│     OPTION B: Archive/move to cold storage                                 │
│                                                                             │
│  3. Update UI components:                                                  │
│     - useWarehouseInventory hook (already uses WarehouseInventory)         │
│     - Any remaining Inventory reads                                         │
│                                                                             │
│  4. Update documentation                                                  │
│  5. Run end-to-end tests                                                  │
│  6. Monitor for discrepancies                                              │
└─────────────────────────────────────────────────────────────────────────────┘

DOWNtime: None
RISK: Low (if cleanup is thorough)
```

---

## PART 7: IMPLEMENTATION DETAILS

### 7.1 Code Changes by File

```
FILES TO MODIFY:
├── src/models/WarehouseInventory.ts
│     - Add/verify reservedQuantity field
│     - Add/verify inTransitQuantity field
│     - Add/verify shippedQuantity field
│
├── src/services/warehouse/stockEngine.service.ts
│     - Change from Inventory to WarehouseInventory
│     - Add giftId support
│     - Update all action handlers
│
├── src/services/warehouse/orderShipment.service.ts
│     - Add idempotency check
│     - Add Order status update
│     - Ensure consistent behavior
│
├── src/services/warehouse/warehouseWorkflow.service.ts
│     - Ensure consistent transfer semantics
│
├── src/services/warehouse.service.ts
│     - Remove Path A duplicate shipment logic
│     - OR: Call unified shipment service
│
├── src/app/api/orders/route.ts
│     - Already uses stockEngine (will auto-update)
│
├── src/app/api/orders/[id]/route.ts
│     - Already uses stockEngine (will auto-update)
│
└── src/app/api/warehouse/orders/[orderId]/ship/route.ts
      - Already uses orderShipmentService
```

### 7.2 Key Implementation Points

#### A. Reservation Semantics (RESERVE)

```typescript
// NEW in stockEngine.service.ts
case InventoryAction.RESERVE: {
  // Find WarehouseInventory by warehouseId + variantId OR warehouseId + giftId
  const filter = item.itemType === "GIFT"
    ? { warehouseId, giftId, isActive: true }
    : { warehouseId, variantId, isActive: true };
  
  // Check availableQuantity >= qty
  const doc = await WarehouseInventory.findOne({
    ...filter,
    availableQuantity: { $gte: qty }  // available = quantity - inTransit - reserved
  });
  
  if (!doc) throw new InsufficientStockError();
  
  // Update
  await WarehouseInventory.updateOne(
    { _id: doc._id },
    {
      $inc: {
        availableQuantity: -qty,
        reservedQuantity: qty
      }
    }
  );
}
```

#### B. Ship Semantics (OUT)

```typescript
// In orderShipmentService.shipOrder()
case "SHIP": {
  const filter = item.itemType === "GIFT"
    ? { warehouseId, giftId, isActive: true }
    : { warehouseId, variantId, isActive: true };
  
  // Check reservedQuantity >= qty (must have reserved to ship)
  const doc = await WarehouseInventory.findOne({
    ...filter,
    reservedQuantity: { $gte: qty }
  });
  
  if (!doc) throw new Error("Chưa reserve hoặc reserve không đủ");
  
  // Update
  await WarehouseInventory.updateOne(
    { _id: doc._id },
    {
      $inc: {
        quantity: -qty,
        reservedQuantity: -qty,
        shippedQuantity: qty
        // availableQuantity unchanged (already 0 due to reserve)
      }
    }
  );
}
```

#### C. Idempotency Check

```typescript
// In orderShipmentService.shipOrder()
async function canShip(orderId: string): Promise<boolean> {
  const order = await Order.findById(orderId).select("status").lean();
  if (!order) throw new Error("Order not found");
  if (order.status === OrderStatus.SHIPPING) {
    // Already shipped - check if this is duplicate call
    const existingMovement = await WarehouseStockMovement.findOne({
      referenceId: new mongoose.Types.ObjectId(orderId),
      type: "ORDER_OUT"
    });
    if (existingMovement) {
      // Already shipped, return idempotent success
      return false;
    }
  }
  return true;
}
```

#### D. Race Condition Prevention

```typescript
// Use MongoDB optimistic locking with version or conditional update
const result = await WarehouseInventory.findOneAndUpdate(
  {
    _id: docId,
    reservedQuantity: { $gte: qty },  // Conditional check
    availableQuantity: { $gte: 0 }    // Safety check
  },
  {
    $inc: {
      quantity: -qty,
      reservedQuantity: -qty,
      shippedQuantity: qty
    }
  },
  { new: true }
);

if (!result) {
  throw new Error("Không thể xuất kho - tồn kho không đủ hoặc đang được cập nhật bởi process khác");
}
```

### 7.3 Gift Support in Stock Engine

```typescript
// In stockEngine.service.ts
async function findOrCreateInventory(
  warehouseId: mongoose.Types.ObjectId,
  item: StockLineItem,
  options: { upsert: boolean; session?: mongoose.ClientSession }
) {
  const isGift = item.giftId !== undefined;
  
  const filter = isGift
    ? {
        warehouseId,
        itemType: "GIFT" as const,
        giftId: toObjectId(item.giftId!),
        isActive: true
      }
    : {
        warehouseId,
        itemType: "PRODUCT" as const,
        variantId: toObjectId(item.productVariantId!),
        isActive: true
      };
  
  // ... rest of implementation
}
```

---

## PART 8: VERIFICATION CHECKLIST

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRE-MIGRATION CHECKLIST                                                   │
│  □ Audit complete - all Inventory usages identified                        │
│  □ Backup scripts tested                                                  │
│  □ Monitoring setup complete                                              │
│  □ Test environment ready                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 1 VERIFICATION                                                      │
│  □ Schema migration successful                                             │
│  □ Indexes created                                                        │
│  □ No data loss                                                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 2 VERIFICATION                                                      │
│  □ All reservedQuantity migrated                                           │
│  □ Counts match between old and new                                        │
│  □ Discrepancies logged and reviewed                                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 3 VERIFICATION                                                      │
│  □ stockEngine uses WarehouseInventory                                    │
│  □ Gift support working                                                   │
│  □ All action types working (RESERVE, UNRESERVE, OUT, RETURN, etc.)     │
│  □ InventoryHistory still being created                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 4 VERIFICATION                                                      │
│  □ SHIP via orderShipmentService works                                    │
│  □ Idempotency check working                                              │
│  □ Order status updates correctly                                         │
│  □ No double deduction                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  PHASE 5 VERIFICATION                                                      │
│  □ TRANSFER works correctly                                               │
│  □ RETURN works correctly                                                 │
│  □ RECEIVE TRANSFER works correctly                                        │
│  □ WarehouseStockMovement created for all operations                       │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  FINAL VERIFICATION                                                        │
│  □ No code reads from Inventory collection in Order/Warehouse flow        │
│  □ UI shows correct stock levels                                          │
│  □ All unit tests passing                                                 │
│  □ All integration tests passing                                          │
│  □ Load testing passed                                                     │
│  □ No discrepancies in production-like environment                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PART 9: RISK MITIGATION

### Risk 1: Data Loss During Migration

**Mitigation:**
1. Run migration in read-only mode first (compare counts)
2. Create shadow write during migration (write to both)
3. Verify before cutover
4. Keep Inventory collection for 30 days after migration

### Risk 2: Double Deduction After Cutover

**Mitigation:**
1. Add idempotency checks at API level
2. Add idempotency checks at service level
3. Add Order status check before SHIP
4. Add distributed lock per (warehouseId, variantId) for critical operations

### Risk 3: Performance Regression

**Mitigation:**
1. Ensure proper indexes exist
2. Load test before and after
3. Monitor query times in production
4. Have rollback plan

### Risk 4: UI Breaking Changes

**Mitigation:**
1. Use feature flag for new behavior
2. Maintain backwards compatibility
3. Test all UI components
4. Have rollback plan

---

## FINAL VERDICT

# **NOT READY FOR IMPLEMENTATION**

**Reason:** The architecture is sound and recommended, but the migration requires careful phased approach with extensive testing.

---

## RECOMMENDED NEXT STEPS

### Immediately (This Week)
1. **Complete the audit** - already done in FINAL_INVENTORY_WAREHOUSE_INTEGRATION_AUDIT.md
2. **Get stakeholder buy-in** - present this architecture design
3. **Set up staging environment** - for testing migration
4. **Create backup scripts** - for all collections

### Short-term (2-3 Weeks)
1. **Phase 1-2** - Schema changes and reservation migration
2. **Test in staging** - Full end-to-end testing
3. **Fix any issues** - Found during testing

### Medium-term (4-6 Weeks)
1. **Phase 3-4** - Code changes and SHIP path unification
2. **UAT** - User acceptance testing
3. **Documentation** - Update all docs

### Long-term (7-8 Weeks)
1. **Phase 5-6** - Full cleanup and deprecation
2. **Production deployment** - With rollback plan
3. **Post-launch monitoring** - For 30 days

---

## SUMMARY

| Item | Value |
|------|-------|
| **Recommended Architecture** | OPTION B - WarehouseInventory as SoT |
| **Source of Truth** | `WarehouseInventory` collection |
| **Transaction Model** | Single MongoDB transaction per operation |
| **Order Lifecycle** | PENDING → CONFIRMED → PACKING → SHIPPING → DELIVERED |
| **Inventory Lifecycle** | INBOUND → AVAILABLE ↔ RESERVED → SHIPPED |
| **Migration Duration** | 8 weeks |
| **Expected Downtime** | Zero (phased approach) |
| **API/UI Impact** | Minimal (use same interfaces) |
| **Risk Level** | Medium (mitigated by phased approach) |

---

**Report Generated:** August 13, 2026  
**Author:** Claude Code  
**Status:** ARCHITECTURE DESIGN COMPLETE - READY FOR STAKEHOLDER REVIEW
