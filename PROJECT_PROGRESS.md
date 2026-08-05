


---

## Sprint 8.3 ? Sales KPI & Target

### Status

? Completed (2026-08-05)

### M?c tiêu

Xây d?ng KPI cho Sale. KPI ??c hoàn toàn t? MongoDB. Không mock.

### Không s?a

- Marketing
- Marketing Dashboard
- Warehouse
- Inventory
- Customer
- Lead
- Order
- UI Kit

### Files t?o m?i

#### Model

| File | Mô t? |
| ---- | --------- |
| src/models/SalesTarget.ts | SalesTarget Mongoose model |

#### Repository

| File | Mô t? |
| ---- | --------- |
| src/repositories/sales-target.repository.ts | SalesTargetRepository - CRUD operations |

#### Service

| File | Mô t? |
| ---- | --------- |
| src/services/sales-kpi/sales-kpi.service.ts | SalesKPIService - business logic |

#### Types

| File | Mô t? |
| ---- | --------- |
| src/types/sales-kpi.ts | Type definitions |

#### Validator

| File | Mô t? |
| ---- | --------- |
| src/validators/sales-target.validator.ts | Zod schemas |

#### API Routes

| File | Mô t? |
| ---- | --------- |
| src/app/api/sales/kpi/route.ts | GET KPI dashboard |
| src/app/api/sales/kpi/chart/route.ts | GET KPI chart |
| src/app/api/sales/kpi/ranking/route.ts | GET KPI ranking |
| src/app/api/sales/target/route.ts | PATCH create/update target |

#### Hooks

| File | Mô t? |
| ---- | --------- |
| src/hooks/useSalesKPI.ts | useSalesKPI(), useSalesKPIChart(), useSalesKPIRanking(), useSalesTarget() |

#### Configs

| File | Mô t? |
| ---- | --------- |
| src/configs/sales-kpi.config.ts | KPI cards config |
| src/configs/sales-kpi-chart.config.ts | KPI chart & ranking config |

### Files ch?nh s?a

| File | Thay ??i |
| ---- | --------- |
| src/constants/permissions.ts | Thêm sales.kpi.view, sales.kpi.update |
| src/constants/roles.ts | Thêm sales.kpi permissions cho MANAGER, SALE roles |

### API Endpoints

| Method | Endpoint | Permission | Mô t? |
| ------ | ---------| ---------- | --------- |
| GET | /api/sales/kpi | sales.kpi.view | KPI dashboard data |
| GET | /api/sales/kpi/chart | sales.kpi.view | KPI chart data |
| GET | /api/sales/kpi/ranking | sales.kpi.view | KPI ranking data |
| PATCH | /api/sales/target | sales.kpi.update | Create/update target |

### SalesTarget Model Fields

```
employeeId, month, year
targetRevenue, targetOrders, targetCustomers, targetClosedLead
note, isActive
createdAt, updatedAt
```

### KPI Data Structure

```
KPIData:
- revenue: { target, current, achievement, remaining }
- orders: { target, current, achievement, remaining }
- customers: { target, current, achievement, remaining }
- closedLeads: { target, current, achievement, remaining }
```

### Dashboard Cards

| Card | Format |
| ---- | ------ |
| Target Revenue | currency |
| Current Revenue | currency |
| Achievement % | percent |
| Remaining | currency |
| Target Orders | number |
| Current Orders | number |
| Target Customers | number |
| Current Customers | number |

### Charts

| Chart | Type |
| ----- | ---- |
| Revenue vs Target | area/bar |
| Orders vs Target | area/bar |

### Rankings

| Ranking | Description |
| ------- | ----------- |
| Top KPI | Top performers by overall achievement |
| Worst KPI | Bottom performers by overall achievement |

### Permission

| Permission | Mô t? |
| ---------- | --------- |
| sales.kpi.view | Xem Sales KPI |
| sales.kpi.update | C?p nh?t Sales Target |

### Verification

- [x] npx tsc --noEmit ? **0 TypeScript Error**
- [x] MongoDB aggregate operations
- [x] No mocking
- [x] Repository contains all CRUD & aggregations
- [x] Service is orchestration + business logic
- [x] Charts config-driven
- [x] React Query hooks integrated
- [x] PROJECT_PROGRESS.md updated

### Review

Reviewed by Cursor Agent

Status: Completed ?
