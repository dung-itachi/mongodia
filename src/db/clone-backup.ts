/**
 * Script sao chép toàn bộ dữ liệu từ Database hiện tại sang Database Backup
 * Source DB: myDatabaseMC
 * Target DB: myDatabaseMC1
 */

import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const rawUri = process.env.MONGODB_URI || "";
const uri = rawUri.trim();

if (!uri) {
  console.error("❌ Không tìm thấy MONGODB_URI trong file .env.local");
  process.exit(1);
}

const SOURCE_DB = "myDatabaseMC";
const TARGET_DB = "myDatabaseMC1";

async function cloneDatabase() {
  console.log("==================================================");
  console.log("🚀 BẮT ĐẦU SAO CHÉP DỮ LIỆU SANG DATABASE BACKUP");
  console.log(`📦 Nguồn: ${SOURCE_DB}`);
  console.log(`💾 Đích:  ${TARGET_DB}`);
  console.log("==================================================");

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✅ Đã kết nối tới MongoDB Cluster thành công!");

    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    // Lấy danh sách toàn bộ collections từ nguồn
    const collections = await sourceDb.listCollections().toArray();
    console.log(`📋 Tìm thấy ${collections.length} collections cần sao chép.\n`);

    let totalDocsCloned = 0;

    for (const collInfo of collections) {
      const collName = collInfo.name;

      // Bỏ qua các collection hệ thống nếu có
      if (collName.startsWith("system.")) continue;

      const sourceColl = sourceDb.collection(collName);
      const targetColl = targetDb.collection(collName);

      const count = await sourceColl.countDocuments();

      if (count === 0) {
        // Tạo collection rỗng bên đích
        await targetDb.createCollection(collName).catch(() => {});
        console.log(`⚪ [${collName}]: 0 bản ghi (đã tạo bảng rỗng)`);
        continue;
      }

      // Xóa dữ liệu cũ ở bảng đích (nếu đã từng tạo trước đó) để tránh trùng lặp
      await targetColl.deleteMany({});

      // Lấy toàn bộ documents và copy sang
      const docs = await sourceColl.find({}).toArray();
      await targetColl.insertMany(docs);
      totalDocsCloned += docs.length;

      // Sao chép cả Indexes (chỉ mục tìm kiếm)
      try {
        const indexes = await sourceColl.indexes();
        for (const idx of indexes) {
          if (idx.name === "_id_") continue; // _id index tự động tạo
          const { key, name, unique, sparse, expireAfterSeconds } = idx;
          const options: any = { name };
          if (unique) options.unique = true;
          if (sparse) options.sparse = true;
          if (expireAfterSeconds !== undefined) options.expireAfterSeconds = expireAfterSeconds;
          await targetColl.createIndex(key, options).catch(() => {});
        }
      } catch (idxErr) {
        // Bỏ qua lỗi index nếu có
      }

      console.log(`🟢 [${collName}]: Đã sao chép ${docs.length} bản ghi & indexes`);
    }

    console.log("\n==================================================");
    console.log(`🎉 HOÀN TẤT SAO CHÉP DATABASE THÀNH CÔNG!`);
    console.log(`📊 Tổng số collections: ${collections.length}`);
    console.log(`📝 Tổng số bản ghi đã sao chép: ${totalDocsCloned}`);
    console.log(`🔒 Database backup '${TARGET_DB}' đã sẵn sàng và đầy đủ 100% dữ liệu.`);
    console.log("==================================================");
  } catch (error) {
    console.error("❌ Lỗi trong quá trình sao chép database:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

cloneDatabase();
