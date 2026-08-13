# PHASE 2.5 WAREHOUSE INVENTORY INVARIANT AUDIT

**Date:** 2026-08-13T07:53:27.301Z  
**Phase:** Phase 2.5 - Invariant Audit  
**Status:** COMPLETE

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total WarehouseInventory Records | 10 |
| PASS | 0 |
| WARNING | 0 |
| CRITICAL | 10 |
| Duplicates Found | 0 |

### Inventory by ItemType

| ItemType | Count |
|----------|-------|
| PRODUCT | 4 |
| GIFT | 6 |

### Inventory by Warehouse

| Warehouse | Count |
|-----------|-------|
| KHO1 | 5 |
| KHO2 | 5 |

---

## 1. CRITICAL Issues (Must Fix Before Phase 3)

| # | Warehouse | itemType | SKU/Gift | Issues | Critical For |
|---|-----------|----------|----------|--------|---------------|
| 1 | KHO1 | PRODUCT | 6a67115c032a705306262152 | 3 issues | RESERVE, UNRESERVE |
| 2 | KHO2 | PRODUCT | 6a67115c032a705306262152 | 3 issues | RESERVE, UNRESERVE |
| 3 | KHO1 | PRODUCT | 6a67115c032a70530626214f | 3 issues | RESERVE, UNRESERVE |
| 4 | KHO2 | PRODUCT | 6a67115c032a70530626214f | 3 issues | RESERVE, UNRESERVE |
| 5 | KHO1 | GIFT | 6a76b540604b7127cda0c5b7 | 3 issues | RESERVE, UNRESERVE |
| 6 | KHO2 | GIFT | 6a76b540604b7127cda0c5b7 | 3 issues | RESERVE, UNRESERVE |
| 7 | KHO1 | GIFT | 6a76b540604b7127cda0c5b0 | 3 issues | RESERVE, UNRESERVE |
| 8 | KHO2 | GIFT | 6a76b540604b7127cda0c5b0 | 3 issues | RESERVE, UNRESERVE |
| 9 | KHO1 | GIFT | 6a76b540604b7127cda0c5b5 | 3 issues | RESERVE, UNRESERVE |
| 10 | KHO2 | GIFT | 6a76b540604b7127cda0c5b5 | 3 issues | RESERVE, UNRESERVE |

### Detailed Critical Records

#### 1. KHO1 - PRODUCT (Variant: 6a67115c032a705306262152)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3dda` |
| warehouseId | `6a76fb56fca9abc120e48d9d` |
| itemType | `PRODUCT` |
| productId | `6a67115b032a705306262144` |
| variantId | `6a67115c032a705306262152` |
| giftId | `null` |
| quantity | `100` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.044Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 2. KHO2 - PRODUCT (Variant: 6a67115c032a705306262152)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3ddb` |
| warehouseId | `6a76fb57fca9abc120e48d9e` |
| itemType | `PRODUCT` |
| productId | `6a67115b032a705306262144` |
| variantId | `6a67115c032a705306262152` |
| giftId | `null` |
| quantity | `20` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.088Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 3. KHO1 - PRODUCT (Variant: 6a67115c032a70530626214f)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3ddc` |
| warehouseId | `6a76fb56fca9abc120e48d9d` |
| itemType | `PRODUCT` |
| productId | `6a67115b032a705306262143` |
| variantId | `6a67115c032a70530626214f` |
| giftId | `null` |
| quantity | `80` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.127Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 4. KHO2 - PRODUCT (Variant: 6a67115c032a70530626214f)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3ddd` |
| warehouseId | `6a76fb57fca9abc120e48d9e` |
| itemType | `PRODUCT` |
| productId | `6a67115b032a705306262143` |
| variantId | `6a67115c032a70530626214f` |
| giftId | `null` |
| quantity | `15` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.167Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 5. KHO1 - GIFT (Gift: 6a76b540604b7127cda0c5b7)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3dde` |
| warehouseId | `6a76fb56fca9abc120e48d9d` |
| itemType | `GIFT` |
| productId | `null` |
| variantId | `null` |
| giftId | `6a76b540604b7127cda0c5b7` |
| quantity | `100` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.243Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 6. KHO2 - GIFT (Gift: 6a76b540604b7127cda0c5b7)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3ddf` |
| warehouseId | `6a76fb57fca9abc120e48d9e` |
| itemType | `GIFT` |
| productId | `null` |
| variantId | `null` |
| giftId | `6a76b540604b7127cda0c5b7` |
| quantity | `100` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.282Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 7. KHO1 - GIFT (Gift: 6a76b540604b7127cda0c5b0)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3de0` |
| warehouseId | `6a76fb56fca9abc120e48d9d` |
| itemType | `GIFT` |
| productId | `null` |
| variantId | `null` |
| giftId | `6a76b540604b7127cda0c5b0` |
| quantity | `100` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.321Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 8. KHO2 - GIFT (Gift: 6a76b540604b7127cda0c5b0)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3de1` |
| warehouseId | `6a76fb57fca9abc120e48d9e` |
| itemType | `GIFT` |
| productId | `null` |
| variantId | `null` |
| giftId | `6a76b540604b7127cda0c5b0` |
| quantity | `100` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.360Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 9. KHO1 - GIFT (Gift: 6a76b540604b7127cda0c5b5)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3de2` |
| warehouseId | `6a76fb56fca9abc120e48d9d` |
| itemType | `GIFT` |
| productId | `null` |
| variantId | `null` |
| giftId | `6a76b540604b7127cda0c5b5` |
| quantity | `100` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.399Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---

#### 10. KHO2 - GIFT (Gift: 6a76b540604b7127cda0c5b5)

| Field | Value |
|-------|-------|
| _id | `6a799512fca9abc120ec3de3` |
| warehouseId | `6a76fb57fca9abc120e48d9e` |
| itemType | `GIFT` |
| productId | `null` |
| variantId | `null` |
| giftId | `6a76b540604b7127cda0c5b5` |
| quantity | `100` (type: number) |
| reservedQuantity | `undefined` (type: undefined) |
| inTransitQuantity | `0` |
| availableQuantity | `undefined` (type: undefined) |
| shippedQuantity | `0` |
| isActive | `true` |
| createdAt | `2026-08-10T09:08:34.438Z` |
| Critical For | RESERVE, UNRESERVE |

**Issues:**
- [reservedQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (type: undefined)
- [availableQuantity] is NaN/undefined (stored value)

---


---

## 2. WARNING Issues (Should Investigate)

**None.** No warning issues found.

---

## 3. Duplicate Records Check

**No duplicates found.** All unique keys are unique.

---

## 4. Missing Reference Check

### Missing Warehouses
**None.** All warehouseId references are valid.

### Missing ProductVariants
**None.** All variantId references are valid.

### Missing Gifts
**None.** All giftId references are valid.


---

## 5. PASS Records Summary

**0 records passed all invariant checks.**

| Warehouse | itemType | Count |
|-----------|----------|-------|
| (All) | (All) | 0 |


---

## 6. Operation Impact Analysis

### Records that could FAIL RESERVE operation
**10 records:**
- KHO1 / 6a67115c032a705306262152: availableQuantity=undefined (type: undefined)
- KHO2 / 6a67115c032a705306262152: availableQuantity=undefined (type: undefined)
- KHO1 / 6a67115c032a70530626214f: availableQuantity=undefined (type: undefined)
- KHO2 / 6a67115c032a70530626214f: availableQuantity=undefined (type: undefined)
- KHO1 / 6a76b540604b7127cda0c5b7: availableQuantity=undefined (type: undefined)
- KHO2 / 6a76b540604b7127cda0c5b7: availableQuantity=undefined (type: undefined)
- KHO1 / 6a76b540604b7127cda0c5b0: availableQuantity=undefined (type: undefined)
- KHO2 / 6a76b540604b7127cda0c5b0: availableQuantity=undefined (type: undefined)
- KHO1 / 6a76b540604b7127cda0c5b5: availableQuantity=undefined (type: undefined)
- KHO2 / 6a76b540604b7127cda0c5b5: availableQuantity=undefined (type: undefined)

### Records that could FAIL UNRESERVE operation
**10 records:**
- KHO1 / 6a67115c032a705306262152: reservedQuantity=undefined (type: undefined)
- KHO2 / 6a67115c032a705306262152: reservedQuantity=undefined (type: undefined)
- KHO1 / 6a67115c032a70530626214f: reservedQuantity=undefined (type: undefined)
- KHO2 / 6a67115c032a70530626214f: reservedQuantity=undefined (type: undefined)
- KHO1 / 6a76b540604b7127cda0c5b7: reservedQuantity=undefined (type: undefined)
- KHO2 / 6a76b540604b7127cda0c5b7: reservedQuantity=undefined (type: undefined)
- KHO1 / 6a76b540604b7127cda0c5b0: reservedQuantity=undefined (type: undefined)
- KHO2 / 6a76b540604b7127cda0c5b0: reservedQuantity=undefined (type: undefined)
- KHO1 / 6a76b540604b7127cda0c5b5: reservedQuantity=undefined (type: undefined)
- KHO2 / 6a76b540604b7127cda0c5b5: reservedQuantity=undefined (type: undefined)

### Records that could FAIL SHIP operation
**None.** All records can participate in SHIP operations.


---

## 7. Schema Default vs Actual Values Analysis

### availableQuantity Field

| Metric | Value |
|--------|-------|
| Schema Default | 0 |
| Total Records | 10 |
| Undefined/NaN in DB | 10 |
| Defined (valid number) | 0 |

**Important:** 10 records have `availableQuantity` stored as undefined/NaN in MongoDB.
When read through Mongoose, schema default (0) will be applied.
However, the **actual value stored in MongoDB** is undefined/NaN.

Affected records:
- KHO1 / 6a67115c032a705306262152: value=`undefined`
- KHO2 / 6a67115c032a705306262152: value=`undefined`
- KHO1 / 6a67115c032a70530626214f: value=`undefined`
- KHO2 / 6a67115c032a70530626214f: value=`undefined`
- KHO1 / 6a76b540604b7127cda0c5b7: value=`undefined`
- KHO2 / 6a76b540604b7127cda0c5b7: value=`undefined`
- KHO1 / 6a76b540604b7127cda0c5b0: value=`undefined`
- KHO2 / 6a76b540604b7127cda0c5b0: value=`undefined`
- KHO1 / 6a76b540604b7127cda0c5b5: value=`undefined`
- KHO2 / 6a76b540604b7127cda0c5b5: value=`undefined`

### reservedQuantity Field

| Metric | Value |
|--------|-------|
| Schema Default | 0 |
| Total Records | 10 |
| Undefined/NaN in DB | 10 |
| Defined (valid number) | 0 |

**Important:** 10 records have `reservedQuantity` stored as undefined/NaN in MongoDB.
When read through Mongoose, schema default (0) will be applied.
However, the **actual value stored in MongoDB** is undefined/NaN.

Affected records:
- KHO1 / 6a67115c032a705306262152: value=`undefined`
- KHO2 / 6a67115c032a705306262152: value=`undefined`
- KHO1 / 6a67115c032a70530626214f: value=`undefined`
- KHO2 / 6a67115c032a70530626214f: value=`undefined`
- KHO1 / 6a76b540604b7127cda0c5b7: value=`undefined`
- KHO2 / 6a76b540604b7127cda0c5b7: value=`undefined`
- KHO1 / 6a76b540604b7127cda0c5b0: value=`undefined`
- KHO2 / 6a76b540604b7127cda0c5b0: value=`undefined`
- KHO1 / 6a76b540604b7127cda0c5b5: value=`undefined`
- KHO2 / 6a76b540604b7127cda0c5b5: value=`undefined`


---

## 8. Conclusion

### Summary

| Classification | Count | Percentage |
|---------------|-------|------------|
| PASS | 0 | 0.0% |
| WARNING | 0 | 0.0% |
| CRITICAL | 10 | 100.0% |
| **Total** | **10** | **100%** |

### CRITICAL Issues List

1. **KHO1** / PRODUCT / 6a67115c032a705306262152
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
2. **KHO2** / PRODUCT / 6a67115c032a705306262152
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
3. **KHO1** / PRODUCT / 6a67115c032a70530626214f
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
4. **KHO2** / PRODUCT / 6a67115c032a70530626214f
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
5. **KHO1** / GIFT / 6a76b540604b7127cda0c5b7
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
6. **KHO2** / GIFT / 6a76b540604b7127cda0c5b7
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
7. **KHO1** / GIFT / 6a76b540604b7127cda0c5b0
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
8. **KHO2** / GIFT / 6a76b540604b7127cda0c5b0
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
9. **KHO1** / GIFT / 6a76b540604b7127cda0c5b5
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE
10. **KHO2** / GIFT / 6a76b540604b7127cda0c5b5
   - Issues: [reservedQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (type: undefined); [availableQuantity] is NaN/undefined (stored value)
   - Critical for: RESERVE, UNRESERVE

### Data Cleanup Required Before Phase 3?

**YES.** Data cleanup is required before Phase 3:

| Issue | Count | Action Required |
|-------|-------|----------------|
| Critical invariant violations | 10 | Fix undefined/NaN values |
| Cannot RESERVE | 10 | Fix availableQuantity |
| Cannot UNRESERVE | 10 | Fix reservedQuantity |


---

## 9. Recommendations

### Immediate Actions (Before Phase 3)

1. **Fix undefined/NaN values** in WarehouseInventory:
   - availableQuantity: Set to `quantity - reservedQuantity - inTransitQuantity`
   - reservedQuantity: Set to 0 (default)
   - Update script:
```javascript
db.warehouse_inventory.updateMany(
  { availableQuantity: { $type: "missing" } },
  [{ $set: { availableQuantity: { $subtract: ["$quantity", { $add: ["$reservedQuantity", "$inTransitQuantity"] }] } } }]
);
```

### Optional Actions (Nice to Have)


### Do NOT Do

- ~~Create Inventory records to make reconciliation pass~~ (Not required per architecture)
- ~~Run migration scripts~~ (No migration needed for this issue)
- ~~Enable dual-write~~ (Not related to data integrity)


---

**Report Generated:** 2026-08-13T07:53:27.301Z  
**Audit Type:** Full collection invariant check  
**Constraints Applied:** Read-only, no modifications
