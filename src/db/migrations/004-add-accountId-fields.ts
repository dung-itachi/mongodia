/**
 * ==================================================
 * MIGRATION: Add accountId to Product, Category, and FacebookPage
 * ==================================================
 *
 * Sprint 8.x — Account-based Data Isolation
 *
 * This migration adds the `accountId` field to existing documents:
 * - Products: set to null (admin can see all)
 * - Categories: set to null (admin can see all)
 * - FacebookPages: set to null (admin can see all)
 * - Employees: set to null (admin can see all)
 *
 * Run with: npx tsx src/db/migrations/004-add-accountId-fields.ts
 */

import mongoose from "mongoose";
import { config } from "dotenv";

// Load env
config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/mongodia";

async function migrate() {
  console.log("🚀 Starting migration: Add accountId fields\n");

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // 1. Products
    console.log("📦 Processing Products...");
    const productsResult = await mongoose.connection.db!.collection("products").updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: null } }
    );
    console.log(`   ✅ Updated ${productsResult.modifiedCount} products`);

    // Create compound index on products
    try {
      await mongoose.connection.db!.collection("products").createIndex(
        { accountId: 1, isActive: 1 },
        { background: true }
      );
      console.log("   ✅ Created compound index on products");
    } catch (e) {
      console.log("   ℹ️  Index already exists or skipped");
    }

    // 2. Categories
    console.log("\n📁 Processing Categories...");
    const categoriesResult = await mongoose.connection.db!.collection("categories").updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: null } }
    );
    console.log(`   ✅ Updated ${categoriesResult.modifiedCount} categories`);

    // Create compound index on categories
    try {
      await mongoose.connection.db!.collection("categories").createIndex(
        { accountId: 1, isActive: 1 },
        { background: true }
      );
      console.log("   ✅ Created compound index on categories");
    } catch (e) {
      console.log("   ℹ️  Index already exists or skipped");
    }

    // 3. FacebookPages
    console.log("\n📄 Processing FacebookPages...");
    const pagesResult = await mongoose.connection.db!.collection("facebookpages").updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: null } }
    );
    console.log(`   ✅ Updated ${pagesResult.modifiedCount} facebook pages`);

    // Create compound index on facebookpages
    try {
      await mongoose.connection.db!.collection("facebookpages").createIndex(
        { accountId: 1, isActive: 1 },
        { background: true }
      );
      console.log("   ✅ Created compound index on facebookpages");
    } catch (e) {
      console.log("   ℹ️  Index already exists or skipped");
    }

    // 4. Employees
    console.log("\n👤 Processing Employees...");
    const employeesResult = await mongoose.connection.db!.collection("employees").updateMany(
      { accountId: { $exists: false } },
      { $set: { accountId: null } }
    );
    console.log(`   ✅ Updated ${employeesResult.modifiedCount} employees`);

    // Create index on employees
    try {
      await mongoose.connection.db!.collection("employees").createIndex(
        { accountId: 1 },
        { background: true }
      );
      console.log("   ✅ Created index on employees");
    } catch (e) {
      console.log("   ℹ️  Index already exists or skipped");
    }

    console.log("\n✅ Migration completed successfully!\n");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

migrate();
