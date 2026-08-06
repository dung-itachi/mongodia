

---

## Sprint 8.5 — Lu?ng Marketing ? Sale

### Status

? Completed (2026-08-06)

### M?c tiêu

B? sung lu?ng nghi?p v? Marketing ? Sale theo giao di?n hi?n có:
- KHÔNG t?o module m?i
- KHÔNG làm l?i UI
- KHÔNG thay ??i layout
- KHÔNG thay ??i sidebar

### Business Workflow

```
Marketing ? Nh?p s? ? Ch?n leads ? ??y sang Sale
                                    ?
                    Sale ? S? c?n g?i (x? lý)
                                    ?
                    Sale ? C?p nh?t tr?ng thái:
                    - Ch?a g?i
                    - Không nghe
                    - ti?m n?ng
                    - ?? ?i?u ki?n
                    - M?t
                                    ?
                    Sale ? B?m CH?T ? T?o Order
                                    ?
                    Marketing ? QL ??n hàng (theo dõi)
```

### ??ng b? d? li?u

- Marketing và Sale nhìn cùng m?t Lead
- Khi Sale ??i tr?ng thái, Marketing th?y ngay
- Không t?o d? li?u riêng cho m?i bên

### Files t?o m?i

| File | Mô t? |
| ---- | --------- |
| src/services/marketing-dispatch.service.ts | Service x? lý push lead và ??ng b? |
| src/app/api/marketing/leads/push/route.ts | POST /api/marketing/leads/push - ??y lead sang Sale |
| src/app/api/sale/leads/route.ts | GET /api/sale/leads - L?y leads cho Sale |
| src/app/api/sale/leads/counts/route.ts | GET /api/sale/leads/counts - Th?ng kê cho Sale |
| src/app/api/sale/leads/[id]/status/route.ts | PATCH /api/sale/leads/:id/status - C?p nh?t tr?ng thái |
| src/app/api/marketing/leads/tracking/route.ts | GET /api/marketing/leads/tracking - Theo dõi cho MKT |
| src/app/api/marketing/leads/tracking/counts/route.ts | GET /api/marketing/leads/tracking/counts |
| src/hooks/useSaleLeads.ts | Hooks cho Sale leads |
| src/hooks/useMarketingLeadTracking.ts | Hooks cho Marketing tracking |
| src/hooks/usePushLeadsToSale.ts | Hook push leads sang Sale |
| src/components/sale/leads/SaleLeadsToolbar.tsx | Toolbar cho Sale |
| src/components/sale/leads/SaleLeadTable.tsx | Table cho Sale |
| src/components/sale/leads/sale-leads.module.css | Styles |
| src/components/marketing/leads/MarketingLeadTrackingToolbar.tsx | Toolbar cho MKT |
| src/components/marketing/leads/MarketingLeadTrackingTable.tsx | Table cho MKT |
| src/components/marketing/leads/marketing-tracking.module.css | Styles |

### Files ch?nh s?a

| File | Thay ??i |
| ---- | --------- |
| src/app/(protected)/leads/page.tsx | Implement Sale ? S? c?n g?i |
| src/app/(protected)/marketing/orders/page.tsx | Implement Marketing ? QL ??n hàng |
| src/app/(protected)/marketing/input/page.tsx | Thêm "??y sang Sale" |
| src/app/(protected)/marketing/input/MarketingLeadToolbar.tsx | Thêm nút push to Sale |
| src/app/(protected)/marketing/input/LeadTable.tsx | Thêm row selection |

### API Endpoints

| Method | Endpoint | Mô t? |
| ------ | ---------| --------- |
| POST | /api/marketing/leads/push | ??y leads sang Sale |
| GET | /api/sale/leads | L?y danh sách leads cho Sale |
| GET | /api/sale/leads/counts | L?y s? li?u th?ng kê Sale |
| PATCH | /api/sale/leads/:id/status | C?p nh?t tr?ng thái lead |
| GET | /api/marketing/leads/tracking | L?y danh sách theo dõi cho MKT |
| GET | /api/marketing/leads/tracking/counts | L?y s? li?u th?ng kê MKT |

### Service Methods

**MarketingDispatchService.pushLeadsToSale(input)**:
1. Validate leads
2. Check if lead ?ã convert (không cho push)
3. Auto-assign cho Sale có ít leads nh?t (round-robin)
4. C?p nh?t lead: saleEmployeeId + status = CONTACTED
5. T?o LeadHistory record

**MarketingDispatchService.updateLeadStatus(id, status, updatedBy)**:
1. Validate lead
2. C?p nh?t status
3. T?o LeadHistory record

### Business Rules

| Rule | Mô t? |
| ----- | ----- |
| Lead ?ã convert | Không cho push sang Sale |
| Lead ?ã có Sale | Không cho push l?i |
| Ch? Sale ch?t ??n | Marketing ch? theo dõi |
| ??ng b? th?i gian th?c | Cùng m?t Lead, cùng m?t d? li?u |

### Verification

- [x] Marketing b?m "??y sang Sale" ? Lead xu?t hi?n ? Sale ? S? c?n g?i
- [x] Marketing b?m "??y sang Sale" ? Lead xu?t hi?n ? Marketing ? QL ??n hàng
- [x] Hai màn hình dùng chung d? li?u (cùng Lead)
- [x] Sale ??i tr?ng thái ? Marketing th?y ngay
- [x] Ch? khi Sale b?m "Ch?t" ? m?i t?o Order
- [x] Không thay ??i giao di?n hi?n có (tr? thêm button)
- [x] Sprint 8.5 files: 0 TypeScript Error

### Review

Reviewed by Cursor Agent

Status: Completed ?

---

## Sprint 8.5 Extension - Marketing Input Enhancement

### Status

In Progress (2026-08-06)

### Muc tieu

Them chuc nang "Nhap so" nang cao theo HTML reference:
- Chon san pham & combo
- Nhap leads tu Comment/Landing page
- Staging area truoc khi day sang Sale
- Stats cards hien thi so lieu

### Files tao moi

| File | Mo ta |
| ---- | --------- |
| src/hooks/useProducts.ts | Hook fetch products va combos |
| src/components/marketing/input/MarketingInputSection.tsx | Component nhap so nang cao |
| src/components/marketing/input/MarketingInputSection.module.css | Styles |

### Files chinh sua

| File | Thay doi |
| ---- | --------- |
| src/app/(protected)/marketing/input/page.tsx | Them MarketingInputSection |

### Component Features

**MarketingInputSection:**
1. Stats Cards - Hien thi so leads da day va staging
2. Product Selection - Chon san pham theo category
3. Combo Selection - Chon combo cua san pham
4. Lead Input - 2 che do: Comment (Ten + SDT) va Landing (Date + Name + Phone + Address + Combo)
5. Staging Area - Bang tam chua leads truoc khi day

### Verification

- [x] Product selection voi categories
- [x] Combo selection theo product
- [x] Input type tabs (Comment / Landing)
- [x] Parse leads tu text input
- [x] Staging table voi source tags
- [x] Push to Sale button
- [x] 0 TypeScript Error (new files)

### Review

Status: In Progress


---

## Sprint 8.5.2 - Ket noi Marketing Input voi Product Module

### Status

Completed (2026-08-06)

### Muc tieu

Ket noi MarketingInputSection voi Product Module hien co:
- KHONG tao Product API moi
- KHONG tao Combo API moi
- SU DUNG truc tiep module hien co

### Files da cap nhat

| File | Thay doi |
| ---- | --------- |
| src/hooks/useProducts.ts | Mo rong voi category fetch, combo lookup, normalize |

### Integration Details

**1. Hien thi danh muc san pham**
- useCategories() - Fetch tu /api/categories (isActive = true)
- useProducts() - Fetch tu /api/products (isActive = true)
- useProductsByCategory() - Group products theo category

**2. Hien thi Combo**
- useCombosByProduct(productId) - Fetch combos cua product
- useCombosWithProduct(productId) - Normalize combos voi product info
- Combos tu MongoDB (isActive = true)

**3. Landing Parser**
- useAllCombosNormalized() - Fetch ALL combos cho lookup
- comboByNameMap - Lookup combo theo ten (case-insensitive)
- Neu combo khong ton tai -> danh dau loi

**4. Push to Sale**
- Product info (productId) tu Product Module
- Combo info (comboId, price) tu Combo Module
- Lead tao ra luu productId, comboId
- Khi Sale chot -> Order co productId, comboId

### Verification

- [x] Chon san pham -> hien dung category
- [x] Chon product -> hien combo
- [x] Combo lay tu MongoDB
- [x] Gia lay tu combo
- [x] Khong co du lieu hardcode
- [x] 0 TypeScript Error (Sprint 8.5.2 files)

### Review

Status: Completed
