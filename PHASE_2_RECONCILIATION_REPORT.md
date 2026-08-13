# PHASE 2 RECONCILIATION REPORT

**Date:** 2026-08-13T07:12:09.876Z
**Duration:** 1994ms

## Summary

| Metric | Value |
|--------|-------|
| Total Inventory Records | 0 |
| Matched | 0 |
| Mismatched | 0 |
| Inventory Only | 0 |
| WarehouseInventory Only | 4 |
| Errors | 0 |

## Severity Breakdown

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| WARNING | 4 |
| INFO | 0 |

## Critical Issues (Must Fix Before Phase 3)

None. All critical issues resolved.

## Warning Issues (Should Investigate)

| Warehouse | Variant | SKU | Diff Qty | Notes |
|-----------|--------|-----|----------|-------|
| KHO1 | 6a67115c032a705306262152 | GS25-BLK-256 | 100 | Record exists in WarehouseInventory but not in Inventory. This may be a gift rec |
| KHO2 | 6a67115c032a705306262152 | GS25-BLK-256 | 20 | Record exists in WarehouseInventory but not in Inventory. This may be a gift rec |
| KHO1 | 6a67115c032a70530626214f | IP16-BLK-128 | 80 | Record exists in WarehouseInventory but not in Inventory. This may be a gift rec |
| KHO2 | 6a67115c032a70530626214f | IP16-BLK-128 | 15 | Record exists in WarehouseInventory but not in Inventory. This may be a gift rec |

## All Discrepancies (Detailed)

```

---
Severity: WARNING
Warehouse: KHO1 (6a76fb56fca9abc120e48d9d)
Variant: 6a67115c032a705306262152
SKU: GS25-BLK-256
Product: Galaxy S25

Inventory:          qty=0, reserved=0, available=0
WarehouseInventory:  qty=100, reserved=undefined, available=undefined, inTransit=0
Diff:               qty=100, reserved=undefined, available=undefined
Inv. Invariant OK: true
WI Inv. Invariant OK: false
Notes: Record exists in WarehouseInventory but not in Inventory. This may be a gift record or a pre-existing WI record.

---
Severity: WARNING
Warehouse: KHO2 (6a76fb57fca9abc120e48d9e)
Variant: 6a67115c032a705306262152
SKU: GS25-BLK-256
Product: Galaxy S25

Inventory:          qty=0, reserved=0, available=0
WarehouseInventory:  qty=20, reserved=undefined, available=undefined, inTransit=0
Diff:               qty=20, reserved=undefined, available=undefined
Inv. Invariant OK: true
WI Inv. Invariant OK: false
Notes: Record exists in WarehouseInventory but not in Inventory. This may be a gift record or a pre-existing WI record.

---
Severity: WARNING
Warehouse: KHO1 (6a76fb56fca9abc120e48d9d)
Variant: 6a67115c032a70530626214f
SKU: IP16-BLK-128
Product: iPhone 16

Inventory:          qty=0, reserved=0, available=0
WarehouseInventory:  qty=80, reserved=undefined, available=undefined, inTransit=0
Diff:               qty=80, reserved=undefined, available=undefined
Inv. Invariant OK: true
WI Inv. Invariant OK: false
Notes: Record exists in WarehouseInventory but not in Inventory. This may be a gift record or a pre-existing WI record.

---
Severity: WARNING
Warehouse: KHO2 (6a76fb57fca9abc120e48d9e)
Variant: 6a67115c032a70530626214f
SKU: IP16-BLK-128
Product: iPhone 16

Inventory:          qty=0, reserved=0, available=0
WarehouseInventory:  qty=15, reserved=undefined, available=undefined, inTransit=0
Diff:               qty=15, reserved=undefined, available=undefined
Inv. Invariant OK: true
WI Inv. Invariant OK: false
Notes: Record exists in WarehouseInventory but not in Inventory. This may be a gift record or a pre-existing WI record.
```

## Recommendations

1. **CRITICAL Issues:** Resolve before activating dual-write
   - Run migration script to create missing WarehouseInventory records
   - Verify data integrity before proceeding

2. **WARNING Issues:** Investigate before Phase 3
   - Identify why records exist in only one collection
   - Determine if these are legitimate (e.g., gift-only records)

3. **Dual-Write Status:**
   - DUAL_WRITE_ENABLED: Run with --verbose to check
   - Run reconciliation after enabling dual-write to verify sync

4. **Next Steps:**
   - Fix all CRITICAL issues
   - Investigate WARNING issues
   - Run reconciliation again after fixes
   - Enable dual-write only when matched = totalRecords

## Configuration

- Threshold: 0
- Warehouse Filter: All
