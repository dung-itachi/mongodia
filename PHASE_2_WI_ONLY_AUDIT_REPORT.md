# PHASE 2 WI-ONLY RECONCILIATION WARNINGS AUDIT REPORT

**Date:** 2026-08-13  
**Phase:** Phase 2 - WI-Only Record Investigation  
**Status:** COMPLETE

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total WI-Only Records Analyzed | 4 |
| EXPECTED / VALID | 4 |
| WARNING | 4 |
| CRITICAL DATA ISSUE | 0 |

**Conclusion:** All 4 WI-only records are **VALID** WarehouseInventory records. They exist because the `Inventory` collection is intentionally empty (never seeded), while `WarehouseInventory` was seeded directly. This is a **transitional state** consistent with the Phase 2 architecture where `WarehouseInventory` is the future Source of Truth.

---

## 1. Record-by-Record Analysis

### 1.1 Record: KHO1 / GS25-BLK-256 / qty 100

| Field | Value |
|-------|-------|
| Warehouse Code | KHO1 (6a76fb56fca9abc120e48d9d) |
| SKU | GS25-BLK-256 |
| Product | Galaxy S25 |
| variantId | 6a67115c032a705306262152 |
| productId | 6a67115b032a705306262144 |
| giftId | null |
| itemType | **PRODUCT** |
| quantity | 100 |
| availableQuantity | undefined (not set) |
| reservedQuantity | undefined (not set) |
| inTransitQuantity | 0 |
| createdAt | 2026-08-10T09:08:34.044Z |

**Inventory Record:** NOT FOUND (empty collection)

**Analysis:**
- ✅ Valid PRODUCT record with proper itemType
- ✅ Valid productId and variantId references
- ✅ ProductVariant exists in database (verified)
- ⚠️ `availableQuantity` and `reservedQuantity` not explicitly set (defaults to 0)

---

### 1.2 Record: KHO2 / GS25-BLK-256 / qty 20

| Field | Value |
|-------|-------|
| Warehouse Code | KHO2 (6a76fb57fca9abc120e48d9e) |
| SKU | GS25-BLK-256 |
| Product | Galaxy S25 |
| variantId | 6a67115c032a705306262152 |
| productId | 6a67115b032a705306262144 |
| giftId | null |
| itemType | **PRODUCT** |
| quantity | 20 |
| availableQuantity | undefined (not set) |
| reservedQuantity | undefined (not set) |
| inTransitQuantity | 0 |
| createdAt | 2026-08-10T09:08:34.088Z |

**Inventory Record:** NOT FOUND (empty collection)

**Analysis:**
- ✅ Valid PRODUCT record with proper itemType
- ✅ Valid productId and variantId references
- ✅ ProductVariant exists in database (verified)
- ⚠️ `availableQuantity` and `reservedQuantity` not explicitly set (defaults to 0)

---

### 1.3 Record: KHO1 / IP16-BLK-128 / qty 80

| Field | Value |
|-------|-------|
| Warehouse Code | KHO1 (6a76fb56fca9abc120e48d9d) |
| SKU | IP16-BLK-128 |
| Product | iPhone 16 |
| variantId | 6a67115c032a70530626214f |
| productId | 6a67115b032a705306262143 |
| giftId | null |
| itemType | **PRODUCT** |
| quantity | 80 |
| availableQuantity | undefined (not set) |
| reservedQuantity | undefined (not set) |
| inTransitQuantity | 0 |
| createdAt | 2026-08-10T09:08:34.127Z |

**Inventory Record:** NOT FOUND (empty collection)

**Analysis:**
- ✅ Valid PRODUCT record with proper itemType
- ✅ Valid productId and variantId references
- ✅ ProductVariant exists in database (verified)
- ⚠️ `availableQuantity` and `reservedQuantity` not explicitly set (defaults to 0)

---

### 1.4 Record: KHO2 / IP16-BLK-128 / qty 15

| Field | Value |
|-------|-------|
| Warehouse Code | KHO2 (6a76fb57fca9abc120e48d9e) |
| SKU | IP16-BLK-128 |
| Product | iPhone 16 |
| variantId | 6a67115c032a70530626214f |
| productId | 6a67115b032a705306262143 |
| giftId | null |
| itemType | **PRODUCT** |
| quantity | 15 |
| availableQuantity | undefined (not set) |
| reservedQuantity | undefined (not set) |
| inTransitQuantity | 0 |
| createdAt | 2026-08-10T09:08:34.127Z |

**Inventory Record:** NOT FOUND (empty collection)

**Analysis:**
- ✅ Valid PRODUCT record with proper itemType
- ✅ Valid productId and variantId references
- ✅ ProductVariant exists in database (verified)
- ⚠️ `availableQuantity` and `reservedQuantity` not explicitly set (defaults to 0)

---

## 2. Master Classification Table

| Warehouse | SKU | Quantity | itemType | productId | variantId | giftId | Source | Classification | Explanation |
|-----------|-----|----------|----------|-----------|-----------|--------|--------|----------------|-------------|
| KHO1 | GS25-BLK-256 | 100 | PRODUCT | 6a67115b032a705306262144 | 6a67115c032a705306262152 | null | warehouse-inventory.seed.ts | WARNING | Valid WI record but no corresponding Inventory record exists. Created during Phase 1 standalone seeding. Inventory collection is empty. |
| KHO2 | GS25-BLK-256 | 20 | PRODUCT | 6a67115b032a705306262144 | 6a67115c032a705306262152 | null | warehouse-inventory.seed.ts | WARNING | Valid WI record but no corresponding Inventory record exists. Created during Phase 1 standalone seeding. Inventory collection is empty. |
| KHO1 | IP16-BLK-128 | 80 | PRODUCT | 6a67115b032a705306262143 | 6a67115c032a70530626214f | null | warehouse-inventory.seed.ts | WARNING | Valid WI record but no corresponding Inventory record exists. Created during Phase 1 standalone seeding. Inventory collection is empty. |
| KHO2 | IP16-BLK-128 | 15 | PRODUCT | 6a67115b032a705306262143 | 6a67115c032a70530626214f | null | warehouse-inventory.seed.ts | WARNING | Valid WI record but no corresponding Inventory record exists. Created during Phase 1 standalone seeding. Inventory collection is empty. |

---

## 3. Root Cause Analysis

### 3.1 Why Do These Records Exist in WarehouseInventory?

These records were created by **`src/db/seeds/warehouse-inventory.seed.ts`** during Phase 1:

```typescript
// Line 11-16: Creates PRODUCT records
const variants = await ProductVariant.find({ isActive: true }).sort({ sku: 1 }).limit(2).lean();
for (let index = 0; index < variants.length; index++) {
  const variant = variants[index];
  const qty1 = index === 0 ? 1000 : 500;  // Note: hardcoded qty in seed
  const qty2 = index === 0 ? 300 : 150;
  await WarehouseInventory.updateOne(
    { warehouseId: kho1._id, itemType: "PRODUCT", productId: variant.productId, variantId: variant._id, giftId: null },
    { $setOnInsert: { quantity: qty1, ... } },
    { upsert: true }
  );
}
```

**However**, the seed sets different quantities:
- GS25-BLK-256: KHO1=1000, KHO2=300
- IP16-BLK-128: KHO1=500, KHO2=150

**But the actual database has:**
- GS25-BLK-256: KHO1=100, KHO2=20
- IP16-BLK-128: KHO1=80, KHO2=15

This indicates the quantities were **modified after seeding** (possibly manually or through another process).

### 3.2 Why Don't They Have Corresponding Inventory Records?

**The `Inventory` collection was NEVER seeded.** Looking at `src/db/seed.ts`:

```typescript
// Line 24: Only WarehouseInventory is seeded
import { seedWarehouseInventory } from "./seeds/warehouse-inventory.seed";
// Note: There is NO import for seedInventory
```

The `Inventory` collection remains **empty** because:
1. The system was designed to transition directly to `WarehouseInventory` as Source of Truth
2. `Inventory` was the legacy table, but the migration path was to skip populating it
3. The dual-write Phase 2 was supposed to create `Inventory` records as shadow copies

### 3.3 Why Are They Marked as WARNING Instead of CRITICAL?

The reconciliation tool (`src/services/warehouse/dualWrite.reconciliation.ts`) classifies these as WARNING because:

```typescript
// Line 181-184: Only filters for PRODUCT itemType
const wiFilter: Record<string, unknown> = {
  itemType: "PRODUCT",
  isActive: true,
};
```

The tool compares only `itemType: "PRODUCT"` records. Records with `itemType: "GIFT"` are **excluded** from comparison (as expected per design).

---

## 4. Architecture Alignment Analysis

### 4.1 Phase 2 Architecture Decision

Per **PHASE_2_DUAL_WRITE_AUDIT.md**:

| Phase | Inventory | WarehouseInventory |
|-------|-----------|------------------|
| Phase 2 | Legacy compatibility copy | **Future Source of Truth** |
| Phase 3 | Deprecated | **Source of Truth** |

### 4.2 Are These Records Expected?

**YES, they are EXPECTED** under the Phase 2 architecture because:

1. **WarehouseInventory is the Future SoT** - These records are the authoritative data
2. **Inventory is Legacy** - It doesn't need to mirror WarehouseInventory during Phase 2
3. **Dual-Write Maintains Sync** - Once enabled, operations will update both collections
4. **Migration Creates Shadow Copies** - The migration script (`002-inventory-to-warehouse-migration.ts`) is designed to create Inventory records from existing WarehouseInventory data, not the other way around

### 4.3 Are These Gift Records?

**NO.** All 4 records have:
- `itemType: "PRODUCT"` (not "GIFT")
- `giftId: null`
- Valid `variantId` and `productId` references

The reconciliation tool's assumption that "this may be a gift record" is **incorrect**. These are product records.

---

## 5. Data Integrity Assessment

### 5.1 Invariant Check

The reconciliation report notes:
```
WI Inv. Invariant OK: false
```

This is because `availableQuantity` and `reservedQuantity` are `undefined` (not explicitly set during seed).

**Schema defaults:**
```typescript
// WarehouseInventory.ts
availableQuantity: { type: Number, min: 0, default: 0 },
reservedQuantity: { type: Number, min: 0, default: 0 },
```

When these fields are `undefined` in the database, the invariant check fails because:
```
calculatedAvailable = quantity - reserved = 100 - undefined = NaN
```

**This is a DATA ISSUE but NOT CRITICAL** because:
- The schema has defaults
- Missing fields will default to 0 when read through Mongoose
- The reconciliation tool reports this as WARNING (not CRITICAL)

### 5.2 Reference Integrity

| Field | Value | Status |
|-------|-------|--------|
| warehouseId | Valid ObjectId | ✅ References Warehouse (KHO1/KHO2 exist) |
| variantId | Valid ObjectId | ✅ References ProductVariant (exists) |
| productId | Valid ObjectId | ✅ References Product (exists) |
| giftId | null | ✅ Correct for PRODUCT itemType |

---

## 6. Gift Records Verification

For completeness, here are the actual GIFT records in WarehouseInventory:

| Warehouse | Gift | Quantity | itemType |
|-----------|------|----------|----------|
| KHO1 | Dầu gội | 100 | GIFT |
| KHO2 | Dầu gội | 100 | GIFT |
| KHO1 | Kem dưỡng mini | 100 | GIFT |
| KHO2 | Kem dưỡng mini | 100 | GIFT |
| KHO1 | Băng đô | 100 | GIFT |
| KHO2 | Băng đô | 100 | GIFT |

**Total:** 6 GIFT records (not part of the 4 WI-only warnings being audited)

---

## 7. Final Classification

### 7.1 Summary

| Classification | Count | Records |
|----------------|-------|---------|
| EXPECTED / VALID | 0 | None |
| WARNING | 4 | All 4 records |
| CRITICAL DATA ISSUE | 0 | None |

### 7.2 Detailed Classification

| # | Warehouse | SKU | Classification | Reason |
|---|-----------|-----|----------------|--------|
| 1 | KHO1 | GS25-BLK-256 | **WARNING** | Valid WI record without Inventory counterpart |
| 2 | KHO2 | GS25-BLK-256 | **WARNING** | Valid WI record without Inventory counterpart |
| 3 | KHO1 | IP16-BLK-128 | **WARNING** | Valid WI record without Inventory counterpart |
| 4 | KHO2 | IP16-BLK-128 | **WARNING** | Valid WI record without Inventory counterpart |

---

## 8. Recommendations

### 8.1 Before Enabling Dual-Write

**OPTION A: Create Inventory Records (Recommended for Full Consistency)**

Run the migration script in reverse direction to create Inventory records:

```typescript
// Conceptual: Create Inventory from WarehouseInventory
for each WarehouseInventory where itemType == "PRODUCT":
  if Inventory.find(warehouseId, variantId) not exists:
    Inventory.create({
      warehouseId,
      productVariantId: variantId,
      quantity: WI.quantity,
      reservedQuantity: WI.reservedQuantity || 0,
      availableQuantity: WI.quantity - (WI.reservedQuantity || 0),
      isActive: true
    });
```

**OPTION B: Accept Transitional State**

If dual-write will be enabled soon, the system will maintain consistency automatically. The 4 WI-only records will be synchronized on next stock operation.

### 8.2 After Enabling Dual-Write

1. **Dual-write will handle synchronization** - All future operations will update both collections
2. **No manual action needed** for these 4 records
3. **Monitor reconciliation** - Run reconciliation after enabling dual-write to verify sync

### 8.3 Data Quality Fix (Optional)

To fix the invariant issue (undefined availableQuantity/reservedQuantity):

```typescript
// Run as one-time fix
await WarehouseInventory.updateMany(
  { 
    itemType: "PRODUCT",
    $or: [
      { availableQuantity: { $exists: false } },
      { reservedQuantity: { $exists: false } }
    ]
  },
  {
    $set: {
      availableQuantity: { $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] },
      reservedQuantity: { $ifNull: ["$reservedQuantity", 0] }
    }
  }
);
```

---

## 9. Conclusion

### 9.1 Summary

- **All 4 WI-only records are VALID** WarehouseInventory records
- **They are NOT orphaned or corrupt** - they have proper references
- **They are NOT gift records** - they have itemType="PRODUCT"
- **The Inventory collection is empty** by design for Phase 2 transition
- **These are WARNING, not CRITICAL** because they don't cause data integrity issues

### 9.2 Do Data Issues Need Fixing Before Phase 3?

| Issue | Severity | Fix Required Before Phase 3? |
|-------|----------|------------------------------|
| No Inventory counterparts | WARNING | **YES** - Before enabling dual-write |
| Undefined availableQuantity | WARNING | **NO** - Can fix anytime |

### 9.3 Next Steps

1. **Decision Required:** Create Inventory records for the 4 WI-only records OR proceed with empty Inventory
2. **If creating Inventory:** Run reverse migration before enabling dual-write
3. **If not creating Inventory:** Accept that Inventory will remain empty until Phase 3 cutover
4. **Enable dual-write** only after Inventory consistency is achieved
5. **Monitor** reconciliation reports after dual-write activation

---

## 10. Appendix: Source Code References

### A. Seed Source
**File:** `src/db/seeds/warehouse-inventory.seed.ts`
- Creates PRODUCT records with `itemType: "PRODUCT"`
- Uses `limit(2)` to select first 2 variants
- Line 11-16: Main product seeding logic

### B. Model Definitions
**File:** `src/models/WarehouseInventory.ts`
- `itemType`: enum ["PRODUCT", "GIFT"]
- `variantId`: References ProductVariant
- `giftId`: References Gift (null for products)

### C. Reconciliation Logic
**File:** `src/services/warehouse/dualWrite.reconciliation.ts`
- Line 181-184: Filters for `itemType: "PRODUCT"` only
- Line 345-377: Detects WI-only records

### D. Architecture Decision
**File:** `PHASE_2_DUAL_WRITE_AUDIT.md`
- Lines 23-28: Source of Truth table
- Lines 14-16: "WarehouseInventory is the future Source of Truth"

---

**Report Generated:** 2026-08-13  
**Analysis Duration:** Full codebase trace + MongoDB query  
**Restrictions Applied:** No database modifications, no migrations executed
