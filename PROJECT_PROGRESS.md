# MongoDIA Project Progress

## Sprint 8.5 - Luồng Marketing đến Sale

### Status
- Completed (2026-08-06)

### Muc tieu
Bo sung luong nghiep vu Marketing den Sale theo giao dien hien co:
- KHONG tao module moi
- KHONG lam lai UI
- KHONG thay doi layout
- KHONG thay doi sidebar

### Business Workflow
```
Marketing -> Nhap so -> Chon leads -> Day sang Sale
                                    |
                    Sale -> So can goi (xu ly)
                                    |
                    Sale -> Cap nhat trang thai:
                    - Chua goi
                    - Khong nghe
                    - tiem nang
                    - Da dieu kien
                    - Mat
                                    |
                    Sale -> Bam CHOT -> Tao Order
                                    |
                    Marketing -> QL don hang (theo doi)
```

### Dong bo du lieu
- Marketing va Sale nhin cung mot Lead
- Khi Sale doi trang thai, Marketing thay ngay
- Khong tao du lieu rieng cho moi ben

### Files tao moi
| File | Mo ta |
| ---- | --------- |
| src/services/marketing-dispatch.service.ts | Service xu ly push lead va dong bo |
| src/app/api/marketing/leads/push/route.ts | POST /api/marketing/leads/push - Day lead sang Sale |
| src/app/api/sale/leads/route.ts | GET /api/sale/leads - Lay leads cho Sale |
| src/app/api/sale/leads/counts/route.ts | GET /api/sale/leads/counts - Thong ke cho Sale |
| src/app/api/sale/leads/[id]/status/route.ts | PATCH /api/sale/leads/:id/status - Cap nhat trang thai |
| src/app/api/marketing/leads/tracking/route.ts | GET /api/marketing/leads/tracking - Theo doi cho MKT |
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

### Files chinh sua
| File | Thay doi |
| ---- | --------- |
| src/app/(protected)/leads/page.tsx | Implement Sale -> So can goi |
| src/app/(protected)/marketing/orders/page.tsx | Implement Marketing -> QL don hang |
| src/app/(protected)/marketing/input/page.tsx | Them "Day sang Sale" |
| src/app/(protected)/marketing/input/MarketingLeadToolbar.tsx | Them nut push to Sale |
| src/app/(protected)/marketing/input/LeadTable.tsx | Them row selection |

### API Endpoints
| Method | Endpoint | Mo ta |
| ------ | ---------| --------- |
| POST | /api/marketing/leads/push | Day leads sang Sale |
| GET | /api/sale/leads | Lay danh sach leads cho Sale |
| GET | /api/sale/leads/counts | Lay so lieu thong ke Sale |
| PATCH | /api/sale/leads/:id/status | Cap nhat trang thai lead |
| GET | /api/marketing/leads/tracking | Lay danh sach theo doi cho MKT |
| GET | /api/marketing/leads/tracking/counts | Lay so lieu thong ke MKT |

### Service Methods
**MarketingDispatchService.pushLeadsToSale(input)**:
1. Validate leads
2. Check if lead da convert (khong cho push)
3. Auto-assign cho Sale co it leads nhat (round-robin)
4. Cap nhat lead: saleEmployeeId + status = CONTACTED
5. Tao LeadHistory record

**MarketingDispatchService.updateLeadStatus(id, status, updatedBy)**:
1. Validate lead
2. Cap nhat status
3. Tao LeadHistory record

### Business Rules
| Rule | Mo ta |
| ----- | ----- |
| Lead da convert | Khong cho push sang Sale |
| Lead da co Sale | Khong cho push lai |
| Chi Sale chat den | Marketing chi theo doi |
| Dong bo thoi gian thuc | Cung mot Lead, cung mot du lieu |

### Verification
- [x] Marketing bam "Day sang Sale" -> Lead xuat hien o Sale -> So can goi
- [x] Marketing bam "Day sang Sale" -> Lead xuat hien o Marketing -> QL don hang
- [x] Hai man hinh dung chung du lieu (cung Lead)
- [x] Sale doi trang thai -> Marketing thay ngay
- [x] Chi khi Sale bam "Chot" -> moi tao Order
- [x] Khong thay doi giao dien hien co (chi them button)
- [x] Sprint 8.5 files: 0 TypeScript Error

### Review
Reviewed by Cursor Agent
Status: Completed

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
