/**
 * Script làm sạch dữ liệu nghiệp vụ test (Leads, Orders, Customers, Lịch sử...)
 * Giữ nguyên 100%: Sản phẩm, Combo, Quà tặng, Danh mục, Nhân viên, Vai trò, Cài đặt, Kho.
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

// Danh sách các collection cần làm sạch (dữ liệu giao dịch test)
const COLLECTIONS_TO_CLEAN = [
  "orders",
  "orderhistories",
  "leads",
  "leadhistories",
  "leadcalllogs",
  "customers",
  "customeractivities",
  "marketingexpensereports",
  "marketingexpensehistories",
  "notifications",
  "notificationreads",
  "loginhistories",
  "auditlogs",
  "warehouse_stock_movements",
  "warehouse_transfers",
  "warehouse_receipts",
  "inventoryhistories",
  "gift_inventory_histories",
];

async function cleanTestData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    
    // Tự động nhận diện Database đang kết nối từ URI
    const dbName = new URL(uri.replace("mongodb+srv://", "http://")).pathname.replace("/", "") || "myDatabaseMC";
    const db = client.db(dbName);

    console.log("==================================================");
    console.log(`🧹 BẮT ĐẦU LÀM SẠCH DỮ LIỆU TEST TRÊN DATABASE: [${dbName}]`);
    console.log("==================================================");

    let totalDeleted = 0;

    for (const collName of COLLECTIONS_TO_CLEAN) {
      try {
        const coll = db.collection(collName);
        const countBefore = await coll.countDocuments();
        if (countBefore > 0) {
          const res = await coll.deleteMany({});
          totalDeleted += res.deletedCount;
          console.log(`🗑️ [${collName}]: Đã xóa ${res.deletedCount} bản ghi test.`);
        } else {
          console.log(`⚪ [${collName}]: Đã sạch (0 bản ghi).`);
        }
      } catch (err) {
        console.warn(`⚠️ Bỏ qua [${collName}]:`, (err as Error).message);
      }
    }

    // Reset tồn kho ảo trong warehouse_inventory (bỏ giữ chỗ reserved, inTransit, shipped từ các đơn test)
    try {
      const whInventoryColl = db.collection("warehouse_inventory");
      const items = await whInventoryColl.find({}).toArray();
      let resetCount = 0;
      for (const item of items) {
        await whInventoryColl.updateOne(
          { _id: item._id },
          {
            $set: {
              reservedQuantity: 0,
              shippedQuantity: 0,
              inTransitQuantity: 0,
              availableQuantity: item.quantity ?? 0,
            },
          }
        );
        resetCount++;
      }
      console.log(`📦 [warehouse_inventory]: Đã hoàn trả tồn kho khả dụng cho ${resetCount} mặt hàng (xóa giữ chỗ ảo).`);
    } catch (whErr) {
      console.warn("⚠️ Bỏ qua reset warehouse_inventory:", (whErr as Error).message);
    }

    // Reset Counters (chỉ giữ lại EMPLOYEE để không làm lệch mã nhân sự hiện có)
    try {
      const countersColl = db.collection("counters");
      const res = await countersColl.deleteMany({ key: { $ne: "EMPLOYEE" } });
      console.log(`🔄 [counters]: Đã reset ${res.deletedCount} bộ đếm mã (lead, order, customer, warehouse...). Giữ lại mã nhân sự.`);
    } catch (err) {
      console.warn("⚠️ Bỏ qua reset counters:", (err as Error).message);
    }

    console.log("\n==================================================");
    console.log(`🎉 HOÀN TẤT LÀM SẠCH DỮ LIỆU TEST!`);
    console.log(`📊 Tổng số bản ghi test đã dọn: ${totalDeleted}`);
    console.log(`✨ Các bảng nghiệp vụ (Leads, Đơn hàng, Khách hàng) đã sẵn sàng hoạt động với dữ liệu thật.`);
    console.log(`🛡️ Các cấu hình (Sản phẩm, Combo, Nhân sự, Phân quyền, Kho...) được giữ nguyên 100%.`);
    console.log("==================================================");
  } catch (error) {
    console.error("❌ Lỗi khi làm sạch dữ liệu:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

cleanTestData();
