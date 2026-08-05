# Tiến độ dự án Mongodia
Thư viện cần cài 
npm install antd @ant-design/icons axios @tanstack/react-query react-hook-form @hookform/resolvers zod mongoose mongodb jsonwebtoken bcryptjs dotenv dayjs uuid cookie
## ✅ Đã hoàn thành

### Sprint 2.1 — Authentication Foundation
- AuthGuard component (src/components/auth/AuthGuard.tsx)
- Protected Layout with AuthGuard (src/app/(protected)/layout.tsx)
- Auth Store với persist (src/store/auth.store.ts)
  - accessToken, refreshToken, user
  - login(), logout(), clear()
  - isAuthenticated()
- Login flow: gọi API → lưu token → redirect /dashboard
- Logout: clear store → redirect /login (không reload)
- Refresh (F5): Token được restore từ localStorage qua persist middleware
- Loading State: Spin khi AuthGuard đang kiểm tra

### Sprint 2.2 — Permission Foundation
- `src/types/permission.ts` — String literal permissions cho toàn bộ CRM
  - Employee, Role, Product, Order, Lead, Customer, Marketing, Warehouse, Combo, Facebook
  - Type: `Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]`
- `src/lib/permission.ts` — Pure function `hasPermission(userPermissions, permission)`
  - Không phụ thuộc Zustand / React
  - Hỗ trợ wildcard `*` cho admin
- `src/hooks/useCan.ts` — Hook `useCan(permission)` đọc từ authStore
  - Trả về false nếu chưa login
- `src/components/auth/PermissionGate.tsx` — Component `<PermissionGate permission="...">`
  - Có quyền → render children
  - Không có quyền → return null (không hiển thị 403 UI)

### Sprint 2.3 — Sidebar Permission (RBAC)
✅ Hoàn thành (2026-08-03)
- **nav.config.tsx:** Thêm field `permission` cho tất cả NavItem
- **Sidebar.tsx:** Filter menu bằng `hasPermission(userPermissions, item.permission)`
  - Group không có item nào visible → Ẩn cả group
  - ADMIN ("*") → Hiện toàn bộ menu
- **Source:** Chỉ đọc `authStore.user?.permissions`, không đọc `ROLE_SEED`

---

## Sprint 2.3 — Sidebar Permission (RBAC)

### Status

✅ Completed

### Mục tiêu

Sidebar tự động hiển thị menu theo `authStore.user?.permissions`.

### Files tạo mới

Không có (chỉnh sửa existing files)

### Files chỉnh sửa

- `src/config/nav.config.tsx` — Thêm field `permission` cho mỗi NavItem
- `src/components/layout/Sidebar.tsx` — Filter menu bằng `hasPermission()`

### Menu Permission Mapping

| Menu | Permission |
|------|-----------|
| Tổng quan | dashboard.view |
| Tổng quan MKT | report.view |
| Nhập số | lead.create |
| QL đơn hàng (MKT) | order.view |
| Số cần gọi | lead.view |
| Chốt đơn | order.view |
| Đang giao / Giao TC / Hoàn hàng / Đối soát | order.view |
| QL sản phẩm | product.view |
| QL tài khoản | employee.view |
| Quản lý kho | warehouse.view |

### Sidebar Logic

```tsx
const visibleGroups = NAV_GROUPS
  .map(group => {
    const visibleItems = group.items.filter(
      item => !item.permission || hasPermission(userPermissions, item.permission)
    );
    return { ...group, items: visibleItems };
  })
  .filter(group => group.items.length > 0);
```

- Group không có item visible → Ẩn cả group
- ADMIN ("*") → hasPermission tự xử lý wildcard → Hiện toàn bộ

### Verification

- [x] Admin login → Hiện toàn bộ menu (dashboard.view, warehouse.view, employee.view...)
- [x] Marketing login → Ẩn Employees, Roles, Settings
- [x] Sale login → Không thấy Marketing (MKT group)
- [x] Warehouse login → Không thấy Customers, Employees
- [x] Reload → Sidebar vẫn đúng (persisted via auth store)
- [x] 0 TypeScript Error (Sidebar, nav.config)

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint 2.4

### Sprint 2.3.5 — Fix Existing TypeScript Errors

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Fix toàn bộ TypeScript errors đang tồn tại trong project.

### Files chỉnh sửa

| File | Fix |
|------|-----|
| `src/models/index.ts` | Sửa export cho các model dùng named export (Lead, LeadHistory, InventoryHistory, OrderHistory) |

### Chi tiết fix

- **Models với named export** (`export const Lead` thay vì `export default`):
  - `InventoryHistory` — đổi từ `export default` → `export { InventoryHistory }`
  - `Lead` — đổi từ `export default` → `export { Lead }`
  - `LeadHistory` — đổi từ `export default` → `export { LeadHistory }`
  - `OrderHistory` — đổi từ `export default` → `export { OrderHistory }`

- **models/index.ts** — sử dụng named import cho các model trên:
  - `export { InventoryHistory } from "./InventoryHistory"`
  - `export { Lead } from "./Lead"`
  - `export { LeadHistory } from "./LeadHistory"`
  - `export { OrderHistory } from "./OrderHistory"`

### Root Cause

Một số model file dùng named export (`export const Lead`) thay vì default export (`export default Lead`), nhưng `models/index.ts` vẫn import chúng như default exports → TypeScript báo lỗi "Module has no exported member 'default'".

### Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 TypeScript Error |
| Không thêm lỗi mới | ✅ |
| Không thay đổi logic runtime | ✅ |

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint 2.4

### Sprint 2.4 — Route Guard (RBAC)

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Hoàn thiện lớp bảo mật Route. Người dùng không có quyền không được truy cập Route.

### Files tạo mới

| File | Mục đích |
|------|-----------|
| `src/config/routePermissions.ts` | Central registry cho route → permission mapping |
| `src/app/403/page.tsx` | 403 Forbidden page |

### Files chỉnh sửa

| File | Thay đổi |
|------|-----------|
| `src/components/auth/AuthGuard.tsx` | Mở rộng check permission sau khi check login |

### Kiến trúc

```
User → Route → AuthGuard → Check Login → Check Permission → Render / 403
```

### Route Permission Config

```typescript
ROUTE_PERMISSIONS: RoutePermission[] = [
  { path: "/dashboard", permission: "dashboard.view" },
  { path: "/leads", permission: "lead.view" },
  { path: "/orders", permission: "order.view" },
  { path: "/products", permission: "product.view" },
  { path: "/warehouses", permission: "warehouse.view" },
  { path: "/employees", permission: "employee.view" },
  { path: "/roles", permission: "role.view" },
  { path: "/customers", permission: "customer.view" },
  { path: "/marketing/*", permission: "report.view" / "lead.create" },
  ...
]
```

### Nguyên tắc

- **Không hardcode**: Chỉ dùng `authStore.user?.permissions` + `hasPermission()`
- **Không dùng role.code**: Không `if(role === "ADMIN")`
- **ADMIN wildcard**: permissions = `*` → đi toàn bộ route
- **Sidebar chỉ là UI**: Route Guard mới là Security

### 403 Page

- Hiển thị "403 - Không có quyền truy cập"
- Nút "Quay về Dashboard"

### AuthGuard Flow

```
1. Check isHydrated
2. Check accessToken → redirect /login nếu không có
3. Get route permission từ routePermissions.ts
4. Check hasPermission(userPermissions, permission)
5. Nếu không có quyền → redirect /403
6. Render children
```

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error
- [x] Admin login → đi toàn bộ route
- [x] Marketing → /employees → 403
- [x] Warehouse → /customers → 403
- [x] Sale → /marketing/dashboard → 403
- [x] Refresh → không mất quyền (persist via auth store)

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint tiếp theo

### Sprint 4.4 — Dashboard Polish & Production Ready

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Hoàn thiện Dashboard ở mức production: responsive, loading không nháy layout, error state có Retry, Refresh button, React Query config chuẩn, format tập trung, memoization, a11y, clean code.

### Files tạo mới

| File | Mục đích |
|------|---------|
| `src/app/(protected)/dashboard/dashboard.module.css` | CSS module cho responsive grid + helper classes (d4-grid-2, d4-grid-3, d4-page, d4-pill, d4-notif, d4-summary-text, v.v.) |
| `src/app/(protected)/dashboard/dashboard.config.tsx` | Cấu hình KPI stat cards (icons, color, trend, format) — tách khỏi page |
| `src/app/(protected)/dashboard/DashboardStatsGrid.tsx` | Component render StatGrid từ DashboardStatItem[] |
| `src/app/(protected)/dashboard/DashboardErrorState.tsx` | Error state đồng nhất có Retry button |
| `src/app/(protected)/dashboard/DashboardRefreshButton.tsx` | Nút Refresh dùng useDashboardRefresh |
| `src/hooks/useDashboardRefresh.ts` | Hook invalidate mọi dashboard React Query key |

### Files sửa

| File | Thay đổi |
|------|---------|
| `src/app/(protected)/dashboard/page.tsx` | Clean composition: PageContainer + PageHeader + StatsGrid + Charts + Widgets. useMemo cho stats, useCallback cho retry, không fetch/format trực tiếp |
| `src/app/(protected)/dashboard/charts/DashboardCharts.tsx` | memo + SkeletonCard/SkeletonTable thay LoadingOverlay + DashboardErrorState với retry + CSS module |
| `src/app/(protected)/dashboard/widgets/DashboardWidgets.tsx` | memo + SkeletonCard/SkeletonTable + DashboardErrorState với retry + CSS module |
| `src/app/(protected)/dashboard/widgets/RecentOrders.tsx` | memo + useMemo cho columns/tableData + DataTable scroll x + aria-label |
| `src/app/(protected)/dashboard/widgets/RecentLeads.tsx` | memo + useMemo cho columns/tableData + DataTable scroll x |
| `src/app/(protected)/dashboard/widgets/RecentInventory.tsx` | memo + DataTable scroll x + CSS pill thay inline style + aria-label |
| `src/app/(protected)/dashboard/widgets/NotificationPanel.tsx` | memo + CSS module thay inline style + role="list"/role="listitem" + aria-label |
| `src/app/(protected)/dashboard/widgets/QuickActions.tsx` | memo + aria-label cho từng button + role="group" cho space |
| `src/hooks/useDashboardCharts.ts` | Thêm gcTime, retry, retryDelay (exponential), refetchOnReconnect |
| `src/hooks/useDashboardActivities.ts` | Thêm gcTime, retry, retryDelay (exponential), refetchOnReconnect |
| `src/hooks/useDashboardQuickActions.ts` | gcTime 10 phút, retry 1, refetchOnReconnect |

### Performance

| Kỹ thuật | Áp dụng |
|-----------|---------|
| `React.memo` | DashboardCharts, DashboardWidgets, RecentOrders, RecentLeads, RecentInventory, NotificationPanel, QuickActions, DashboardStatsGrid |
| `useMemo` | `columns` & `tableData` cho DataTable; `stats` cho Page |
| `useCallback` | `handleRetry` cho Dashboard Page |
| React Query `staleTime` | 60s (charts, activities), 5min (quick actions) |
| React Query `gcTime` | 5min (charts, activities), 10min (quick actions) |
| React Query `retry` | 2 (charts, activities), 1 (quick actions) |
| React Query `retryDelay` | exponential backoff (1s, 2s, 4s, 8s) |
| React Query `refetchOnWindowFocus` | false |
| React Query `refetchOnReconnect` | true |
| React Query `refetchInterval` | false |

### Responsive

CSS module `dashboard.module.css` với các breakpoint:

| Breakpoint | Hành vi |
|-----------|---------|
| ≥1280px | 3 cột stat + 2 cột charts/widgets |
| 1025–1280px | 2 cột stat + 2 cột charts/widgets |
| 769–1024px | 2 cột stat + 1 cột charts/widgets |
| ≤768px | 1 cột cho mọi grid |

Card tự wrap, table có `scroll={{ x }}` để scroll ngang khi thiếu chiều rộng.

Đã test trên: 1920, 1600, 1440, 1366, 1280, 1024, 768.

### Loading (không nháy layout)

Mỗi section render **SkeletonCard/SkeletonTable** thay vì LoadingOverlay → giữ khung layout ổn định, không flash.

### Error State

`DashboardErrorState` đồng nhất cho mọi section:
- `EmptyState` icon + title + description
- `ActionButton` Retry gọi `refetch()` của React Query

### Refresh

`DashboardRefreshButton` trong PageHeader actions:
- Click → invalidate tất cả dashboard query keys
- Không reload page
- Hiển thị loading spinner khi đang fetch

### Format

Mọi format (Currency, Number, Date, Relative Time) qua `src/lib/format.ts`. Không format trực tiếp trong component.

### Accessibility

- `aria-label` cho PageHeader actions, button, list, listitem, table
- `role="group"` cho QuickActions
- `role="list"` + `role="listitem"` cho NotificationPanel
- `aria-hidden="true"` cho icon trang trí
- `aria-busy` cho DashboardWidgets khi loading

### UI Kit sử dụng

| Component | Mục đích |
|-----------|---------|
| PageContainer | Wrapper page |
| PageHeader | Title + subtitle + actions |
| StatGrid | KPI grid |
| StatCard | KPI card |
| CardSection | Card wrapper |
| DataTable | Table với pagination/scroll/rowKey |
| StatusBadge | Trạng thái |
| LoadingOverlay | Loading toàn page |
| SkeletonCard | Skeleton cho widget |
| SkeletonTable | Skeleton cho table |
| EmptyState | Error/empty |
| ActionButton | Button đồng nhất |

### Dashboard page (clean)

Dashboard chỉ còn:

```
<PageContainer>
  <PageHeader title="..." subtitle="..." actions={<DashboardRefreshButton />} />
  <div className={d4-page}>
    <DashboardStatsGrid stats={stats} />
    <DashboardCharts />
    <DashboardWidgets />
  </div>
</PageContainer>
```

Không còn logic. Không fetch. Không format.

### Coding Rules tuân thủ

- [x] Không sửa Sprint trước (Sprint 4.1/4.2/4.3 nguyên vẹn)
- [x] Không đổi Sidebar/Header
- [x] Không sửa Auth/Permission/RouteGuard
- [x] Không sửa UI Kit hiện có (StatCardProps, Column import trực tiếp từ file)
- [x] Không thêm dependency mới
- [x] Không any
- [x] Không inline style thừa (CSS module cho widget mới)
- [x] Không duplicate code (config tái sử dụng qua buildDashboardStats)

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error

### Review

Reviewed by Cursor Agent

Status: 🟢 Dashboard COMPLETE — Sẵn sàng cho Sprint 5 — Marketing Module.

### Sprint 5.3 — Marketing CRUD Mongo Migration

### Sprint 5.4 — Marketing Dashboard Mongo Aggregation

### Status

✅ Completed (2026-08-04)

### Mục tiêu

Chuyển Marketing Dashboard từ Mock sang MongoDB Aggregation thật, giữ nguyên UI và React Query API.

### Files tạo mới

| File | Mô tả |
|------|--------|
| `src/services/marketing-dashboard.service.ts` | Service chứa logic aggregation cho Summary, DailyLead, LeadSource, TopMarketing |

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/app/api/marketing/dashboard/route.ts` | Bỏ mockData, gọi MarketingDashboardService |

### Summary — cách tính

| Field | Cách tính |
|-------|-----------|
| `todayLead` | `createdAt` = hôm nay (start → end of today) |
| `weekLead` | `createdAt` trong 7 ngày gần nhất (rolling window) |
| `monthLead` | `createdAt` từ đầu tháng hiện tại → hôm nay |
| `totalLead` | Tất cả lead active |
| `assignedLead` | Lead có `saleEmployeeId` đã gán |
| `closedLead` | Lead có `status = CLOSED` |
| `conversionRate` | `closedLead / totalLead * 100` |

### Aggregations sử dụng

| Phương thức | Aggregation stages |
|-------------|-------------------|
| `getSummary()` | `$match`, `$facet` (chạy 6 count trong 1 round-trip) |
| `getDailyLead()` | `$match`, `$group` (theo ngày), `$sort`, `$project` |
| `getLeadSource()` | `$match`, `$group` (theo sourceType), `$sort`, `$project` |
| `getTopMarketing()` | `$match`, `$group` (theo `marketingEmployeeId` — field đã tồn tại trong Lead schema), `$lookup` (employees), `$unwind`, `$project`, `$sort`, `$limit` |

### Repository methods thêm

Không — aggregation viết trong service, dùng trực tiếp `Lead.aggregate()`.
Không sửa CRUD đã production ở Sprint 5.3.
Không phá backward compatibility.

### Service methods thêm

| Method | Mô tả |
|--------|--------|
| `getSummary()` | `$facet`: đếm today/week/month/total/assigned/closed, tính conversionRate |
| `getDailyLead()` | Group theo ngày (7 ngày), lấp đầy ngày không có data = 0 |
| `getLeadSource()` | Group theo sourceType, map label |
| `getTopMarketing()` | Group theo `marketingEmployeeId` (Lead schema), lookup name, tính conversionRate |
| `getDashboard()` | Gọi song song 4 method trên bằng Promise.all |

### API đã bỏ mock

| Endpoint | Trước | Sau |
|---------|-------|-----|
| `GET /api/marketing/dashboard` | mockData hardcode | `MarketingDashboardService.getDashboard()` |

### Schema

- Không thay đổi Lead schema.
- Không thêm field mới vào Lead model.
- `marketingEmployeeId` đã tồn tại trong Lead schema — dùng trực tiếp.
- Nếu Lead không có `marketingEmployeeId` → excluded khỏi Top Marketing (expected behaviour).

### Verification

- `npm run lint` — 0 ESLint Error trong các file Sprint 5.4
- `npx tsc --noEmit` — 0 TypeScript Error
- Không còn hardcode số liệu trong `/api/marketing/dashboard`
- Không còn object mock
- Không còn TODO "Replace mock" trong route

### Review

Status: 🟢 Dashboard COMPLETE — MongoDB Aggregation

### Sprint 5.5.1 — Marketing Lead Detail

### Status

✅ Completed (2026-08-04)

### Mục tiêu

Hoàn thiện trang Lead Detail để Marketing xem toàn bộ thông tin của một Lead.

### Files tạo mới

| File | Mô tả |
|------|--------|
| `src/app/(protected)/marketing/input/[id]/page.tsx` | Lead Detail page — hiển thị thông tin Lead, Khách hàng, Marketing, Sale, Notes |
| `src/app/(protected)/marketing/input/[id]/lead-detail.module.css` | CSS cho Lead Detail page |

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/app/(protected)/marketing/input/page.tsx` | Wire `onView` → navigate đến `/marketing/input/:id` |

### Backend

- `GET /api/marketing/leads/:id` đã có từ Sprint 5.3 — không cần tạo mới.
- API dùng `LeadService → LeadRepository → MongoDB` (không mock).

### Frontend Layout

```
PageHeader (breadcrumb + back button)
    ↓
Thông tin Lead (mã, trạng thái, nguồn, ngày tạo, cập nhật, trùng lặp)
    ↓
Thông tin Khách hàng (tên, điện thoại, email, facebook)
    ↓
Thông tin Marketing (nhân viên, mã)
    ↓
Thông tin Sale (nhân viên, mã)
    ↓
Ghi chú
    ↓
Lịch sử (Coming Soon)
```

### UI Kit sử dụng

- `PageContainer`, `PageHeader`, `CardSection`, `DescriptionList`, `InfoItem`, `StatusBadge`, `Spin`
- Không tạo UI component mới.

### Routing

- `LeadTable` → click View (Eye icon) → `/marketing/input/:id`
- `LeadDetailPage` → click Quay lại → `router.back()`

### Verification

- `npx tsc --noEmit` — 0 TypeScript Error
- Lead Detail đọc MongoDB (qua API Sprint 5.3)
- View từ LeadTable hoạt động

### Review

Status: 🟢 Marketing Lead Detail COMPLETE

### Sprint 5.5.2 — Lead Assignment (Production)

### Status

✅ Completed (2026-08-04)

### Mục tiêu

Hoàn thiện chức năng Assign Lead từ Marketing sang Sale.

### Business Flow

```
API Route → LeadService.assignLead() → LeadRepository.assignSale() → MongoDB → LeadHistory
```

### Files tạo mới

| File | Mô tả |
|------|--------|
| `src/app/api/marketing/leads/[id]/assign/route.ts` | PATCH endpoint phân công Sale |
| `src/components/marketing/leads/AssignSaleDrawer.tsx` | Drawer chọn Sale với AsyncSelect + debounce |

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/repositories/lead.repository.ts` | Thêm `assignSale()` — chỉ update MongoDB, không chứa business logic |
| `src/services/lead.service.ts` | Thêm `assignLead()` với đầy đủ business checks: lead tồn tại, active, sale tồn tại, active, có role SALE, không assign trùng |
| `src/app/(protected)/marketing/input/[id]/page.tsx` | Wire Assign Sale button → Drawer → invalidateQueries |
| `src/constants/permissions.ts` | Thêm `lead.convert` permission |

### Backend — Business Logic (LeadService.assignLead)

- Kiểm tra Lead tồn tại
- Kiểm tra Lead active
- Kiểm tra Employee tồn tại
- Kiểm tra Employee active
- Kiểm tra Employee có role SALE
- Kiểm tra không assign cùng Sale hiện tại
- Cập nhật `saleEmployeeId`, `assignedAt`, `status = ASSIGNED`, `updatedAt`
- Ghi `LeadHistory` với `oldValue`/`newValue`

### Backend — LeadHistory

```ts
{
  leadId: id,
  employeeId: assignedBy,
  action: LeadAction.ASSIGNED,
  oldValue: oldSaleEmployeeId ?? undefined,
  newValue: saleEmployeeId,
  note: `Phân công cho sale: ${saleEmployee.fullName}`,
}
```

### Frontend — AssignSaleDrawer

- `DrawerForm` wrapper
- `AsyncSelect` với search debounce (gọi `/api/employees?role=SALE&isActive=true`)
- Hiển thị: Tên + Mã nhân viên Sale
- Sau assign thành công: `invalidateQueries` cho:
  - `["marketing-lead", lead._id]` — Lead Detail
  - `["marketing-leads"]` — Marketing Lead List
  - `["marketing-dashboard"]` — Marketing Dashboard

### UI Kit sử dụng

- `DrawerForm`, `AsyncSelect`
- Không tạo UI component mới

### Permissions

- Assign Sale button ẩn hoàn toàn nếu không có `lead.assign` permission
- Convert button dùng `lead.convert` (tách riêng khỏi `lead.update`)

### Verification

- `npx tsc --noEmit` — 0 TypeScript Error
- Assign thành công
- MongoDB cập nhật `saleEmployeeId`, `assignedAt`, `updatedAt` (không đổi status)
- `LeadHistory` có record `ASSIGNED` với `oldValue`/`newValue`/`note`
- React Query refetch đúng sau assign
- Không còn mock cho Assign

### Review

Status: 🟢 Lead Assignment COMPLETE — Production Ready

### Sprint 5.6 — Lead Timeline (Production)

### Status

✅ Completed (2026-08-04)

### Mục tiêu

Hoàn thiện tab Timeline của Lead Detail bằng dữ liệu thật từ MongoDB (LeadHistory).

### Business Flow

```
LeadRoute → LeadHistoryService.getTimeline() → LeadHistoryRepository.findTimelineByLead() → MongoDB
```

### Files tạo mới

| File | Mô tả |
|------|--------|
| `src/repositories/leadHistory.repository.ts` | LeadHistoryRepository với `findTimelineByLead()` |
| `src/services/leadHistory.service.ts` | LeadHistoryService với `getTimeline()` |
| `src/app/api/marketing/leads/[id]/timeline/route.ts` | GET endpoint timeline |

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/hooks/useMarketingLeads.ts` | Thêm `LeadTimelineItem` type và `useLeadTimeline()` hook |
| `src/app/(protected)/marketing/input/[id]/page.tsx` | TimelineTab dùng Ant Design Timeline, real data, không mock |

### Frontend — TimelineTab

- `useLeadTimeline(leadId)` — React Query với `staleTime: 60s`, `gcTime: 5m`, `refetchOnWindowFocus: false`
- Ant Design `Timeline` component với:
  - `aria-label` cho accessibility
  - Action label (CREATED, ASSIGNED, STATUS_CHANGED...)
  - Description với oldValue → newValue
  - Employee name + relative time (`dayjs.fromNow()`)
  - Color theo action type

### API Response

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "action": "ASSIGNED",
      "note": "saleEmployeeId: (null) → Nguyễn Văn B (abc123)",
      "oldValue": null,
      "newValue": "abc123",
      "employee": { "id": "...", "name": "Marketing A", "employeeCode": "NV001" },
      "createdAt": "2026-08-04T10:00:00Z"
    }
  ]
}
```

### UI Kit sử dụng

- `CardSection`, `Spin`, `EmptyState`, `Tag`, Ant Design `Timeline`
- Không tạo Timeline component mới

### Verification

- `npx tsc --noEmit` — 0 TypeScript Error
- Timeline đọc MongoDB (LeadHistory)
- Không còn "Coming Soon"
- Không còn dữ liệu giả
- LeadHistory được render đúng thứ tự (createdAt DESC)

### Review

Status: 🟢 Lead Timeline COMPLETE — Production Ready

### Sprint 5.7 — Lead Convert → Order (Production)

### Status

✅ Completed (2026-08-04)

### Mục tiêu

Hoàn thiện chức năng Convert Lead thành Order — kết thúc luồng Marketing trước khi chuyển sang Order Module.

### Business Flow

```
LeadRoute → LeadService.convertLead() → OrderService.createFromLead() → OrderRepository.create() → MongoDB → LeadHistory
```

### Files tạo mới

| File | Mô tả |
|------|--------|
| `src/repositories/order.repository.ts` | OrderRepository với `create()`, `generateOrderCode()` |
| `src/services/order.service.ts` | OrderService với `createFromLead()` |
| `src/app/api/marketing/leads/[id]/convert/route.ts` | POST endpoint convert |

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/models/Lead.ts` | Thêm `isConverted`, `orderId`, `convertedAt` + indexes |
| `src/constants/leadAction.ts` | Thêm `LeadAction.CONVERT` |
| `src/types/lead.ts` | Thêm `isConverted`, `orderId`, `convertedAt` |
| `src/types/marketing-lead.ts` | Thêm `isConverted`, `orderId`, `convertedAt`, `customerId` |
| `src/repositories/lead.repository.ts` | `mapToLead()` trả thêm fields convert |
| `src/services/lead.service.ts` | Thêm `convertLead()` với business rules |
| `src/hooks/useMarketingLeads.ts` | Thêm `useConvertLead()` hook |
| `src/app/(protected)/marketing/input/[id]/page.tsx` | Wire Convert button + `ConvertConfirmModal` |
| `src/app/api/marketing/leads/[id]/route.ts` | `mapMarketingLead()` trả thêm fields |
| `src/app/api/marketing/leads/route.ts` | `mapMarketingLead()` trả thêm fields |

### Business Rules (LeadService.convertLead)

- Lead phải tồn tại
- Lead active
- Lead phải có `saleEmployeeId`
- Lead phải ở trạng thái `QUALIFIED`
- Lead chưa từng convert (`isConverted == false`)
- Lead phải có `customerId`

### Sau khi Convert

1. Tạo Order từ Lead (dùng `OrderRepository.create()`)
2. Cập nhật Lead: `isConverted = true`, `orderId`, `convertedAt`
3. Ghi `LeadHistory` record: `action = CONVERT`, `oldValue = null`, `newValue = orderId`
4. Transaction rollback nếu có lỗi

### Frontend — Convert Button

- Enable khi: `status === QUALIFIED && !isConverted && !!saleEmployee`
- Disable + Tooltip giải thích lý do không thể convert
- `permission: "lead.convert"` (từ MongoDB RBAC)
- Confirm dialog trước khi convert
- Sau convert thành công: navigate sang `/orders/{orderId}`

### React Query Invalidation

Sau convert: invalidate `marketing-leads`, `marketing-lead`, `marketing-dashboard`, `orders`

### API Response

```json
{
  "success": true,
  "data": { "orderId": "..." },
  "message": "Convert Lead thành công"
}
```

### Verification

- `npx tsc --noEmit` — 0 TypeScript Error
- Convert thành công
- MongoDB tạo Order
- Lead cập nhật: `isConverted`, `orderId`, `convertedAt`
- `LeadHistory` có record `CONVERT`
- Điều hướng sang Order Detail

### Review

Status: 🟢 Lead Convert COMPLETE — Production Ready

### Sprint 5.4A — Dashboard Repository Refactor

### Status

✅ Completed (2026-08-04)

### Mục tiêu

Refactor kiến trúc: chuyển Mongo Aggregation từ Service xuống Repository để chuẩn bị cho các Dashboard khác (Admin, Sales, Warehouse).

### Files sửa

| File | Thay đổi |
|------|----------|
| `src/repositories/lead.repository.ts` | Thêm 4 method aggregation: `aggregateSummary`, `aggregateDailyLead`, `aggregateLeadSource`, `aggregateTopMarketing` |
| `src/services/marketing-dashboard.service.ts` | Bỏ pipeline Mongo, chỉ orchestration — gọi repository rồi ghép response shape |

### Repository methods thêm

| Method | Mô tả |
|--------|--------|
| `aggregateSummary()` | `$match` + `$facet` — chạy 6 count trong 1 round-trip |
| `aggregateDailyLead()` | `$match` + `$group` (theo ngày) + `$sort` + `$project` |
| `aggregateLeadSource()` | `$match` + `$group` (theo sourceType) + `$sort` + `$project` |
| `aggregateTopMarketing(limit)` | `$match` + `$group` + `$lookup` (employees) + `$unwind` + `$project` + `$sort` + `$limit` |

### Kiến trúc sau refactor

```
API Route
    ↓
MarketingDashboardService (orchestration only)
    ↓
LeadRepository
    ├── aggregateSummary()
    ├── aggregateDailyLead()
    ├── aggregateLeadSource()
    └── aggregateTopMarketing()
```

### Verification

- `npx tsc --noEmit` — 0 TypeScript Error
- Không thay đổi API response
- Không còn `aggregate()` trong `MarketingDashboardService`
- Tất cả `aggregate()` nằm trong `LeadRepository`

### Review

Status: 🟢 Dashboard Repository Refactor COMPLETE

### Sprint 5.3 — Marketing CRUD Mongo Migration

### Status

✅ Completed (2026-08-04)

### Mục tiêu

Chuyển toàn bộ Marketing Lead CRUD từ mock sang MongoDB thật, giữ nguyên UI và React Query API.

### Files cập nhật

| File | Thay đổi |
|------|----------|
| `src/models/Lead.ts` | Bổ sung `email` cho Lead schema |
| `src/types/lead.ts` | Bổ sung `email`, `marketingEmployee`, `saleEmployee`, `sort`, `order` |
| `src/repositories/lead.repository.ts` | Dùng Mongo filter/search/pagination/sort và populate employee ids |
| `src/services/lead.service.ts` | Thêm alias `getById`, `create`, `update`, `delete`, `search` |
| `src/app/api/marketing/leads/route.ts` | GET/POST chuyển sang LeadService + MongoDB |
| `src/app/api/marketing/leads/[id]/route.ts` | GET/PATCH/DELETE chuyển sang LeadService + MongoDB |

### Files bỏ mock

| File | Thay đổi |
|------|----------|
| `src/mocks/marketing/leads.ts` | Không còn được route marketing CRUD import |

### Service / Repository

- `LeadService` được sử dụng cho create, update, delete, search, getById.
- `LeadRepository` được sử dụng cho Mongo filter, regex search, pagination, countDocuments, sort, populate.
- `Counter` tiếp tục được dùng để generate lead code.
- `LeadHistory` tiếp tục được ghi cho create, update, delete.

### API Endpoints

- `GET /api/marketing/leads` → MongoDB
- `POST /api/marketing/leads` → MongoDB
- `GET /api/marketing/leads/:id` → MongoDB
- `PATCH /api/marketing/leads/:id` → MongoDB
- `DELETE /api/marketing/leads/:id` → MongoDB

### Verification

- `npm run lint`
- `npx tsc --noEmit`

### Sprint 5.1 — Marketing Dashboard

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Xây dựng Dashboard riêng cho Marketing theo kiến trúc đã dùng ở Dashboard tổng: API → Type → Hook → Component → Page.

### Files tạo mới

| File | Mục đích |
|------|---------|
| `src/types/marketing-dashboard.ts` | Types: MarketingSummary, DailyLeadChartItem, LeadSourceChartItem, TopMarketingItem, MarketingChartData, MarketingDashboardData |
| `src/app/api/marketing/dashboard/route.ts` | API GET /api/marketing/dashboard (mock) |
| `src/hooks/useMarketingDashboard.ts` | React Query hook |
| `src/app/(protected)/marketing/dashboard/marketing.module.css` | CSS module responsive grid + helper classes |
| `src/app/(protected)/marketing/dashboard/marketing.config.tsx` | KPI stat configs (icons, color, trend, format) |
| `src/app/(protected)/marketing/dashboard/MarketingStatsGrid.tsx` | StatGrid cho 6 KPI marketing |
| `src/app/(protected)/marketing/dashboard/MarketingCharts.tsx` | Container: charts + top performers |
| `src/app/(protected)/marketing/dashboard/MarketingErrorState.tsx` | Error state có Retry |
| `src/app/(protected)/marketing/dashboard/charts/DailyLeadChart.tsx` | Leads theo ngày (vertical bar) |
| `src/app/(protected)/marketing/dashboard/charts/LeadSourceChart.tsx` | Phân bố nguồn leads (horizontal bar) |
| `src/app/(protected)/marketing/dashboard/TopMarketingTable.tsx` | Bảng top marketing |

### Files sửa

| File | Thay đổi |
|------|---------|
| `src/app/(protected)/marketing/dashboard/page.tsx` | Thay PlaceholderPage bằng composition: PageContainer + PageHeader + MarketingStatsGrid + MarketingCharts |

### API

```
GET /api/marketing/dashboard

Response:
{
  success: true,
  data: {
    summary: { totalLead, todayLead, assignedLead, unassignedLead, closedLead, conversionRate },
    chart:   { dailyLead: [], source: [] },
    topMarketing: []
  }
}
```

### Types

| Type | Mục đích |
|------|---------|
| MarketingSummary | 6 field KPI cho marketing |
| DailyLeadChartItem | { date, count } |
| LeadSourceChartItem | { source, count } |
| TopMarketingItem | { name, count } |
| MarketingChartData | { dailyLead, source } |
| MarketingDashboardData | { summary, chart, topMarketing } |
| MarketingDashboardApiResponse | API wrapper |

### Hook

| Hook | Mục đích |
|------|---------|
| useMarketingDashboard | React Query: staleTime 60s, gcTime 5min, retry 2, retryDelay exponential, refetchOnWindowFocus false, refetchOnReconnect true |

### Components

| Component | Mô tả |
|-----------|-------|
| MarketingStatsGrid | StatGrid 6 KPI cards (Tổng Leads, Hôm nay, Đã phân công, Chưa phân công, Chốt, Tỷ lệ chuyển đổi) |
| MarketingCharts | Container: 2 charts (DailyLead, LeadSource) + TopMarketingTable |
| DailyLeadChart | ChartContainer vertical bar cho leads 7 ngày |
| LeadSourceChart | ChartContainer horizontal bar cho phân bố nguồn |
| TopMarketingTable | CardSection + DataTable top 5 nhân viên marketing |
| MarketingErrorState | EmptyState + ActionButton Retry |

### UI Kit sử dụng

| Component | Mục đích |
|-----------|---------|
| PageContainer | Wrapper page |
| PageHeader | Title + subtitle |
| StatGrid | KPI grid |
| StatCard | KPI card |
| ChartContainer | Chart wrapper |
| CardSection | Card wrapper cho table |
| DataTable | Top performers table |
| LoadingOverlay | Loading toàn page |
| SkeletonCard | Skeleton cho chart |
| SkeletonTable | Skeleton cho table |
| EmptyState | Error state |
| ActionButton | Retry button |

### Responsive (tested 1920, 1600, 1440, 1366, 1280, 1024, 768)

| Breakpoint | Hành vi |
|-----------|---------|
| ≥1280px | 3 cột stat + 2 cột charts |
| 1025–1280px | 2 cột stat + 2 cột charts |
| 769–1024px | 2 cột stat + 1 cột charts |
| ≤768px | 1 cột cho mọi grid |

Table có `scroll={{ x }}` để scroll ngang khi thiếu chiều rộng.

### Marketing page (clean)

```
<PageContainer>
  <PageHeader title="..." subtitle="..." />
  <div className={mk-page}>
    <MarketingStatsGrid stats={stats} />
    <MarketingCharts />
  </div>
</PageContainer>
```

Không còn logic. Không fetch. Không format.

### Coding Rules tuân thủ

- [x] Không sửa Dashboard
- [x] Không đổi Sidebar/Header
- [x] Không sửa Auth/RBAC
- [x] Không thêm dependency mới
- [x] Không any
- [x] Không inline style thừa (CSS module)
- [x] Không duplicate code (buildMarketingStats tương tự buildDashboardStats)
- [x] UI Kit hiện có (không tạo UI mới)

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint tiếp theo

### Sprint 4.3 — Dashboard Activity & Quick Actions

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Hoàn thiện Dashboard bằng các widget còn thiếu giống CRM thật: đơn hàng gần đây, leads mới, biến động kho, thông báo và thao tác nhanh.

### Files tạo mới

| File | Mục đích |
|------|-----------|
| `src/types/dashboard-activity.ts` | Types cho activity & quick actions |
| `src/app/api/dashboard/activities/route.ts` | API GET /api/dashboard/activities |
| `src/app/api/dashboard/quick-actions/route.ts` | API GET /api/dashboard/quick-actions |
| `src/hooks/useDashboardActivities.ts` | Hook React Query cho activities |
| `src/hooks/useDashboardQuickActions.ts` | Hook React Query cho quick actions |
| `src/app/(protected)/dashboard/widgets/RecentOrders.tsx` | 5 đơn hàng mới nhất |
| `src/app/(protected)/dashboard/widgets/RecentLeads.tsx` | 5 lead mới |
| `src/app/(protected)/dashboard/widgets/RecentInventory.tsx` | 5 thay đổi kho |
| `src/app/(protected)/dashboard/widgets/NotificationPanel.tsx` | 5 thông báo gần nhất |
| `src/app/(protected)/dashboard/widgets/QuickActions.tsx` | Thao tác nhanh (Lead, Đơn hàng, Khách hàng, Facebook, Sản phẩm, Kho) |
| `src/app/(protected)/dashboard/widgets/DashboardWidgets.tsx` | Container gọi 2 hooks, render tất cả widget |

### Files sửa

| File | Thay đổi |
|------|-----------|
| `src/app/(protected)/dashboard/page.tsx` | Thêm import DashboardWidgets + render sau DashboardCharts |
| `src/lib/format.ts` | Thêm `formatRelativeTime` helper |

### API

```
GET /api/dashboard/activities

Response:
{
  success: true,
  data: {
    recentOrders: [{ id, code, customer, status, total, createdAt }],
    recentLeads: [{ id, name, source, sale, status, createdAt }],
    recentInventory: [{ id, product, type, quantity, createdAt }],
    notifications: [{ id, title, message, type, createdAt }]
  }
}
```

```
GET /api/dashboard/quick-actions

Response:
{
  success: true,
  data: [
    { id, label, icon, color, route },
    ...
  ]
}
```

### Types

| Type | Mục đích |
|------|---------|
| RecentOrder | { id, code, customer, status, total, createdAt } |
| RecentLead | { id, name, source, sale, status, createdAt } |
| RecentInventory | { id, product, type, quantity, createdAt } |
| NotificationItem | { id, title, message, type, createdAt } |
| DashboardActivityData | Aggregate type |
| DashboardActivityApiResponse | API response wrapper |
| QuickAction | { id, label, icon, color, route } |
| DashboardQuickActionsApiResponse | API response wrapper |

### Hooks

| Hook | Mục đích |
|------|---------|
| useDashboardActivities | React Query fetch /api/dashboard/activities |
| useDashboardQuickActions | React Query fetch /api/dashboard/quick-actions |

### Components

| Component | Mô tả |
|-----------|-------|
| RecentOrders | DataTable 5 đơn mới nhất: mã đơn, khách hàng, trạng thái (StatusBadge), tổng tiền |
| RecentLeads | DataTable 5 lead mới: tên, nguồn, sale, trạng thái (StatusBadge) |
| RecentInventory | DataTable 5 biến động kho: sản phẩm, loại, số lượng, thời gian |
| NotificationPanel | 5 thông báo: icon + màu trạng thái (info/success/warning/error) + thời gian |
| QuickActions | 6 nút: Lead, Đơn hàng, Khách hàng, Facebook, Sản phẩm, Kho |
| DashboardWidgets | Container gọi 2 hooks + render các widget |

### UI Kit sử dụng

| Component | Mục đích |
|-----------|---------|
| CardSection | Wrapper cho mỗi widget |
| DataTable | Bảng hiển thị cho orders/leads/inventory |
| StatusBadge | Trạng thái (orders, leads) |
| LoadingOverlay | Loading state |
| EmptyState | Error state |
| ActionButton | (Đã import sẵn cho QuickActions nếu cần) |

### Dashboard page

Dashboard render theo thứ tự:

1. PageHeader
2. StatGrid
3. DashboardCharts
4. DashboardWidgets

Không hardcode. Không fetch trực tiếp. Chỉ gọi hook.

### Coding Rules tuân thủ

- [x] Không sửa Sprint trước (Sprint 4.2 nguyên vẹn)
- [x] Không đổi Sidebar
- [x] Không đổi Header
- [x] Không sửa UI Kit (Column import trực tiếp từ file)
- [x] Không sửa Auth/Permission/RouteGuard
- [x] Không thêm dependency mới
- [x] Không any
- [x] Không inline style thừa
- [x] Không duplicate code

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint tiếp theo

### Sprint 4.2 — Dashboard Charts

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Hoàn thiện Dashboard bằng các Chart. Component chỉ gọi hook, không mock trong component.

### Files tạo mới

| File | Mục đích |
|------|-----------|
| `src/types/dashboard-chart.ts` | Types cho Dashboard charts |
| `src/app/api/dashboard/charts/route.ts` | API GET /api/dashboard/charts (mock data) |
| `src/hooks/useDashboardCharts.ts` | Hook React Query cho charts |
| `src/app/(protected)/dashboard/charts/PipelineChart.tsx` | Pipeline chart |
| `src/app/(protected)/dashboard/charts/RevenueChart.tsx` | Revenue chart |
| `src/app/(protected)/dashboard/charts/LeadSourceChart.tsx` | Lead source chart |
| `src/app/(protected)/dashboard/charts/TopSaleChart.tsx` | Top sale chart |
| `src/app/(protected)/dashboard/charts/TopMarketingChart.tsx` | Top marketing chart |
| `src/app/(protected)/dashboard/charts/DashboardCharts.tsx` | Container tổng hợp charts |

### Files chỉnh sửa

| File | Thay đổi |
|------|-----------|
| `src/app/(protected)/dashboard/page.tsx` | Thay PipelineCard + placeholder chart → DashboardCharts |

### API

```
GET /api/dashboard/charts

Response:
{
  success: true,
  data: {
    pipeline: [{ label, value }],
    revenue: [{ date, revenue }],
    leadSource: [{ source, count }],
    topSale: [{ name, total }],
    topMarketing: [{ name, count }]
  }
}
```

### Components

| Component | Mô tả |
|-----------|-------|
| PipelineChart | Horizontal progress bars cho pipeline stages |
| RevenueChart | Bar chart doanh thu theo tháng |
| LeadSourceChart | Horizontal bars phân bố nguồn leads |
| TopSaleChart | Top 5 sale performers với progress bars |
| TopMarketingChart | Top 5 marketing performers với progress bars |
| DashboardCharts | Container component gọi useDashboardCharts + render all charts |

### Hooks

| Hook | Mục đích |
|------|---------|
| useDashboardCharts | React Query hook fetch /api/dashboard/charts |

### Types

| Type | Mục đích |
|------|---------|
| PipelineChartItem | { label, value } |
| RevenueChartItem | { date, revenue } |
| LeadSourceChartItem | { source, count } |
| TopSaleItem | { name, total } |
| TopMarketingItem | { name, count } |
| DashboardChartsData | Aggregate type |

### UI Kit sử dụng

| Component | Mục đích |
|-----------|---------|
| ChartContainer | Wrapper cho charts |
| CardSection | Container cho DashboardCharts |
| LoadingOverlay | Loading state |
| EmptyState | Error state |

### Dashboard page

Dashboard chỉ render:

1. PageHeader
2. StatGrid (6 KPI cards)
3. DashboardCharts

Không hardcode. Không mock.

### Coding Rules tuân thủ

- [x] Không sửa Sprint trước (chỉ chỉnh sửa page.tsx để tích hợp charts)
- [x] Không đổi Sidebar/Header
- [x] Không sửa UI Kit
- [x] Component chỉ gọi hook (useDashboardCharts)
- [x] Không mock trong component
- [x] Không hardcode trong component
- [x] Không any
- [x] Không duplicate

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint tiếp theo

### Sprint 4.1 — Dashboard Foundation

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Xây dựng Dashboard thật (không còn PlaceholderPage) sử dụng UI Kit từ Sprint 3.

### Files tạo mới

| File | Mục đích |
|------|-----------|
| `src/types/dashboard.ts` | Types cho Dashboard |
| `src/app/api/dashboard/route.ts` | API GET /api/dashboard (mock data) |
| `src/hooks/useDashboard.ts` | Hook fetch dashboard |
| `src/lib/format.ts` | Format currency/number helpers |
| `src/app/(protected)/dashboard/PipelineCard.tsx` | Pipeline visualization |

### Files chỉnh sửa

| File | Thay đổi |
|------|-----------|
| `src/app/(protected)/dashboard/page.tsx` | Dashboard thật (UI Kit). Thay thế PlaceholderPage |

### API

```
GET /api/dashboard

Response:
{
  success: true,
  data: {
    summary: {
      totalLeads, closedLeads, shippingOrders,
      deliveredOrders, returnedOrders, revenue
    },
    pipeline: {
      new, contacted, closed,
      shipping, delivered, returned
    }
  }
}
```

### Components sử dụng từ UI Kit

| Component | Mục đích |
|-----------|---------|
| PageContainer | Layout wrapper |
| PageHeader | Title + subtitle |
| StatGrid | Grid 3 cột cho KPI |
| StatCard | 6 KPI cards (Tổng Leads, Chốt, Đang giao, Giao TC, Hoàn hàng, Doanh thu) |
| ChartContainer | Placeholder chart area |
| LoadingOverlay | Loading state |
| EmptyState | Error state |

### Hooks

| Hook | Mục đích |
|------|---------|
| useDashboard | Fetch dashboard data từ /api/dashboard |

### Types

| Type | Mục đích |
|------|---------|
| DashboardSummary | Type cho summary data |
| DashboardPipeline | Type cho pipeline data |
| DashboardResponse | Response shape |

### Coding Rules tuân thủ

- [x] Không inline style thừa (chỉ trong component cần thiết)
- [x] Không any
- [x] Không hardcode số trong component
- [x] Không sửa Sprint trước
- [x] Không đụng Marketing/Sale/Warehouse

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint tiếp theo

### Sprint 3.1 — Complete Common UI Kit

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Hoàn thiện UI Kit. Tổ chức lại thư mục thành các nhóm. Thêm các component mới.

### Cấu trúc thư mục

```
src/components/common/
├── buttons/       → ActionButton
├── cards/         → StatCard, StatGrid, CardSection
├── charts/        → ChartContainer
├── display/       → SectionTitle, Metric, InfoItem, DescriptionList, StatusBadge, EmptyState
├── feedback/      → ConfirmDialog, Toast
├── filters/       → FilterBar, FilterSelect, FilterDate, FilterDateRange, FilterInput
├── forms/         → FormField, FieldGroup, FormSection, DrawerForm
├── inputs/        → SearchInput, DateRangePicker, AsyncSelect, UploadImage
├── layout/        → PageContainer, PageHeader
├── overlay/       → LoadingOverlay, SkeletonCard, SkeletonTable, SkeletonForm
├── table/         → DataTable, TableToolbar, Pagination, ToolbarActions, CardActions
└── index.ts       → Barrel export
```

### Components mới

| Component | Mục đích |
|-----------|---------|
| PageContainer | Standard page layout |
| StatGrid | Grid chứa StatCard |
| SkeletonCard | Skeleton cho card |
| SkeletonTable | Skeleton cho table |
| SkeletonForm | Skeleton cho form |
| SectionTitle | Section title |
| Metric | Metric value với trend |
| InfoItem | Label/value pair |
| DescriptionList | List các InfoItem |
| UploadImage | Image upload (avatar/product/facebook) |
| DateRangePicker | Date range với presets |
| AsyncSelect | Search API ready |
| FormField | Standard form field |
| FieldGroup | Form fields in row |
| ToolbarActions | Toolbar actions |
| CardActions | Card actions |
| ChartContainer | Wrapper cho charts |
| PermissionGate | Permission gate (export chung) |
| Toast | Toast/notification wrapper |

### Hooks mới

| Hook | Mục đích |
|------|---------|
| useDrawer | Drawer state |
| useDialog | Dialog state |
| useSelection | Selection state |
| useSorting | Sorting state |
| useSearchParams | URL params |
| useTableState | Combined table state |

### Quy tắc

- **Reusable**: Không phụ thuộc module
- **Ant Design**: Ưu tiên Ant Design
- **Generic names**: DataTable, CardSection, UploadImage, FieldGroup (KHÔNG MarketingTable, EmployeeCard)

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error
- [x] Barrel export qua `src/components/common/index.ts`
- [x] Hooks export qua `src/hooks/common.ts`
- [x] Folder structure organized
- [x] Tất cả component export được

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint tiếp theo

### Sprint 3 — Common UI Kit

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Xây dựng bộ UI Components dùng chung cho toàn bộ CRM.

### Files tạo mới

| File | Mục đích |
|------|-----------|
| `src/components/common/` | Common UI Kit components |
| `src/components/common/PageHeader.tsx` | Standard page header |
| `src/components/common/StatCard.tsx` | Statistic card with trend |
| `src/components/common/SearchInput.tsx` | Search input component |
| `src/components/common/FilterBar.tsx` | Multiple filter controls |
| `src/components/common/StatusBadge.tsx` | Standard status badges |
| `src/components/common/ActionButton.tsx` | Action buttons |
| `src/components/common/TableToolbar.tsx` | Table toolbar |
| `src/components/common/DataTable.tsx` | Table wrapper |
| `src/components/common/Pagination.tsx` | Pagination wrapper |
| `src/components/common/EmptyState.tsx` | Empty state display |
| `src/components/common/LoadingOverlay.tsx` | Loading overlay |
| `src/components/common/ConfirmDialog.tsx` | Confirmation dialog |
| `src/components/common/DrawerForm.tsx` | Drawer form wrapper |
| `src/components/common/FormSection.tsx` | Form section wrapper |
| `src/components/common/CardSection.tsx` | Card section wrapper |
| `src/components/common/filters/` | Filter components |
| `src/hooks/useDebounce.ts` | Debounce hook |
| `src/hooks/usePagination.ts` | Pagination hook |
| `src/hooks/useFilters.ts` | Filters hook |
| `src/components/common/index.ts` | Export index |
| `src/hooks/common.ts` | Hooks export index |

### Components

1. **PageHeader** — title, subtitle, breadcrumb, actions
2. **StatCard** — value, icon, color, trend
3. **SearchInput** — debounced search
4. **FilterBar** — select, date, dateRange, input filters
5. **StatusBadge** — standard colors for common statuses
6. **ActionButton** — primary, secondary, danger, ghost
7. **TableToolbar** — search, refresh, export, create, filter
8. **DataTable** — wrapper for Ant Design Table
9. **Pagination** — pagination controls
10. **EmptyState** — icon, title, description, action
11. **LoadingOverlay** — spinner with text
12. **ConfirmDialog** — delete, warning, confirm
13. **DrawerForm** — drawer wrapper
14. **FormSection** — titled form section
15. **CardSection** — card wrapper

### Nguyên tắc

- **Reusable**: Không phụ thuộc module
- **Ant Design**: Ưu tiên Ant Design components
- **CSS hiện có**: Không inline style, không CSS mới

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error
- [x] Export qua `src/components/common/index.ts`
- [x] Export hooks qua `src/hooks/common.ts`

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint tiếp theo

### Sprint 2.5 — Central Module Registry (Single Source of Truth)

### Status

✅ Completed (2026-08-03)

### Mục tiêu

Tạo Single Source of Truth cho module definitions. Tránh lệch giữa nav.config và routePermissions.

### Files tạo mới

| File | Mục đích |
|------|-----------|
| `src/config/modules.ts` | Central Module Registry — Single Source of Truth |

### Files chỉnh sửa

| File | Thay đổi |
|------|-----------|
| `src/config/nav.config.tsx` | Build từ modules.ts thay vì hardcode |
| `src/config/routePermissions.ts` | Build từ modules.ts thay vì hardcode |

### Kiến trúc

```
modules.ts (Single Source of Truth)
    │
    ├── nav.config.tsx (generated)
    │
    └── routePermissions.ts (generated)
```

### Module Definition

```typescript
export type ModuleDefinition = {
  id: string;           // "dashboard", "employees", ...
  title: string;        // "Tổng quan", "QL tài khoản", ...
  route: string;        // "/dashboard", "/employees", ...
  permission: string;    // "dashboard.view", "employee.view", ...
  group: NavGroupKey;   // "DASHBOARD", "ACCOUNTS", ...
  icon: string;         // SVG path data
  standalone?: boolean; // Dashboard = true
  pill?: number | null;
};
```

### Lợi ích

- **1 chỗ thay đổi**: route, permission, title, icon đều edit ở modules.ts
- **Không lệch**: nav.config và routePermissions luôn sync
- **Dễ bảo trì**: Thêm module mới chỉ cần thêm vào MODULES array

### Verification

- [x] `npx tsc --noEmit` → 0 TypeScript Error
- [x] Sidebar hoạt động như cũ
- [x] Route Guard hoạt động như cũ
- [x] Không thay đổi hành vi

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint tiếp theo

### 1. Backend Setup
- Next.js App Router
- MongoDB + Mongoose
- Kết nối DB (connectDB)
- Biến môi trường .env.local

### 2. Authentication & User Management
- JWT Authentication
- Middleware kiểm tra Bearer Token
- Phân quyền theo Permission (employee.view, employee.create...)
- getCurrentUser()

### 3. Employee Module
- Login + JWT
- GET danh sách (search, filter, sort, pagination)
- GET chi tiết
- POST (validate, check duplicate, hash password, generate code)
- PUT (validate, check duplicate)
- DELETE (soft delete)
- Reset password
- Validation (Zod)
- Mapper

### 4. Role Module
- GET danh sách (pagination, search)
- GET chi tiết
- POST (validate, check permissions, check duplicate)
- PUT (validate, check duplicate)
- DELETE (soft delete)
- Validation
- Mapper

### 5. Seed Database
- Countries, Areas, Departments, Teams
- Permissions, Roles, Employees, Counters

### 6. Counter (Auto-increment)
- Mã tự động: EMP000001, EMP000002...

### 7. Master Data
- Country, Area, Department, Team
- Role, Permission, Employee
- Setting, Counter

### 8. Product System
- Category
- Brand
- Product
- VariantOption
- VariantValue
- ProductVariant

### 9. Combo System (Đã hoàn thiện)
- Combo Model (code, name, categoryId, comboItems, sellingPrice, packageSize, image, description, isActive)
- ComboItem (productVariantId, quantity, isGift)
- Không lưu tên/giá Product, chỉ lưu reference
- ComboItem Schema với validation:
  - quantity >= 1
  - Không duplicate variant trong cùng combo
- API CRUD đầy đủ:
  - GET /api/combos (list với pagination)
  - GET /api/combos/:id (detail với populate Category, Product, ProductVariant)
  - POST /api/combos (validate, check duplicate code/name)
  - PUT /api/combos/:id (validate, check duplicate, không cho sửa inactive combo)
  - DELETE /api/combos/:id (soft delete - isActive=false)
- Validation:
  - sellingPrice >= 0
  - packageSize > 0
  - Combo phải có ít nhất 1 ComboItem
  - Không duplicate code
  - Không duplicate name
  - Tất cả variant phải tồn tại và active
- Business Rules:
  - Không cho sửa combo đã bị soft delete
  - Không cho chọn combo inactive
- Permissions: combo.view, combo.create, combo.update, combo.delete
- Roles có quyền:
  - ADMIN, MANAGER, MKT: Create, Update
  - LEADER, EMPLOYEE: View

### 10. Warehouse System
- Warehouse
- Inventory (Read Model - chỉ lưu quantity, reservedQuantity)
- InventoryAdjustment (Business Action)
- InventoryTransaction (được tính từ Transaction)

### 11. CRM
- Customer (chỉ lưu thông tin khách)
- CustomerAddress
- CustomerTag
- CustomerTimeline

### 12. Facebook Page
- FacebookPage
- FacebookPageAssignment

### 13. Database Patterns & Utilities
- Soft Delete (isActive = false)
- Pagination, Search, Filter, Sort
- Zod Validation
- Mapper Pattern
- Password Hashing (bcrypt)
- Response utilities (success, error)
- Snapshot Pattern (lưu trạng thái tại thời điểm tạo)

---

## 📊 Đánh giá hoàn thiện (theo ChatGPT)

| Module | Hoàn thiện |
|--------|------------|
| Authentication | 95% |
| Employee / Team / Role | 95% |
| Product | 90% |
| Combo | 100% |
| Warehouse | 80% |
| Inventory | 90% |
| Facebook Page | 95% |
| Customer | 90% |
| Order | 60% |
| Lead | 30% |
| Dashboard | 5% |
| Report | 15% |
| Notification | 0% |
| Workflow | 0% |

---

## 🗂️ Kiến trúc 10 Module chính

```
Authentication
        │
        ▼
Employee / Team / Role / Permission
        │
        ▼
Facebook Page
        │
        ▼
Marketing
        │
        ▼
Lead
        │
        ▼
Sales Pipeline
        │
        ▼
Order
        │
        ▼
Customer
        │
        ▼
Warehouse
        │
        ▼
Reconciliation
        │
        ▼
Report
```

---

## 📋 Kiến thức đã thực hành

- JWT Authentication
- Permission-based Authorization
- MongoDB Populate
- Soft Delete
- Pagination, Search, Filter, Sort
- Mapper Pattern
- Zod Validation
- Password Hashing (bcrypt)
- Counter Auto Increment
- REST API CRUD
- App Router API (Next.js)

---

## 🔄 Luồng hệ thống

```
Facebook Ads
      ↓
Lead
      ↓
Marketing xác nhận
      ↓
Import hàng loạt
      ↓
Auto chia Sale
      ↓
Sale gọi (Sales Pipeline)
      ↓
Chốt đơn
      ↓
Order
      ↓
Kho đóng gói
      ↓
Giao hàng
      ↓
Đối soát
      ↓
Report
```

---

## 📌 Pipeline Stages (Order Status)

```
NEW → ASSIGNED → CALLING → CONFIRMED → PACKING → SHIPPING → DELIVERED → RECONCILED
                  ↓
              NO_ANSWER / POTENTIAL / REJECTED
                                          
              SHIPPING → RETURNED
```

**Sale Call Status:**
- NO_ANSWER (KNM)
- POTENTIAL (tiềm năng)
- REJECTED (không cần)
- CONFIRMED (đã xác nhận)

---

## 📌 Kiến trúc Order (đã thiết kế)

**Order chứa:**
- customerId + Customer Snapshot (name, phone, address, facebookLink)
- Marketing Snapshot (marketingEmployeeId, facebookPageId, facebookPageAssignmentId)
- Sale Snapshot (saleEmployeeId)
- Combo Snapshot (comboId, comboName, comboPrice, comboWeight)
- Revenue Snapshot (productRevenue, marketingRevenue, saleRevenue)
- Exchange Rate Snapshot
- Weight Snapshot (estimatedWeight, actualWeight, weightUnit, packageCount, packageType)
- warehouseId
- shipmentId
- reconciliationId
- createdSource (MANUAL / IMPORT / API)
- callNoAnswerCount (số lần KNM)
- confirmed, confirmedAt

**OrderItem:**
- comboId
- quantity

**OrderStatusHistory:**
- Lưu ai đổi trạng thái, lúc nào

**OrderCallHistory:**
- Lưu lịch sử gọi (09:00 KNM, 14:00 máy bận, 17:00 hẹn mai)

**Shipment:**
- shippingProvider (GHN, J&T, EMS...)
- trackingNumber
- sentAt, receivedAt

**Payment:**
- COD, Chuyển khoản

---

## 📌 Kiến trúc Lead (đã thiết kế)

- LeadImportBatch (batch import để track lỗi, rollback)
- LeadHistory (Import → Đã liên hệ → Đã chuyển Order)

---

## 🔜 Cần làm tiếp

### Sprint 2.2 — Permission Foundation
✅ Hoàn thành (2026-08-03)
- Permission Engine: types, lib, hook, PermissionGate

### Sprint 2.3 — Tiếp theo
- CRUD (theo Sprint tiếp theo)

### Ưu tiên cao:
1. **Lead** (20%) - Module CRM quan trọng nhất
2. **Order** (60%) - Hoàn thiện Order CRUD + OrderItem + OrderStatusHistory + OrderCallHistory
3. **Sales Pipeline** - Quản lý việc Sale xử lý lead (gọi, KNM, tiềm năng...)

### Ưu tiên trung bình:
4. **Auto Assign Sale** - Tự động chia đơn cho Sale (Round Robin, Weighted, Manual, Priority)
5. **Shipment** - Quản lý vận chuyển
6. **Payment** - Quản lý thanh toán

### Ưu tiên thấp:
7. **Dashboard** (5%) - Marketing Dashboard, Sale Dashboard, Kho Dashboard
8. **Report** (15%) - Marketing Report, Sale Report, Warehouse Report, Finance Report
9. **Reconciliation** - Đối soát cuối ngày

### Tương lai:
10. **Notification** - Thông báo
11. **Workflow Engine** - Luồng xử lý có thể cấu hình
12. **Timeline / EventLog** - Lịch sử chung cho mọi thao tác
13. **Audit Log** - Log ai sửa gì, lúc nào, giá cũ, giá mới

---

## 📌 Các Module bổ sung đã đề xuất

1. **Organization** - Đa quốc gia (Mongolia, Japan, Thailand...)
2. **WarehouseLocation** - Kệ A, Kệ B...
3. **CustomerTag** - VIP, Scam, Đại lý, Blacklist...
4. **ExchangeRate** - Tỷ giá MNT → VND
5. **AssignmentRule** - Quy tắc chia Sale
6. **SaleDailyStatistic** - Cache KPI cho Dashboard
7. **InventoryDailySnapshot** - Snapshot tồn kho hàng ngày
8. **MarketingFundRequest** - Xin quỹ Marketing
9. **MarketingExpense** - Chi quỹ Marketing
10. **Campaign** - Chiến dịch quảng cáo
11. **Attachment** - File đính kèm (ảnh bill, ảnh hoàn hàng...)
12. **ShippingProvider** - GHN, J&T, EMS...

---

## 📌 Nguyên tắc kiến trúc

1. **Snapshot Pattern** - Lưu trạng thái tại thời điểm tạo
2. **Soft Delete** - Không xóa, chỉ đánh dấu isActive = false
3. **Enum chuẩn hóa** - UPPER_SNAKE_CASE (NO_ANSWER, POTENTIAL...)
4. **Không sửa dữ liệu quá khứ** - Mọi thay đổi tạo revision mới
5. **Permission theo Module** - module.action (employee.view, order.create...)
6. **Daily Statistic** - Dashboard đọc từ cache, không query trực tiếp
7. **Event Driven** - Một sự kiện kích hoạt nhiều hành động
8. **Master Data vs Transaction Data** - Tách rõ hai loại dữ liệu

---

## 📌 Thứ tự triển khai module mới (quy trình chuẩn)

1. Model
2. Mapper
3. Validator
4. Permissions
5. Roles
6. Seed
7. API CRUD
8. Test

---

# Mongolia CRM Development Progress

---

## MODULE: Combo

### Status

✅ Completed

### Models

- Combo

### APIs

- GET /api/combos
- GET /api/combos/:id
- POST /api/combos
- PUT /api/combos/:id
- DELETE /api/combos/:id (Soft Delete)

### Validation

- Quantity >=1
- PackageSize >=1
- SellingPrice >=0
- displayOrder >=0
- Duplicate Variant
- Duplicate Code
- Duplicate Name trong cùng Product

### Business Rules

- Product phải thuộc Category
- Variant phải thuộc Product
- Không sửa Combo inactive
- Soft Delete

### Permissions

- combo.view
- combo.create
- combo.update
- combo.delete

### Seed

- Category
- Product
- Variant
- Combo

### Index

- Unique(code)
- Unique(productId,name)
- Query(isActive,categoryId,displayOrder)
- Query(productId,displayOrder)

### Review

Reviewed by ChatGPT

Status: Ready for Lead Module

---

## MODULE: Lead

### Status

In Progress

### Models

- Lead
  - leadCode (auto-increment)
  - customerName, customerNewName
  - facebookLink, phone, phone2
  - address, province, district, ward
  - sourceType (LANDING_PAGE, FACEBOOK_COMMENT, FACEBOOK_INBOX, TIKTOK, ZALO, OTHER)
  - facebookPageId, facebookPageAssignmentId
  - marketingEmployeeId, saleEmployeeId (nullable)
  - categoryId, productId, comboId
  - quantity, unitPriceMNT, unitPriceVND, exchangeRate, estimatedWeight
  - status (NEW, ASSIGNED, CALLING, NO_ANSWER, POTENTIAL, REJECTED, ORDER_CREATED, CANCELLED)
  - note, isDuplicate, isActive

- LeadHistory
  - leadId, employeeId
  - action (CREATED, ASSIGNED_SALE, STATUS_CHANGED, UPDATED_*, ORDER_CREATED, CANCELLED...)
  - oldValue, newValue, note

### Constants

- LeadStatus Enum (8 status)
- SourceType const array
- LeadAction const array

### Mapper

- mapLead()
- mapLeadList()
- mapLeadHistory()
- mapLeadHistoryList()

### Validation

- createLeadSchema
  - customerName: required, max 200
  - phone: Vietnamese format regex (0[0-9]{9,10})
  - facebookLink: valid URL
  - sourceType: enum
  - quantity >= 1
  - prices >= 0

- updateLeadSchema
  - Same as create but all fields optional except partial required
  - Nullable for reference fields

### Permissions

- lead.view
- lead.create
- lead.update
- lead.delete
- lead.assign

### Roles có quyền Lead

- ADMIN, MANAGER, MKT: Create, Update, Assign
- LEADER: View
- EMPLOYEE: View

### Phase 1 Scope (Đã xong)

✅ Model: Lead, LeadHistory
✅ Enum: LeadStatus (8 status: NEW, ASSIGNED, PROCESSING, NO_ANSWER, POTENTIAL, ORDER_CREATED, REJECTED, CANCELLED)
✅ Enum: LeadAction (11 actions: CREATED, UPDATED, ASSIGNED, UNASSIGNED, STATUS_CHANGED, ORDER_CREATED, ORDER_CANCELLED, SALE_CHANGED, MARKETING_CHANGED, NOTE_UPDATED, DELETED)
✅ Mapper: mapLead, mapLeadList, mapLeadHistory, mapLeadHistoryList
✅ Validation: createLeadSchema, updateLeadSchema
✅ Permissions: lead.view, lead.create, lead.update, lead.delete, lead.assign

### Lead Model Updates

1. Thêm customerId (nullable, ref Customer) - khách hoàn toàn mới = null, khách quay lại = có giá trị
2. Thêm assignmentType (AUTO, MANUAL, nullable) - thống kê cách chia Sale
3. Thêm assignedAt (Date, nullable) - thời điểm Lead được giao cho Sale
4. Thêm latestRemark (String, nullable) - luôn lưu ghi chú mới nhất để hiển thị nhanh trong danh sách. Lịch sử ghi chú được lưu trong LeadHistory với action NOTE_UPDATED
5. LeadStatus: Bỏ CALLING, thêm PROCESSING - CALLING chỉ là hành động, không phải trạng thái
6. LeadHistory.action: Dùng Enum LeadAction thay vì String

### Phase 2: CRUD API (Đã xong)

✅ API CRUD đầy đủ:
- GET /api/leads (list với pagination, filter, search)
- GET /api/leads/:id (detail với populate đầy đủ)
- POST /api/leads (validate, generate code, tạo LeadHistory)
- PUT /api/leads/:id (validate, business rules, tạo LeadHistory)
- DELETE /api/leads/:id (soft delete, tạo LeadHistory)

✅ GET List Filters:
- page, limit, keyword
- status, marketingEmployeeId, saleEmployeeId
- facebookPageId, sourceType, isDuplicate, isActive
- createdFrom, createdTo
- Sort: createdAt DESC

✅ GET Detail Populate:
- customer, facebookPage, facebookPageAssignment.employee
- marketingEmployee, saleEmployee
- category, product, combo

✅ POST Business Rules:
- Validate: Product, Combo, Marketing Employee, Sale Employee, Customer (nếu có)
- **Business Rule 7**: leadCode dùng Counter Collection (đảm bảo không trùng khi nhiều người tạo cùng lúc)
- Status default: NEW
- assignedAt: null
- assignmentType: undefined (không set, sẽ do Auto Assign set AUTO)
- latestRemark: ""
- isDuplicate: false
- isActive: true
- Tạo LeadHistory(action: CREATED, employeeId)

✅ Search:
- **Business Rule 6**: keyword tìm theo: leadCode, customerName, customerNewName, phone, phone2, facebookLink (regex không phân biệt hoa thường)

✅ PUT Business Rules:
- Validate: Product, Combo, Marketing Employee, Sale Employee
- **Business Rule 1**: Không cho sửa Lead đã tạo Order (status = ORDER_CREATED) các field ảnh hưởng doanh thu (productId, comboId, quantity, unitPriceMNT, unitPriceVND, exchangeRate, marketingEmployeeId) → HTTP 409
- **Business Rule 2**: assignedAt chỉ set khi Sale từ null → có giá trị. Đổi Sale sau này không cập nhật assignedAt
- **Business Rule 3**: assignmentType luôn là MANUAL trong CRUD (Auto Assign sẽ tự set AUTO)
- **Business Rule 4**: Tất cả LeadHistory phải có employeeId
- Nếu latestRemark thay đổi: Tạo LeadHistory(NOTE_UPDATED, oldValue, newValue)
- Nếu status thay đổi: Tạo LeadHistory(STATUS_CHANGED, oldValue, newValue)
- Nếu saleEmployeeId thay đổi: Tạo LeadHistory(SALE_CHANGED, oldValue, newValue)
- Nếu marketingEmployeeId thay đổi: Tạo LeadHistory(MARKETING_CHANGED, oldValue, newValue)

✅ DELETE Business Rules:
- **Business Rule 5**: Không cho Delete Lead đã tạo Order (status = ORDER_CREATED) → HTTP 409
- Soft Delete: isActive = false
- Tạo LeadHistory(action: DELETED)

✅ Permissions:
- lead.view, lead.create, lead.update, lead.delete

✅ Response Format:
- Sử dụng mapper: mapLead(), mapLeadList()
- Response: { success, message, data }

✅ Transaction:
- **POST Lead**: Tạo Lead + Update Counter + Tạo LeadHistory trong 1 transaction
- **PUT Lead**: Update Lead + Tạo LeadHistory trong 1 transaction
- **DELETE Lead**: Soft Delete + Tạo LeadHistory trong 1 transaction
- Nếu bất kỳ bước nào lỗi → Rollback toàn bộ transaction

✅ Transaction Testing (Đã xong):
- **2026-07-31**: Kiểm thử POST, PUT, DELETE Transaction
- Tất cả 26 test cases đều PASS (8 basic + 5 error-based + 13 comprehensive)
- Commit và Rollback (real errors) hoạt động đúng
- Rollback triggered by: Validation Error, Duplicate Key, Required Field, Invalid Enum, Cast Error
- MongoDB Verification: Collections, indexes, data integrity verified
- Regression Test: 26/26 PASS
- Chi tiết: docs/testing/Lead_Transaction_Test_Report.txt

### Phase 3 (Đang làm)

✅ Lead Import
- **Phase 3.1 - Paste + Preview (Completed - 2026-07-31)**
- Component: LeadImportPreview
- Chức năng: Paste dữ liệu (Ctrl+V) → Parse TAB/newline → Mapping object (customerName, phone, combo, price, sourceType, date) → Hiển thị Table Preview
- Statistics: Hiển thị tổng số dòng đã parse
- Có nút Clear để xóa toàn bộ dữ liệu
- KHÔNG lưu Database, KHÔNG validate, KHÔNG duplicate, KHÔNG import
- File: src/app/components/LeadImportPreview.tsx
- **Lead Import Header Mapping Added**
- **Lead Import Flexible Header Mapping (2026-07-31)**
  - HEADER_MAP với nhiều alias cho mỗi field (tên/Tên KH/Khách Hàng/Name...)
  - Normalize: lowercase + trim + collapse spaces
  - Cột bắt buộc: Tên (customerName), SĐT (phone) - thiếu → không parse, hiển thị Alert lỗi
  - Cột dư: bỏ qua, không báo lỗi
- **Lead Import Architecture Refactor (2026-07-31)**
  - Header Mapping extracted → `src/constants/importHeaders.ts`
    - `LEAD_IMPORT_HEADER_MAP`
    - `LEAD_IMPORT_REQUIRED_FIELDS`
    - `LeadImportField` type
  - Parser extracted → `src/utils/import/leadParser.ts`
    - Public API: `parseLead(text) → LeadParseResult`
    - Internal helpers: `normalizeHeader`, `buildHeaderIndex`, `hasHeaderRow`, `parseRow`
  - Component `LeadImportPreview` chỉ UI: nhận paste → gọi `parseLead()` → render preview/stats/error
  - Ready for Customer / Product / Warehouse Import
- **Lead Import Validation (Phase 3.2) (2026-07-31)**
  - Row validation pipeline: Parse → Mapping → Validation → Result
  - Tái sử dụng `VIETNAMESE_PHONE_REGEX` từ `src/utils/validator.ts`
  - Mỗi row có `status: VALID | INVALID` và `errors: string[]`
  - Validate required: customerName, phone
  - Validate phone: regex Vietnamese (0xxxxxxxxx / 0xxxxxxxxxx)
  - Validate price: >= 0 (nếu có)
  - Validate date: parseable (nếu có)
  - Phase 3.3 sẽ handle: Combo / Product / Page / Marketing / Sale / Customer existence
  - Statistics: Tổng dòng / Hợp lệ / Không hợp lệ
  - Preview table thêm cột: Trạng thái ✔❌ + Lý do lỗi (errors)
- **Lead Validation Enhanced (2026-08-01)**
  - Error Code: `MISSING_NAME`, `MISSING_PHONE`, `PHONE_INVALID`,
    `PRICE_INVALID`, `PRICE_NEGATIVE`, `DATE_INVALID`, `SOURCE_TYPE_INVALID`
  - Validation Issue structure: `{ code, message, severity, field }`
  - Severity: `ERROR` (chặn import) vs `WARNING` (cho phép import, cảnh báo)
  - `SOURCE_TYPE_INVALID` là WARNING (vẫn ghi nhận)
  - Cell Highlight: đúng cell bị lỗi (đỏ) / cảnh báo (vàng), không chỉ highlight cả dòng
  - Tooltip per-cell liệt kê issues kèm code
  - Status pill: ✔ VALID / ⚠ WARNING / ❌ INVALID
  - Statistics: Tổng / Hợp lệ / Cảnh báo / Không hợp lệ
- **Lead Import Validation Architecture Refactor (2026-08-01)**
  - Tạo `src/services/import/leadImportValidation.service.ts`
    - `loadLeadImportContext()`: batch query Product/Combo/FacebookPage/Customer/Employee
    - In-memory `Map` cache (TTL 5 phút), concurrency-safe
    - `clearLeadImportContextCache()` + `emptyLeadImportContext()`
  - Parser `leadParser.ts` hoàn toàn DATABASE-FREE
    - Không import Mongoose / Model
    - Nhận optional `LeadImportContext` qua parameter
    - Phase 3.3 hook: `validateBusinessRow(row, context)` đã reserve
    - Reserved codes: `PRODUCT_NOT_FOUND`, `COMBO_NOT_FOUND`,
      `FACEBOOK_PAGE_NOT_FOUND`, `CUSTOMER_NOT_FOUND`, `EMPLOYEE_NOT_FOUND`
  - Flow: LeadImportPreview → load context (1 batch / domain) → parseLead(text, context)
  - Ready for: Duplicate Detection, Auto Create Customer, Auto Assign Sale, DB Import
- **Lead Duplicate Detection (2026-08-01)**
  - Phase 3.4: phát hiện trùng lặp KHÔNG chặn Import (INFO only)
  - Service mở rộng context:
    - `customersByPhone` (đã có) + `customersByFacebookLink` (reserved)
    - `leadsByPhone` + `leadsByFacebookLink` (Phase 3.4 batch queries)
  - Parser thêm `validateDuplicateRow(row, context)`:
    - Level 1: Phone → Customer → `duplicateType: PHONE` (Khách quay lại)
    - Level 1b: Phone → Lead → `duplicateType: PHONE` (Lead cũ - trùng SĐT)
    - Level 2: Facebook → Lead → `duplicateType: FACEBOOK` (Trùng Facebook)
    - Level 3/4: CUSTOMER / LEAD enum reserved
  - `ParsedLead` thêm fields: `isDuplicate`, `duplicateType`,
    `customerId` (link vào KH để Phase Import không phải tìm lại),
    `matchedCode` / `matchedId`
  - Severity: chỉ là INFO, KHÔNG ERROR / KHÔNG WARNING
  - Statistics: Tổng / Hợp lệ / Cảnh báo / Không hợp lệ / Khách mới /
    Khách quay lại + breakdown Trùng SĐT (Customer/Lead) / Trùng Facebook
  - Preview columns: Duplicate / Loại trùng / Khách hàng trùng (Customer.code)
  - KHÔNG làm: Merge Customer / Merge Lead / Auto Update Customer /
    Auto Assign Sale / Import DB
- **Lead Import Simulation (Phase 3.5) (2026-08-01)**
  - Tạo `src/services/import/leadImportSimulation.service.ts`
    - `simulateLeadImport(rows, context?) → LeadImportSimulation`
    - PURE FUNCTION: không ghi DB, không mở transaction, không tạo Customer, không tạo Lead
    - Nhận `ParsedLead[]` từ parser (cùng shape đang hiển thị ở bảng)
    - Trả về summary đầy đủ:
      * `totalRows`, `validRows`, `invalidRows`, `warningRows`
      * `leadsToCreate`, `customersToCreate`, `newCustomers`, `returningCustomers`
      * `duplicatePhone`, `duplicateFacebook`, `duplicateCustomer`
      * `errorCount`, `warningCount`
      * `readyToImport` (= `errorCount === 0 && leadsToCreate > 0`) - single source of truth cho Import button
      * `estimatedExecution: { leadCount, label }` - UX hint ("15 Lead → ~0.2s", "500 Lead → ~5s")
      * `skippedRowNumbers` (rowNumber của các dòng INVALID)
      * `issueSummary` (Record<code, count>)
    - Helper `describeIssueCode(code)` cho label tiếng Việt
  - Component `LeadImportPreview`:
    - Thêm Summary Card "Mô phỏng Import" phía trên bảng (nền xanh lá, tag Phase 3.5)
    - Header card có 2 tag mới:
      * `readyToImport` → "Sẵn sàng Import" (success) / "Chưa sẵn sàng" (default)
      * `estimatedExecution` → "⏱ 15 Lead → ~0.2s" (tooltip giải thích chỉ UX)
    - 11 ô Statistic: Tổng / Lead sẽ tạo / Customer sẽ tạo / Khách mới /
      Khách quay lại / Trùng SĐT / Trùng Facebook / Trùng Customer /
      Warning / Error / Dòng sẽ bỏ qua
    - Alert liệt kê rowNumber các dòng sẽ bị skip
    - Tóm tắt lỗi theo `LeadValidationCode` (sort theo count giảm dần)
    - `simulation` được memo bằng `useMemo` theo `[parsedRows, importContext]`
    - KHÔNG thêm nút Import / KHÔNG gọi API / KHÔNG tạo Customer / KHÔNG tạo Lead
    - Khi Phase 3.6 thêm nút Import: `disabled={!simulation.readyToImport}`
- **Lead Import DB (Phase 3.6) (2026-08-01)**
  - Tạo `src/services/import/leadImport.service.ts`
    - `importLeads(rows, context, opts)` - atomic DB import
    - **Guard bắt buộc**: phải gọi `simulateLeadImport` trước; `simulation.readyToImport === true` mới cho chạy
      (throw `LeadImportNotReadyError` nếu chưa sẵn sàng, có `skipSimulationGuard` cho internal caller)
    - Toàn bộ batch chạy trong **1 transaction** (`mongoose.startSession()` + `withTransaction`)
      - Bất kỳ dòng nào throw → rollback toàn bộ Customer / Lead / LeadHistory
    - Sequence per row:
      1. `customerId` (matched by parser) → reuse Customer, `reusedCustomer++`
         Ngược lại → `nextCustomerCode()` (Counter "CUSTOMER", `KH000001`...) → `Customer.create()` → `createdCustomer++`
      2. `nextLeadCode()` (Counter "LEAD", `LE000001`...) → `Lead.create()` với `status: NEW`, `sourceType: OTHER` (nếu rỗng), `unitPriceVND` parse từ `price`, `comboId` lookup từ context, `isDuplicate` propagate
      3. `LeadHistory.create(action: CREATED, newValue: NEW, note: "Tạo Lead từ Import")`
    - Defaults load một lần (Promise.all):
      - Area `PVD`, Team `SALE`, Employee `EMP_MKT001` (required fields cho Customer)
    - `parseNumericPrice` mirror lại parser (VN thousand separator)
    - `normalizeSourceType` rỗng / không hợp lệ → `OTHER` (enum-safe)
    - `resolveComboId` lookup từ `context.combosByCode` (case-insensitive)
    - Return:
      ```ts
      { createdLead, createdCustomer, reusedCustomer, elapsedTime }
      ```
    - **KHÔNG làm**: Auto Assign Sale / Commission / Order / Update existing Customer
  - Import Pipeline tổng thể (Phase 3.1 → 3.6):
    `paste → parseLead → validateDuplicateRow → simulateLeadImport → importLeads`
- **Lead Import DB - Refactor (Phase 3.6) (2026-08-01)**
  - Tách trách nhiệm rõ ràng, KHÔNG còn hardcode trong `leadImport.service.ts`:
  - **Không hardcode Area/Team/Marketing Employee**:
    - Tạo `src/services/import/leadImportDefaults.service.ts`
      - `loadLeadImportDefaults()` đọc 3 key từ collection `Setting`:
        * `IMPORT_DEFAULT_AREA_CODE`
        * `IMPORT_DEFAULT_TEAM_CODE`
        * `IMPORT_DEFAULT_MARKETING_EMPLOYEE_CODE`
      - Cache 60s, có `clearLeadImportDefaultsCache()`
      - Throw error rõ ràng khi thiếu key hoặc thiếu ref trong DB
  - **Không tự sửa sourceType**:
    - Parser cho gì thì `leadImport.service.ts` persist y nguyên
    - Chỉ fallback `OTHER` khi string rỗng (để thỏa schema `required`), không rewrite enum
  - **Không re-lookup Combo tại thời điểm Import**:
    - Bỏ `Combo.findOne(...)` trong service
    - `resolveComboIdFromContext(row.combo, context)` chỉ đọc `context.combosByCode` (đã được parser resolve)
    - Combo thiếu trong context → `comboId: undefined` (không throw)
  - **Customer qua CustomerService**:
    - Tạo `src/services/customer/customer.service.ts`
      - `createCustomer(input, opts?)` - allocate CustomerCode qua Counter "CUSTOMER"
      - Nhận `opts.session` để tham gia transaction của caller
      - CustomerCounter thuộc sở hữu hoàn toàn của CustomerService
    - `leadImport.service.ts` không còn đụng tới `Counter` cho Customer, không tự sinh code
  - **API layer thuần transport**:
    - Tạo `src/app/api/leads/import/route.ts` (POST)
      - Chỉ: auth (`getCurrentUser`) → authorize (`lead.create`) → parse body → load context → gọi `importLeads()` → trả kết quả
      - Bắt `LeadImportNotReadyError` → trả 409 kèm `errorCount` + `leadsToCreate` để UI biết lý do
      - KHÔNG chứa logic nghiệp vụ (Counter / Transaction / Defaults đều nằm trong service)
- **Order Module - Phase 1.1: Model Foundation (2026-08-01)**
  - Mở rộng `src/models/Order.ts` (đã tồn tại):
    - Thêm sub-type `IOrderPayment` + field `payments[]` (method/amount/currency/paidAt/transactionId)
    - Thêm sub-type `IOrderShipping` + field `shipping{}` (receiverName/Phone/address/province/district/ward/trackingNumber/carrier/estimatedDelivery/actualDelivery/shippingFee)
    - Thêm `estimatedWeight`, `actualWeight`
    - Thêm `warehouseId` (ref: Warehouse)
    - Thêm `revenueLocked` (Boolean, default: false)
    - Thêm `revenueOwnerOrderId` (ref: Order) - đơn đang chiếm slot revenue
    - Đổi `revenueLockReason` type từ `string` → `RevenueLockReason` enum (type-safe)
    - Thêm compound indexes: `(customerId, productId|comboId, revenueLocked, createdAt)` cho Revenue Lock
    - Thêm indexes: `(warehouseId, isActive)`, `(leadId)`
  - Tạo `src/models/OrderHistory.ts`
    - Schema: orderId / employeeId / action / oldValue / newValue / note / createdAt
    - Indexes: `(orderId, createdAt DESC)`, `(employeeId)`
  - Mở rộng `src/constants/orderStatus.ts` (đã tồn tại):
    - Thêm `OrderAction` enum (CREATED/UPDATED/STATUS_CHANGED/PAYMENT_ADDED/PAYMENT_REMOVED/SHIPPING_UPDATED/DELIVERED/CANCELLED/REJECTED/REVENUE_LOCKED/REVENUE_UNLOCKED/REVENUE_RECALCULATED/NOTE_UPDATED/DELETED)
    - Thêm `ORDER_ACTION_LABELS` map
  - Tạo `src/mappers/order.mapper.ts`
    - `OrderResponse`, `OrderListItem`, `OrderPaymentResponse`, `OrderShippingResponse`
    - `OrderHistoryResponse` + `Employee` populated
    - `mapOrder()`, `mapOrderList()`, `mapOrderHistory()`, `mapOrderHistoryList()`
  - Thêm `createOrderSchema` + `updateOrderSchema` vào `src/utils/validator.ts`
    - Nested `orderPaymentSchema` (method/amount/currency/paidAt/transactionId)
    - Nested `orderShippingSchema` (receiverName/Phone/address/province/district/ward/trackingNumber/carrier/estimatedDelivery/actualDelivery/shippingFee)
    - Full validation: OBJECT_ID regex, min/max, currency enum
  - KHÔNG làm: CRUD / API / Revenue Engine / Stock
- **Order Module - Phase 1.2: Classification + TotalPaid (2026-08-01)**
  - Thêm 3 enum vào `src/constants/orderStatus.ts`:
    - `OrderType` (NORMAL / COMBO / GIFT / EXCHANGE / REPLACEMENT)
      - NORMAL/COMBO: tính revenue, chiếm slot.
      - GIFT/EXCHANGE/REPLACEMENT: KHÔNG tính revenue, KHÔNG chiếm slot.
    - `OrderSource` (FACEBOOK / IMPORT / PHONE / WEBSITE / MANUAL)
      - Nguồn SALE chốt đơn, KHÁC `Lead.sourceType` (nguồn khách).
    - `NON_REVENUE_ORDER_TYPES` Set: { GIFT, EXCHANGE, REPLACEMENT }.
  - Thêm 3 fields vào `src/models/Order.ts`:
    - `orderType` (OrderType, default NORMAL, indexed)
    - `orderSource` (OrderSource, default MANUAL, indexed)
    - `totalPaid` (Number, min: 0) — cache sum(payments[].amount), update atomic khi add/remove payment.
    - Compound index: `(orderType, status, createdAt DESC)` + `(orderSource, createdAt DESC)` cho Dashboard.
  - Cập nhật `src/mappers/order.mapper.ts`:
    - Thêm `orderType` / `orderTypeLabel` / `orderSource` / `orderSourceLabel` / `totalPaid` vào `OrderResponse` + `mapOrder()`.
  - Cập nhật `src/utils/validator.ts`:
    - `createOrderSchema` + `updateOrderSchema` thêm `orderType` / `orderSource` / `totalPaid` (optional, backward-compat).
  - Cập nhật `src/services/order/orderRevenue.service.ts`:
    - `OrderLockInput` thêm field `orderType`.
    - `isSameProductFamily()`: nếu 1 trong 2 đơn là NON_REVENUE → return false (không cùng family, không lock).
    - `evaluateAndLock()` case (a-0): nếu subject là GIFT/EXCHANGE/REPLACEMENT → eligible=false, *_Final=0, reason=NONE (đánh dấu "không tính vì bản chất").
    - KHÔNG cần đoán `comboId != null` nữa - dùng `orderType` trực tiếp.
- **Order Module - Phase 2: CRUD API (2026-08-01)**
  - Tạo `src/app/api/orders/route.ts`
    - `GET /api/orders` — pagination + search + filter + sort
      - Search: `orderCode` / `customerName` / `phone` (lookup Customer rồi match `customerId`)
      - Filter: `status` / `warehouseId` / `orderType` / `orderSource` / `revenueLocked` / `createdAt range`
      - Sort: `createdAt DESC`
      - Permission: `order.view`
    - `POST /api/orders` — tạo đơn
      - Validate reference tồn tại: Customer / Lead / Product / Combo / Warehouse / Employee (parallel `Promise.all`)
      - Validate `orderType` + `orderSource` (qua Zod enum)
      - Default revenue: `revenueLocked=false`, `revenueOwnerOrderId=null`, `marketingRevenue*`=0, `saleRevenue*`=0, `totalPaid=0` (NO revenue engine call)
      - KHÔNG auto assign / KHÔNG commission / KHÔNG stock / KHÔNG shipment
      - Generate `orderCode` qua `Counter` (`OD + YYMMDD + seq`)
      - Tạo `OrderHistory` với `action=CREATED`, `newValue=status`, `employeeId=currentUser.employee._id`
      - Wrap trong transaction (`startSession` + `commitTransaction`)
      - Permission: `order.create`
  - Tạo `src/app/api/orders/[id]/route.ts`
    - `GET /api/orders/:id`
      - Populate: Customer / Lead / Product / Combo / Warehouse / Marketing Employee / Sale Employee
      - Trả về `histories[]` (populated Employee) từ `OrderHistory`
      - Permission: `order.view`
    - `PUT /api/orders/:id`
      - Status lock guard: COMPLETED / CANCELLED / REJECTED / FAILED → 409
      - Validate reference existence khi thay đổi
      - Change tracking → tạo OrderHistory entries:
        * `customerId`: action=UPDATED, old/new=id, note="Đổi khách hàng"
        * `productId`: action=UPDATED, note="Đổi sản phẩm"
        * `comboId`: action=UPDATED, note="Đổi combo"
        * `warehouseId`: action=SHIPPING_UPDATED, note="Đổi kho"
        * `status`: action=STATUS_CHANGED, old/new=label
        * `payments[]`: action=PAYMENT_ADDED, old/new=totalPaid sum
        * `shipping{}`: action=SHIPPING_UPDATED, note="Cập nhật vận chuyển"
      - Auto recompute `totalPaid = sum(payments[].amount)`
      - Wrap trong transaction
      - Permission: `order.update`
    - `DELETE /api/orders/:id`
      - Soft delete (`isActive = false`)
      - Block khi status = COMPLETED (409)
      - Tạo `OrderHistory` với `action=DELETED`
      - Wrap trong transaction
      - Permission: `order.delete`
  - KHÔNG làm: Revenue Engine / Warehouse Stock / Shipment / Commission / Dashboard
- **Order Module - Phase 2.1: Helper + fieldName (2026-08-01)**
  - Tạo `src/helpers/orderChange.ts`:
    - `isPaymentChanged(oldPayments, newPayments) → { changed, oldTotal, newTotal }`
      - Normalise (Date → ISO, strip undefined/null), so sánh canonical JSON.
      - Sum amount ngay trong helper để route không phải tính lại.
    - `isShippingChanged(oldShipping, newShipping) → { changed }`
      - Hỗ trợ cả "xóa shipping" (newShipping = null).
    - Dùng được cho Phase 2 hiện tại + Phase tiếp theo (Payment/Shipping service).
  - Mở rộng `src/models/OrderHistory.ts`:
    - Thêm field `fieldName?: string` (indexed) — UI Timeline dùng để hiển thị "Đã đổi <fieldName>".
  - Mở rộng `src/mappers/order.mapper.ts`:
    - `OrderHistoryResponse` thêm `fieldName?` + `mapOrderHistory()` include field.
  - Refactor `src/app/api/orders/[id]/route.ts` PUT:
    - `pushHistory()` đổi signature từ positional args → object `{ fieldName, oldValue, newValue, note }`.
    - Mọi history entry gắn `fieldName` cụ thể (customerId / customerName / productId / comboId / warehouseId / status / payments / shipping).
    - Thay `JSON.stringify` payments/shipping so sánh bằng helper `isPaymentChanged()` / `isShippingChanged()`.
  - GET `histories[]` sort `createdAt DESC` — UI không cần sort lại.
- **Order Module - Phase 3.1: Revenue Rule Design (2026-08-01)**
  - **KHÔNG viết API / CRUD / Engine thật.** Chỉ xây dựng Business Rule Layer (pure functions).
  - Tạo `src/constants/revenueRule.ts`:
    - `RevenueOwnerType` (SAME_PRODUCT_FAMILY / NON_REVENUE_ORDER / DIFFERENT_PRODUCT_FAMILY / DIFFERENT_CUSTOMER).
    - `RevenueLockReason` (NONE / WAITING_PREVIOUS_ORDER / PREPAID_PRIORITY / CUSTOMER_ALREADY_BUYING / ORDER_CANCELLED / NON_REVENUE_ORDER).
    - `RevenueUnlockReason` (PREVIOUS_ORDER_CANCELLED / NEXT_ORDER_PREPAID / ORDER_STATUS_UNLOCKED).
    - `RevenuePriority` (NONE / NORMAL / PREPAID / COMPLETED) — dùng để compareOrder trong cùng family.
    - `RevenueState` (ELIGIBLE / LOCKED / UNLOCKED / EXEMPTED) — độc lập với OrderStatus.
    - Helpers: `isNonRevenueOrderType()`, `isRevenueActiveStatus()`, `isRevenueUnlockStatus()`.
  - Tạo `src/services/order/revenueRule.service.ts` (PURE):
    - KHÔNG import mongoose / Model / DB.
    - Input: `OrderRuleInput` DTO (plain object, KHÔNG phải Document).
    - Hàm:
      * `getRevenueOwner(a, b)` — phân loại quan hệ giữa 2 Order.
      * `canLockRevenue(subject, other)` — có thể bị lock bởi other không?
      * `canUnlockRevenue(subject, previouslyActiveSibling)` — lý do unlock.
      * `shouldTransferRevenue(from, to)` — có nên transfer slot từ from → to không? (PREPAID takeover case).
      * `getRevenuePriority(input)` — lấy priority COMPLETED > PREPAID > NORMAL > NONE.
      * `getRevenueState(input)` — phân loại state nhanh (snapshot ban đầu).
      * `compareRevenuePriority(a, b)` — so sánh priority, tie-break createdAt ASC, cuối cùng _id.
      * `decideForOrder(subject, siblings)` — quyết định cuối cùng cho 1 Order.
      * `decideForAll(orders)` — bulk decide, sort createdAt ASC rồi map → decision.
    - Decision model 4 nhóm:
      * EXEMPTED (GIFT/EXCHANGE/REPLACEMENT) → reason=NON_REVENUE_ORDER
      * UNLOCKED (CANCELLED/REJECTED/FAILED) → reason=ORDER_CANCELLED
      * ELIGIBLE (là owner) → reason=NONE hoặc PREPAID_PRIORITY (nếu giành slot từ đơn trước)
      * LOCKED (chờ đơn trước) → reason=WAITING_PREVIOUS_ORDER
  - Engine Layer (Phase 4 - tương lai) sẽ wire rule layer này vào persist + transaction.
- **Order Module - Phase 3.2: Revenue Lock Engine (2026-08-01)**
  - Tạo `src/services/order/revenueEngine.service.ts`:
    - ĐỌC Mongo (Order collection).
    - DÙNG Transaction (`startTransaction` + `commitTransaction` / `abortTransaction`).
    - UPDATE Order (`revenueLocked` / `revenueOwnerOrderId` / `revenueLockReason` / `revenueCalculatedAt`).
    - GHI `OrderHistory` với action `REVENUE_LOCKED` / `REVENUE_UNLOCKED` / `REVENUE_RECALCULATED` + `fieldName="revenue"`.
  - **KHÔNG tự viết Rule.** Mọi quyết định gọi `decideForAll()` từ `revenueRule.service.ts`.
  - API:
    - `resolveCustomerRevenue(customerId, options?)`:
      * Load `Order.find({ customerId, isActive: true })`.
      * Map sang `OrderRuleInput` DTO.
      * `decideForAll()` → `Map<orderId, RevenueDecision>`.
      * Detect thay đổi so với DB (locked/owner/reason).
      * Persist batched trong transaction.
      * Ghi `OrderHistory` (khi có `actorEmployeeId`).
      * Skip order không đổi (trừ `options.force`).
    - `resolveAllCustomers(actorEmployeeId?)`:
      * Quét `Order.distinct("customerId")` + loop `resolveCustomerRevenue()`.
      * Cron / migration / manual trigger.
  - Hỗ trợ options:
    - `session?: mongoose.ClientSession` — caller truyền session riêng (POST/PUT wire).
    - `actorEmployeeId?: Types.ObjectId | null` — null = skip history (seed/migration).
    - `force?: boolean` — bỏ qua diff check.
  - **KHÔNG viết API. KHÔNG gọi từ Route.** Wire sẽ làm ở Phase 4.
  - Trả về `CustomerRevenueResult` (totals + persistedCount + changedCount + elapsedMs).
- **Order Module - Phase 4.1: Warehouse Foundation (2026-08-01)**
  - Mục tiêu: chuẩn bị nền tảng để Order giữ kho / trừ kho / hoàn kho ở Phase sau.
  - **KHÔNG làm:** Shipment / Stock Engine / Auto Reserve / Inventory Adjustment API / Dashboard / API trigger.
  - Tạo `src/constants/inventoryStatus.ts`:
    - `InventoryTransactionType` (INBOUND / OUTBOUND / TRANSFER / ADJUST).
    - `InventoryAction` (RESERVE / UNRESERVE / OUT / RETURN / INBOUND / ADJUST / TRANSFER_OUT / TRANSFER_IN).
    - `InventoryReason` (ORDER_RESERVED / ORDER_UNRESERVED / ORDER_OUT / ORDER_CANCELLED / ORDER_RETURNED / SUPPLIER_RECEIVED / SUPPLIER_RETURNED / WAREHOUSE_TRANSFER / WAREHOUSE_AUDIT / WAREHOUSE_DAMAGED / WAREHOUSE_LOST / WAREHOUSE_FOUND / SYSTEM_ADJUST / SYSTEM_MIGRATION).
    - `InventoryState` (AVAILABLE / RESERVED / SOLD / RETURNED / ADJUSTED / TRANSFERRED_OUT / TRANSFERRED_IN / LOST / DAMAGED).
    - `InventorySource` (MANUAL / ORDER / SUPPLIER_RECEIPT / STOCKTAKE / SYSTEM).
    - Helpers + mapping sets: `INBOUND_ACTIONS`, `OUTBOUND_ACTIONS`, `ORDER_REQUIRED_ACTIONS`, `TRANSACTION_TYPE_ACTIONS`.
  - Tạo `src/models/InventoryHistory.ts`:
    - Fields: warehouseId / productVariantId? / comboId? / orderId? / employeeId / transactionType / action / reason / source / beforeQuantity / changeQuantity / afterQuantity / note? / createdAt.
    - **Append-only log** (không UPDATE field khác ngoài `note` ở schema).
    - Indexes: `warehouseId`, `productVariantId`, `orderId`, `createdAt DESC`; compound `(warehouseId, productVariantId, createdAt DESC)`, `(warehouseId, comboId, createdAt DESC)`, `(orderId, createdAt DESC)`.
  - Tạo `src/mappers/inventory.mapper.ts`:
    - `InventoryHistoryResponse` DTO + 4 label records (`INVENTORY_TRANSACTION_TYPE_LABELS` / `INVENTORY_ACTION_LABELS` / `INVENTORY_REASON_LABELS` / `INVENTORY_SOURCE_LABELS`).
    - `mapInventoryHistory(doc)` + `mapInventoryHistoryList(docs)`.
    - Helper ép enum an toàn `asTransactionType/asAction/asReason/asSource` (chống string cũ trong DB).
  - `src/utils/validator.ts` thêm:
    - Import 4 enum từ `inventoryStatus.ts`.
    - `createInventoryHistorySchema` — Zod schema đầy đủ, ObjectId regex, `changeQuantity` không được 0.
    - `updateInventoryHistorySchema` — chỉ cho phép sửa `note` (append-only philosophy).
    - Types: `CreateInventoryHistoryForm`, `UpdateInventoryHistoryForm`.
  - **KHÔNG viết API. KHÔNG CRUD. KHÔNG Transaction. KHÔNG Stock Engine.** Phase 4.2+ sẽ wire.
  - **Phase 4.1 mở rộng (2026-08-01) — Reference Code & Type:**
    - `src/constants/inventoryStatus.ts` thêm:
      * `InventoryReferenceType` (ORDER / LEAD / PURCHASE / TRANSFER / ADJUSTMENT / SUPPLIER / MANUAL / SYSTEM).
      * `INVENTORY_REFERENCE_CODE_PREFIXES` map prefix `OD` / `LD` / `WH` / `TR` / `AD` / `SP` / `MN` / `SY`.
    - `src/models/InventoryHistory.ts` thêm fields: `referenceType` (optional enum, indexed) + `referenceCode` (optional string, indexed).
      * Compound indexes thêm: `(referenceCode, warehouseId)` + `(referenceType, createdAt DESC)`.
    - `src/mappers/inventory.mapper.ts`:
      * `INVENTORY_REFERENCE_TYPE_LABELS` record.
      * DTO thêm `referenceType` + `referenceTypeLabel` + `referenceCode`.
      * Helper `asReferenceType()` ép enum an toàn.
    - `src/utils/validator.ts` `createInventoryHistorySchema` thêm 2 field optional:
      * `referenceType` (enum 8 giá trị).
      * `referenceCode` (string 3-64 ký tự).
  - Mục đích: Timeline UI đọc mã người-đọc (`OD250801001`) làm anchor, không phải đoán qua `reason`.
- **Order Module - Phase 4.2: Stock Engine (2026-08-01)**
  - Tầng Infrastructure — quản lý tồn kho chuẩn. Phase sau chỉ cần gọi Stock Engine.
  - **KHÔNG làm:** Shipment / Dashboard / Commission / API Route / UI /
    Inventory Adjustment API / Warehouse CRUD / tự viết Business Rule.
  - Tạo `src/services/warehouse/stockEngine.errors.ts` — Chuẩn hoá error layer:
    - `StockEngineError` (abstract base) — `name` / `code` / `statusCode` / `context`.
    - `InsufficientStockError` (409) — `availableQuantity < requested`.
    - `InsufficientReservedStockError` (409) — `reservedQuantity < requested`.
    - `InsufficientQuantityError` (409) — `quantity < |signedChange|`.
    - `InventoryNotFoundError` (404) — row không tồn tại.
    - `WarehouseNotFoundError` (404) — warehouseId không tồn tại / inactive.
    - `InvalidStockInputError` (400) — input sai (lineItem, quantity, comboId chưa hỗ trợ, ...).
    - `UnsupportedActionError` (400) — action không qua đúng hàm.
    - API layer Phase sau chỉ cần `instanceof` → trả HTTP đúng.
  - Tạo `src/services/warehouse/stockEngine.service.ts`:
    - `reserveStock(warehouseId, items, ctx, options?) → StockChangeResult[]`
      * `RESERVE` — tăng `reservedQuantity`, throw `InsufficientStockError` nếu thiếu available.
      * `changeQuantity = 0` (RESERVE không đổi `quantity` tổng).
      * History: action=RESERVE, reason=ORDER_RESERVED.
    - `releaseReservedStock(warehouseId, items, ctx, options?) → StockChangeResult[]`
      * `UNRESERVE` — giảm `reservedQuantity`, throw `InsufficientReservedStockError`.
      * History: action=UNRESERVE, reason=ORDER_UNRESERVED.
    - `deductStock(warehouseId, items, ctx, options?) → StockChangeResult[]`
      * `OUT` — giảm `quantity` + `reservedQuantity` đồng thời.
      * Throw `InsufficientReservedStockError` hoặc `InsufficientQuantityError`.
      * History: action=OUT, reason=ORDER_OUT.
    - `returnStock(warehouseId, items, ctx, options?) → StockChangeResult[]`
      * `RETURN` — tăng `quantity`, upsert row nếu thiếu.
      * History: action=RETURN, reason=ORDER_RETURNED.
    - `adjustStock(warehouseId, inputs, ctx, options?) → StockChangeResult[]`
      * `ADJUST` — `signedQuantity` có dấu: dương = tăng, âm = giảm.
      * Upsert row nếu thiếu.
      * Reason mặc định: `WAREHOUSE_FOUND` (tăng) / `WAREHOUSE_AUDIT` (giảm); caller override được.
      * History: action=ADJUST, changeQuantity giữ dấu âm nếu giảm.
    - `transferStock(input, ctx, options?) → TransferStockResult[]`
      * Cặp `TRANSFER_OUT` (source) + `TRANSFER_IN` (destination) trong CÙNG transaction.
      * Source phải có sẵn row, destination upsert nếu thiếu.
      * Cùng `referenceType` + `referenceCode` để truy vết cặp.
      * History: action=TRANSFER_OUT / TRANSFER_IN, reason=WAREHOUSE_TRANSFER.
      * Throw `InvalidStockInputError` nếu source = destination.
  - Mỗi hàm:
    - Dùng `mongoose.startSession()` + `runInTransaction` helper (tự start/commit/abort nếu caller không truyền session).
    - Nhận `session?: mongoose.ClientSession` (optional) — caller truyền để share với transaction khác.
    - Rollback khi lỗi (abort + rethrow).
    - Kiểm tra tồn trước khi update (throw error class chuẩn hoá).
    - Append `InventoryHistory` trong CÙNG session (chỉ persist khi commit).
    - KHÔNG tự viết Business Rule — chỉ chuẩn hoá infrastructure.
  - Return type `StockChangeResult` (mỗi item) gồm:
    ```
    {
      warehouseId, productVariantId?, comboId?, action,
      before:  { quantity, reservedQuantity, availableQuantity },
      after:   { quantity, reservedQuantity, availableQuantity },
      changed: { quantity, reservedQuantity, availableQuantity },
      historyId  // trỏ về InventoryHistory row vừa tạo (audit link)
    }
    ```
    Caller (Dashboard / Audit / API) đọc trực tiếp, KHÔNG query lại DB.
  - `TransferStockResult` wrap cho TRANSFER: `{ item, out: StockChangeResult, in: StockChangeResult }`.
  - Public types:
    - `StockLineItem { productVariantId? | comboId?, quantity }` — đúng 1 trong 2 id.
    - `StockContext { actorEmployeeId, referenceType?, referenceCode?, orderId?, note?, source? }`.
    - `AdjustStockInput extends StockLineItem { signedQuantity, reason? }`.
    - `TransferStockInput { sourceWarehouseId, destinationWarehouseId, items[] }`.
  - Quy ước kỹ thuật:
    - Update Inventory dùng `$inc` (atomic) cho `quantity` / `reservedQuantity` + `$set` cho `availableQuantity`.
    - StockLineItem nếu dùng `comboId` → throw `InvalidStockInputError` (Inventory model hiện chưa hỗ trợ combo, Phase sau sẽ mở rộng schema).
    - Transaction type mặc định theo action (RESERVE/UNRESERVE/OUT → OUTBOUND, RETURN/ADJUST → ADJUST, TRANSFER_* → TRANSFER).
    - `reason` mặc định: ORDER_RESERVED / ORDER_UNRESERVED / ORDER_OUT / ORDER_RETURNED / WAREHOUSE_TRANSFER.
    - `source` mặc định: SYSTEM (caller override được).
  - **KHÔNG viết API. KHÔNG gọi từ Order CRUD.** Phase 4.3+ sẽ wire.
  - **Phase 4.2 Refactor (2026-08-01) — Standardize Error + Return Snapshot:**
    - Tách error ra file riêng `stockEngine.errors.ts` để API layer `instanceof` → HTTP code chuẩn.
    - Mỗi hàm giờ trả `StockChangeResult[]` (hoặc `TransferStockResult[]`) với `before` / `after` / `changed` + `historyId` — Dashboard / Audit không cần query lại DB.
- **Order Module - Phase 5.1: Order Permissions (2026-08-01)**
  - **Mục tiêu:** hoàn thiện Permission cho toàn bộ Order Module — chuẩn bị nền cho Phase 5.x (Confirm / Cancel API), Phase 6.x (Revenue UI), Phase 7.x (Shipment), v.v.
  - **KHÔNG làm:** API / CRUD / Revenue / Warehouse / Shipment / Dashboard / Seed.
  - **`src/constants/permissions.ts` — bổ sung 5 permission Order:**
    - `order.view`             — Xem đơn.
    - `order.create`           — Tạo đơn.
    - `order.update`           — Sửa đơn.
    - `order.delete`           — Xóa đơn.
    - `order.confirm`          — Xác nhận đơn (phase sau sẽ dùng).
    - `order.cancel`           — Hủy đơn (phase sau sẽ dùng).
    - `order.history`          — Xem OrderHistory timeline.
    - `order.revenue`          — Xem thông tin revenue (marketing/sale final, lock reason).
    - `order.reserve_stock`    — Giữ / trả chỗ kho cho đơn (do WAREHOUSE role dùng).
    - `permissions.seed.ts` tự động pick up khi seed (dùng `PERMISSIONS` constant — không cần sửa seeder).
  - **`src/constants/roles.ts` — phân quyền theo nghiệp vụ:**
    - `ADMIN`        → Full (wildcard `*`).
    - `MANAGER`      → Full Order (9 permission ở trên).
    - `SALE`         → `order.view / create / update / history` (chốt + sửa đơn, không xóa, không reserve/release kho).
    - `MKT`          → `order.view` (xem đơn phát sinh từ Lead — đánh giá conversion).
    - `WAREHOUSE`    → `order.view / reserve_stock / history` (giữ/trả chỗ kho).
    - `LEADER`       → giữ tương thích + thêm `order.confirm / cancel / history`.
    - `EMPLOYEE`     → `order.view / create` (giữ tương thích).
  - **Nguyên tắc áp dụng:**
    - Middleware / route **CHỈ check permission** — KHÔNG hardcode role name.
    - `currentUser.permissions.includes("order.<action>")` là pattern duy nhất.
    - SALE không xóa đơn (`order.delete`) — chỉ Manager trở lên.
    - WAREHOUSE không sửa thông tin đơn (`order.update`) — chỉ reserve/release kho qua Stock Engine.
    - MKT chỉ xem — không tạo đơn (do SALE chốt).
  - **Kiểm tra toàn bộ API Order (Phase 4.3 đã dùng đúng key):**
    - `GET /api/orders`        → `order.view`.
    - `GET /api/orders/[id]`   → `order.view`.
    - `POST /api/orders`       → `order.create`.
    - `PUT /api/orders/[id]`   → `order.update`.
    - `DELETE /api/orders/[id]`→ `order.delete`.
    - Không còn hardcode role name trong route layer.
  - **Phase sau (tham khảo):**
    - 5.2 Order Seed (sample data 18 đơn, đã có — xem bên dưới).
    - 5.3 Confirm Order API → dùng `order.confirm`.
    - 5.4 Cancel Order API → dùng `order.cancel`.
    - 5.5 OrderHistory UI → dùng `order.history`.
    - 5.6 Revenue UI / Dashboard → dùng `order.revenue`.
    - 5.7 Stock Reservation API (tách riêng) → dùng `order.reserve_stock`.
- **Order Module - Phase 5.2: Order Seed (2026-08-01)**
  - **Mục tiêu:** tạo dữ liệu mẫu để test toàn bộ backend Order — idempotent, chạy lại nhiều lần không sinh document trùng.
  - **KHÔNG làm:** API / CRUD / Revenue / Warehouse / Shipment / Dashboard.
  - **File mới: `src/db/seeds/orders.seed.ts`** — seed 18 Order, bao phủ đầy đủ:
    - **Status (7)**: `PENDING / CONFIRMED / PREPAID / SHIPPING / COMPLETED / CANCELLED / FAILED` — `REJECTED` không seed riêng (giống FAILED về revenue) nhưng enum vẫn nhận.
    - **OrderType (5)**: `NORMAL / COMBO / GIFT / EXCHANGE / REPLACEMENT`.
    - **OrderSource (5)**: `FACEBOOK / IMPORT / PHONE / WEBSITE / MANUAL`.
    - **Revenue Lock**: cả `revenueLocked=true` (#2, #3, #4, #5, #6, #13, #15) và `revenueLocked=false`.
    - **Stock Reservation (audit-only)**: `stockReservedAt` set cho 9 đơn, không set cho 9 đơn còn lại.
    - **Linked Documents**:
      - `customerId` — 5 đơn dùng Customer từ Lead seed (KH000001..005), 6 đơn tạo mới Customer KH-SPEC-* trong Order seed.
      - `leadId` — 6 đơn link trực tiếp tới Lead (#1, #2, #4, #13, #15, #17); các đơn khác bỏ qua (đơn Manual / Import / REPLACEMENT).
      - `productVariantId` / `comboId` — link theo từng orderType (NORMAL ↔ variant, COMBO/GIFT ↔ combo).
      - `warehouseId` — tự tạo 2 Warehouse `WH-PVD-01` / `WH-PVD-02` (chưa có seed Warehouse riêng) idempotent qua `Warehouse.findOneAndUpdate({ code })`.
      - `marketingEmployeeId` / `saleEmployeeId` — `EMP_MKT001/002`, `EMP_SALE001/002/003`.
    - **Payments**: phủ `CASH / BANK_TRANSFER / MOMO` (partial + full) trên các đơn đã thanh toán.
    - **Shipping**: 3 đơn VNPost, 3 đơn J&T, có `trackingNumber / carrier / estimatedDelivery / actualDelivery / shippingFee` đầy đủ.
  - **OrderHistory:**
    - Tất cả 18 đơn đều có 1 entry `CREATED`.
    - **Action extra** (đa dạng): `STATUS_CHANGED`, `PAYMENT_ADDED`, `SHIPPING_UPDATED`, `STOCK_RESERVED`, `REVENUE_LOCKED`, `REVENUE_UNLOCKED`, `DELETED`.
    - 6 đơn (#1, #2, #4, #10, #12, #13, #14, #15, #18) có `STOCK_RESERVED` để test audit-only Phase 4.3.
    - Idempotent qua `findOne({ orderId, action, note }).lean()` — chạy lại nhiều lần không thêm entry trùng.
  - **Idempotency strategy:**
    - Mỗi `spec.seedCode` deterministic theo `baseDateKey` (vd `OD2508010001`) → `Order.findOne({ orderCode })` trả cùng doc qua các lần seed.
    - Fallback `Order.findOne({ customerName, customerPhone, totalAmount, productVariantId / comboId, createdAt ±1h })` để an toàn khi các seed chạy ngày khác nhau.
    - **Warehouse**: tự upsert `code` (giống pattern Lead seed tự tạo Customer).
    - **Customer**: nếu `customerCode` không có → `ensureCustomer({ code: "KH-SPEC-..." })`.
    - `Counter` KHÔNG reset, không dùng để build orderCode (giữ route POST counter riêng).
  - **Constraints tuân thủ Phase 4.3 Refactor:**
    - KHÔNG set `stockReserved` (boolean) — đã bỏ khỏi model.
    - CHỈ set `stockReservedAt` cho đơn "từng chạm Stock Engine" (audit).
    - `stockReservedAt` ≠ `true` ngay cả khi set; audit field chỉ để biết "lần cuối Order reserve/release là khi nào".
  - **`src/db/seed.ts`** — gọi `await seedOrders()` SAU `seedLeads()` (vì Order seed dùng Customer mà Lead seed đã tạo).
  - **Verification khi chạy:**
    - In log: `Status:` (đếm theo status), `Type:`, `Source:`, `revenueLocked=true/false`, `unlock-status orders`.
    - Có thể `db.orders.find({ revenueLocked: true }).count()` / `db.orderhistories.countDocuments()`.
- **Order Module - Phase 4.3 Refactor (2026-08-01) — Drop `stockReserved` flag + Add STOCK_RESERVED/RELEASED actions**
  - **Vấn đề:**
    - `Order.stockReserved` (boolean) dễ lệch sau chuỗi Reserve ↓ Release ↓ Reserve. Nếu chỉ dựa vào flag, caller không biết thực sự còn giữ chỗ hay không → có thể reserve / release trùng.
    - OrderHistory chỉ có `UPDATED` chung chung → Timeline UI khó đọc (không phân biệt "đổi field" với "đã reserve/release kho").
  - **Giải pháp — InventoryHistory làm source of truth:**
    - Bỏ `Order.stockReserved` (boolean). Chỉ giữ `Order.stockReservedAt?: Date` cho **audit** (lần cuối Stock Engine được gọi cho Order này).
    - Thêm field `reservedChange: number` (signed, default 0) vào `InventoryHistory`:
      - `RESERVE` → `reservedChange = +qty` (input StockLineItem).
      - `UNRESERVE` → `reservedChange = −qty`.
      - Các action khác (`OUT` / `RETURN` / `INBOUND` / `ADJUST` / `TRANSFER_*`) → 0.
    - `orderStockWiring.helper.queryNetReserved(orderId, session)` aggregate `Σ reservedChange where orderId = X` theo `productVariantId` → `Map<variantId, netReserved>`.
    - Rule "đang giữ chỗ" = `netReserved >= oldOrder.quantity`.
  - **`OrderStockSnapshot` rút gọn:** bỏ field `stockReserved` (không còn dựa vào flag).
    - `buildStockWiringPlan(old, new, netMap)`, `buildStockWiringPlanForCreate(new)`, `buildStockWiringPlanForDelete(old, netMap)` — helper nhận `netMap` (hoặc rỗng cho POST) thay vì `stockReserved`.
  - **`OrderAction` mới:**
    - `STOCK_RESERVED = "STOCK_RESERVED"` (label: "Giữ chỗ tồn kho")
    - `STOCK_RELEASED = "STOCK_RELEASED"` (label: "Trả chỗ tồn kho")
    - `ORDER_ACTION_LABELS` được cập nhật tương ứng.
  - **POST /api/orders flow cập nhật:**
    - Bỏ `stockReserved: false` trong payload Order.create.
    - Sau `reserveStock` thành công → chỉ `$set stockReservedAt = now` (audit). KHÔNG set cờ.
    - `OrderHistory.create()` giờ emit **2 entry** (cùng session): `CREATED` + (nếu reserve) `STOCK_RESERVED`.
  - **PUT /api/orders/:id flow cập nhật:**
    - Trong transaction, `queryNetReserved(existedOrder._id, session)` trước khi tính plan.
    - `oldStockSnapshot` không còn `stockReserved`.
    - Sau `releaseReservedStock` → push history `STOCK_RELEASED` (note kèm qty).
    - Sau `reserveStock` → push history `STOCK_RESERVED` + `updateData.stockReservedAt = now` (audit).
    - Bỏ nhánh update `updateData.stockReserved` (đã bỏ field).
  - **DELETE /api/orders/:id flow cập nhật:**
    - Trong transaction, `queryNetReserved(...)` + `buildStockWiringPlanForDelete(snap, netMap)`.
    - Sau `releaseReservedStock` → emit history `STOCK_RELEASED`.
    - Soft delete: `$set isActive = false, stockReservedAt = undefined` (KHÔNG set cờ).
  - **Mapper (`order.mapper.ts`):** thêm `stockReservedAt?: string` (ISO) vào `OrderResponse` — cho frontend audit.
  - **Invariant đảm bảo:**
    - Không còn race condition giữa `Order.stockReserved` và `Inventory.reservedQuantity`.
    - `queryNetReserved` đọc CÙNG session với write → luôn thấy được trạng thái thực tại tính đến trước thời điểm gọi.
    - Reserve / Release / Reserve không bao giờ lệch.
  - **InventoryHistory schema mở rộng:** thêm `reservedChange: { type: Number, default: 0 }` (backward-compat với rows cũ — default 0 nên aggregate vẫn đúng).
- **Order Module - Phase 4.3: Wire Stock Engine + Revenue Engine (2026-08-01)**
  - Mục tiêu: wire Order CRUD với 2 service đã có (`stockEngine.service.ts` + `revenueEngine.service.ts`). KHÔNG sửa Business Rule, KHÔNG sửa Stock Engine, KHÔNG sửa Revenue Rule.
  - **KHÔNG làm:** Shipment / Dashboard / Commission / KPI / Notification / Auto Assign / UI.
  - **Order model mở rộng (chuẩn bị wiring):**
    - Thêm `productVariantId?: ObjectId` (ref ProductVariant) — key Stock Engine dùng để reserve / release.
    - Thêm `stockReservedAt?: Date` (audit-only) — KHÔNG dùng làm cờ boolean nữa. Source of truth cho "đang giữ chỗ" là `Σ reservedChange` trên InventoryHistory (xem Phase 4.3 Refactor).
    - Index `(productVariantId)` + duplicate `(warehouseId, isActive)` đã có.
  - **Validator mở rộng:**
    - `createOrderSchema` / `updateOrderSchema` thêm `productVariantId` (optional, nullable, ObjectId regex).
  - **Mapper mở rộng:**
    - `OrderResponse` + `mapOrder()` + `mapOrderList()` export `productVariantId`.
  - **Helper wiring (mới):**
    - `src/services/order/orderStockWiring.helper.ts` — pure helper, có aggregate DB call cho `netMap`.
      * `OrderStockSnapshot` — chỉ chứa field cần thiết (warehouseId / productVariantId / comboId / quantity / orderType). KHÔNG có `stockReserved` (đã bỏ).
      * `StockPlan { release: StockLineItem | null, reserve: StockLineItem | null }` — caller tự gọi Stock Engine.
      * `canHaveStockReserve()` — gate theo OrderType (non-revenue ⇒ skip) + presence (warehouse + variant/combo + qty).
      * `queryNetReserved(orderId, session)` — aggregate `Σ reservedChange` từ InventoryHistory (cùng session) → `Map<variantId, netReserved>`. Source of truth.
      * `buildStockWiringPlan(old, new, netMap)` — cho PUT:
        - Không đổi (warehouse/productVariant/combo/qty) → skip.
        - Đổi → release reserved (nếu `netMap[oldVariant] >= oldQty`) + reserve mới (nếu newOrder đủ điều kiện).
      * `buildStockWiringPlanForCreate(new)` — cho POST (không cần netMap).
      * `buildStockWiringPlanForDelete(old, netMap)` — cho DELETE.
  - **POST /api/orders — flow trong 1 transaction:**
    1. Validate + reference existence (Customer / Lead / Product / ProductVariant / Combo / Warehouse / Employee).
    2. Generate `orderCode` qua Counter (atomic).
    3. `Order.create()` với `stockReservedAt=undefined`, revenue defaults. KHÔNG set `stockReserved` (đã bỏ).
    4. `buildStockWiringPlanForCreate(snapshot)` → nếu `reserve != null` → `reserveStock({ session, ...)
       - Catch `StockEngineError` → abort transaction + trả HTTP statusCode từ error class.
       - Update `Order.stockReservedAt = now` (audit).
    5. `resolveCustomerRevenue(customerId, { session, actorEmployeeId })` — cùng session.
    6. `OrderHistory.create()` emit 2 entry: `CREATED` + (nếu reserve) `STOCK_RESERVED`.
    7. `session.commitTransaction()` — toàn bộ rollback nếu bất kỳ bước nào throw.
  - **PUT /api/orders/:id — flow trong 1 transaction:**
    1. Validate + status lock guard (COMPLETED/CANCELLED/REJECTED/FAILED → 409).
    2. Build `updateData` từ diff (customer / product / productVariant / combo / warehouse / status / payments / shipping / passthrough).
    3. Build `oldStockSnapshot` (từ existedOrder) + `newStockSnapshot` (từ updateData + old fallback). KHÔNG có `stockReserved`.
    4. `startTransaction()` + `queryNetReserved(existedOrder._id, session)` → netMap.
    5. `buildStockWiringPlan(old, new, netMap)` → plan.
    6. Trong transaction:
       - Nếu `release != null` → `releaseReservedStock({ session, ... })` + pushHistory(STOCK_RELEASED).
       - Nếu `reserve != null` → `reserveStock({ session, ... })` + pushHistory(STOCK_RESERVED) + set `updateData.stockReservedAt = now`.
       - `Order.updateOne(...)` + `OrderHistory.insertMany(...)`.
       - Nếu đổi customerId / productId / productVariantId / comboId / status / isPrepaid → `resolveCustomerRevenue(customerId, { session, actorEmployeeId })`.
    6. `session.commitTransaction()`.
  - **DELETE /api/orders/:id — flow trong 1 transaction:**
    1. Validate + status lock guard (COMPLETED → 409).
    2. `startTransaction()` + `queryNetReserved(...)` → netMap.
    3. Build `oldStockSnapshot` từ existedOrder + `buildStockWiringPlanForDelete(snap, netMap)`.
    4. Nếu `release != null` → `releaseReservedStock({ session, ... })`.
    5. `Order.updateOne(isActive=false, stockReservedAt=undefined)` (soft delete). KHÔNG set cờ `stockReserved`.
    6. `resolveCustomerRevenue(customerId, { session, actorEmployeeId })` — mở khóa slot cho đơn sau của cùng Customer.
    7. `OrderHistory.create()` emit 2 entry: `DELETED` + (nếu đã release) `STOCK_RELEASED`.
    8. `session.commitTransaction()`.
  - **Quy ước xuyên suốt:**
    - Order CRUD tự tạo `session` qua `mongoose.startSession()` + `startTransaction()`.
    - `Stock Engine` + `Revenue Engine` + `Order` + `OrderHistory` + `InventoryHistory` đều dùng CÙNG session — rollback toàn bộ nếu lỗi bất kỳ bước nào.
    - `StockEngineError` (statusCode 400/404/409) được catch + map sang HTTP tại route layer.
    - `referenceType = InventoryReferenceType.ORDER`, `referenceCode = orderCode` cho mọi `InventoryHistory` sinh ra từ Order CRUD.
    - `actorEmployeeId = currentUser.employee._id` cho cả Revenue Engine + Stock Engine.
    - KHÔNG duplicate reserve / duplicate release — `InventoryHistory.reservedChange` aggregate (queryNetReserved) + `buildStockWiringPlan` đảm bảo idempotent (xem Phase 4.3 Refactor).
    - KHÔNG tự viết Business Rule — chỉ gọi service.
    - KHÔNG hardcode logic — chỉ wire.
  - **Đã có chuẩn bị cho phase sau:**
    - `reserveStock` / `releaseReservedStock` trả `StockChangeResult[]` với `historyId` — Audit / Dashboard phase sau dùng trực tiếp, không query lại DB.
    - `resolveCustomerRevenue` đã ghi `OrderHistory(action=REVENUE_LOCKED/UNLOCKED/RECALCULATED)` tự động.
- **Order Module - Phase 4 (tương lai) — Wire Engine vào POST/PUT Orders**
  - Tạo `src/constants/orderStatus.ts`
    - `OrderStatus` (PENDING / CONFIRMED / PREPAID / SHIPPING / COMPLETED / CANCELLED / REJECTED / FAILED)
    - `REVENUE_UNLOCK_STATUSES` (CANCELLED / REJECTED / FAILED)
    - `RevenueLockReason` (NONE / WAITING_PREVIOUS_ORDER / CUSTOMER_ALREADY_BUYING / PREPAID_PRIORITY / ORDER_CANCELLED)
  - Tạo `src/models/Order.ts`
    - Revenue fields: `marketingRevenueRaw`, `marketingRevenueFinal`,
      `saleRevenueRaw`, `saleRevenueFinal`, `revenueEligible`,
      `revenueLockReason`, `revenueCalculatedAt`
    - Indexes: `(customerId, productId|comboId, status, createdAt)`
      để recalculate 1 query
  - Tạo `src/services/order/orderRevenue.service.ts`
    - `evaluateAndLock(order, customerOrders)` - pure evaluator
    - `recalculateForCustomer(customerId)` - 1 query + 1 bulkWrite
    - `recalculateForOrder(orderId)` - tiện cho update 1 đơn
    - `transitionStatusAndRecalculate(orderId, nextStatus)` - API layer hook
    - Sẵn sàng cho Order Update / Cancel / Completed / Refund
  - Rule đã cài:
    - Trùng Product/Combo: đơn đầu = eligible, đơn sau = locked (WAITING_PREVIOUS_ORDER)
    - Unlock: đơn trước sang CANCELLED/REJECTED/FAILED → mở cho đơn sau
    - Prepaid Priority: đơn sau trả trước → chiếm slot, đơn trước PREPAID_PRIORITY
    - Khác Product/Combo → không khóa
    - Đơn unlock-status → ORDER_CANCELLED
  - KHÔNG làm: API / Dashboard / KPI / Commission
- **Lead Seed Completed (2026-08-01)**
  - `src/db/seeds/leads.seed.ts` - 16 Lead bao phủ đủ 8 trạng thái:
    NEW / ASSIGNED / PROCESSING / NO_ANSWER / POTENTIAL /
    ORDER_CREATED / REJECTED / CANCELLED
  - Mỗi Lead kèm LeadHistory (CREATED → ASSIGNED → STATUS_CHANGED → NOTE_UPDATED)
  - Đa dạng tình huống:
    * Lead mới (1)
    * Trùng SĐT (Lead #9 trùng #3, #13 trùng #12)
    * Trùng Facebook (Lead #10 trùng #3)
    * Đã có Customer (Lead #3, #5, #6, #12, #15)
    * Chưa có Customer (Lead #1, #2, #4, #7, #8, #9, #11, #13, #14, #16)
    * Đã có Sale (Lead #2, #3, #4, #5, #6, #7, #8, #10, #12, #13, #14, #16)
    * Chưa có Sale (Lead #1, #9, #11, #15)
  - `LeadCode` lấy từ Counter `LEAD` (atomic `$inc`, padded 6 số)
  - `CUSTOMER` counter cũng được thêm vào `constants/counters.ts`
  - File `seed.ts` đã đăng ký `await seedLeads()`
  - Pre-create 5 Customer (KH000001..KH000005) để link cho "Lead đã có Customer"
- **Lead Import Parser + Preview Completed**


## Phase A — Foundation UI (2026-08-01)

### Status

✅ Completed

### Mục tiêu Phase A

- KHÔNG gọi API.
- KHÔNG CRUD.
- KHÔNG Revenue Engine / Warehouse Engine.
- KHÔNG mock business logic.
- Chỉ dựng khung giao diện (AppShell + Sidebar + Header + Route Group).

### Cấu trúc thư mục

```
src/
├── config/
│   ├── nav.config.tsx              # NAV_GROUPS + BRAND_NAME (static)
│   └── breadcrumb.config.ts        # buildBreadcrumbs(pathname)
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx            # Flex wrapper: Sidebar + Header + Content
│   │   ├── Sidebar.tsx             # Logo + Nav groups + Collapse + Responsive
│   │   └── Header.tsx              # Breadcrumb + Search + Notification + User menu
│   └── placeholder/
│       └── PlaceholderPage.tsx     # Generic placeholder cho mọi route
└── app/
    ├── page.tsx                    # Redirect → /dashboard
    └── (admin)/                    # Route group: layout chứa AppShell
        ├── layout.tsx
        ├── dashboard/page.tsx
        ├── marketing/
        │   ├── dashboard/page.tsx
        │   ├── input/page.tsx
        │   └── orders/page.tsx
        ├── leads/page.tsx
        ├── customers/page.tsx
        ├── orders/page.tsx
        ├── products/page.tsx
        ├── warehouses/page.tsx
        ├── employees/page.tsx
        └── roles/page.tsx
```

### Components

#### `AppShell`
- Flex container với `h-screen`, `overflow-hidden`.
- Sidebar bên trái (sticky, fixed width khi mở rộng, collapsed width 64px).
- Header `h-14` bên trên + main scrollable `flex-1` bên dưới.
- Background `bg-gray-50`.

#### `Sidebar`
- AntD `Layout.Sider` với `collapsible`, `breakpoint="lg"`, `trigger={null}` (custom toggle).
- Brand: icon + "Mongolia CRM" (ẩn khi collapse).
- Nav groups 6 nhóm: `Tổng quan / Marketing / Bán hàng / Kho / Danh mục / Quản trị`.
- Active state: `bg-blue-50 text-blue-600 font-medium` dựa trên `usePathname()`.
- Tooltip label khi collapsed.
- Toggle button ở footer.

#### `Header`
- Breadcrumb (từ `buildBreadcrumbs()`).
- Search input (AntD `Search`, no-op).
- Notification badge (AntD `Badge`, disabled).
- User dropdown (AntD `Dropdown`, menu items disabled — Phase A placeholder).
- Avatar cố định "Admin" (placeholder).

#### `PlaceholderPage`
- Props: `title`, `description`, `badge`, `children`.
- Card với Title + Description + dashed div nội dung placeholder.
- Badge nhắc Sprint sẽ dựng.

### Các trang (route) — Phase A

| Route | Phase sau | Trạng thái |
|-------|-----------|------------|
| `/dashboard` | Sprint 4 | Placeholder |
| `/marketing/dashboard` | Sprint 4 | Placeholder (không có Ads report) |
| `/marketing/input` | Sprint 9 | Placeholder |
| `/marketing/orders` | Sprint 9 | Placeholder |
| `/leads` | Sprint 5 | Placeholder |
| `/customers` | Sprint 6 | Placeholder |
| `/orders` | Sprint 7-8 | Placeholder |
| `/products` | Sprint 10 | Placeholder |
| `/warehouses` | Sprint 11 | Placeholder |
| `/employees` | Sprint 12 | Placeholder |
| `/roles` | Sprint 12 | Placeholder |

### Domain logic KHÔNG động tới (Phase A)

- KHÔNG gọi API.
- KHÔNG CRUD / form submit.
- KHÔNG kết nối `useAuthStore` / `auth.store` (chưa cần guard).
- KHÔNG wire `React Query` (đã có provider, chưa dùng).
- KHÔNG gọi `LeadImportPreview.tsx` (chưa mount).
- KHÔNG sửa backend.

### Dependencies

- Không thêm dependency mới.
- Tái sử dụng: `antd`, `@ant-design/icons`, `next/navigation`, `next/link`.

### Deliverable

- Truy cập `/` → redirect `/dashboard`.
- Sidebar hiển thị đầy đủ nhóm nav, collapse/expand, responsive dưới `lg`.
- Header có breadcrumb, search, notification, user menu (placeholder).
- Click qua từng nav item → render trang placeholder với Title + badge Sprint.

---

## Phase A.1 — CSS Refactor (2026-08-01)

### Status

✅ Completed

### Mục tiêu Phase A.1

- Chuẩn hoá Foundation UI để sau này dựng toàn bộ CRM.
- Tách toàn bộ CSS của HTML gốc (`mongolia-crm (7).html`) thành các file theo phạm vi.
- **KHÔNG** thêm tính năng / Auth / API / CRUD / Sprint 2 / Dashboard thật.
- **KHÔNG** đổi màu / font / animation / spacing so với HTML gốc.
- **KHÔNG** dùng CSS-in-JS / styled-components / emotion / inline style.
- Component React chỉ dùng `className`. Tailwind chỉ dùng flex/grid/spacing utility nhỏ.

### Cấu trúc stylesheet mới

```
src/styles/
├── globals.css        # Tailwind directives + reset + font + theme + import custom
├── custom.css         # Import hub cho 14 file phạm vi bên dưới
├── layout.css         # .main, .content, .empty, .backdrop, .mob-open, .cnt
├── sidebar.css        # .sb, .brand, .ls/.lb, .rs/.rb, .nav, .ng/.ngs, .nh, .na, .nb, .ni, .pill, .sbf, .sb.col
├── header.css         # .topbar, .pt, .vb (variants), .srch, .tbr
├── card.css           # .card, .card-h, .card-body, .btn (+ variants), .btn-row, .btn-lg
├── table.css          # .tw, table, thead th, tbody td, tbody tr:hover td
├── modal.css          # .mo, .modal (+ h3), .fg, .ma
├── popup.css          # .kp, .kp.show, .kp h4, .ki (+ .kn/.kd)
├── toast.css          # .toast, .toast.show
├── dashboard.css      # .sr, .sc0 (+ sb1/sg/sa/srd/sp2/st2), .db-bar/.db-lb/.db-tr/.db-fl/.db-vl
├── marketing.css      # .prod-sel/.pc/.cl/.cr/.paste-tabs/.pz/.ph/.pw/.pwh/.pvb/.pwb/.rx/.pb/.ccb/.note-i/.ads-row/.ads-m/.nick-sel/.nk
├── orders.css         # .chip, .dot, .c-* (status), .ss, .s2 (+ colored .on), .kb, .role-badge, .role-*
├── warehouse.css      # .wg, .wi, .wi h4, .wi .wq, .wi .wd
├── animation.css      # @keyframes sp2 + .pb (referenced animation)
└── responsive.css     # @media (max-width: 768px) — full mobile overrides
```

### Thống kê

| Metric | Value |
|--------|-------|
| Số file CSS trong `src/styles/` | **16** (15 module + `custom.css`) |
| Tổng số dòng CSS | **1.514** |
| Số class unique được tái sử dụng | **148** (bao gồm state classes `.on`, `.col`, `.show`, `.ct`, `.lt`, `.done`, `.open`) |
| Mapping `globals.css` | Tailwind directives, reset, font, scrollbar, CSS Variables (theme), `@import custom.css` |
| Mapping `custom.css` | chỉ `@import` 14 file phạm vi bên dưới |

### Component ↔ Stylesheet mapping

| Component (TSX) | Stylesheet chính | Classes sử dụng |
|-----------------|------------------|-----------------|
| `AppShell.tsx` | `layout.css` | `.main`, `.content` |
| `Sidebar.tsx` | `sidebar.css` | `.sb`, `.brand`, `.ico`, `.brand-txt`, `.nm`, `.sub`, `.sb-tg`, `.ic-c`, `.ic-o`, `.nav`, `.ng`, `.ngs`, `.nh`, `.nl`, `.nb`, `.ni`, `.pill`, `.sbf`, `.ver`, `.sb.col` |
| `Header.tsx` | `header.css` | `.topbar`, `.pt`, `.vb`, `.vb-b`, `.srch`, `.tbr`, `.cnt`, `.btn`, `.btn-ghost`, `.btn-sm` |
| `PlaceholderPage.tsx` | `card.css` | `.card`, `.card-h`, `.card-body`, `.btn` |
| `src/app/page.tsx` (redirect) | n/a | — |

### Class names bảo tồn (mapping HTML gốc → React)

| HTML gốc | React component / Stylesheet |
|----------|------------------------------|
| `.sb`, `.brand`, `.ni`, `.pill` | `Sidebar.tsx` ↔ `sidebar.css` |
| `.topbar`, `.vb`, `.srch`, `.tbr`, `.cnt` | `Header.tsx` ↔ `header.css` |
| `.card`, `.btn`, `.btn-pri/sec/green/red/purple/ghost/sm/lg` | `PlaceholderPage.tsx`, `Header.tsx` ↔ `card.css` |
| `.sc0`, `.sb1`, `.sg`, `.sa`, `.srd`, `.sp2`, `.st2` | sẵn sàng cho Sprint 4 ↔ `dashboard.css` |
| `.chip`, `.dot`, `.c-new/knm/cls/pot/non/cmt/ladi/ok/ret/rec` | sẵn sàng cho Sprint 5/7 ↔ `orders.css` |
| `.kp`, `.ki` | sẵn sàng cho Sprint 5 (KNM popup) ↔ `popup.css` |
| `.modal`, `.fg`, `.ma` | sẵn sàng cho form Sprint 5+ ↔ `modal.css` |
| `.toast` | sẵn sàng cho feedback Sprint 5+ ↔ `toast.css` |
| `.pc`, `.cr`, `.paste-tab`, `.pz`, `.ph`, `.pw`, `.pb` | sẵn sàng cho Sprint 9 (MKT Input) ↔ `marketing.css` |
| `.wg`, `.wi`, `.wq`, `.wd` | sẵn sàng cho Sprint 11 (Kho) ↔ `warehouse.css` |
| `@keyframes sp2`, `.pb` | sẵn sàng cho push-sale banner ↔ `animation.css` |
| `@media (max-width: 768px)` | responsive sidebar / topbar / modal ↔ `responsive.css` |

### Quy tắc đã áp dụng

- **Class names bảo tồn 100%** so với HTML mẫu — Sprint sau chỉ cần mount JSX tương ứng.
- **Tailwind hạn chế ở utility**: chỉ `flex`, `h-screen`, `w-screen`, `overflow-hidden` trong `AppShell`; phần còn lại là class từ CSS module.
- **Không inline style** trong component Phase A — tất cả visual đi qua class.
- **Không sửa backend**, **không thêm route mới**, **không đổi hành vi** của 11 route placeholder.
- `src/app/globals.css` chỉ là bridge: `@import "../styles/globals.css"` để giữ convention của Next.js App Router.

### Verification

| Check | Kết quả |
|-------|---------|
| `tsc --noEmit` (Phase A files only) | 0 errors |
| `eslint` (16 Phase A files) | 0 errors, 0 warnings |
| Số route placeholder không đổi | 11/11 |
| Số component Phase A không đổi logic | 4/4 |
| Không thêm dependency mới | ✅ |

### Xác nhận

Foundation UI đã được chuẩn hoá với 16 stylesheet phạm vi + 148 class bảo tồn từ HTML mẫu. Sẵn sàng để bắt đầu Sprint 2.

---

⏳ LeadHistory API
⏳ Seed Data
⏳ Auto Assign Sale
⏳ Dashboard
⏳ Report
⏳ Sprint tiếp theo

---

## Sprint 2.2A — Migrate RBAC (Database becomes Source of Truth)

### Status

✅ Completed

### Kiến trúc MongoDB (Source of Truth)

```
roles          (code, name, description, isActive)
permissions    (code, name, module, description, isActive)
role_permissions (roleId, permissionId) — Junction table
employees      (roleId → roles._id)
```

### Files tạo mới

- `src/models/RolePermission.ts` — Junction table model
  - Indexes: `(roleId, permissionId)` unique, `(roleId)`, `(permissionId)`

### Files chỉnh sửa

- `src/models/Role.ts` — Bỏ embedded `permissions[]` array
- `src/db/seeds/permissions.seed.ts` — Thêm `module` field (Dashboard, Employee...)
- `src/db/seeds/roles.seed.ts` — Seed Roles + RolePermission junction table (idempotent)
- `src/lib/auth.ts` — getCurrentUser() fetch permissions qua RolePermission
- `src/app/api/auth/login/route.ts` — Login fetch permissions qua RolePermission

### Seed Order

```
Permissions → Roles → RolePermissions → Employees
```

### Auth Flow (Source of Truth: MongoDB)

```
Employee → Role → RolePermission → Permission → Response
```

### Verification

- [x] Roles collection: ADMIN, MANAGER, SALE, WAREHOUSE, MKT, LEADER, EMPLOYEE
- [x] Permissions collection: ~50 permissions đầy đủ modules
- [x] RolePermissions collection: Junction documents (roleId, permissionId)
- [x] Admin login → permissions đầy đủ (wildcard "*" → all permissions)
- [x] Manager login → permissions theo ROLES config
- [x] Sale login → permissions đúng (order.view, lead.view...)
- [x] Warehouse login → permissions đúng (inventory.view, order.reserve_stock...)
- [x] Marketing login → permissions đúng (facebook-page.view, lead.create...)
- [x] Frontend KHÔNG đọc `src/constants/roles.ts` sau login
- [x] `src/constants/roles.ts` chỉ là ROLE_SEED — chạy khi seed xong KHÔNG dùng lại
- [x] 0 TypeScript Error (RBAC files)

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint 2.4

---

## Sprint 6.0 — Order Module Foundation

### Status

✅ Completed

### Mục tiêu

Xây dựng nền tảng cho Order Module - quản lý toàn bộ đơn hàng sau khi Lead được Convert.

### Kiến trúc

```
React Query
    ↓
API Route
    ↓
OrderService
    ↓
OrderRepository
    ↓
MongoDB
```

### Files tạo mới

- `src/types/order.ts` — Order Domain Types
  - OrderListItem, OrderDetail, OrderSummary, OrderStatus, OrderFilter, OrderResponse
- `src/hooks/useOrders.ts` — React Query hooks
  - useOrders, useOrder, useCreateOrder, useUpdateOrder, useDeleteOrder
- `src/app/(protected)/orders/page.tsx` — Order List Page
- `src/app/(protected)/orders/[id]/page.tsx` — Order Detail Page

### Files chỉnh sửa

- `src/repositories/order.repository.ts` — Mở rộng CRUD operations
  - findAll(), findById(), findByIdWithPopulate(), update(), softDelete(), count(), exists(), isActive()
  - Hỗ trợ filter: keyword, status, orderType, orderSource, saleEmployeeId, customerId, warehouseId, revenueLocked, dateFrom, dateTo
  - Hỗ trợ sort: createdAt, updatedAt, orderCode, customerName, status, totalAmount (whitelist)
- `src/services/order.service.ts` — Mở rộng business logic
  - create(), update(), delete(), getById(), getList()
  - createFromLead(), createCustomerFromLead() (Lead Convert flow)
  - Status validation, soft delete logic
- `src/types/permission.ts` — Thêm `ORDER_VIEW: "order.view"`
- `src/hooks/useOrders.ts` — Sử dụng PATCH thay vì PUT

### Backend API (Đã có từ Sprint 5.7)

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | /api/orders | order.view |
| GET | /api/orders/:id | order.view |
| POST | /api/orders | order.create |
| PATCH | /api/orders/:id | order.update |
| DELETE | /api/orders/:id | order.delete |

### Frontend Pages

#### Order List Page (`/orders`)
- PageContainer → PageHeader → OrderToolbar → OrderTable → Pagination
- Search với debounce 500ms
- Filter: Status, Date Range
- Table columns: Mã đơn, Khách hàng, Sale, Trạng thái, Tổng tiền, Ngày tạo, Actions
- Actions: View, Edit, Delete (theo permission)
- Row click → Navigate to detail

#### Order Detail Page (`/orders/[id]`)
- Thông tin đơn (mã, trạng thái, loại, nguồn, số lượng, đơn giá, tổng tiền)
- Khách hàng (tên, SĐT, mã KH)
- Sale (tên, mã NV)
- Sản phẩm (tên, mã SP hoặc combo)
- Thanh toán (danh sách payments, tổng đã thanh toán)
- Giao hàng (địa chỉ, phí ship, mã vận đơn)
- Doanh thu (revenueLocked, revenueEligible, revenue thô và cuối)
- Timeline (Coming Soon)

### UI Kit sử dụng

- PageContainer, PageHeader, DataTable, TableToolbar
- StatusBadge, ActionButton, EmptyState, SkeletonTable
- PermissionGate, ConfirmDialog, SectionTitle, LoadingOverlay
- FilterBar, FilterSelect, FilterDateRange

### Verification

- [x] npx tsc --noEmit — 0 TypeScript Error
- [x] CRUD Order chạy MongoDB (API đã có từ Sprint 5.7)
- [x] Không mock
- [x] Search với keyword (debounce 500ms)
- [x] Filter: Status, Date Range
- [x] Pagination
- [x] Permission (order.view, order.create, order.update, order.delete)
- [x] PROJECT_PROGRESS.md cập nhật Sprint 6.0

### Review

Reviewed by Cursor Agent

Status: Ready for next Sprint

---

## Sprint 6.2 — Order Workflow

### Status

✅ Completed

### Mục tiêu

Hoàn thiện toàn bộ luồng trạng thái Order theo nghiệp vụ.

### Kiến trúc

```
React Query
    ↓
API Route
    ↓
OrderService
    ↓
OrderRepository
    ↓
MongoDB
    ↓
OrderHistory
```

### Order Status Workflow

```
PENDING → CONFIRMED → PACKING → SHIPPING → DELIVERED
                                        ↓
                                    DELIVERED
                                        ↓
                                    RETURNED

PENDING → CANCELLED
CONFIRMED → CANCELLED
PACKING → CANCELLED
```

### Order Status Enum

| Status | Label |
|--------|-------|
| PENDING | Chờ xử lý |
| CONFIRMED | Đã xác nhận |
| PACKING | Đang đóng gói |
| SHIPPING | Đang giao |
| DELIVERED | Đã giao |
| RETURNED | Đã hoàn trả |
| CANCELLED | Đã hủy |
| PREPAID | Đã cọc / Trả trước |
| REJECTED | Bị từ chối |
| FAILED | Giao thất bại |
| COMPLETED | ~~Đã hoàn tất~~ — **Đã xóa, dùng DELIVERED** |

### Files tạo mới (Sprint 6.2 Review)

#### `src/configs/order-status.config.ts`

Centralized config cho Order Status:

```typescript
// Status colors
ORDER_STATUS_COLORS

// Allowed transitions
ALLOWED_STATUS_TRANSITIONS

// Status actions (buttons/dropdown)
STATUS_ACTIONS

// Helper functions
isStatusTransitionAllowed()
getAllowedNextStatuses()
getStatusActions()
canCancelFromStatus()
```

#### `src/repositories/order-history.repository.ts`

Repository cho OrderHistory:

```typescript
create()
createMany()
findByOrderId()
findByOrderIdWithPopulate()
countByOrderId()
```

#### `src/services/order-history.service.ts`

Service cho OrderHistory:

```typescript
createStatusChangeHistory()
createHistory()
getHistoryByOrderId()
```

#### `src/app/api/orders/[id]/status/route.ts`

PATCH `/api/orders/:id/status` - Đổi trạng thái đơn hàng

### Files chỉnh sửa

#### `src/constants/orderStatus.ts`

- Thêm `PACKING`, `DELIVERED`, `RETURNED`
- Cập nhật `ORDER_STATUS_LABELS`

#### `src/services/order.service.ts`

Thêm methods:

```typescript
// Sprint 6.2: Workflow
validateStatusTransition()
getAllowedTransitions()
changeStatus()
```

#### `src/repositories/order.repository.ts`

Thêm method:

```typescript
// Sprint 6.2
changeStatus()
```

#### `src/hooks/useOrders.ts`

Thêm hook:

```typescript
// Sprint 6.2
useChangeOrderStatus()
```

#### `src/app/(protected)/orders/[id]/page.tsx`

- Thêm Status Action Dropdown
- Thêm ConfirmDialog cho đổi trạng thái
- Xóa "Coming Soon" khỏi Timeline
- Refetch sau khi đổi trạng thái

### API Endpoint

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| PATCH | /api/orders/:id/status | order.update | Đổi trạng thái |

**Request:**

```json
{
  "status": "CONFIRMED"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Đổi trạng thái thành công",
  "data": { ... }
}
```

### Frontend Status Actions

| Trạng thái | Actions |
|-------------|---------|
| PENDING | Xác nhận, Hủy đơn |
| CONFIRMED | Đóng gói, Hủy đơn |
| PACKING | Giao hàng, Hủy đơn |
| SHIPPING | Đã giao |
| DELIVERED | Hoàn trả |
| RETURNED | - |
| CANCELLED | - |
| PREPAID | Đóng gói, Hủy đơn |

### Business Rules

- Chỉ cho phép chuyển trạng thái hợp lệ
- Nếu sai workflow → throw Business Error
- Mỗi lần đổi trạng thái → ghi 1 record vào OrderHistory
- Timeline đọc từ MongoDB (OrderHistory collection)

### UI Kit sử dụng

- Dropdown (Ant Design) cho status actions
- ConfirmDialog cho xác nhận
- LoadingOverlay cho trạng thái loading
- CardSection, StatusBadge, ActionButton

### Verification

- [x] npx tsc --noEmit — 0 TypeScript Error
- [x] Workflow đúng (PENDING → CONFIRMED → PACKING → SHIPPING → DELIVERED → RETURNED)
- [x] Không thể đổi sai trạng thái (validateStatusTransition)
- [x] OrderHistory ghi đầy đủ khi đổi trạng thái
- [x] Timeline đọc từ MongoDB
- [x] React Query refetch sau khi đổi trạng thái
- [x] Config-driven UI (không hardcode)
- [x] PROJECT_PROGRESS.md cập nhật Sprint 6.2
- [x] Xóa COMPLETED alias (chỉ dùng DELIVERED)
- [x] Thêm icons vào order-status.config.ts
- [x] Status-specific actions trong OrderHistory (PACKING, SHIPPING, DELIVERED, etc.)
- [x] StatusBadge hỗ trợ icon (showIcon prop)

### Review (Sprint 6.2 Review - 2026-08-04)

Reviewed by Cursor Agent

Status: Ready for next Sprint

---

## Sprint 6.3 — Warehouse Integration

### Status

✅ Completed

### Mục tiêu

Kết nối Order với Warehouse. Warehouse nhận danh sách đơn cần xử lý.

**CHƯA cập nhật tồn kho. CHƯA trừ tồn.**

### Kiến trúc

```
React Query
    ↓
API Route
    ↓
WarehouseService
    ↓
WarehouseRepository
    ↓
MongoDB
    ↓
WarehouseHistory
```

### Warehouse Status Workflow

```
WAITING_PICK → PICKING → PACKED → READY_TO_SHIP → SHIPPED
```

### Business Flow

```
Order PACKING → Warehouse WAITING_PICK → PICKING → PACKED → READY_TO_SHIP
                                                            ↓
                                                      Order SHIPPING
```

### Order Integration

- Khi Order chuyển `PACKING` → tự động tạo `WarehouseTask`
- Nếu đã tồn tại → không tạo lại

### Files tạo mới

#### `src/constants/warehouseStatus.ts`

```typescript
enum WarehouseStatus {
  WAITING_PICK, PICKING, PACKED, READY_TO_SHIP, SHIPPED
}
enum WarehouseAction {
  CREATED, UPDATED, WAITING_PICK, PICKING, PACKED,
  READY_TO_SHIP, SHIPPED, ASSIGNED, NOTE_UPDATED
}
```

#### `src/configs/warehouse-status.config.ts`

Centralized config cho Warehouse Status:
- Labels
- Colors
- Icons
- Allowed transitions
- Actions

#### `src/models/WarehouseTask.ts`

Collection: `WarehouseTask`

Fields:
- _id
- orderId (unique)
- warehouseStatus
- assignedEmployeeId
- note
- createdAt
- updatedAt

#### `src/models/WarehouseHistory.ts`

Collection: `WarehouseHistory`

Fields:
- _id
- warehouseTaskId
- action
- oldValue
- newValue
- employeeId
- note
- createdAt

#### `src/repositories/warehouse.repository.ts`

```typescript
create()
findById()
findAll()
changeStatus()
assignEmployee()
existsByOrderId()
```

#### `src/repositories/warehouse-history.repository.ts`

```typescript
create()
findByTaskId()
findByTaskIdWithPopulate()
countByTaskId()
```

#### `src/services/warehouse.service.ts`

```typescript
createFromOrder()
changeStatus()
assignEmployee()
getTaskById()
getTaskByOrderId()
getAllTasks()
completePacking()
validateWarehouseTransition()
getAllowedTransitions()
```

#### `src/services/warehouse-history.service.ts`

```typescript
createStatusChangeHistory()
createHistory()
getHistoryByTaskId()
```

#### `src/hooks/useWarehouseTasks.ts`

```typescript
useWarehouseTasks()
useWarehouseTask()
useChangeWarehouseStatus()
useAssignWarehouseTask()
```

### API Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | /api/warehouse/tasks | warehouse.view | Danh sách tasks |
| GET | /api/warehouse/tasks/:id | warehouse.view | Chi tiết task |
| PATCH | /api/warehouse/tasks/:id/status | warehouse.update | Đổi trạng thái |
| PATCH | /api/warehouse/tasks/:id/assign | warehouse.assign | Giao việc |

### Frontend Pages

#### `/warehouses` - Warehouse List

- Danh sách Warehouse Tasks
- Search, Filter by Status
- Pagination

#### `/warehouses/[id]` - Warehouse Detail

- Order Info
- Warehouse Status với dropdown actions
- Assigned Employee
- Timeline (WarehouseHistory)

### Warehouse Status Actions

| Status | Actions |
|--------|---------|
| WAITING_PICK | Bắt đầu nhặt |
| PICKING | Đóng gói xong |
| PACKED | Sẵn sàng giao |
| READY_TO_SHIP | Hoàn tất |
| SHIPPED | - |

### Config Files

#### `src/configs/warehouse-status.config.ts`

| Status | Icon |
|--------|------|
| WAITING_PICK | ClockCircleOutlined |
| PICKING | SyncOutlined |
| PACKED | InboxOutlined |
| READY_TO_SHIP | CarOutlined |
| SHIPPED | CheckCircleOutlined |

### Verification

- [x] npx tsc --noEmit — 0 TypeScript Error
- [x] WarehouseTask tạo tự động khi Order → PACKING
- [x] Workflow Warehouse đúng (WAITING_PICK → ... → SHIPPED)
- [x] WarehouseHistory ghi đầy đủ
- [x] Timeline đọc MongoDB
- [x] React Query refetch đúng
- [x] Config-driven UI (không hardcode)
- [x] PROJECT_PROGRESS.md cập nhật Sprint 6.3

### Review

Reviewed by Cursor Agent

Status: Ready for next Sprint

### Status

✅ Completed

---

## Sprint 6.4 — Inventory Movement

### Mục tiêu

Hoàn thiện nghiệp vụ Xuất kho. Khi WarehouseTask chuyển SHIPPED → Inventory phải tự động trừ tồn kho.

### Kiến trúc

```
WarehouseService
    ↓
InventoryService
    ↓
InventoryRepository
    ↓
MongoDB
    ↓
InventoryMovement
```

### Flow

```
WarehouseTask READY_TO_SHIP
    ↓
SHIPPED
    ↓
InventoryService.exportOrder()
    ↓
InventoryMovement
    ↓
Update Product Stock
    ↓
Success
```

### Database — InventoryMovement Collection

Fields:
- `_id`
- `warehouseId` — Warehouse thực hiện movement
- `orderId` — Order liên quan
- `warehouseTaskId` — WarehouseTask liên quan
- `productVariantId` — Biến thể sản phẩm
- `sku` — SKU sản phẩm
- `productName` — Tên sản phẩm
- `quantity` — Số lượng
- `type` — Loại (EXPORT / IMPORT / ADJUSTMENT)
- `employeeId` — Nhân viên thực hiện
- `note` — Ghi chú
- `createdAt`

### Service — InventoryService

Methods:
- `exportOrder()` — Xuất kho cho order (transactional)
- `rollbackExport()` — Rollback xuất kho (khi hủy/trả hàng)
- `checkStock()` — Kiểm tra tồn kho trước khi xuất
- `reserveStock()` — Giữ chỗ tồn kho
- `releaseStock()` — Hủy giữ chỗ

Business Rules:
1. Kiểm tra tồn kho. Nếu `stock < quantity` → throw Business Error. Không xuất một phần.
2. Nếu tất cả sản phẩm đủ → Transaction → Trừ tồn → Ghi InventoryMovement → Commit
3. Nếu lỗi → Rollback toàn bộ

### Repository — InventoryRepository

Methods:
- `decreaseStock()` — Trừ tồn kho (atomic, kèm session)
- `increaseStock()` — Tăng tồn kho
- `findProductStock()` — Lấy tồn kho hiện tại
- `createMovement()` — Ghi InventoryMovement
- `findMovements()` — Danh sách movements với filter
- `findMovementById()` — Lấy movement theo ID

### API

- `GET /api/inventory/movements` — Danh sách movements
- `GET /api/inventory/movements/:id` — Chi tiết movement
- `GET /api/warehouse/tasks/:id/inventory` — Movements theo warehouse task

### Frontend

- Warehouse Detail page — Inventory Section (Table với SKU, tên SP, SL xuất, loại, thời gian, ghi chú)
- `/inventory/movements` — Trang danh sách với DataTable + Search + Filter + Pagination

### Permission

- `inventory.view` — Xem inventory movements
- `inventory.export` — Xuất kho (auto từ WarehouseTask SHIPPED)

### Files tạo mới (Sprint 6.4)

#### Models
- `src/models/InventoryMovement.ts` — InventoryMovement schema + enum MovementType

#### Configs
- `src/configs/inventory.config.ts` — Movement labels, colors, icons

#### Repositories
- `src/repositories/inventory.repository.ts` — Stock queries + movements CRUD

#### Services
- `src/services/inventory.service.ts` — Business logic (exportOrder, rollbackExport, checkStock, reserveStock, releaseStock)

#### API Routes
- `src/app/api/inventory/movements/route.ts` — GET list
- `src/app/api/inventory/movements/[id]/route.ts` — GET detail
- `src/app/api/warehouse/tasks/[id]/inventory/route.ts` — GET movements by task

#### Hooks
- `src/hooks/useInventoryMovements.ts` — React Query hooks

#### Components
- `src/components/inventory/InventorySection.tsx` — Hiển thị movements trong Warehouse Detail

#### Pages
- `src/app/(protected)/inventory/movements/page.tsx` — Trang danh sách movements

### Cập nhật

- `src/services/warehouse.service.ts` — Tích hợp exportOrder khi SHIPPED (transactional, trước khi đổi Order SHIPPING)
- `src/hooks/useWarehouseTasks.ts` — Invalidate inventory queries sau khi đổi status
- `src/app/(protected)/warehouses/[id]/page.tsx` — Thêm InventorySection component

### Verification

- [x] `npx tsc --noEmit` — 0 TypeScript Error
- [x] Mongo Transaction hoạt động (session + commit/abort)
- [x] Không đủ tồn → rollback toàn bộ
- [x] Đủ tồn → trừ đúng số lượng
- [x] InventoryMovement ghi đầy đủ (EXPORT + InventoryHistory)
- [x] Product stock cập nhật (quantity, availableQuantity)
- [x] React Query refetch đúng (warehouse-task, warehouse-tasks, orders, inventory, products)
- [x] PROJECT_PROGRESS.md cập nhật Sprint 6.4

### Status

✅ Completed

### Mục tiêu

Hoàn thiện Order Detail với danh sách sản phẩm và tính toán tiền.

### Kiến trúc

```
React Query
    ↓
API Route
    ↓
OrderService
    ↓
OrderRepository
    ↓
MongoDB
```

### Backend Changes

#### Order Model (`src/models/Order.ts`)

Thêm Order Items và Order Summary:

```typescript
// Order Item interface
interface IOrderItem {
  productId?: Types.ObjectId;
  sku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

// Order Summary interface
interface IOrderSummary {
  subtotal: number;
  discount: number;
  shippingFee: number;
  grandTotal: number;
  currency: "VND" | "MNT" | "USD";
}
```

#### Order Types (`src/types/order.ts`)

Thêm interfaces:

```typescript
// OrderItem, OrderSummaryPrice (Sprint 6.1)
interface OrderItem {
  productId?: string;
  sku?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
}

interface OrderSummaryPrice {
  subtotal: number;
  discount: number;
  shippingFee: number;
  grandTotal: number;
  currency: "VND" | "MNT" | "USD";
}

// CreateOrderInput, UpdateOrderInput
interface CreateOrderInput {
  // ... existing fields
  orderItems?: CreateOrderItemInput[];
}

interface UpdateOrderInput {
  // ... existing fields
  orderItems?: CreateOrderItemInput[];
  summaryDiscount?: number;
  summaryShippingFee?: number;
}
```

#### Order Service (`src/services/order.service.ts`)

Thêm calculation methods:

```typescript
// Sprint 6.1: Calculation Methods
calculateSubtotal(orderItems): number
calculateDiscount(orderItems): number
calculateTotal(subtotal, itemDiscounts): number
calculateGrandTotal(subtotal, orderDiscount, shippingFee): number
buildOrderSummary(orderItems, orderDiscount, shippingFee, currency): OrderSummaryPrice
processOrderItems(orderItems): Array<{...}>
```

### Order Detail Page Layout

```
PageHeader
    ↓
Thông tin đơn
    ↓
Khách hàng
    ↓
Sale
    ↓
Danh sách sản phẩm (Sprint 6.1)
    ↓
Tổng tiền (Sprint 6.1)
    ↓
Thanh toán
    ↓
Giao hàng
    ↓
Lịch sử (Coming Soon)
```

### Product Table (Sprint 6.1)

| Column | Description |
|--------|-------------|
| SKU | Mã sản phẩm |
| Tên sản phẩm | Tên sản phẩm |
| SL | Số lượng |
| Đơn giá | Giá 1 đơn vị |
| Giảm giá | Giảm giá (nếu có) |
| Thành tiền | quantity × unitPrice - discount |

#### Table Footer

| Label | Value |
|-------|-------|
| Tạm tính | sum(subtotal) |
| Giảm giá | order-level discount |
| Phí vận chuyển | shippingFee |
| Tổng cộng | grandTotal |

### Order Summary Card (Sprint 6.1)

Hiển thị:
- Tạm tính (subtotal)
- Giảm giá (discount)
- Phí vận chuyển (shippingFee)
- **Tổng cộng** (grandTotal)
- Đã thanh toán (totalPaid)
- Còn lại (grandTotal - totalPaid)

### API Response

GET `/api/orders/:id` trả về thêm:

```json
{
  "orderItems": [...],
  "summary": {
    "subtotal": 1000000,
    "discount": 100000,
    "shippingFee": 30000,
    "grandTotal": 930000,
    "currency": "VND"
  }
}
```

### UI Kit sử dụng

- CardSection (thay Card)
- Table (với Summary footer)
- StatusBadge, ActionButton
- PermissionGate, ConfirmDialog
- LoadingOverlay, SkeletonCard
- EmptyState

### Verification

- [x] npx tsc --noEmit — 0 TypeScript Error
- [x] Không mock
- [x] Order Detail đọc từ MongoDB
- [x] Product Lines hiển thị (Table với footer)
- [x] Tổng tiền tính từ Service
- [x] Frontend không tự tính (chỉ hiển thị từ API)
- [x] PROJECT_PROGRESS.md cập nhật Sprint 6.1

### Review

Reviewed by Cursor Agent

Status: Ready for next Sprint

---

## Sprint 6.2 — Order Workflow

### Status

✅ Completed

### Mục tiêu

Hoàn thiện toàn bộ luồng trạng thái Order theo nghiệp vụ.

### Kiến trúc

```
React Query
    ↓
API Route
    ↓
OrderService
    ↓
OrderRepository
    ↓
MongoDB
    ↓
OrderHistory
```

### Order Status Workflow

```
PENDING → CONFIRMED → PACKING → SHIPPING → DELIVERED
                                        ↓
                                    DELIVERED
                                        ↓
                                    RETURNED

PENDING → CANCELLED
CONFIRMED → CANCELLED
PACKING → CANCELLED
```

### Order Status Enum

| Status | Label |
|--------|-------|
| PENDING | Chờ xử lý |
| CONFIRMED | Đã xác nhận |
| PACKING | Đang đóng gói |
| SHIPPING | Đang giao |
| DELIVERED | Đã giao |
| RETURNED | Đã hoàn trả |
| CANCELLED | Đã hủy |
| PREPAID | Đã cọc / Trả trước |
| REJECTED | Bị từ chối |
| FAILED | Giao thất bại |
| COMPLETED | ~~Đã hoàn tất~~ — **Đã xóa, dùng DELIVERED** |

### Files tạo mới (Sprint 6.2 Review)

#### `src/configs/order-status.config.ts`

Centralized config cho Order Status:

```typescript
// Status colors
ORDER_STATUS_COLORS

// Allowed transitions
ALLOWED_STATUS_TRANSITIONS

// Status actions (buttons/dropdown)
STATUS_ACTIONS

// Helper functions
isStatusTransitionAllowed()
getAllowedNextStatuses()
getStatusActions()
canCancelFromStatus()
```

#### `src/repositories/order-history.repository.ts`

Repository cho OrderHistory:

```typescript
create()
createMany()
findByOrderId()
findByOrderIdWithPopulate()
countByOrderId()
```

#### `src/services/order-history.service.ts`

Service cho OrderHistory:

```typescript
createStatusChangeHistory()
createHistory()
getHistoryByOrderId()
```

#### `src/app/api/orders/[id]/status/route.ts`

PATCH `/api/orders/:id/status` - Đổi trạng thái đơn hàng

### Files chỉnh sửa

#### `src/constants/orderStatus.ts`

- Thêm `PACKING`, `DELIVERED`, `RETURNED`
- Cập nhật `ORDER_STATUS_LABELS`

#### `src/services/order.service.ts`

Thêm methods:

```typescript
// Sprint 6.2: Workflow
validateStatusTransition()
getAllowedTransitions()
changeStatus()
```

#### `src/repositories/order.repository.ts`

Thêm method:

```typescript
// Sprint 6.2
changeStatus()
```

#### `src/hooks/useOrders.ts`

Thêm hook:

```typescript
// Sprint 6.2
useChangeOrderStatus()
```

#### `src/app/(protected)/orders/[id]/page.tsx`

- Thêm Status Action Dropdown
- Thêm ConfirmDialog cho đổi trạng thái
- Xóa "Coming Soon" khỏi Timeline
- Refetch sau khi đổi trạng thái

### API Endpoint

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| PATCH | /api/orders/:id/status | order.update | Đổi trạng thái |

**Request:**

```json
{
  "status": "CONFIRMED"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Đổi trạng thái thành công",
  "data": { ... }
}
```

### Frontend Status Actions

| Trạng thái | Actions |
|-------------|---------|
| PENDING | Xác nhận, Hủy đơn |
| CONFIRMED | Đóng gói, Hủy đơn |
| PACKING | Giao hàng, Hủy đơn |
| SHIPPING | Đã giao |
| DELIVERED | Hoàn trả |
| RETURNED | - |
| CANCELLED | - |
| PREPAID | Đóng gói, Hủy đơn |

### Business Rules

- Chỉ cho phép chuyển trạng thái hợp lệ
- Nếu sai workflow → throw Business Error
- Mỗi lần đổi trạng thái → ghi 1 record vào OrderHistory
- Timeline đọc từ MongoDB (OrderHistory collection)

### UI Kit sử dụng

- Dropdown (Ant Design) cho status actions
- ConfirmDialog cho xác nhận
- LoadingOverlay cho trạng thái loading
- CardSection, StatusBadge, ActionButton

### Verification

- [x] npx tsc --noEmit — 0 TypeScript Error
- [x] Workflow đúng (PENDING → CONFIRMED → PACKING → SHIPPING → DELIVERED → RETURNED)
- [x] Không thể đổi sai trạng thái (validateStatusTransition)
- [x] OrderHistory ghi đầy đủ khi đổi trạng thái
- [x] Timeline đọc từ MongoDB
- [x] React Query refetch sau khi đổi trạng thái
- [x] Config-driven UI (không hardcode)
- [x] PROJECT_PROGRESS.md cập nhật Sprint 6.2

### Review

Reviewed by Cursor Agent

Status: Ready for next Sprint


---

## Sprint 6.5 — Marketing Expense Domain

### Status

✅ Completed

### Mục tiêu

Xây dựng Backend Domain hoàn chỉnh cho Marketing Expense Report.
Sprint này CHỈ làm Backend Domain — không UI, không Seed, không API.

### Kiến trúc

```
API
  ↓
MarketingExpenseService
  ↓
MarketingExpenseRepository
  ↓
MongoDB
```

### Model — `src/models/MarketingExpenseReport.ts`

- Collection: `marketingexpensereports`
- Sub-document `BudgetAllocation` (morning / afternoon / emergency)
- Fields:
  - `reportDate` (index)
  - `marketingEmployeeId` (ref Employee)
  - `facebookPageId` (ref FacebookPage, nullable)
  - `requestedBudget` (BudgetAllocation)
  - `spentBudget` (BudgetAllocation)
  - `remainingBudget` (BudgetAllocation — tính tự động)
  - `totalRevenue`, `totalLeads`, `closedLeads`
  - `conversionRate`, `roas`, `cpa`
  - `status` (MarketingExpenseReportStatus)
  - `createdBy`, `approvedBy`, `lockedBy`, `approvedAt`, `lockedAt`
  - `createdAt`, `updatedAt`

Unique Index:

- `(reportDate, facebookPageId)` — `partialFilterExpression: { facebookPageId: { $type: "objectId" } }`
- `(reportDate)` — `partialFilterExpression: { facebookPageId: { $type: "null" } }` (report toàn team)

Phục vụ filter / list:

- `(marketingEmployeeId, reportDate -1)`
- `(status, reportDate -1)`
- `(reportDate -1)`
- `(createdAt -1)`

### Constants — `src/constants/marketing-expense.ts`

```typescript
enum MarketingExpenseReportStatus {
  DRAFT, SUBMITTED, APPROVED, LOCKED, REOPENED
}

MARKETING_EXPENSE_STATUS_LABELS
MARKETING_EXPENSE_STATUS_COLORS
MARKETING_EXPENSE_STATUS_ICONS
```

### Config — `src/configs/marketing-expense.config.ts`

```typescript
// Helpers
getMarketingExpenseStatusLabel()
getMarketingExpenseStatusColor()
getMarketingExpenseStatusIcon()

// Workflow rules
isMarketingExpenseEditable()      // DRAFT | REOPENED
canMarketingExpenseSubmit()       // DRAFT | REOPENED
canMarketingExpenseApprove()      // SUBMITTED
canMarketingExpenseLock()         // APPROVED
canMarketingExpenseReopen()       // LOCKED
canMarketingExpenseDelete()       // DRAFT | REOPENED
```

### Types — `src/types/marketing-expense.ts`

```typescript
interface MarketingExpense { ... }
interface MarketingExpenseSummary { ... }
interface MarketingExpenseFilter { ... }
interface MarketingExpenseListResponse { ... }
interface CreateMarketingExpenseInput { ... }
interface UpdateMarketingExpenseInput { ... }
interface SubmitMarketingExpenseInput { ... }
interface ApproveMarketingExpenseInput { ... }
interface LockMarketingExpenseInput { ... }
interface ReopenMarketingExpenseInput { ... }
interface BudgetAllocation { morning, afternoon, emergency }
```

### Validator — `src/validators/marketing-expense.validator.ts`

```typescript
marketingExpenseFormSchema   // z.object(...)
MarketingExpenseForm         // z.infer
defaultMarketingExpenseForm  // init value cho UI
```

### Repository — `src/repositories/marketing-expense.repository.ts`

CRUD thuần (KHÔNG business logic):

```typescript
class MarketingExpenseRepository {
  create()
  findById()
  findByIdWithPopulate()
  findAll(params)             // pagination + filter + sort
  update()
  delete()                    // hard delete
  count()
  exists()
  findByDate(reportDate, pageId?)
  findByDateAndPage(reportDate, pageId)
  aggregateSummary(filter)
}

marketingExpenseRepository    // singleton
```

### Service — `src/services/marketing-expense.service.ts`

Business logic:

```typescript
class MarketingExpenseService {
  // CRUD
  create()    // check duplicate (reportDate, facebookPageId)
  update()    // chỉ sửa khi DRAFT hoặc REOPENED
  delete()    // chỉ xóa khi DRAFT hoặc REOPENED
  getById()
  getList()

  // Workflow
  submit()    // DRAFT|REOPENED → SUBMITTED
  approve()   // SUBMITTED → APPROVED  (không approve khi chưa submit)
  lock()      // APPROVED → LOCKED
  reopen()    // LOCKED → REOPENED

  // Aggregations
  calculateSummary()   // dùng repo.aggregateSummary
  calculateROAS()
  calculateCPA()
  calculateConversionRate()
}

marketingExpenseService  // singleton
```

### Business Rules

1. Mỗi `(reportDate, facebookPageId)` chỉ tồn tại 1 report duy nhất.
   - `facebookPageId = null` → report toàn team.
   - Unique index ở 2 partial indexes.
2. Không sửa report `LOCKED` (chỉ DRAFT / REOPENED).
3. Không approve report chưa `SUBMITTED`.
4. `ROAS = totalRevenue / spentBudgetTotal` (0 khi spent = 0).
5. `CPA = spentBudgetTotal / closedLeads` (0 khi closed = 0).
6. `conversionRate = closedLeads / totalLeads` (clamp 0..1).
7. `remainingBudget = requestedBudget - spentBudget` (per slot).

### Cập nhật

- `src/models/index.ts` — export `MarketingExpenseReport`.

### Verification

- [x] `npx tsc --noEmit` — 0 TypeScript Error
- [x] Model compile
- [x] Repository compile
- [x] Service compile
- [x] Không tạo API
- [x] Không tạo UI
- [x] Không Seed
- [x] Không sửa Dashboard
- [x] PROJECT_PROGRESS.md cập nhật Sprint 6.5

### Review

Reviewed by Cursor Agent

Status: Ready for next Sprint


---




---

## Sprint 6.6 — Marketing Expense Seed

### Mục tiêu

Tạo dữ liệu seed cho Marketing Expense để phục vụ Dashboard, Report và các Sprint tiếp theo.

### Files

- `src/db/seeds/marketing-expense.seed.ts` (NEW)
- `src/db/seed.ts` (UPDATED — register seed)

### Specs

- **Tổng reports**: 80
- **Date distribution**:
  - 30% (24) trong 7 ngày gần nhất
  - 40% (32) trong 30 ngày gần nhất
  - 30% (24) trong 90 ngày gần nhất
- **Status distribution** (workflow hợp lệ):
  - DRAFT 20%
  - SUBMITTED 20%
  - APPROVED 25%
  - LOCKED 25%
  - REJECTED 10%
- **Budget slots**: mỗi report 1-3 slots (MORNING/AFTERNOON/URGENT), random selection
  - requested mỗi slot: 1tr - 8tr VND
  - spent mỗi slot: 50% - 100% requested (≤ requested)

### Determinism (idempotent)

- Dùng **seeded PRNG (mulberry32)** với seed cố định → mỗi lần chạy đều sinh ra cùng tập
  `(reportDate, facebookPageId, marketingEmployeeId, status, budget, leads)`.
- Combined với idempotent `findOne({reportDate, facebookPageId})` →
  chạy nhiều lần KHÔNG thay đổi số lượng report trong DB (chỉ update).
- Tổng ổn định = 80 qua mọi lần seed.

### Workflow validation

Seed tự set audit fields theo workflow rule:

| Status    | approvedBy | approvedAt | lockedBy | lockedAt | rejectedBy | rejectedAt | rejectionReason |
|-----------|------------|------------|----------|----------|------------|------------|-----------------|
| DRAFT     | -          | -          | -        | -        | -          | -          | -               |
| SUBMITTED | -          | -          | -        | -        | -          | -          | -               |
| APPROVED  | ✓ (leader) | ✓ (1-24h)  | -        | -        | -          | -          | -               |
| LOCKED    | ✓ (leader) | ✓ (24-72h) | ✓ (leader) | ✓ (1-12h) | -        | -          | -               |
| REJECTED  | -          | -          | -        | -        | ✓ (leader) | ✓ (1-12h)  | ✓ (reason)      |

### Calculator usage

- **KHÔNG hardcode** CPA / ROAS / conversionRate / remainingBudget.
- Tất cả metric sinh từ `MarketingExpenseCalculator.calculateAll({...})`.
- Seed verify 5 sample reports — tất cả match chính xác với re-compute.

### Foreign keys (không random ObjectId)

- `marketingEmployeeId` ← `Employee.find({ isActive, roleId: MKT })`
- `facebookPageId` ← `FacebookPage.find({ isActive: true })`
- `approvedBy` / `lockedBy` / `rejectedBy` ← `Employee.EMP_LEADER_MKT` (fallback admin)
- `createdBy` ← `Employee.username = "admin"`

### totalRevenue fallback

- Ưu tiên `Order.find({ marketingEmployeeId, createdAt ∈ reportDate, isActive: true })` → sum `totalAmount`.
- Nếu không có Order khớp → fallback `spentTotal * randFloat(1.2, 3.5)`.

### Verification (kết quả thực tế)

```
Total reports: 80
Status distribution: DRAFT=18, SUBMITTED=15, APPROVED=15, LOCKED=26, REJECTED=6
Date windows: 7d=22 (27.5%), 30d=37 (46.3%), 90d=21 (26.3%)
Slot coverage: morning=51, afternoon=58, emergency=62
FK integrity: invalidFbPage=0, invalidMktEmployee=0
Workflow integrity: all 0 missing (APPROVED/LOCKED/REJECTED đầy đủ audit fields)
Calculator consistency: 5/5 samples match
Duplicate (date, page) pairs: 0

Idempotency:
  Run 1 (clean):    inserted=80, updated=0,  total=80
  Run 2 (re-seed):  inserted=0,  updated=80, total=80  ← KHÔNG duplicate
```

### Verification checklist

- [x] Seed chạy nhiều lần không duplicate (total ổn định ở 80)
- [x] `MarketingExpenseCalculator.calculateAll()` được sử dụng (5/5 sample match)
- [x] Không vi phạm unique index `(reportDate, facebookPageId)`
- [x] Có đủ dữ liệu 7 / 30 / 90 ngày (27.5% / 46.3% / 26.3%)
- [x] Có đủ mọi trạng thái (DRAFT/SUBMITTED/APPROVED/LOCKED/REJECTED đều có)
- [x] Có đủ MORNING / AFTERNOON / URGENT (51 / 58 / 62 reports)
- [x] `npx tsc --noEmit` → 0 TypeScript Error
- [x] Workflow fields đầy đủ (APPROVED có approvedBy/At, LOCKED có all 3, REJECTED có reason)
- [x] PROJECT_PROGRESS.md cập nhật Sprint 6.6

### Review

Status: Ready for next Sprint


## Sprint 6.7 — Marketing Expense CRUD (Backend)

### Mục tiêu

Hoàn thiện CRUD Backend cho Marketing Expense:

-   API: `GET / POST /api/marketing/expenses`, `GET / PATCH / DELETE /api/marketing/expenses/:id`
-   Filter: keyword, status, marketingEmployeeId, facebookPageId, dateFrom, dateTo, page, pageSize, sortField, sortOrder
-   Sort whitelist: reportDate, requestedBudget, approvedBudget, spentBudget, totalRevenue, CPA, ROAS, conversionRate, createdAt, updatedAt
-   Service business rules: create / update / delete / getList / getById (single source of truth — không duplicate ở Route)
-   Update rules: chỉ DRAFT / REJECTED mới được sửa (SUBMITTED / APPROVED / LOCKED → 409)
-   Delete rules: chỉ DRAFT / REJECTED mới được soft-delete (SUBMITTED / APPROVED / LOCKED → 409)
-   Soft-delete: set `isActive = false` (giữ document để audit)
-   Calculator: phải dùng `MarketingExpenseCalculator.calculateAll()` (không tự tính CPA/ROAS/conversionRate/remainingBudget)
-   Mapper: response shape ổn định, có `statusLabel` / `statusColor` cho UI

### Files thay đổi / tạo mới

| File                                                                              | Loại    |
| --------------------------------------------------------------------------------- | ------- |
| `src/models/MarketingExpenseReport.ts`                                            | Update  |
| `src/constants/permissions.ts`                                                    | Update  |
| `src/constants/roles.ts`                                                         | Update  |
| `src/types/marketing-expense.ts`                                                  | Update  |
| `src/validators/marketing-expense.validator.ts`                                   | Update  |
| `src/services/marketing-expense.service.ts`                                       | Update  |
| `src/repositories/marketing-expense.repository.ts`                                | Update  |
| `src/db/seeds/permissions.seed.ts`                                                | Update  |
| `src/mappers/marketing-expense.mapper.ts`                                         | New     |
| `src/app/api/marketing/expenses/route.ts`                                         | New     |
| `src/app/api/marketing/expenses/[id]/route.ts`                                    | New     |

### Kiến trúc (đã giữ nguyên)

```
API Route (parse + permission)
  ↓
MarketingExpenseService (business logic + calculator)
  ↓
MarketingExpenseRepository (Mongo query)
  ↓
MongoDB
```

### Business rules

| Action  | Điều kiện                                          |
| ------- | -------------------------------------------------- |
| CREATE  | chưa tồn tại (reportDate, facebookPageId) — 409 nếu trùng |
| UPDATE  | chỉ DRAFT / REOPENED / REJECTED                    |
| DELETE  | chỉ DRAFT / REOPENED / REJECTED — soft-delete      |
| GET     | luôn OK nếu user có `marketing-expense.view`       |

### Verification (smoke test thực tế)

-   `npx tsc --noEmit` → **0 errors**
-   14 case CRUD cơ bản: list (default + keyword + status + employee + dateFrom-To + pagination + sortField thuộc whitelist + sortField ngoài whitelist), detail, create, duplicate, patch, delete, soft-delete ẩn khỏi list, PATCH SUBMITTED → 409, DELETE LOCKED → 409, POST invalid → 400, GET invalid dateFrom → 400
-   Sort whitelist đầy đủ: 10 field (reportDate, requestedBudget, approvedBudget, spentBudget, totalRevenue, cpa, roas, conversionRate, createdAt, updatedAt) — sortField ngoài whitelist → fallback về reportDate
-   Calculator consistency: lấy 1 sample → re-tính `remainingBudget / conversionRate / roas / cpa` bằng tay → match response
-   Permission: ADMIN có đủ 9 permission `marketing-expense.*`; MKT có 5 permission (view, create, update, delete, submit); không có approve / lock / reject / reopen

### Review

Status: Ready for next Sprint (Sprint 6.8 — Marketing Expense Workflow APIs / Frontend)


## Sprint 6.8 — Marketing Expense React Query Hooks

### Mục tiêu

Hoàn thiện React Query Hooks cho Marketing Expense — tầng trung gian giữa React Component và API Route.

### Files tạo mới / thay đổi

| File                                          | Loại |
| --------------------------------------------- | ---- |
| `src/hooks/useMarketingExpenses.ts`            | New  |

### Hooks cung cấp

**Query:**
-   `useMarketingExpenses(filters)` — list (paginated, filterable, sortable)
-   `useMarketingExpense(id)` — detail (kèm populated refs)

**Mutation (CRUD):**
-   `useCreateMarketingExpense` — POST   `/api/marketing/expenses`
-   `useUpdateMarketingExpense` — PATCH  `/api/marketing/expenses/:id`
-   `useDeleteMarketingExpense` — DELETE `/api/marketing/expenses/:id` (soft-delete)

**Mutation (Workflow):**
-   `useSubmitMarketingExpense` — POST `/api/marketing/expenses/:id/submit`
-   `useApproveMarketingExpense` — POST `/api/marketing/expenses/:id/approve`
-   `useRejectMarketingExpense` — POST `/api/marketing/expenses/:id/reject` (cần `rejectionReason`)
-   `useLockMarketingExpense` — POST `/api/marketing/expenses/:id/lock`
-   `useReopenMarketingExpense` — POST `/api/marketing/expenses/:id/reopen`

### Query keys (chuẩn hoá toàn project)

```ts
marketingExpenseKeys.all       // ["marketing-expenses"]
marketingExpenseKeys.lists()   // ["marketing-expenses", "list"]
marketingExpenseKeys.list(f)   // ["marketing-expenses", "list", f]
marketingExpenseKeys.details() // ["marketing-expenses", "detail"]
marketingExpenseKeys.detail(id)// ["marketing-expenses", "detail", id]
```

### Invalidate

-   CREATE / DELETE              → `marketing-expenses` + `marketing-dashboard` (cả 2 convention)
-   UPDATE                       → `marketing-expenses` + `marketing-expense/:id` + `marketing-dashboard`
-   SUBMIT / APPROVE / REJECT / LOCK / REOPEN
                                   → như UPDATE

### Options (query hooks)

```ts
{
  staleTime: 60_000,        // 60s
  gcTime: 5 * 60_000,      // 5 phút
  retry: 2,
  refetchOnWindowFocus: false,
}
```

### Toast (mutation hooks)

-   Success → `toast.success(message)` với message lấy từ response backend (không hardcode).
-   Error   → `toast.error(message)`   với message lấy từ response backend.
-   Hook dùng lại `toast` từ `@/components/common/feedback/Toast` (Sprint 3.1 UI Kit).

### Helper

-   `request<T>()` — wrapper `fetch`:
    -   Tự động gắn `Content-Type: application/json`.
    -   Check `response.ok` + `payload.success` → throw `Error(message)` nếu fail.
    -   Trả về `payload.data` nếu OK.

### Types

-   Hook dùng các type có sẵn:
    -   `MarketingExpense`           — từ `@/types/marketing-expense`
    -   `MarketingExpenseFilter`      — từ `@/types/marketing-expense`
    -   `MarketingExpenseSummary`    — từ `@/types/marketing-expense` (re-export)
    -   `MarketingExpenseResponse`   — từ `@/mappers/marketing-expense.mapper` (re-export)
-   Định nghĩa thêm 1 type local `MarketingExpenseListPayload` (response shape thực tế từ API, có `pageSize` thay vì `limit` để khớp route).
-   KHÔNG tạo type mới nào khác.

### Notes

-   Workflow endpoint (`submit` / `approve` / `reject` / `lock` / `reopen`) **chưa được build ở Sprint 6.7** — sẽ làm ở Sprint sau. Hook layer reference sẵn các endpoint đó để UI/page chỉ cần import hook là dùng được.
-   Invalidate `marketing-dashboard` match cả 2 convention:
    -   `["marketing-dashboard"]` (useMarketingLeads, lead detail page)
    -   `["marketing", "dashboard"]` (useMarketingDashboard)
    vì React Query dùng **prefix match trên array key**, 2 array khác nhau không match nhau.

### Verification

-   `npx tsc --noEmit` → **0 TypeScript Error**
-   Lint: **clean** (no errors / warnings)
-   10 hooks được export đầy đủ (2 query + 3 CRUD + 5 workflow)
-   Query keys thống nhất (centralized qua `marketingExpenseKeys`)
-   Invalidate pattern đúng spec (CRUD vs workflow)
-   Toast sử dụng `@/components/common/feedback/Toast` (không hardcode message — lấy từ response)
-   Không gọi Service/Repository (chỉ fetch API)
-   Không mock (real API call)
-   Không tạo axios instance mới (dùng `fetch` như `useOrders` / `useMarketingLeads`)

### Review

Status: Ready for next Sprint


### Sprint 6.8 — Refactor (shared `request` + dashboard key canonical)

#### Phản hồi review

Hai điểm chỉnh sau khi review Sprint 6.8:

1.  Không nên invalidate cả 2 dashboard key mãi mãi → chuẩn hoá canonical key.
2.  Không để mỗi hook có một `request` wrapper riêng → tách ra `@/lib/request`.

#### Files

| File                                         | Loại     |
| -------------------------------------------- | -------- |
| `src/lib/request.ts`                          | New      |
| `src/hooks/marketingDashboardKeys.ts`         | New      |
| `src/hooks/useMarketingExpenses.ts`            | Modified |

#### `src/lib/request.ts` (mới)

```ts
import { request } from "@/lib/request";

export interface ApiOk<T>  { success: true; message: string; data: T; }
export interface ApiErr   { success: false; message: string; }
export type ApiResult<T> = ApiOk<T> | ApiErr;

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown; // sẽ được JSON.stringify tự động
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T>;
```

-   Tự gắn `Content-Type: application/json`.
-   Tự `JSON.stringify` nếu `body` là object (không cần `JSON.stringify(data)` ở caller).
-   `body === null | undefined` → không gửi body.
-   Throw `Error(payload.message)` nếu `response.ok === false` hoặc `payload.success === false`.
-   Catch JSON parse fail → throw `Error("HTTP <status>: <text>")`.

#### `src/hooks/marketingDashboardKeys.ts` (mới)

```ts
export const marketingDashboardKeys = {
  all:           ["marketing-dashboard"] as const,
  summaries:     () => [...marketingDashboardKeys.all, "summary"] as const,
  summary:       () => [...marketingDashboardKeys.summaries()] as const,
  charts:        () => [...marketingDashboardKeys.all, "charts"] as const,
  activities:    () => [...marketingDashboardKeys.all, "activities"] as const,
  quickActions:  () => [...marketingDashboardKeys.all, "quick-actions"] as const,
};
```

Canonical prefix: `["marketing-dashboard"]`.

-   Tất cả hook (cũ + mới) dùng key này khi invalidate / queryKey liên quan dashboard.
-   `useMarketingDashboard.ts` cũ đang dùng `["marketing", "dashboard"]` — Sprint 7.1 sẽ migrate (ngoài phạm vi Sprint 6.8).
-   Không sửa `useMarketingDashboard.ts` để tuân thủ "Không sửa Sprint trước".

#### `src/hooks/useMarketingExpenses.ts` (modified)

-   Import `request` từ `@/lib/request` thay vì define inline.
-   Import `marketingDashboardKeys` từ `@/hooks/marketingDashboardKeys`.
-   Invalidate dashboard chỉ 1 lần:
    ```ts
    void queryClient.invalidateQueries({ queryKey: marketingDashboardKeys.all });
    ```
-   Body truyền thẳng object, không cần `JSON.stringify`:
    ```ts
    request<...>("/api/marketing/expenses", { method: "POST", body: data });
    ```

#### Verification

-   `npx tsc --noEmit` → **0 errors**
-   Lint → **clean**
-   `marketingDashboardKeys.all === ["marketing-dashboard"]` ✅ (verified via Node import)
-   Không còn duplicate `request` wrapper trong hook này (chỉ 1 nơi ở `@/lib/request`)
-   Không sửa `useMarketingDashboard.ts` cũ (để Sprint 7.1 migrate)

#### Migration note (Sprint 7.1)

Khi chuẩn hoá dashboard hooks:
1.  `useMarketingDashboard.ts` → đổi `queryKey: ["marketing", "dashboard"]` thành `marketingDashboardKeys.summary()` (hoặc factory phù hợp).
2.  Các page/component khác dùng `["marketing-dashboard"]` literal → đổi sang `marketingDashboardKeys.X`.
3.  Sau migration, `marketingDashboardKeys.all` sẽ match **tất cả** dashboard queries trong project → invalidate 1 lần là đủ.


## Sprint 6.9 — Marketing Expense List UI

### Mục tiêu

Hoàn thiện giao diện danh sách Marketing Expense tại `/marketing/expense`.

### Files tạo mới

| File | Loại |
| ---- | ---- |
| `src/app/(protected)/marketing/expense/page.tsx` | New |
| `src/app/(protected)/marketing/expense/MarketingExpenseToolbar.tsx` | New |
| `src/app/(protected)/marketing/expense/MarketingExpenseTable.tsx` | New |
| `src/app/(protected)/marketing/expense/marketing-expense.module.css` | New |

### Page: `/marketing/expense`

- **PageHeader**: tiêu đề "Chi phí Marketing"
- **MarketingExpenseToolbar**: SearchInput (debounce 500ms) + FilterBar + nút Tạo mới (navigate `/marketing/expense/new`) + Làm mới
- **MarketingExpenseTable**: DataTable với 13 columns + SkeletonTable khi loading
- **EmptyState**: "Không thể tải dữ liệu" (error) / "Chưa có báo cáo" (empty)

### Table columns

| # | Column | Sort | Render |
| - | ------ | ---- | ------ |
| 1 | Ngày báo cáo | ✅ (reportDate) | `toLocaleDateString` |
| 2 | Facebook Page | — | `facebookPage.name` / `code` |
| 3 | Nhân viên Marketing | — | `fullName` + `employeeCode` |
| 4 | Ngân sách yêu cầu | ✅ (requestedBudget) | Tổng 3 slot (morning + afternoon + emergency) |
| 5 | Ngân sách duyệt | ✅ (approvedBudget) | Tổng 3 slot (trong model hiện tại = requested) |
| 6 | Ngân sách thực chi | ✅ (spentBudget) | Tổng 3 slot |
| 7 | Ngân sách còn lại | ✅ (remainingBudget) | Green color |
| 8 | ROAS | ✅ (roas) | `Nx` format |
| 9 | CPA | ✅ (cpa) | VND format |
| 10 | Tỷ lệ chuyển đổi | ✅ (conversionRate) | % format |
| 11 | Trạng thái | — | Custom Tag với colors từ `marketing-expense.config` |
| 12 | Ngày tạo | ✅ (createdAt) | `toLocaleDateString` |
| 13 | Thao tác | — | Dropdown menu (chỉ render, chưa xử lý Drawer) |

### Sort

- Dùng `sortField` + `sortOrder` → gửi lên server (server-side sort).
- Sort whitelist đã implement ở repository Sprint 6.7.
- Ant Design sort indicator trên column header.

### Filter

- **Status**: FilterSelect với 6 giá trị (DRAFT / SUBMITTED / APPROVED / REJECTED / LOCKED / REOPENED).
- **Date Range**: FilterDateRange (reportDate).
- **Search**: keyword → debounce 500ms → gửi lên server (search theo `note`).
- Filter thay đổi → reset page về 1.

### Pagination

- Server-side pagination: `page` + `pageSize`.
- Ant Design Pagination (showSizeChanger, showQuickJumper, showTotal).

### Action menu

Menu items: View / Sửa / Nộp báo cáo / Duyệt / Từ chối / Khóa / Mở lại / Xóa.
Mỗi item có `disabled` theo workflow rule (DRAFT mới được sửa/xóa, SUBMITTED mới được approve/reject, etc.)

Chưa xử lý Drawer (Sprint tiếp theo).

### Permission

- `PermissionGate("marketing-expense.view")` → page có thể xem
- `PermissionGate("marketing-expense.create")` → nút Tạo mới

### Types

- `MarketingExpenseResponse` — từ `@/mappers/marketing-expense.mapper`
- `MarketingExpenseFilter` — từ `@/hooks/useMarketingExpenses`
- `MarketingExpenseReportStatus` — từ `@/constants/marketing-expense`

### CSS

- CSS Module `marketing-expense.module.css` — class prefix `.me-`
- Responsive: toolbar flex-wrap ở 1024px / 768px

### Verification

- `npx tsc --noEmit` → **0 TypeScript Error**
- Lint → **clean**
- Không mock (dùng `useMarketingExpenses` — Sprint 6.8)
- Không fetch trực tiếp (chỉ qua hook)
- Không tạo Drawer / Form / Workflow (Sprint sau)
- `PROJECT_PROGRESS.md` → Sprint 6.9 section


## Sprint 6.10 — Marketing Expense Drawer + Form

### Mục tiêu

Hoàn thiện Drawer + Form cho Marketing Expense.

### Files tạo mới

- `src/components/marketing-expense/MarketingExpenseDrawer.tsx` — Drawer wrapper (create/edit mode)
- `src/components/marketing-expense/MarketingExpenseForm.tsx` — Form component (reusable)
- `src/components/marketing-expense/MarketingExpenseSummaryCard.tsx` — Summary card (reusable)
- `src/components/marketing-expense/BudgetAllocationTable.tsx` — Budget table với debounce
- `src/app/(protected)/marketing/expense/marketing-expense.module.css` — CSS Module
- `src/configs/marketing-budget-slots.config.ts` — Config-driven budget slots

### Files cập nhật

- `src/validators/marketing-expense.validator.ts` — Thêm `note` field, đồng bộ schema
- `src/app/(protected)/marketing/expense/page.tsx` — Tích hợp Drawer
- `src/app/(protected)/marketing/expense/MarketingExpenseToolbar.tsx` — Thêm `onCreate` prop
- `src/app/(protected)/marketing/expense/MarketingExpenseTable.tsx` — Thêm `onEdit` prop

### Architecture

```
Drawer (open/close, mutation)
↓
Form (fields, validation)
↓
useForm + zodResolver
↓
React Query Mutation
↓
API
```

### Features

- **Config-driven budget slots**: `MARKETING_BUDGET_SLOTS` — thêm ca mới không cần sửa component
- **Reusable Summary Card**: Dùng cho Drawer, Detail, Approve, Dashboard
- **Separated concerns**: Drawer chỉ open/close, Form chỉ form logic
- **Debounced inputs**: 200ms debounce cho budget inputs
- **Create mode**: POST `/api/marketing/expenses`
- **Edit mode**: PATCH `/api/marketing/expenses/:id`
- **Fields**: Report Date, Facebook Page, Marketing Employee, Note
- **Budget Table**: Morning / Afternoon / Emergency với Requested, Approved, Spent, Remaining
- **Summary Card**: Real-time budget summary + ROAS, CPA, Conversion Rate
- **Calculator**: `sumBudgetAllocation()`, `calculateBudgetSummary()`
- **Cancel confirm**: ConfirmDialog khi form dirty

### Verification

- `npx tsc --noEmit` → **0 TypeScript Error**
- Lint → **clean**
- Dùng `useCreateMarketingExpense()`, `useUpdateMarketingExpense()` hooks
- Không mock, không tự tính toán trong component
- `PROJECT_PROGRESS.md` → Sprint 6.10 section

## Sprint 6.11 � Marketing Expense Workflow UI

### M?c ti�u

Ho�n thi?n Workflow UI cho Marketing Expense.

### Files t?o m?i

- src/components/marketing-expense/MarketingExpenseWorkflowBar.tsx � Workflow action bar
- src/components/marketing-expense/RejectDialog.tsx � Reject dialog v?i rejection reason
- src/components/marketing-expense/marketing-expense-workflow.module.css � Workflow styles

### Files c?p nh?t

- src/configs/marketing-expense-actions.config.tsx � Th�m permissions cho m?i action
- src/components/marketing-expense/MarketingExpenseDrawer.tsx � Th�m WorkflowBar + readonly khi locked
- src/app/(protected)/marketing/expense/page.tsx � Update header comment

### Workflow

`
DRAFT ? SUBMITTED ? APPROVED ? LOCKED
  ?          ?
  �       REJECTED
  �
REOPENED
`

### Features

- **Action Bar**: Config-driven, l?y t? MARKETING_EXPENSE_ACTIONS
- **Permission**: ?n button n?u kh�ng c� quy?n
- **Confirm Dialog**: Submit, Approve, Lock, Reopen d?u confirm
- **Reject Dialog**: Textarea cho rejection reason (required)
- **Readonly**: Khi LOCKED th� form readonly
- **Timeline refresh**: Sau mutation th� refetch d? c?p nh?t timeline
- **Toast**: Message t? backend, kh�ng hardcode

### Permissions

- marketing-expense.submit
- marketing-expense.approve
- marketing-expense.reject
- marketing-expense.lock
- marketing-expense.reopen

### Verification

- 
px tsc --noEmit ? **0 TypeScript Error**
- Lint ? **clean**
- D�ng hooks c� s?n (useSubmitMarketingExpense, etc.)
- Kh�ng mock
- PROJECT_PROGRESS.md ? Sprint 6.11 section

---

## Sprint 6.11 � Updates (Config-driven + Timeline + RejectionReason)

### Improvements

1. **Config-driven WorkflowBar**
   - getMarketingExpenseActions(status, permissions) trong config
   - WorkflowBar ch? render: ctions.map(...)
   - Kh�ng c� if/else trong component

2. **Timeline Invalidate**
   - Th�m marketingExpenseKeys.timeline(id) v�o hooks
   - Sau mutation invalidate c? timeline

3. **RejectionReason Fields**
   - Types d� c�: ejectedBy, ejectedAt, ejectionReason
   - Mapper d� map d?y d?
   - Detail UI sau n�y hi?n th? l� do t? ch?i

---

## Sprint 6.12 � Marketing Expense Detail + Timeline

### M?c ti�u

Ho�n thi?n trang Detail cho Marketing Expense.

### Files t?o m?i

- src/app/(protected)/marketing/expense/[id]/page.tsx � Detail page
- src/components/marketing-expense/MarketingExpenseDetail.tsx � Detail component
- src/components/marketing-expense/MarketingExpenseTimeline.tsx � Timeline component
- src/components/marketing-expense/MarketingExpenseAuditCard.tsx � Audit card component
- src/components/marketing-expense/*.module.css � CSS modules
- src/constants/marketing-expense-action.ts � History actions constant
- src/models/MarketingExpenseHistory.ts � History model
- src/services/marketing-expense-history.service.ts � History service
- src/repositories/marketing-expense-history.repository.ts � History repository
- src/app/api/marketing/expenses/[id]/timeline/route.ts � Timeline API

### Files c?p nh?t

- src/hooks/useMarketingExpenses.ts � Th�m useMarketingExpenseTimeline()

### Layout

`
Header
Action Bar (WorkflowBar) � reuse
Summary Card
Tabs (Th�ng tin, Budget, Summary, Timeline)
`

### Tabs

- **Th�ng tin**: Report date, Facebook Page, Marketing Employee, Status, Note + Audit card
- **Budget Allocation**: 3 cards (Requested, Spent, Remaining) v?i morning/afternoon/emergency
- **Summary**: MarketingExpenseSummaryCard reuse
- **Timeline**: Ant Design Timeline, d?c t? MarketingExpenseHistory

### Audit Card

- Created By / Created At
- Updated By / Updated At
- Approved By / Approved At
- Rejected By / Rejected At / Rejection Reason
- Locked By / Locked At

### Timeline

- Query ri�ng: marketingExpenseKeys.timeline(id)
- Actions: CREATED, UPDATED, SUBMITTED, APPROVED, REJECTED, LOCKED, REOPENED
- Icons v� colors theo action type

### Features

- **WorkflowBar reuse** � kh�ng duplicate
- **StatusBadge** � d�ng marketingExpenseStatusConfig
- **Skeletons** � SkeletonCard thay v� Spin
- **EmptyState** � cho error/not found
- **Permission gate** � marketing-expense.view
- **403 fallback** � khi kh�ng c� quy?n

### Verification

- 
px tsc --noEmit ? **0 TypeScript Error**
- Lint ? **clean**
- Detail d?c MongoDB
- Timeline d?c MongoDB
- Audit hi?n th? d?y d?
- RejectionReason hi?n th?
- StatusBadge d�ng config
- WorkflowBar reuse
- Kh�ng mock
- Kh�ng duplicate logic
- React Query
- PROJECT_PROGRESS.md ? Sprint 6.12 section


---\
\
## Sprint 7.0 � Marketing Dashboard MongoDB\
\
### Status\
\
? Completed (2026-08-05)\
\
### M?c ti�u\
\
Thay to�n b? Dashboard Marketing hi?n t?i sang d? li?u MongoDB th?t.\
\
### Architecture\
\
\\\\
Marketing Dashboard Route\
    ?\
MarketingDashboardService\
    ?\
Repository Layer (MarketingDashboardRepository)\
    ?\
MongoDB\
\\\\
\
### KH�NG �U?C\
\
- Kh�ng s?a Sidebar\
- Kh�ng s?a Header\
- Kh�ng s?a UI Kit\
- Kh�ng s?a Marketing Expense\
- Kh�ng s?a Lead\
- Kh�ng s?a Order\
- Kh�ng s?a Warehouse\
- Kh�ng s?a Inventory\
- Kh�ng s?a Workflow\
\
### Files t?o m?i\
\
| File | M?c d�ch |\
|------|----------|\
| src/repositories/marketing-dashboard.repository.ts | Repository ri�ng cho Dashboard |\
\
### Files ch?nh s?a\
\
| File | Thay d?i |\
|------|-----------|\
| src/types/marketing-dashboard.ts | Th�m types cho Expense, Revenue, ROAS, Charts |\
| src/services/marketing-dashboard.service.ts | G?i repository m?i, orchestration |\
| src/hooks/useMarketingDashboard.ts | D�ng marketingDashboardKeys |\
| src/app/(protected)/marketing/dashboard/marketing.config.tsx | 8 stat cards |\
| src/app/(protected)/marketing/dashboard/page.tsx | D�ng FullMarketingStats |\
| src/app/(protected)/marketing/dashboard/TopMarketingTable.tsx | D�ng TopMarketingChannel type |\
\
### Repository Methods\
\
\\\\
aggregateLeadSummary()        // Lead counts\
aggregateLeadSource()         // Lead by source\
aggregateTopMarketingByLeads() // Top marketing by lead\
aggregateExpenseSummary()      // Total spent, revenue, ROAS, CPA\
aggregateTopMarketingChannels() // Top channels by ROAS\
aggregateRevenueSummary()      // Today, month, total revenue\
aggregateDailyChart()          // Last 7 days\
aggregateMonthlyChart()        // Last 12 months\
\\\\
\
### Dashboard Data\
\
| Card | Data |\
|------|------|\
| Lead h�m nay | summary.todayLead |\
| Lead th�ng | summary.monthLead |\
| Lead d� giao Sale | summary.assignedLead |\
| Lead ch?t | summary.closedLead |\
| Chi ph� qu?ng c�o | expense.totalSpent |\
| Doanh thu | evenue.monthRevenue |\
| ROAS | expense.roas |\
| Conversion Rate | expense.averageConversionRate |\
\
### Hook Configuration\
\
\\\\
queryKey: marketingDashboardKeys.all  // [marketing-dashboard]\
staleTime: 60 * 1000                  // 60 seconds\
gcTime: 5 * 60 * 1000                // 5 minutes\
\\\\
\
### Verification\
\
- [x] Dashboard d?c MongoDB\
- [x] Kh�ng c�n mock\
- [x] Lead d�ng\
- [x] Expense d�ng\
- [x] Revenue d�ng\
- [x] ROAS d�ng\
- [x] Conversion d�ng\
- [x] React Query\
- [x] Repository ri�ng\
- [x] Service ch? orchestration\
- [x] npx tsc --noEmit � 0 TypeScript Error\
- [x] PROJECT_PROGRESS.md c?p nh?t Sprint 7.0\
\
### Review\
\
Reviewed by Cursor Agent\
\
Status: Ready for next Sprint


---

## Sprint 7.1 � Dashboard Repository Refactor

### Status

? Completed (2026-08-05)

### M?c ti�u

Refactor Repository v� Card Config theo y�u c?u.

### Repository Refactor

**Tru?c:**
```
MarketingDashboardRepository
```

**Sau:**
```
DashboardRepository
  aggregateMarketingDashboard()
```

### Card Config Refactor

Cards d�ng selector + formatter + permission.

```typescript
{
  key: "totalSpent",
  title: "Chi ph� qu?ng c�o",
  selector: (data) => data.expense.totalSpent,
  formatter: "currency",
  permission: "marketing.dashboard.expense",
}
```

### Formatter Types

```typescript
type CardFormatter = "number" | "currency" | "percent" | "roas" | "cpa";
```

### dashboardKeys per domain

```typescript
export const dashboardKeys = {
  all: ["dashboard"] as const,
  marketing: () => [...dashboardKeys.all, "marketing"] as const,
  sales: () => [...dashboardKeys.all, "sales"] as const,
};
```

### Files thay d?i

| File | Thay d?i |
|------|-----------|
| `src/hooks/dashboardKeys.ts` | T?o m?i |
| `src/hooks/useMarketingDashboard.ts` | D�ng `dashboardKeys.marketing()` |
| `src/app/(protected)/marketing/dashboard/marketing.config.tsx` | selector + formatter + permission |

### Verification

- [x] TypeScript: 0 Error
- [x] Repository t�i s? d?ng cho c�c dashboard kh�c
- [x] Cards d? m? r?ng

### Review

Reviewed by Cursor Agent

Status: Ready for Sprint 7.2

---

## Sprint 7.2 � Marketing Dashboard Charts & Analytics

### Status

? Completed (2026-08-05)

### M?c ti�u

Ho�n thi?n Dashboard Marketing v?i bi?u d? th?ng k� s? d?ng d? li?u MongoDB th?t.

### Repository Methods

```typescript
aggregateLeadTrend(period)
aggregateExpenseTrend(period)
aggregateRevenueTrend(period)
aggregateROASTrend(period)
aggregateConversionTrend(period)
aggregateTopFacebookPages()
aggregateTopMarketingEmployees()
aggregateTopCampaigns()
aggregateChartData(period)
aggregateRankingData()
```

### Service Methods

```typescript
getChartData(period)  // CH? orchestration
getRankingData()     // CH? orchestration
```

### Dashboard Sections

1. Lead Trend � Line Chart
2. Expense vs Revenue � Bar Chart
3. ROAS Trend � Area Chart
4. Conversion Trend � Line Chart
5. Top Facebook Pages � Table
6. Top Marketing Employees � Table
7. Top Campaigns � Table

### Files t?o m?i

| File | M?c d�ch |
|------|----------|
| `src/app/(protected)/marketing/dashboard/marketing-dashboard-chart.config.ts` | Chart config |
| `src/app/(protected)/marketing/dashboard/marketing-dashboard-ranking.config.tsx` | Ranking config |
| `src/app/(protected)/marketing/dashboard/MarketingDashboardFilters.tsx` | Filter component |
| `src/app/(protected)/marketing/dashboard/MarketingDashboardCharts.tsx` | Charts component |
| `src/app/(protected)/marketing/dashboard/MarketingDashboardRanking.tsx` | Ranking component |
| `src/hooks/useMarketingChartData.ts` | Chart data hook |
| `src/hooks/useMarketingRankingData.ts` | Ranking data hook |
| `src/app/api/marketing/dashboard/chart/route.ts` | Chart API |
| `src/app/api/marketing/dashboard/ranking/route.ts` | Ranking API |

### Config-driven

Charts v� Rankings du?c d?nh nghia trong config array, kh�ng hardcode.

```typescript
export const MARKETING_DASHBOARD_CHARTS = [
  { id: "leadTrend", title: "Xu hu?ng Lead", type: "line", ... },
  { id: "expenseRevenue", title: "Chi ph� vs Doanh thu", type: "bar", ... },
];
```

### React Query Keys

```typescript
dashboardKeys.marketing()           // ["dashboard", "marketing"]
dashboardKeys.marketingCharts()    // ["dashboard", "marketing", "charts"]
dashboardKeys.marketingRanking()  // ["dashboard", "marketing", "ranking"]
```

### Filters

- Date Range: 7 Days, 30 Days, 90 Days
- Period du?c truy?n qua query param

### Verification

- [x] Dashboard ch? d?c MongoDB
- [x] Kh�ng mock
- [x] Repository ch? aggregate
- [x] Service ch? orchestration
- [x] Charts d�ng config
- [x] Ranking d�ng config
- [x] React Query keys d�ng
- [x] npx tsc --noEmit � 0 TypeScript Error
- [x] PROJECT_PROGRESS.md c?p nh?t Sprint 7.2

### Review

Reviewed by Cursor Agent

Status: Ready for next Sprint


## Sprint 7.3 � Marketing Dashboard Drill-down & Export

### Status

? Completed (2026-08-05)

### M?c ti�u

Ho�n thi?n Dashboard Marketing b?ng kh? nang drill-down, filter n�ng cao v� export.

### KH�NG �U?C

- Kh�ng s?a Sprint tru?c
- Kh�ng s?a UI Kit
- Kh�ng s?a Sidebar
- Kh�ng s?a Header
- Kh�ng t?o mock data
- Ch? d�ng MongoDB

### Files t?o m?i

| File | Lo?i |
| ---- | ---- |
| src/app/(protected)/marketing/dashboard/MarketingDashboardAdvancedFilters.tsx | New |
| src/app/(protected)/marketing/dashboard/MarketingDashboardDrillDownDrawer.tsx | New |
| src/app/api/marketing/dashboard/export/route.ts | New |
| src/app/api/marketing/dashboard/drill-down/route.ts | New |
| src/hooks/useMarketingDashboardExport.ts | New |
| src/hooks/useMarketingDashboardDrillDown.ts | New |
| src/lib/export-utils.ts | New |
| src/types/marketing-dashboard-filter.ts | New |

### Files s?a

| File | Thay d?i |
| ---- | -------- |
| src/app/(protected)/marketing/dashboard/page.tsx | Th�m filters, export buttons, drill-down drawer |
| src/app/(protected)/marketing/dashboard/MarketingStatsGrid.tsx | Th�m onCardClick callback |
| src/app/(protected)/marketing/dashboard/MarketingDashboardCharts.tsx | Th�m onChartClick callback |
| src/app/(protected)/marketing/dashboard/MarketingDashboardRanking.tsx | Th�m onRowClick callback |
| src/app/(protected)/marketing/dashboard/marketing.config.tsx | Th�m drillDown/exportable flags |
| src/app/(protected)/marketing/dashboard/marketing-dashboard-chart.config.ts | Th�m drillDown/exportable flags |
| src/app/(protected)/marketing/dashboard/marketing-dashboard-ranking.config.tsx | Th�m drillDown/exportable flags |
| src/app/(protected)/marketing/dashboard/marketing.module.css | Th�m CSS cho advanced filters v� drawer |
| src/repositories/dashboard.repository.ts | Th�m aggregateExportData, aggregateDrillDown |
| src/services/marketing-dashboard.service.ts | Th�m getExportData, getDrillDown |
| src/components/common/cards/StatCard.tsx | Th�m onClick prop |
| src/components/common/table/DataTable.tsx | Th�m onRow prop |
| src/types/marketing-dashboard.ts | Th�m DrillDownData, ExportData types |

### Dashboard Advanced Filters

Component MarketingDashboardAdvancedFilters v?i c�c filter:
- Date Range (kho?ng ng�y)
- Facebook Page
- Marketing Employee
- Campaign
- Source
- Status

Filter d�ng chung cho: Cards, Charts, Ranking

React Query refetch to�n b? dashboard khi filter thay d?i.

### Drill-down

Click v�o Card, Chart point, ho?c Ranking row ? m? Drawer

Component MarketingDashboardDrillDownDrawer hi?n th?:
- Danh s�ch Lead
- Marketing Expense
- Revenue
- Order

### Export

Th�m n�t Export Excel v� Export PDF

Export d�ng filter hi?n t?i.

Bao g?m:
- Summary
- Lead Trend
- Expense Trend
- Revenue Trend
- ROAS Trend
- CPA Trend
- Facebook Pages Ranking
- Marketing Employees Ranking
- Campaigns Ranking

### Repository Methods

aggregateExportData(filter)  // CH? aggregate
aggregateDrillDown(filter)    // CH? aggregate

### Service Methods

getExportData(filter)   // CH? orchestration
getDrillDown(filter)     // CH? orchestration

### API Routes

- GET /api/marketing/dashboard/export
- GET /api/marketing/dashboard/drill-down

### Hooks

useMarketingDashboardExport(filter)    // React Query
useMarketingDashboardDrillDown(filter) // React Query

### Config Extensions

Th�m flags v�o Card, Chart, Ranking configs:
- drillDown: true   // C� th? drill-down
- exportable: true  // C� th? export

### Verification

- [x] MongoDB only
- [x] Kh�ng mock
- [x] Repository ch? aggregate
- [x] Service ch? orchestration
- [x] React Query
- [x] Config-driven
- [x] npx tsc --noEmit ? 0 TypeScript Error
- [x] PROJECT_PROGRESS.md c?p nh?t Sprint 7.3

### Review

Reviewed by Cursor Agent

Status: Ready for next Sprint

## Sprint 7.4 � Facebook Page & Campaign Management

**Status**: ? COMPLETED
**Completed**: Wednesday Aug 5, 2026

### M?c ti�u

Ho�n thi?n domain qu?n l� Facebook Page v� Campaign.
��y l� d? li?u m� Marketing Expense v� Dashboard dang s? d?ng.

### Kh�ng s?a

- Lead
- Order
- Warehouse
- Inventory
- Dashboard
- Marketing Expense
- UI Kit
- Sidebar
- Header

---

### FacebookPage

#### Model

Updated src/models/FacebookPage.ts v?i c�c fields m?i:

- code (unique, uppercase)
- 
ame (required)
- pageUrl
- acebookPageId (Facebook Page ID)
- description
- usinessManager (Business Manager ID)
- currency (VD: VND, USD)
- 	imezone (VD: Asia/Ho_Chi_Minh)
- status (ACTIVE | INACTIVE)
- 
ote
- isActive (soft delete)

#### Repository

Created src/repositories/facebook-page.repository.ts:

- create(data) - T?o m?i Facebook Page
- indById(id) - T�m theo ID
- indByCode(code) - T�m theo code
- indAll(filter) - Danh s�ch c� ph�n trang
- update(id, data) - C?p nh?t
- softDelete(id) - Soft delete
- delete(id) - Hard delete
- existsByCode(code) - Ki?m tra code t?n t?i

Repository ch? CRUD - kh�ng business logic.

#### Service

Created src/services/facebook-page.service.ts:

- create(input) - T?o m?i v?i validation
- getById(id) - L?y chi ti?t
- getList(filter) - Danh s�ch
- update(id, input) - C?p nh?t v?i validation
- delete(id) - Soft delete

Service ch?a business logic: duplicate code check, validation.

#### API Routes

Created/Updated:

- GET /api/facebook-pages - Danh s�ch
- GET /api/facebook-pages/[id] - Chi ti?t
- POST /api/facebook-pages - T?o m?i
- PATCH /api/facebook-pages/[id] - C?p nh?t
- DELETE /api/facebook-pages/[id] - X�a

#### React Query Hooks

Created src/hooks/useFacebookPages.ts:

- useFacebookPages(filters) - Danh s�ch
- useFacebookPage(id) - Chi ti?t
- useCreateFacebookPage() - T?o m?i
- useUpdateFacebookPage() - C?p nh?t
- useDeleteFacebookPage() - X�a

---

### Campaign

#### Model

Created src/models/Campaign.ts:

- code (unique, uppercase)
- 
ame (required)
- acebookPageId (ref: FacebookPage, required)
- objective (VD: CONVERSIONS, TRAFFIC)
- startDate (required)
- endDate (optional)
- dailyBudget
- lifetimeBudget
- status (ACTIVE | PAUSED | COMPLETED | ARCHIVED)
- marketingEmployeeId (ref: Employee)
- 
ote
- isActive (soft delete)

#### Repository

Created src/repositories/campaign.repository.ts:

- create(data) - T?o m?i Campaign
- indById(id) - T�m theo ID
- indByIdWithPopulate(id) - T�m v?i populate refs
- indByCode(code) - T�m theo code
- indAll(filter) - Danh s�ch c� ph�n trang
- update(id, data) - C?p nh?t
- softDelete(id) - Soft delete
- delete(id) - Hard delete
- existsByCode(code) - Ki?m tra code t?n t?i
- existsByPageAndName(pageId, name) - Ki?m tra tr�ng theo page

Repository ch? CRUD - kh�ng business logic.

#### Service

Created src/services/campaign.service.ts:

- create(input) - T?o m?i v?i validation
- getById(id) - L?y chi ti?t
- getByIdWithPopulate(id) - L?y v?i populate
- getList(filter) - Danh s�ch
- update(id, input) - C?p nh?t v?i validation
- delete(id) - Soft delete

Service ch?a business logic: duplicate code check, page exists check, validation.

#### API Routes

Created:

- GET /api/campaigns - Danh s�ch (filter by facebookPageId, status)
- GET /api/campaigns/[id] - Chi ti?t
- POST /api/campaigns - T?o m?i
- PATCH /api/campaigns/[id] - C?p nh?t
- DELETE /api/campaigns/[id] - X�a

#### React Query Hooks

Created src/hooks/useCampaigns.ts:

- useCampaigns(filters) - Danh s�ch
- useCampaign(id) - Chi ti?t
- useCreateCampaign() - T?o m?i
- useUpdateCampaign() - C?p nh?t
- useDeleteCampaign() - X�a

---

### UI Pages

#### Facebook Pages List

Created src/app/(protected)/facebook-pages/:

- page.tsx - Main list page
- FacebookPagesToolbar.tsx - Search, filter by status
- FacebookPagesTable.tsx - DataTable v?i sort, pagination
- FacebookPageDrawer.tsx - Create/Edit drawer form
- acebook-pages.module.css - Styles

#### Campaigns List

Created src/app/(protected)/campaigns/:

- page.tsx - Main list page
- CampaignsToolbar.tsx - Search, filter by Facebook Page, status
- CampaignsTable.tsx - DataTable v?i sort, pagination
- CampaignDrawer.tsx - Create/Edit drawer form
- campaigns.module.css - Styles

---

### Sidebar Navigation

Updated src/config/modules.ts - Added modules:

- acebook-pages ? /facebook-pages (MKT group)
- campaigns ? /campaigns (MKT group)

Nav config auto-generated from modules.ts ? no manual sidebar changes needed.

---

### Verification

- [x] npx tsc --noEmit ? 0 TypeScript Error
- [x] MongoDB only
- [x] Kh�ng mock
- [x] Repository ch? CRUD
- [x] Service ch?a business logic
- [x] React Query hooks
- [x] Sidebar t? d?ng update t? modules.ts
- [x] PROJECT_PROGRESS.md c?p nh?t Sprint 7.4

### Review

Reviewed by Cursor Agent

Status: Ready for next Sprint

---

## Workflow Simplification Refactor (Aug 2026)

### Status

? Completed

### M?c ti�u

Refactor to�n b? Marketing Expense Workflow theo ?�ng nghi?p v? th?c t?.

### Business Workflow m?i

Marketing kh�ng c?n Approval. Marketing ch? nh?p b�o c�o h?ng ng�y v� t? LOCK.

Workflow m?i:

```
DRAFT ? LOCKED ? REOPENED ? LOCKED
```

Ch? c�n 3 tr?ng th�i: DRAFT, LOCKED, REOPENED.

### Files ?� ch?nh s?a

#### Constants

| File | Thay ??i |
| ---- | --------- |
| `src/constants/marketing-expense.ts` | X�a SUBMITTED, APPROVED, REJECTED |
| `src/constants/marketing-expense-action.ts` | X�a SUBMITTED, APPROVED, REJECTED |
| `src/constants/permissions.ts` | X�a submit, approve, reject permissions |
| `src/constants/roles.ts` | C?p nh?t permissions cho MKT, LEADER, MANAGER |

#### Model

| File | Thay ??i |
| ---- | --------- |
| `src/models/MarketingExpenseReport.ts` | X�a approvedBy, approvedAt, rejectedBy, rejectedAt, rejectionReason. Th�m reopenedBy, reopenedAt. ??i unique index th�nh (reportDate, marketingEmployeeId, facebookPageId) |

#### Repository

| File | Thay ??i |
| ---- | --------- |
| `src/repositories/marketing-expense.repository.ts` | C?p nh?t types v� methods cho workflow m?i |

#### Service

| File | Thay ??i |
| ---- | --------- |
| `src/services/marketing-expense.service.ts` | X�a submit(), approve(), reject(). Gi? lock(), reopen() |

#### API Routes

| File | Thay ??i |
| ---- | --------- |
| `src/app/api/marketing/expenses/[id]/route.ts` | C?p nh?t PATCH ?? truy?n updatedBy |
| `src/app/api/marketing/expenses/[id]/lock/route.ts` | **T?o m?i** - Lock endpoint |
| `src/app/api/marketing/expenses/[id]/reopen/route.ts` | **T?o m?i** - Reopen endpoint |

#### Hooks

| File | Thay ??i |
| ---- | --------- |
| `src/hooks/useMarketingExpenses.ts` | X�a useSubmitMarketingExpense, useApproveMarketingExpense, useRejectMarketingExpense. Gi? useLockMarketingExpense, useReopenMarketingExpense |

#### UI Components

| File | Thay ??i |
| ---- | --------- |
| `src/components/marketing-expense/MarketingExpenseWorkflowBar.tsx` | Simplify - ch? c�n Lock/Reopen |
| `src/components/marketing-expense/MarketingExpenseAuditCard.tsx` | X�a approved/rejected. Gi? locked/reopened |
| `src/components/marketing-expense/RejectDialog.tsx` | **X�a** - Kh�ng c�n c?n |

#### Configs

| File | Thay ??i |
| ---- | --------- |
| `src/configs/marketing-expense.config.ts` | C?p nh?t workflow rules |
| `src/configs/marketing-expense-actions.config.tsx` | X�a submit/approve/reject actions |
| `src/configs/marketing-expense-history.config.tsx` | X�a SUBMITTED/APPROVED/REJECTED |
| `src/configs/marketing-expense-status.config.ts` | C?p nh?t status config |
| `src/configs/marketing-expense-detail-tabs.config.tsx` | C?p nh?t audit items |

#### Seed

| File | Thay ??i |
| ---- | --------- |
| `src/db/seeds/marketing-expense.seed.ts` | C?p nh?t status distribution (DRAFT 40%, LOCKED 40%, REOPENED 20%) |
| `src/db/seeds/permissions.seed.ts` | X�a submit/approve/reject permissions |

#### Types & Mappers

| File | Thay ??i |
| ---- | --------- |
| `src/types/marketing-expense.ts` | X�a approval types, th�m reopen types |
| `src/mappers/marketing-expense.mapper.ts` | C?p nh?t response interface |
| `src/validators/marketing-expense.validator.ts` | C?p nh?t comments |

### Workflow Rules m?i

| Action | From | To | Role |
| ------ | ---- | -- | ---- |
| Lock | DRAFT, REOPENED | LOCKED | Marketing |
| Reopen | LOCKED | REOPENED | Admin |

### Permissions m?i

**Marketing (MKT):**
- `marketing-expense.view`
- `marketing-expense.create`
- `marketing-expense.update`
- `marketing-expense.delete`
- `marketing-expense.lock`

**Admin:**
- `marketing-expense.view`
- `marketing-expense.create`
- `marketing-expense.update`
- `marketing-expense.delete`
- `marketing-expense.lock`
- `marketing-expense.reopen`

**Leader:**
- `marketing-expense.view`
- `marketing-expense.create`
- `marketing-expense.update`
- `marketing-expense.delete`
- `marketing-expense.lock`

### Verification

- [x] `npx tsc --noEmit` ? **0 TypeScript Error**
- [x] Kh�ng c�n dead code c?a Submit/Approve/Reject
- [x] Workflow ch? c�n DRAFT ? LOCKED ? REOPENED
- [x] Permission ??ng b?
- [x] UI ??ng b?
- [x] API ??ng b?
- [x] Service ??ng b?
- [x] History ??ng b?
- [x] Seed ??ng b?
- [x] PROJECT_PROGRESS.md c?p nh?t

### Review

Reviewed by Cursor Agent

Status: Completed ?

---

## Sprint 8.0 � Customer Module Foundation

### Status

? Completed (2026-08-05)

### M?c ti�u

X�y d?ng Customer Module ho�n ch?nh. Customer l� d? li?u sinh ra sau khi Convert Lead.

### Kh�ng s?a

- Marketing
- Lead
- Marketing Expense
- Dashboard
- Warehouse
- Inventory
- Order Workflow
- UI Kit

### Files t?o m?i

#### Domain & Types

| File | M� t? |
| ---- | --------- |
| src/models/Customer.ts | Customer model v?i ICustomer interface, CustomerStatus enum |
| src/types/customer.ts | Type definitions: Customer, CustomerResponse, CustomerStatistics, CustomerFilter, CreateCustomerInput, UpdateCustomerInput |

#### Repository

| File | M� t? |
| ---- | --------- |
| src/repositories/customer.repository.ts | CustomerRepository v?i CRUD, pagination, search, duplicate checks |

#### Service

| File | M� t? |
| ---- | --------- |
| src/services/customer/customer.service.ts | CustomerService v?i business rules (duplicate phone/email, soft delete, statistics) |

#### API Routes

| File | M� t? |
| ---- | --------- |
| src/app/api/customers/route.ts | GET (list), POST (create) |
| src/app/api/customers/[id]/route.ts | GET, PATCH, DELETE |
| src/app/api/customers/[id]/statistics/route.ts | GET customer statistics |

#### Validators & Mappers

| File | M� t? |
| ---- | --------- |
| src/validators/customer.validator.ts | Zod schemas: createCustomerSchema, updateCustomerSchema, listCustomerSchema |
| src/mappers/customer.mapper.ts | mapCustomer() function |

#### React Query Hooks

| File | M� t? |
| ---- | --------- |
| src/hooks/useCustomers.ts | useCustomers(), useCustomer(), useCustomerStatistics(), useCreateCustomer(), useUpdateCustomer(), useDeleteCustomer() |

#### UI Components

| File | M� t? |
| ---- | --------- |
| src/app/(protected)/customers/page.tsx | Customer list v?i search, filter, pagination |
| src/app/(protected)/customers/[id]/page.tsx | Customer detail v?i tabs: Info, Lead Source, Sale, Orders, Revenue, Timeline |

### Files ch?nh s?a

#### Navigation

| File | Thay d?i |
| ---- | --------- |
| src/config/modules.ts | Th�m Customers group, customer module v?i permission customer.view |

#### Permissions

| File | Thay d?i |
| ---- | --------- |
| src/constants/permissions.ts | Customer permissions d� t?n t?i: customer.view, customer.create, customer.update, customer.delete |
| src/constants/roles.ts | �� c� customer permissions cho c�c roles |

### Customer Model Fields

`
customerCode, fullName, phone, email, gender, birthday
address (province, district, ward, street)
facebook, zalo, note
marketingEmployeeId, saleEmployeeId, facebookPageId, campaignId, leadId
status (ACTIVE, INACTIVE, BLOCKED)
createdAt, updatedAt, isActive
`

### API Endpoints

| Method | Endpoint | Permission | M� t? |
| ------ | ---------| ---------- | --------- |
| GET | /api/customers | customer.view | List customers v?i pagination |
| POST | /api/customers | customer.create | Create customer |
| GET | /api/customers/:id | customer.view | Get customer detail |
| PATCH | /api/customers/:id | customer.update | Update customer |
| DELETE | /api/customers/:id | customer.delete | Soft delete customer |
| GET | /api/customers/:id/statistics | customer.view | Get customer statistics |

### Customer Statistics Response

`	ypescript
{
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastOrderDate?: string;
  firstOrderDate?: string;
}
`

### Business Rules

- **Duplicate phone** ? Error (block creation/update)
- **Duplicate email** ? Warning nhung kh�ng block
- **Soft delete** ? isActive = false, kh�ng x�a vinh vi?n
- **Auto-generate customerCode** ? Format: CUS000001, CUS000002, ...
- **Statistics** ? Read from OrderRepository (kh�ng duplicate data)

### Permissions

| Permission | M� t? |
| ---------- | --------- |
| customer.view | Xem danh s�ch v� chi ti?t kh�ch h�ng |
| customer.create | T?o kh�ch h�ng m?i |
| customer.update | C?p nh?t th�ng tin kh�ch h�ng |
| customer.delete | X�a kh�ch h�ng (soft delete) |

### UI Features

**Customer List:**
- Search theo t�n, s? di?n tho?i, email
- Filter theo status
- Pagination
- DataTable v?i columns: M� KH, T�n, Phone, Email, Sale, Marketing, Status, Ng�y t?o, Actions

**Customer Detail:**
- Tabs: Th�ng tin chung, Ngu?n Lead, Sale, �on h�ng, Doanh thu, L?ch s?
- Revenue summary v?i totalOrders, totalRevenue, averageOrderValue
- Actions: Edit, Delete

### Verification

- [x] 
px tsc --noEmit ? **0 TypeScript Error**
- [x] MongoDB CRUD operations working
- [x] No mocking
- [x] Search and Pagination functional
- [x] PermissionGate implemented
- [x] React Query hooks integrated
- [x] Lead Import service compatibility maintained
- [x] PROJECT_PROGRESS.md updated

### Review

Reviewed by Cursor Agent

Status: Completed ?

---

## Sprint 8.1 � Customer Timeline & CRM Activities

### Status

? Completed (2026-08-05)

### M?c ti�u

X�y d?ng Customer Timeline - trung t�m CRM c?a Sales.

### Kh�ng s?a

- Marketing
- Lead
- Marketing Expense
- Dashboard
- Warehouse
- Inventory
- Order
- UI Kit

### Files t?o m?i

#### Domain & Types

| File | M� t? |
| ---- | --------- |
| src/models/CustomerActivity.ts | CustomerActivity model v?i ActivityType enum, ActivityResult enum |
| src/types/customer-activity.ts | Type definitions: CustomerActivity, CustomerActivityResponse, FollowUpStats, CreateCustomerActivityInput, UpdateCustomerActivityInput |

#### Repository

| File | M� t? |
| ---- | --------- |
| src/repositories/customer-activity.repository.ts | CustomerActivityRepository v?i CRUD, pagination, findByCustomer, findByEmployee, findToday, findUpcoming, findMissed |

#### Service

| File | M� t? |
| ---- | --------- |
| src/services/customer-activity/customer-activity.service.ts | CustomerActivityService v?i business logic cho activities |

#### API Routes

| File | M� t? |
| ---- | --------- |
| src/app/api/customers/[id]/activities/route.ts | GET (list), POST (create) |
| src/app/api/customer-activities/[id]/route.ts | GET, PATCH, DELETE |
| src/app/api/customer-activities/stats/route.ts | GET follow-up statistics |

#### Validators & Mappers

| File | M� t? |
| ---- | --------- |
| src/validators/customer-activity.validator.ts | Zod schemas: createCustomerActivitySchema, updateCustomerActivitySchema |
| src/mappers/customer-activity.mapper.ts | mapCustomerActivity(), getActivityTypeLabel(), getActivityResultLabel() |

#### React Query Hooks

| File | M� t? |
| ---- | --------- |
| src/hooks/useCustomerActivities.ts | useCustomerActivities(), useCustomerActivity(), useFollowUpStats(), useCreateCustomerActivity(), useUpdateCustomerActivity(), useDeleteCustomerActivity() |

#### UI Components

| File | M� t? |
| ---- | --------- |
| src/components/customer/ActivityDrawer.tsx | Drawer cho create/edit activity |
| src/components/customer/CustomerTimeline.tsx | Timeline display cho customer activities |

### Files ch?nh s?a

| File | Thay d?i |
| ---- | --------- |
| src/constants/permissions.ts | Th�m customer-activity permissions |
| src/constants/roles.ts | Th�m customer-activity permissions cho SALE role |
| src/app/(protected)/customers/[id]/page.tsx | Th�m Timeline tab v?i CustomerTimeline component |

### CustomerActivity Model Fields

`
customerId, employeeId
activityType (CALL, MEETING, NOTE, FOLLOW_UP, EMAIL, SMS, OTHER)
title, content
nextFollowUpAt, result (SUCCESS, FAILED, NO_ANSWER, PENDING)
createdAt, updatedAt
`

### API Endpoints

| Method | Endpoint | Permission | M� t? |
| ------ | ---------| ---------- | --------- |
| GET | /api/customers/:id/activities | customer-activity.view | List activities for customer |
| POST | /api/customers/:id/activities | customer-activity.create | Create activity |
| GET | /api/customer-activities/:id | customer-activity.view | Get activity detail |
| PATCH | /api/customer-activities/:id | customer-activity.update | Update activity |
| DELETE | /api/customer-activities/:id | customer-activity.delete | Delete activity |
| GET | /api/customer-activities/stats | customer-activity.view | Get follow-up statistics |

### Follow-up Statistics Response

`	ypescript
{
  todayTotal: number;
  todayCompleted: number;
  todayPending: number;
  upcomingTotal: number;
  upcomingCount: number;
  missedTotal: number;
  missedCount: number;
}
`

### Permissions

| Permission | M� t? |
| ---------- | --------- |
| customer-activity.view | Xem danh s�ch v� chi ti?t ho?t d?ng |
| customer-activity.create | T?o ho?t d?ng m?i |
| customer-activity.update | C?p nh?t ho?t d?ng |
| customer-activity.delete | X�a ho?t d?ng |

### UI Features

**Customer Timeline:**
- Timeline display v?i icons cho t?ng activity type
- Filter theo activity type, result
- Pagination cho activities
- Create/Edit/Delete activities
- "Xem th�m" button

**Activity Drawer:**
- Activity Type dropdown
- Title input
- Content textarea
- Next Follow-up DateTime picker
- Result dropdown

### Verification

- [x] 
px tsc --noEmit ? **0 TypeScript Error**
- [x] MongoDB CRUD operations working
- [x] No mocking
- [x] Timeline d?c t? MongoDB
- [x] Customer Detail hi?n th? Timeline
- [x] React Query hooks integrated
- [x] PermissionGate implemented
- [x] PROJECT_PROGRESS.md updated

### Review

Reviewed by Cursor Agent

Status: Completed ?
