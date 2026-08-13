# PHASE 2.5.2 CLEANUP SCRIPT REVIEW

**Date:** 2026-08-13  
**Phase:** Phase 2.5.2 - Cleanup Script Review  
**Status:** INDEPENDENT REVIEW

---

## Executive Summary

| Review Item | Verdict |
|-------------|---------|
| **OVERALL** | **FAIL** |

**Critical Issues Found:** 2  
**Warnings:** 4  
**Pass Criteria:** 8/14

---

## 1. Cleanup Script Under Review

The cleanup script from `PHASE_2_5_WAREHOUSE_INVARIANT_AUDIT.md`:

### Script 1: Fix availableQuantity

```javascript
db.warehouse_inventory.updateMany(
  { availableQuantity: { $type: "missing" } },
  [{ $set: { availableQuantity: { $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] } } }]
);
```

### Script 2: Fix reservedQuantity

```javascript
db.warehouse_inventory.updateMany(
  { reservedQuantity: { $type: "missing" } },
  { $set: { reservedQuantity: 0 } }
);
```

---

## 2. Review Criteria Analysis

### Criterion 1: Only update missing fields, don't overwrite valid data

| Aspect | Analysis | Status |
|--------|----------|--------|
| Query filter | `{ availableQuantity: { $type: "missing" } }` | ✅ Correct |
| Query filter | `{ reservedQuantity: { $type: "missing" } }` | ✅ Correct |
| Update operator | `$set` - overwrites existing values | ⚠️ **RISK** |

**Issue:** While the query filters for missing fields, if a record has `availableQuantity = -5` (invalid), it won't be caught by this script.

**Finding:** Script only targets truly missing fields, does not affect existing values.

**Status:** ✅ PASS (for missing-only fix)

---

### Criterion 2: Formula correctness

**Architecture Decision (from FINAL_INVENTORY_ARCHITECTURE_DESIGN.md):**

```
availableQuantity = quantity - inTransitQuantity - reservedQuantity
```

**Cleanup Script Formula:**

```javascript
{ $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] }
```

**Missing Component:** `inTransitQuantity` is NOT included!

| Field | In Formula? |
|-------|-------------|
| `quantity` | ✅ Yes |
| `reservedQuantity` | ✅ Yes |
| `inTransitQuantity` | ❌ **MISSING** |

**Expected Formula:**

```javascript
{ $subtract: ["$quantity", { $add: [
  { $ifNull: ["$inTransitQuantity", 0] },
  { $ifNull: ["$reservedQuantity", 0] }
]}] }
```

**Status:** ❌ **FAIL** - Formula is incomplete

---

### Criterion 3: reservedQuantity missing = 0?

**Analysis:**

For newly seeded records (initial state):
- `quantity = 100`
- `reservedQuantity = 0` (default, nothing reserved yet)
- `inTransitQuantity = 0` (default, nothing in transit)
- `availableQuantity = 100` (initial stock)

**Is setting `reservedQuantity = 0` correct?**

| Scenario | reservedQuantity Value | Correct? |
|----------|----------------------|----------|
| New record from seed | 0 | ✅ Yes |
| Existing record without reservations | 0 | ✅ Yes |
| Existing record with reservations | Unknown (could be > 0) | ❌ Not tracked |

**Risk:** If a record had reservations before `reservedQuantity` became missing, we lose that information. However, since ALL records have missing `reservedQuantity`, this is the best we can do without historical data.

**Status:** ⚠️ **ACCEPTABLE** - Best effort given data state

---

### Criterion 4: Can availableQuantity become negative?

**Cleanup Script Result:**

For each record, the script calculates:
```
availableQuantity = quantity - reservedQuantity
                 = quantity - 0
                 = quantity
```

If `quantity = 0` and `inTransitQuantity = 0`:
- Result: `availableQuantity = 0` ✅

If `quantity = 0` and `inTransitQuantity = 50` (already in transit but somehow quantity=0):
- Result: `availableQuantity = 0 - 0 = 0` ❌ (should be negative, which would be caught by schema `min: 0`)

**However:** The missing `inTransitQuantity` in the formula means:

If a record has:
- `quantity = 100`
- `inTransitQuantity = 80` (already shipped but not received)
- `reservedQuantity = 0`

Current (wrong) formula: `100 - 0 = 100` ❌ (should be `100 - 80 - 0 = 20`)

**Status:** ❌ **FAIL** - Can produce incorrect availableQuantity

---

### Criterion 5: Invariant validation before/after

**Missing Pre-Validation Checks:**

The cleanup script does NOT verify:
- `quantity >= 0`
- `reservedQuantity >= 0`
- `inTransitQuantity >= 0`
- `availableQuantity >= 0`
- `reservedQuantity <= quantity`
- `inTransitQuantity <= quantity`

**Required Pre-Checks:**

```javascript
// Pre-validation before cleanup
db.warehouse_inventory.find({
  $or: [
    { quantity: { $lt: 0 } },
    { inTransitQuantity: { $lt: 0 } },
    { reservedQuantity: { $gt: "$quantity" } },
    { inTransitQuantity: { $gt: "$quantity" } }
  ]
}).forEach(doc => {
  print("ERROR: " + doc._id + " has invalid data");
});
```

**Status:** ❌ **FAIL** - No validation before cleanup

---

### Criterion 6: Transaction/Rollback

**Current Script:** No transaction wrapper

```javascript
// No transaction
db.warehouse_inventory.updateMany(...);
```

**MongoDB Behavior:**
- `updateMany` is atomic per document
- BUT multiple documents updated incrementally
- If script fails mid-way, partial updates occur

**Recommendation:**

```javascript
// With transaction (MongoDB 4.0+ replica set)
session = db.getMongo().startSession();
session.startTransaction();
try {
  db.warehouse_inventory.updateMany(...);
  session.commitTransaction();
} catch (e) {
  session.abortTransaction();
  throw e;
}
session.endSession();
```

**Status:** ⚠️ **WARNING** - No transaction, but acceptable for idempotent script

---

### Criterion 7: --dry-run mode

**Current Script:** No dry-run support

The audit report script does NOT include `--dry-run` functionality.

**Required:**

```javascript
// Check for dry-run flag
const dryRun = db.getMongo().getMinorVersion() === "dry-run" || 
               process.argv.includes("--dry-run");

if (dryRun) {
  print("DRY RUN - Following records would be updated:");
  db.warehouse_inventory.find({ availableQuantity: { $type: "missing" } })
    .forEach(doc => printjson(doc));
} else {
  db.warehouse_inventory.updateMany(...);
}
```

**Status:** ❌ **FAIL** - No dry-run mode

---

### Criterion 8: Idempotency

**Analysis:**

Run 1: Updates 10 records (availableQuantity missing → set)  
Run 2: Updates 0 records (no missing availableQuantity)  
Run 3: Updates 0 records  

**Query used:** `{ availableQuantity: { $type: "missing" } }`

After first run, no records have missing `availableQuantity`, so subsequent runs do nothing.

**Status:** ✅ **PASS** - Idempotent

---

### Criterion 9: Seed code fix for future records

**Current Seed Code (warehouse-inventory.seed.ts):**

```typescript
// Line 18
{ $setOnInsert: { 
    quantity: qty1, 
    availableQuantity: qty1, 
    inTransitQuantity: 0, 
    shippedQuantity: 0, 
    reservedQuantity: 0, 
    isActive: true 
}}
```

**Analysis:**

| Field | Set in Seed? | Correct? |
|-------|-------------|----------|
| `quantity` | ✅ Yes | ✅ |
| `availableQuantity` | ✅ Yes (`= qty1`) | ✅ (assumes inTransit=0, reserved=0) |
| `inTransitQuantity` | ✅ Yes (0) | ✅ |
| `shippedQuantity` | ✅ Yes (0) | ✅ |
| `reservedQuantity` | ✅ Yes (0) | ✅ |
| `isActive` | ✅ Yes | ✅ |

**CRITICAL FINDING:** The seed code in the repository DOES include `availableQuantity` and `reservedQuantity`!

**BUT the audit found these fields as undefined in MongoDB.**

This suggests one of:
1. Seed was run with OLD version (before fix was committed)
2. Records were manually created/copied without these fields
3. Migration script created records without these fields

**Status:** ✅ **PASS** (seed code is correct, but historical records need cleanup)

---

### Criterion 10: Affect on Gift inventory

**Records Affected:**

| itemType | Count | Cleanup Impact |
|----------|-------|----------------|
| GIFT | 6 | ✅ Script applies (all have missing fields) |

**Gift-specific considerations:**
- Gifts don't have `variantId` or `productId`
- Formula still applies: `availableQuantity = quantity - inTransitQuantity - reservedQuantity`
- For gifts, `inTransitQuantity = 0` and `reservedQuantity = 0` (typical)

**Status:** ✅ **PASS** - No Gift-specific issues

---

### Criterion 11: Affect on Product inventory

**Records Affected:**

| itemType | Count | Cleanup Impact |
|----------|-------|----------------|
| PRODUCT | 4 | ✅ Script applies (all have missing fields) |

**Product-specific considerations:**
- Products have `variantId` and `productId`
- Formula still applies: `availableQuantity = quantity - inTransitQuantity - reservedQuantity`

**Status:** ✅ **PASS** - No Product-specific issues

---

### Criterion 12: Affect on Legacy Inventory collection

**Cleanup Script Target:** `warehouse_inventory` collection

**Legacy Inventory Collection:** `inventory` (legacy, empty per Phase 1 design)

The cleanup script does NOT touch the `inventory` collection.

```javascript
// Script only targets:
db.warehouse_inventory.updateMany(...)  // NOT db.inventory
```

**Status:** ✅ **PASS** - Does not affect legacy Inventory collection

---

### Criterion 13: Affect on stockEngine

**Analysis:**

The cleanup script fixes data values, which affects how stockEngine operates.

| stockEngine Operation | Cleanup Impact |
|---------------------|----------------|
| RESERVE | ✅ Will work (availableQuantity now defined) |
| UNRESERVE | ✅ Will work (reservedQuantity now defined) |
| SHIP | ✅ No change needed |
| RETURN | ✅ Will work |
| TRANSFER | ✅ Will work |

**However:** The formula bug (missing inTransitQuantity) could cause issues after cleanup if:
- Records later have inTransitQuantity > 0
- availableQuantity won't be correctly reduced

**Status:** ⚠️ **WARNING** - StockEngine will work, but formula bug may cause issues later

---

### Criterion 14: Duplicate/Uniqueness

**Uniqueness Index:**

```javascript
// From WarehouseInventory schema
{ warehouseId: 1, itemType: 1, productId: 1, variantId: 1, giftId: 1 }
```

**Cleanup script does NOT:**
- Create new records
- Delete records
- Modify key fields

**Duplicate Check Result:** No duplicates found in audit.

**Status:** ✅ **PASS** - No uniqueness issues

---

## 3. Summary of Issues

### Critical Issues (Must Fix)

| # | Issue | Description | Fix Required |
|---|-------|-------------|--------------|
| 1 | **Formula Missing inTransitQuantity** | `availableQuantity = quantity - reservedQuantity` is WRONG. Should be `quantity - inTransitQuantity - reservedQuantity` | Yes |
| 2 | **No Pre-Validation** | Script doesn't check if source fields (quantity, reserved, inTransit) are valid before calculating | Yes |

### Warnings (Should Fix)

| # | Issue | Description | Fix Required |
|---|-------|-------------|--------------|
| 3 | **No Transaction Wrapper** | If script fails mid-way, partial updates occur | Recommended |
| 4 | **No Dry-Run Mode** | Cannot preview changes before executing | Recommended |
| 5 | **Formula Assumes inTransit=0** | Seed sets inTransitQuantity=0, but formula doesn't account for it | Yes (critical) |

---

## 4. Corrected Cleanup Script

### Pre-Validation Check

```javascript
// Check 1: Records with invalid quantities
print("=== PRE-VALIDATION CHECK ===");
const invalidRecords = db.warehouse_inventory.find({
  $or: [
    { quantity: { $exists: false } },
    { quantity: { $type: "number", $lt: 0 } },
    { inTransitQuantity: { $type: "number", $lt: 0 } },
    { inTransitQuantity: { $gt: "$quantity" } }
  ]
}).toArray();

if (invalidRecords.length > 0) {
  print("ERROR: Found " + invalidRecords.length + " records with invalid data:");
  invalidRecords.forEach(r => printjson(r));
  throw "Aborting cleanup due to invalid data";
}

// Check 2: Count missing fields
const missingAvailable = db.warehouse_inventory.countDocuments({ availableQuantity: { $type: "missing" } });
const missingReserved = db.warehouse_inventory.countDocuments({ reservedQuantity: { $type: "missing" } });
print("Records with missing availableQuantity: " + missingAvailable);
print("Records with missing reservedQuantity: " + missingReserved);
```

### Fix reservedQuantity (run first)

```javascript
// Fix reservedQuantity - set to 0 for missing values
print("=== FIXING reservedQuantity ===");
const reservedResult = db.warehouse_inventory.updateMany(
  { reservedQuantity: { $type: "missing" } },
  { $set: { reservedQuantity: 0 } }
);
print("reservedQuantity fixed: " + reservedResult.modifiedCount + " records");
```

### Fix availableQuantity (run after reserved)

```javascript
// Fix availableQuantity - CORRECT formula
print("=== FIXING availableQuantity ===");
const availableResult = db.warehouse_inventory.updateMany(
  { availableQuantity: { $type: "missing" } },
  [{ $set: { 
      availableQuantity: { 
        $subtract: [
          "$quantity", 
          { $add: [
            { $ifNull: ["$inTransitQuantity", 0] },  // CORRECT: includes inTransit
            { $ifNull: ["$reservedQuantity", 0] }     // CORRECT: includes reserved
          ]}
        ]
      }
  }}]
);
print("availableQuantity fixed: " + availableResult.modifiedCount + " records");
```

### Post-Validation

```javascript
// Verify all fields now exist
print("=== POST-VALIDATION ===");
const remainingMissing = db.warehouse_inventory.countDocuments({
  $or: [
    { availableQuantity: { $type: "missing" } },
    { reservedQuantity: { $type: "missing" } }
  ]
});
print("Remaining missing fields: " + remainingMissing);

if (remainingMissing > 0) {
  throw "Cleanup incomplete - some fields still missing";
}
```

---

## 5. Final Verdict

### VERDICT: ❌ **FAIL**

**Reasons:**

1. **CRITICAL: Formula Bug** - The cleanup script for `availableQuantity` is missing `inTransitQuantity` in the calculation. This will produce incorrect results for any records that have items in transit.

2. **CRITICAL: No Pre-Validation** - The script doesn't verify that source fields are valid before calculating derived values.

### Issues Fixed in Corrected Script:

| Issue | Original | Corrected |
|-------|----------|-----------|
| Formula | `quantity - reserved` | `quantity - inTransit - reserved` |
| Pre-validation | None | Checks for invalid quantities |
| Post-validation | None | Verifies cleanup complete |

### Must Fix Before Running:

1. ✅ Add `inTransitQuantity` to formula
2. ✅ Add pre-validation checks
3. ✅ Add post-validation checks
4. ⬜ Consider adding transaction wrapper
5. ⬜ Consider adding dry-run mode

---

## 6. Additional Finding: Seed Code vs Database State

**IMPORTANT DISCREPANCY:**

| Source | availableQuantity Set? | reservedQuantity Set? |
|--------|----------------------|----------------------|
| **Seed Code (warehouse-inventory.seed.ts)** | ✅ Yes (`= qty1`) | ✅ Yes (`= 0`) |
| **Actual MongoDB Records** | ❌ Missing | ❌ Missing |

**Conclusion:**

Records in MongoDB do NOT have `availableQuantity` and `reservedQuantity`, but the seed CODE shows it should set them. This means:

1. Either seed was run with an OLD version
2. Or records were created/modified outside the seed process
3. Or migration script created records incorrectly

**Recommendation:** Investigate HOW these records became missing these fields.

---

## 7. Recommendations

### Before Running Cleanup

1. **Investigate root cause** - How did these fields become missing?
2. **Backup collection** - `db.warehouse_inventory.find().forEach(doc => printjson(doc))` to backup
3. **Add pre-validation** - Verify all source fields are valid
4. **Fix formula** - Include `inTransitQuantity`

### After Running Cleanup

1. **Run Phase 2.5 audit again** - Verify all records now PASS
2. **Test stock operations** - RESERVE, UNRESERVE, SHIP
3. **Verify no regression** - Check Inventory and Gift operations still work

### For Future Prevention

1. **Update seed code** - Already correct, but ensure it runs on fresh DB
2. **Update migration scripts** - Any script creating WI records must set all fields
3. **Add schema validation** - MongoDB schema validation rules

---

**Report Generated:** 2026-08-13  
**Review Type:** Independent audit of cleanup script  
**Constraints Applied:** Read-only, no modifications

