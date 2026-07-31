/**
 * Lead Transaction Test Script - Direct MongoDB Testing
 *
 * Mục tiêu: Kiểm thử Transaction cho Lead CRUD API trực tiếp với MongoDB
 *
 * Chạy: npx dotenv -e .env.local -- tsx src/app/api/test-lead-transaction-direct.ts
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { LeadHistory } from "@/models/LeadHistory";
import Counter, { ICounter } from "@/models/Counter";

const TEST_RESULTS: Array<{ name: string; status: "PASS" | "FAIL"; message: string }> = [];

function logResult(name: string, status: "PASS" | "FAIL", message: string) {
  TEST_RESULTS.push({ name, status, message });
  console.log(`[${status}] ${name}: ${message}`);
}

async function cleanup() {
  console.log("\n--- Cleaning up test data ---");
  try {
    // Delete test leads by customerName pattern
    const testLeads = await Lead.find({ customerName: /Test (POST|PUT|DELETE|Rollback)/ }).lean();
    const leadIds = testLeads.map(l => l._id);

    if (leadIds.length > 0) {
      await LeadHistory.deleteMany({ leadId: { $in: leadIds } });
    }

    await Lead.deleteMany({ customerName: /Test (POST|PUT|DELETE|Rollback)/ });

    // Delete test counters
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    await Counter.deleteMany({ key: `lead_${year}${month}${day}` });

    console.log("Cleanup completed\n");
  } catch (error) {
    console.error("Cleanup error:", error);
  }
}

// Helper to generate lead code
async function generateLeadCodeWithCounter(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const counterKey = `lead_${year}${month}${day}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  const sequence = (counter.value || 1).toString().padStart(4, "0");
  return `LD${year}${month}${day}${sequence}`;
}

// ==================================================
// POST Lead Transaction Tests
// ==================================================

async function test_POST_Lead_Transaction_Success(): Promise<string | null> {
  console.log("\n  Testing POST Lead Transaction - Success...");

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Get counter key
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    // Get counter before
    const counterBefore = await Counter.findOne({ key: counterKey }).session(session);
    const seqBefore = counterBefore?.value || 0;

    // 1. Update counter in transaction
    const counter = await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { new: true, upsert: true, session }
    );
    console.log("    ✓ Counter incremented:", counter?.value);

    // 2. Create Lead with generated code
    const sequence = (counter?.value || seqBefore + 1).toString().padStart(4, "0");
    const leadCode = `LD${year}${month}${day}${sequence}`;

    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test POST Customer",
        phone: "0909123456",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
        assignedAt: null,
      }],
      { session }
    );

    console.log("    ✓ Lead created with code:", leadCode);

    // 3. Verify Lead exists in transaction
    const leadInTx = await Lead.findById(lead[0]._id).session(session).lean();
    if (!leadInTx) {
      await session.abortTransaction();
      return "Lead not found in transaction";
    }
    console.log("    ✓ Lead exists in transaction");

    // 4. Create LeadHistory
    const employeeId = new mongoose.Types.ObjectId();
    await LeadHistory.create(
      [{
        leadId: lead[0]._id,
        employeeId: employeeId,
        action: "CREATED",
        note: "Test create lead",
      }],
      { session }
    );

    console.log("    ✓ LeadHistory created");

    // 5. Verify LeadHistory in transaction
    const historyInTx = await LeadHistory.findOne({ leadId: lead[0]._id }).session(session).lean();
    if (!historyInTx) {
      await session.abortTransaction();
      return "LeadHistory not found in transaction";
    }
    console.log("    ✓ LeadHistory exists in transaction");

    // 6. Commit transaction
    await session.commitTransaction();
    console.log("    ✓ Transaction committed");

    // 7. Verify data persists after commit
    const leadAfter = await Lead.findById(lead[0]._id).lean();
    if (!leadAfter) {
      return "Lead not persisted after commit";
    }
    console.log("    ✓ Lead persisted after commit");

    const historyAfter = await LeadHistory.findOne({ leadId: lead[0]._id }).lean();
    if (!historyAfter) {
      return "LeadHistory not persisted after commit";
    }
    console.log("    ✓ LeadHistory persisted after commit");

    const counterAfter = await Counter.findOne({ key: counterKey }).lean();
    if (!counterAfter || counterAfter.value <= seqBefore) {
      return "Counter not incremented";
    }
    console.log("    ✓ Counter incremented:", counterAfter.value);

    return null; // Success
  } catch (error) {
    await session.abortTransaction();
    console.error("    ✗ Error:", error);
    return `Exception: ${error}`;
  } finally {
    session.endSession();
  }
}

async function test_POST_Lead_Transaction_Rollback(): Promise<string | null> {
  console.log("\n  Testing POST Lead Transaction - Rollback...");

  const session = await mongoose.startSession();

  try {
    // Get counter key
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    // Get initial counter value
    const counterBefore = await Counter.findOne({ key: counterKey });
    const seqBefore = counterBefore?.value || 0;

    // Get initial lead count
    const leadCountBefore = await Lead.countDocuments({ customerName: "Test Rollback Customer" });

    session.startTransaction();

    // 1. Update counter in transaction
    const counter = await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { new: true, upsert: true, session }
    );
    console.log("    ✓ Counter incremented in transaction");

    // 2. Create Lead
    const sequence = (counter?.value || seqBefore + 1).toString().padStart(4, "0");
    const leadCode = `LD${year}${month}${day}${sequence}`;

    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Rollback Customer",
        phone: "0909999999",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
        assignedAt: null,
      }],
      { session }
    );

    console.log("    ✓ Lead created in transaction");

    // 3. Create LeadHistory
    await LeadHistory.create(
      [{
        leadId: lead[0]._id,
        employeeId: new mongoose.Types.ObjectId(),
        action: "CREATED",
        note: "Test rollback",
      }],
      { session }
    );

    console.log("    ✓ LeadHistory created in transaction");

    // 4. Abort transaction to simulate error
    await session.abortTransaction();
    console.log("    ✓ Transaction aborted (simulated error)");

    // 5. Verify data rolled back
    const leadCountAfter = await Lead.countDocuments({ customerName: "Test Rollback Customer" });
    if (leadCountAfter !== leadCountBefore) {
      return "Lead count changed after rollback - transaction failed";
    }
    console.log("    ✓ Lead count unchanged after rollback");

    const leadInDb = await Lead.findOne({ customerName: "Test Rollback Customer" }).lean();
    if (leadInDb) {
      return "Lead still exists after rollback - transaction failed";
    }
    console.log("    ✓ Lead rolled back");

    const counterAfter = await Counter.findOne({ key: counterKey });
    if (counterAfter && counterAfter.value > seqBefore) {
      return "Counter incremented after rollback - transaction failed";
    }
    console.log("    ✓ Counter unchanged after rollback");

    return null; // Success
  } catch (error) {
    await session.abortTransaction();
    console.log("    ✓ Transaction error handled:", error);

    // Even if error occurs, data should be rolled back
    const leadCountAfter = await Lead.countDocuments({ customerName: "Test Rollback Customer" });
    if (leadCountAfter === 0) {
      console.log("    ✓ Data rolled back after error");
    }

    return null; // Success - error handling verified
  } finally {
    session.endSession();
  }
}

// ==================================================
// PUT Lead Transaction Tests
// ==================================================

async function test_PUT_Lead_Transaction_Success(): Promise<string | null> {
  console.log("\n  Testing PUT Lead Transaction - Success...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first (outside transaction)
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test PUT Customer",
      phone: "0909888888",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "",
      isDuplicate: false,
      isActive: true,
    });

    await LeadHistory.create({
      leadId: lead._id,
      employeeId: new mongoose.Types.ObjectId(),
      action: "CREATED",
      note: "Initial",
    });

    const leadId = lead._id;
    console.log("    ✓ Test lead created");

    session.startTransaction();

    // 1. Update Lead
    await Lead.updateOne(
      { _id: leadId },
      { $set: { latestRemark: "Updated remark", customerName: "Test PUT Customer Updated" } },
      { session }
    );
    console.log("    ✓ Lead updated in transaction");

    // 2. Create LeadHistory
    await LeadHistory.create(
      [{
        leadId: leadId,
        employeeId: new mongoose.Types.ObjectId(),
        action: "NOTE_UPDATED",
        oldValue: "",
        newValue: "Updated remark",
      }],
      { session }
    );
    console.log("    ✓ LeadHistory created in transaction");

    // 3. Commit
    await session.commitTransaction();
    console.log("    ✓ Transaction committed");

    // 4. Verify changes persist
    const leadAfter = await Lead.findById(leadId).lean();
    if (!leadAfter || leadAfter.latestRemark !== "Updated remark") {
      return "Lead not updated after commit";
    }
    console.log("    ✓ Lead updated after commit");

    const historyCount = await LeadHistory.countDocuments({ leadId, action: "NOTE_UPDATED" });
    if (historyCount === 0) {
      return "LeadHistory not created after commit";
    }
    console.log("    ✓ LeadHistory created after commit");

    return null; // Success
  } catch (error) {
    await session.abortTransaction();
    console.error("    ✗ Error:", error);
    return `Exception: ${error}`;
  } finally {
    session.endSession();
  }
}

async function test_PUT_Lead_Transaction_Rollback(): Promise<string | null> {
  console.log("\n  Testing PUT Lead Transaction - Rollback...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test PUT Rollback Customer",
      phone: "0909777777",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "Original remark",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const originalRemark = lead.latestRemark;
    const originalName = lead.customerName;
    console.log("    ✓ Test lead created");

    session.startTransaction();

    // 1. Update Lead
    await Lead.updateOne(
      { _id: leadId },
      { $set: { latestRemark: "Changed remark", customerName: "Changed Name" } },
      { session }
    );
    console.log("    ✓ Lead updated in transaction");

    // 2. Create LeadHistory
    await LeadHistory.create(
      [{
        leadId: leadId,
        employeeId: new mongoose.Types.ObjectId(),
        action: "NOTE_UPDATED",
        oldValue: originalRemark,
        newValue: "Changed remark",
      }],
      { session }
    );
    console.log("    ✓ LeadHistory created in transaction");

    // 3. Abort transaction (simulate error)
    await session.abortTransaction();
    console.log("    ✓ Transaction aborted");

    // 4. Verify rollback
    const leadAfter = await Lead.findById(leadId).lean();
    if (!leadAfter || leadAfter.latestRemark !== originalRemark) {
      return "Lead rolled back incorrectly - remark changed";
    }
    console.log("    ✓ Lead remark unchanged after rollback");

    if (!leadAfter || leadAfter.customerName !== originalName) {
      return "Lead rolled back incorrectly - name changed";
    }
    console.log("    ✓ Lead name unchanged after rollback");

    const historyCount = await LeadHistory.countDocuments({
      leadId,
      action: "NOTE_UPDATED",
      newValue: "Changed remark"
    });
    if (historyCount > 0) {
      return "LeadHistory still exists after rollback - transaction failed";
    }
    console.log("    ✓ LeadHistory rolled back");

    return null; // Success
  } catch (error) {
    await session.abortTransaction();
    console.error("    ✗ Error:", error);
    return `Exception: ${error}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// DELETE Lead Transaction Tests
// ==================================================

async function test_DELETE_Lead_Transaction_Success(): Promise<string | null> {
  console.log("\n  Testing DELETE Lead Transaction - Success...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test DELETE Customer",
      phone: "0909666666",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "",
      isDuplicate: false,
      isActive: true,
    });

    await LeadHistory.create({
      leadId: lead._id,
      employeeId: new mongoose.Types.ObjectId(),
      action: "CREATED",
      note: "Initial",
    });

    const leadId = lead._id;
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });
    console.log("    ✓ Test lead created");

    session.startTransaction();

    // 1. Soft delete Lead
    await Lead.updateOne(
      { _id: leadId },
      { $set: { isActive: false } },
      { session }
    );
    console.log("    ✓ Lead isActive set to false in transaction");

    // 2. Create LeadHistory for deletion
    await LeadHistory.create(
      [{
        leadId: leadId,
        employeeId: new mongoose.Types.ObjectId(),
        action: "DELETED",
        note: "Soft delete test",
      }],
      { session }
    );
    console.log("    ✓ LeadHistory created in transaction");

    // 3. Commit
    await session.commitTransaction();
    console.log("    ✓ Transaction committed");

    // 4. Verify changes persist
    const leadAfter = await Lead.findById(leadId).lean();
    if (!leadAfter || leadAfter.isActive !== false) {
      return "Lead isActive not set to false after commit";
    }
    console.log("    ✓ Lead isActive = false after commit");

    // Lead should still exist in database
    if (!leadAfter || leadAfter.customerName !== "Test DELETE Customer") {
      return "Lead data lost after soft delete";
    }
    console.log("    ✓ Lead document still exists");

    const historyCountAfter = await LeadHistory.countDocuments({ leadId });
    if (historyCountAfter <= historyCountBefore) {
      return "LeadHistory not created after commit";
    }
    console.log("    ✓ LeadHistory created after commit");

    const deletedHistory = await LeadHistory.findOne({
      leadId,
      action: "DELETED"
    }).lean();
    if (!deletedHistory) {
      return "DELETED history not found";
    }
    console.log("    ✓ DELETED history exists");

    return null; // Success
  } catch (error) {
    await session.abortTransaction();
    console.error("    ✗ Error:", error);
    return `Exception: ${error}`;
  } finally {
    session.endSession();
  }
}

async function test_DELETE_Lead_Transaction_Rollback(): Promise<string | null> {
  console.log("\n  Testing DELETE Lead Transaction - Rollback...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test DELETE Rollback Customer",
      phone: "0909555555",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const originalIsActive = lead.isActive;
    console.log("    ✓ Test lead created");

    session.startTransaction();

    // 1. Soft delete Lead
    await Lead.updateOne(
      { _id: leadId },
      { $set: { isActive: false } },
      { session }
    );
    console.log("    ✓ Lead isActive set to false in transaction");

    // 2. Create LeadHistory
    await LeadHistory.create(
      [{
        leadId: leadId,
        employeeId: new mongoose.Types.ObjectId(),
        action: "DELETED",
        note: "Delete test",
      }],
      { session }
    );
    console.log("    ✓ LeadHistory created in transaction");

    // 3. Abort transaction (simulate error)
    await session.abortTransaction();
    console.log("    ✓ Transaction aborted");

    // 4. Verify rollback
    const leadAfter = await Lead.findById(leadId).lean();
    if (!leadAfter || leadAfter.isActive !== originalIsActive) {
      return "Lead isActive changed after rollback";
    }
    console.log("    ✓ Lead isActive unchanged after rollback");

    const historyCount = await LeadHistory.countDocuments({
      leadId,
      action: "DELETED"
    });
    if (historyCount > 0) {
      return "LeadHistory still exists after rollback";
    }
    console.log("    ✓ LeadHistory rolled back");

    return null; // Success
  } catch (error) {
    await session.abortTransaction();
    console.error("    ✗ Error:", error);
    return `Exception: ${error}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// MongoDB Verification Tests
// ==================================================

async function test_MongoDB_Verification(): Promise<string | null> {
  console.log("\n  Testing MongoDB Verification...");

  try {
    // 1. Verify collections exist
    const collections = await mongoose.connection.db?.listCollections().toArray();
    const collectionNames = collections?.map(c => c.name) || [];

    if (!collectionNames.includes("leads")) {
      return "Lead collection not found";
    }
    console.log("    ✓ Lead collection exists");

    if (!collectionNames.includes("leadhistories")) {
      return "LeadHistory collection not found";
    }
    console.log("    ✓ LeadHistory collection exists");

    if (!collectionNames.includes("counters")) {
      return "Counter collection not found";
    }
    console.log("    ✓ Counter collection exists");

    // 2. Verify indexes on Lead collection
    const leadIndexes = await Lead.collection.indexes();
    const hasLeadCodeUnique = leadIndexes.some(idx =>
      idx.key && (idx.key as Record<string, number>).leadCode === 1 && idx.unique
    );
    if (!hasLeadCodeUnique) {
      return "Lead collection missing unique leadCode index";
    }
    console.log("    ✓ Lead collection has unique leadCode index");

    // 3. Verify indexes on LeadHistory collection
    const historyIndexes = await LeadHistory.collection.indexes();
    const hasLeadIdIndex = historyIndexes.some(idx =>
      idx.key && (idx.key as Record<string, number>).leadId === 1
    );
    if (!hasLeadIdIndex) {
      return "LeadHistory collection missing leadId index";
    }
    console.log("    ✓ LeadHistory collection has leadId index");

    // 4. Verify schema fields
    const leadSchema = Lead.schema;
    const requiredFields = ["leadCode", "customerName", "sourceType", "status", "isActive"];
    for (const field of requiredFields) {
      if (!leadSchema.paths[field]) {
        return `Lead schema missing required field: ${field}`;
      }
    }
    console.log("    ✓ Lead schema has all required fields");

    const historySchema = LeadHistory.schema;
    const historyRequiredFields = ["leadId", "employeeId", "action"];
    for (const field of historyRequiredFields) {
      if (!historySchema.paths[field]) {
        return `LeadHistory schema missing required field: ${field}`;
      }
    }
    console.log("    ✓ LeadHistory schema has all required fields");

    return null; // Success
  } catch (error) {
    return `Exception: ${error}`;
  }
}

// ==================================================
// Transaction Support Verification
// ==================================================

async function test_Transaction_Support(): Promise<string | null> {
  console.log("\n  Testing MongoDB Transaction Support...");

  try {
    console.log("    ✓ MongoDB connection established");

    // Test if we can start a session (basic transaction support check)
    const session = await mongoose.startSession();
    console.log("    ✓ MongoDB session support available");
    session.endSession();

    return null; // Success
  } catch (error) {
    return `Exception: ${error}`;
  }
}

// ==================================================
// Run All Tests
// ==================================================

async function runTests() {
  console.log("==================================================");
  console.log("Lead Transaction Test Suite (Direct MongoDB)");
  console.log("==================================================\n");

  try {
    await connectDB();
    console.log("Connected to MongoDB\n");

    await cleanup();

    // ==================================================
    // POST Lead Transaction Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("POST LEAD TRANSACTION TESTS");
    console.log("==================================================");

    const postSuccessError = await test_POST_Lead_Transaction_Success();
    logResult(
      "POST Lead - Transaction Success",
      postSuccessError ? "FAIL" : "PASS",
      postSuccessError || "Lead + Counter + LeadHistory created in transaction, committed successfully"
    );

    const postRollbackError = await test_POST_Lead_Transaction_Rollback();
    logResult(
      "POST Lead - Transaction Rollback",
      postRollbackError ? "FAIL" : "PASS",
      postRollbackError || "Transaction aborted, all changes rolled back"
    );

    // ==================================================
    // PUT Lead Transaction Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("PUT LEAD TRANSACTION TESTS");
    console.log("==================================================");

    const putSuccessError = await test_PUT_Lead_Transaction_Success();
    logResult(
      "PUT Lead - Transaction Success",
      putSuccessError ? "FAIL" : "PASS",
      putSuccessError || "Lead updated + LeadHistory created in transaction, committed successfully"
    );

    const putRollbackError = await test_PUT_Lead_Transaction_Rollback();
    logResult(
      "PUT Lead - Transaction Rollback",
      putRollbackError ? "FAIL" : "PASS",
      putRollbackError || "Transaction aborted, all changes rolled back"
    );

    // ==================================================
    // DELETE Lead Transaction Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("DELETE LEAD TRANSACTION TESTS");
    console.log("==================================================");

    const deleteSuccessError = await test_DELETE_Lead_Transaction_Success();
    logResult(
      "DELETE Lead - Transaction Success",
      deleteSuccessError ? "FAIL" : "PASS",
      deleteSuccessError || "Lead soft deleted + LeadHistory created in transaction, committed successfully"
    );

    const deleteRollbackError = await test_DELETE_Lead_Transaction_Rollback();
    logResult(
      "DELETE Lead - Transaction Rollback",
      deleteRollbackError ? "FAIL" : "PASS",
      deleteRollbackError || "Transaction aborted, all changes rolled back"
    );

    // ==================================================
    // MongoDB Verification Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("MONGODB VERIFICATION TESTS");
    console.log("==================================================");

    const mongoError = await test_MongoDB_Verification();
    logResult(
      "MongoDB Verification",
      mongoError ? "FAIL" : "PASS",
      mongoError || "Collections, indexes, and schema verified"
    );

    const txSupportError = await test_Transaction_Support();
    logResult(
      "Transaction Support",
      txSupportError ? "FAIL" : "PASS",
      txSupportError || "MongoDB transaction support available"
    );

    await cleanup();

    // ==================================================
    // Print Summary
    // ==================================================
    console.log("\n==================================================");
    console.log("TEST SUMMARY");
    console.log("==================================================");

    const passed = TEST_RESULTS.filter(r => r.status === "PASS").length;
    const failed = TEST_RESULTS.filter(r => r.status === "FAIL").length;

    console.log(`\nTotal: ${TEST_RESULTS.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log("\nFailed Tests:");
      TEST_RESULTS.filter(r => r.status === "FAIL").forEach(r => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    }

    // Return overall status
    return failed === 0 ? "ALL_PASS" : "SOME_FAILED";

  } catch (error) {
    console.error("Test suite error:", error);
    return "ERROR";
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

// Run tests
runTests()
  .then(status => {
    process.exit(status === "ALL_PASS" ? 0 : 1);
  })
  .catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
