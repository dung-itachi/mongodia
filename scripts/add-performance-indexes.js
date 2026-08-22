/**
 * scripts/add-performance-indexes.js
 *
 * Migration script: thêm các MongoDB indexes cần thiết cho các endpoint
 * dashboard, login-history và notifications đang bị chậm.
 *
 * Đặc điểm:
 *  - Idempotent: kiểm tra listIndexes() trước khi tạo, chạy nhiều lần OK.
 *  - background: true (MongoDB >= 4.2 thì createIndex luôn non-blocking
 *    nhưng ta vẫn truyền để tương thích với cluster cũ).
 *  - Bỏ qua collection không tồn tại (dev mới chưa có data).
 *  - Không tạo index trùng tên với index đã có (Mongo sẽ trả về
 *    "IndexOptionsConflict" hoặc "IndexKeySpecsConflict" — đều an toàn).
 *
 * Cách chạy:
 *   cd d:/mongodia
 *   node --env-file=.env.local scripts/add-performance-indexes.js
 *
 *   (Node 20.6+ hỗ trợ --env-file để load biến môi trường từ file .env)
 */

const { MongoClient } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || undefined;

if (!MONGODB_URI) {
  console.error("Lỗi: Chưa khai báo MONGODB_URI trong .env.local");
  process.exit(1);
}

/**
 * Danh sách index cần tạo.
 * key = tên collection (lowercase)
 * value = mảng các spec: { key, name, options }
 */
const INDEX_PLAN = {
  loginhistories: [
    {
      key: { employeeId: 1, loginAt: -1 },
      name: "employeeId_1_loginAt_-1",
    },
    {
      key: { employeeId: 1, success: 1, isTrusted: 1, loginAt: -1 },
      name: "employeeId_1_success_1_isTrusted_1_loginAt_-1",
    },
  ],
  notifications: [
    { key: { isActive: 1, createdAt: -1 }, name: "isActive_1_createdAt_-1" },
    { key: { recipients: 1, createdAt: -1 }, name: "recipients_1_createdAt_-1" },
  ],
  notificationreads: [
    { key: { employeeId: 1, _id: -1 }, name: "employeeId_1__id_-1" },
  ],
  leads: [
    { key: { isActive: 1, status: 1 }, name: "isActive_1_status_1" },
    { key: { isActive: 1, createdAt: -1 }, name: "isActive_1_createdAt_-1" },
    {
      key: { marketingEmployeeId: 1, isActive: 1, createdAt: -1 },
      name: "marketingEmployeeId_1_isActive_1_createdAt_-1",
    },
    {
      key: { saleEmployeeId: 1, isActive: 1, createdAt: -1 },
      name: "saleEmployeeId_1_isActive_1_createdAt_-1",
    },
  ],
  orders: [
    { key: { isActive: 1, status: 1 }, name: "isActive_1_status_1" },
    {
      key: { isActive: 1, createdAt: -1, status: 1 },
      name: "isActive_1_createdAt_-1_status_1",
    },
    {
      key: { saleEmployeeId: 1, status: 1, createdAt: -1 },
      name: "saleEmployeeId_1_status_1_createdAt_-1",
    },
    {
      key: { marketingEmployeeId: 1, status: 1, createdAt: -1 },
      name: "marketingEmployeeId_1_status_1_createdAt_-1",
    },
  ],
  inventoryhistories: [
    { key: { createdAt: -1 }, name: "createdAt_-1" },
  ],
};

async function ensureIndex(db, collectionName, indexSpec) {
  const coll = db.collection(collectionName);
  const existing = await coll.listIndexes().toArray();
  const existsByName = existing.some((idx) => idx.name === indexSpec.name);
  if (existsByName) {
    console.log(`  [SKIP] ${collectionName}.${indexSpec.name} (already exists)`);
    return { status: "skipped" };
  }
  const existsByKey = existing.some(
    (idx) =>
      JSON.stringify(idx.key) === JSON.stringify(indexSpec.key) &&
      (!idx.unique || false) === (indexSpec.options?.unique || false),
  );
  if (existsByKey) {
    console.log(
      `  [SKIP] ${collectionName}.${indexSpec.name} (same key exists with different name)`,
    );
    return { status: "skipped" };
  }

  await coll.createIndex(indexSpec.key, {
    name: indexSpec.name,
    background: true,
    ...(indexSpec.options || {}),
  });
  console.log(`  [CREATE] ${collectionName}.${indexSpec.name}`);
  return { status: "created" };
}

async function main() {
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  const db = DB_NAME ? client.db(DB_NAME) : client.db();

  console.log(`\nConnected to MongoDB: ${db.databaseName}`);
  console.log(`Plan: ${Object.keys(INDEX_PLAN).length} collections\n`);

  const summary = { created: 0, skipped: 0, missing: 0 };

  for (const [collectionName, indexes] of Object.entries(INDEX_PLAN)) {
    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (collections.length === 0) {
      console.log(`[${collectionName}] collection không tồn tại — bỏ qua`);
      summary.missing += indexes.length;
      continue;
    }
    console.log(`[${collectionName}]`);
    for (const spec of indexes) {
      try {
        const result = await ensureIndex(db, collectionName, spec);
        if (result.status === "created") summary.created += 1;
        else summary.skipped += 1;
      } catch (err) {
        if (
          err.code === 85 || // IndexOptionsConflict
          err.code === 86 || // IndexKeySpecsConflict
          err.code === 11000
        ) {
          console.log(`  [SKIP] ${collectionName}.${spec.name} (already exists, code=${err.code})`);
          summary.skipped += 1;
        } else {
          console.error(`  [ERROR] ${collectionName}.${spec.name}:`, err.message);
        }
      }
    }
  }

  console.log(`\nHoàn tất:`);
  console.log(`  Created:  ${summary.created}`);
  console.log(`  Skipped:  ${summary.skipped}`);
  console.log(`  Missing:  ${summary.missing} (collection chưa tồn tại — tạo sau khi insert data)`);

  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Lỗi khi chạy migration:", err);
  process.exit(1);
});
