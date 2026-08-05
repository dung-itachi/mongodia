


---

## Sprint 8.4 ? Tách Lead và Order

### Status

? Completed (2026-08-05)

### M?c tiêu

Refactor l?i ?úng nghi?p v? CRM:
- Marketing không t?o Order
- Marketing ch? t?o Lead
- Order ch? ???c t?o khi Sale b?m Ch?t

### Không s?a

- Warehouse
- Inventory
- Marketing Dashboard
- Sales Dashboard
- Customer Module
- KPI
- Payment

### Business Workflow m?i

```
Marketing ? Import Lead ? Lead ? Sale g?i nhi?u l?n
                                          ?
Không nghe / Máy b?n / Sai s? / Không nhu c?u / H?n g?i
                                          ?
                                    Ti?m n?ng (QUALIFIED / POTENTIAL)
                                          ?
                                       CH?T
                                          ?
                                    T?o Order

Lead KHÔNG t? sinh Order.
```

### Lead Model Updates (Sprint 8.4)

| Field | Mô t? |
| ----- | ----- |
| isConverted | ?ánh d?u lead ?ã ???c convert thành order |
| convertedOrderId | Tham chi?u ??n Order ?ã t?o (thay th? orderId c?) |

### Order Model

Order ?ã có s?n `leadId` ?? tham chi?u ??n Lead g?c.

### Business Rules

| Rule | Mô t? |
| ----- | ----- |
| Ch? QUALIFIED/POTENTIAL ???c convert | Lead ? tr?ng thái Không nhu c?u, Sai s?, Không nghe, Máy b?n không ???c ch?t |
| Lead ?ã convert r?i | Không cho convert l?n n?a |
| Order b?t bu?c có leadId | Order ???c t?o t? Lead ph?i bi?t Lead g?c |

### Files ch?nh s?a

| File | Thay ??i |
| ----- | --------- |
| src/models/Lead.ts | ??i orderId ? convertedOrderId |
| src/types/lead.ts | ??i orderId ? convertedOrderId |
| src/repositories/lead.repository.ts | ??i orderId ? convertedOrderId, thêm markAsConverted, findUnconverted, findConverted |
| src/services/lead.service.ts | C?p nh?t convertLead v?i business rules m?i |

### Files t?o m?i

| File | Mô t? |
| ---- | --------- |
| src/app/api/leads/[id]/convert/route.ts | POST /api/leads/:id/convert |
| src/hooks/useConvertLead.ts | useConvertLead() mutation hook |

### API Endpoint

| Method | Endpoint | Permission | Mô t? |
| ------ | ---------| ---------- | --------- |
| POST | /api/leads/:id/convert | lead.update ho?c order.create | Ch?t ??n t? Lead |

### Repository Methods

| Method | Mô t? |
| ------ | ----- |
| markAsConverted(leadId, orderId) | ?ánh d?u lead ?ã convert v?i order ID |
| findUnconverted(params) | Tìm leads ch?a convert |
| findConverted(params) | Tìm leads ?ã convert |

### Service Method

`convertLead(id, convertedBy)`:
1. Ki?m tra lead t?n t?i và active
2. Ki?m tra lead ch?a convert
3. Ki?m tra tr?ng thái QUALIFIED ho?c POTENTIAL
4. T?o Customer n?u ch?a có
5. T?o Order v?i leadId
6. C?p nh?t Lead: isConverted = true, convertedOrderId = order._id
7. T?o LeadHistory record

### Verification

- [x] Lead ch?a convert ? t?o Order thành công
- [x] Lead ?ã convert ? báo l?i
- [x] Order có leadId
- [x] Lead có convertedOrderId
- [x] npx tsc --noEmit ? **0 TypeScript Error**

### Review

Reviewed by Cursor Agent

Status: Completed ?
