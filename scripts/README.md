# Performance indexes migration

Script này tạo các MongoDB indexes cần thiết để tăng tốc các endpoint dashboard, login-history và notifications.

## Tại sao cần?

Các endpoint sau đang chậm do query full-collection scan (COLLSCAN):

- `GET /api/dashboard` — group-by trên toàn bộ collection Lead/Order
- `GET /api/dashboard/charts` — top-sale aggregation quét toàn bộ Order
- `GET /api/login-history/check-suspicious` — `LoginHistory` không có index nào
- `GET /api/notifications?limit=50` — `$or: [{recipients: id}, {recipients: {$size: 0}}]` không dùng được multikey index
- `GET /api/notifications/unread-count` — `$nin` với mảng read IDs lớn

## Cách chạy

```bash
cd d:/mongodia
node --env-file=.env.local scripts/add-performance-indexes.js
```

Yêu cầu: Node.js >= 20.6 để dùng flag `--env-file`. Nếu dùng Node cũ hơn, hãy chạy qua `dotenv-cli`:

```bash
npx dotenv -e .env.local -- node scripts/add-performance-indexes.js
```

## Đặc điểm

- **Idempotent**: chạy nhiều lần OK, script tự skip index đã tồn tại.
- **Background**: tất cả index tạo với `background: true` — không block read/write.
- **Bỏ qua collection rỗng**: nếu collection chưa tồn tại (dev mới), script bỏ qua và in cảnh báo.

## Rollback

Nếu cần xóa một index:

```js
// Trong MongoDB shell hoặc script Node:
db.collection.dropIndex("indexName");
```

## Sau khi chạy

Restart `npm run dev` để Next.js reload models. Mở dashboard và xem terminal log — các request `/api/dashboard*` sẽ giảm từ 1-12s xuống dưới 1s.

## Lưu ý

Nếu production DB đang chạy Atlas free tier, một số index build có thể mất vài phút cho collection lớn. Script chạy tuần tự nhưng không block traffic — kiểm tra Atlas UI để theo dõi tiến độ.
