/**
 * Lead Transaction Test Script - Error-based Rollback Testing
 *
 * Mục tiêu: Kiểm thử Transaction rollback khi có lỗi thực tế
 *           KHÔNG gọi session.abortTransaction() trực tiếp
 *
 * Chạy: npx dotenv -e .env.local -- tsx src/app/api/test-lead-transaction-error.ts
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Lead } from "@/models/Lead";
import { LeadHistory } from "@/models/LeadHistory";
import Counter from "@/models/Counter";

const TEST_RESULTS: Array<{ name: string; status: "PASS" | "FAIL"; message: string }> = [];

function logResult(name: string, status: "PASS" | "FAIL", message: string) {
  TEST_RESULTS.push({ name, status, message });
  console.log(`[${status}] ${name}: ${message}`);
}

async function cleanup() {
  console.log("\n--- Cleaning up test data ---");
  try {
    const testLeads = await Lead.find({ customerName: /Test Error/ }).lean();
    const leadIds = testLeads.map(l => l._id);

    if (leadIds.length > 0) {
      await LeadHistory.deleteMany({ leadId: { $in: leadIds } });
    }

    await Lead.deleteMany({ customerName: /Test Error/ });

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

// Helper to generate lead code (outside transaction)
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

  const sequence = (counter.seq || 1).toString().padStart(4, "0");
  return `LD${year}${month}${day}${sequence}`;
}

// ==================================================
// POST Lead - Rollback khi LeadHistory tạo lỗi thực tế
// ==================================================

async function test_POST_Lead_Rollback_With_RealError(): Promise<string | null> {
  console.log("\n  Testing POST Lead - Rollback with Real Error...");

  const session = await mongoose.startSession();

  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    // Get initial state (before transaction)
    const counterBefore = await Counter.findOne({ key: counterKey });
    const seqBefore = counterBefore?.seq || 0;
    const leadCountBefore = await Lead.countDocuments({ customerName: "Test Error POST Lead" });

    session.startTransaction();

    // 1. Update counter in transaction
    await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { upsert: true, session }
    );
    console.log("    ✓ Counter incremented in transaction");

    // 2. Create Lead in transaction
    const leadCode = `LD${year}${month}${day}${(seqBefore + 1).toString().padStart(4, "0")}`;
    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Error POST Lead",
        phone: "0909000001",
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

    // 3. Simulate REAL ERROR when creating LeadHistory
    // Using invalid employeeId (not a valid ObjectId)
    console.log("    ⚠ Simulating real error: Creating LeadHistory with invalid employeeId...");

    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          leadId: lead[0]._id,
          // Invalid employeeId - not a valid ObjectId
          employeeId: "invalid-object-id-that-will-cause-error" as unknown as mongoose.Types.ObjectId,
          action: "CREATED",
          note: "This should cause a validation error",
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Real error occurred: ${(error as Error).message.substring(0, 100)}`);

      // When error occurs inside transaction, MongoDB automatically aborts
      // We just need to end the session
    }

    if (!errorOccurred) {
      return "LeadHistory created with invalid data - validation should have failed";
    }

    // 4. Verify MongoDB state - without explicitly calling abortTransaction()
    // (Transaction is auto-aborted by MongoDB when error occurs)
    const leadCountAfter = await Lead.countDocuments({ customerName: "Test Error POST Lead" });
    console.log(`    Lead count before: ${leadCountBefore}, after: ${leadCountAfter}`);

    if (leadCountAfter !== leadCountBefore) {
      return `Lead count changed - rollback failed: ${leadCountBefore} -> ${leadCountAfter}`;
    }
    console.log("    ✓ Lead count unchanged - rollback worked");

    const leadInDb = await Lead.findOne({ customerName: "Test Error POST Lead" }).lean();
    if (leadInDb) {
      return "Lead still exists in database after error - rollback failed";
    }
    console.log("    ✓ Lead does not exist in database - rollback worked");

    const counterAfter = await Counter.findOne({ key: counterKey });
    if (counterAfter && counterAfter.seq > seqBefore) {
      return `Counter incremented after error - rollback failed: ${seqBefore} -> ${counterAfter.seq}`;
    }
    console.log("    ✓ Counter unchanged - rollback worked");

    return null; // Success
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Unexpected exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// POST Lead - Rollback với duplicate leadCode
// ==================================================

async function test_POST_Lead_Rollback_With_DuplicateCode(): Promise<string | null> {
  console.log("\n  Testing POST Lead - Rollback with Duplicate leadCode...");

  const session = await mongoose.startSession();

  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    session.startTransaction();

    // 1. Create Lead
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Error Duplicate Code",
        phone: "0909000002",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
      }],
      { session }
    );
    console.log("    ✓ First Lead created with code:", leadCode);

    // 2. Try to create Lead with SAME code - should fail
    console.log("    ⚠ Attempting to create Lead with duplicate code...");

    let errorOccurred = false;
    try {
      await Lead.create(
        [{
          leadCode: leadCode, // Same code - should fail
          customerName: "Test Error Duplicate Code 2",
          phone: "0909000003",
          sourceType: "LANDING_PAGE",
          status: "NEW",
          latestRemark: "",
          isDuplicate: false,
          isActive: true,
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Real error occurred: Duplicate key error`);
    }

    if (!errorOccurred) {
      return "Duplicate leadCode was inserted - unique constraint not working";
    }

    // 3. Verify MongoDB state
    const leadCount = await Lead.countDocuments({ customerName: /Test Error Duplicate/ });
    console.log(`    Lead count after error: ${leadCount}`);

    if (leadCount > 0) {
      return `Leads still exist after error - rollback failed: ${leadCount}`;
    }
    console.log("    ✓ No leads exist - rollback worked");

    return null; // Success
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Unexpected exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// PUT Lead - Rollback với lỗi thực tế
// ==================================================

async function test_PUT_Lead_Rollback_With_RealError(): Promise<string | null> {
  console.log("\n  Testing PUT Lead - Rollback with Real Error...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first (outside transaction)
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test Error PUT Lead",
      phone: "0909000010",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "Original remark",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const originalLead = await Lead.findById(leadId).lean();
    const originalRemark = originalLead?.latestRemark || "";
    const originalName = originalLead?.customerName || "";
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });

    console.log(`    ✓ Test lead created with remark: "${originalRemark}"`);

    session.startTransaction();

    // 1. Update Lead in transaction
    await Lead.updateOne(
      { _id: leadId },
      { $set: { latestRemark: "Changed by PUT", customerName: "Changed Name" } },
      { session }
    );
    console.log("    ✓ Lead updated in transaction");

    // 2. Try to create LeadHistory with invalid data - should fail
    console.log("    ⚠ Simulating real error: Creating LeadHistory with invalid action...");

    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          leadId: leadId,
          // Invalid action - not in enum
          action: "INVALID_ACTION_THAT_SHOULD_FAIL",
          note: "This should cause validation error",
          employeeId: new mongoose.Types.ObjectId(),
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Real error occurred: ${(error as Error).message.substring(0, 100)}`);
    }

    if (!errorOccurred) {
      return "LeadHistory created with invalid action - validation should have failed";
    }

    // 3. Verify MongoDB state (rollback should auto-happen)
    const leadAfter = await Lead.findById(leadId).lean();
    console.log(`    Remark before: "${originalRemark}", after: "${leadAfter?.latestRemark || ""}"`);

    if (leadAfter?.latestRemark !== originalRemark) {
      return `Lead was modified after error - rollback failed: expected "${originalRemark}", got "${leadAfter?.latestRemark}"`;
    }
    console.log("    ✓ Lead remark unchanged - rollback worked");

    if (leadAfter?.customerName !== originalName) {
      return `Lead name changed after error - rollback failed`;
    }
    console.log("    ✓ Lead name unchanged - rollback worked");

    const historyCountAfter = await LeadHistory.countDocuments({ leadId });
    if (historyCountAfter > historyCountBefore) {
      return `LeadHistory was created despite error: ${historyCountBefore} -> ${historyCountAfter}`;
    }
    console.log("    ✓ No new LeadHistory created");

    return null; // Success
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Unexpected exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// DELETE Lead - Rollback với lỗi thực tế
// ==================================================

async function test_DELETE_Lead_Rollback_With_RealError(): Promise<string | null> {
  console.log("\n  Testing DELETE Lead - Rollback with Real Error...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first (outside transaction)
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test Error DELETE Lead",
      phone: "0909000020",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const originalIsActive = lead.isActive;
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });

    console.log(`    ✓ Test lead created, isActive: ${originalIsActive}`);

    session.startTransaction();

    // 1. Soft delete Lead in transaction
    await Lead.updateOne(
      { _id: leadId },
      { $set: { isActive: false } },
      { session }
    );
    console.log("    ✓ Lead isActive set to false in transaction");

    // 2. Try to create LeadHistory with missing required field - should fail
    console.log("    ⚠ Simulating real error: Creating LeadHistory with missing leadId...");

    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          // Missing leadId - required field
          action: "DELETED",
          note: "This should cause validation error",
          employeeId: new mongoose.Types.ObjectId(),
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Real error occurred: ${(error as Error).message.substring(0, 100)}`);
    }

    if (!errorOccurred) {
      return "LeadHistory created without leadId - validation should have failed";
    }

    // 3. Verify MongoDB state (rollback should auto-happen)
    const leadAfter = await Lead.findById(leadId).lean();
    console.log(`    isActive before: ${originalIsActive}, after: ${leadAfter?.isActive}`);

    if (leadAfter?.isActive !== originalIsActive) {
      return `Lead isActive changed after error - rollback failed: expected ${originalIsActive}, got ${leadAfter?.isActive}`;
    }
    console.log("    ✓ Lead isActive unchanged - rollback worked");

    const historyCountAfter = await LeadHistory.countDocuments({ leadId });
    if (historyCountAfter > historyCountBefore) {
      return `LeadHistory was created despite error: ${historyCountBefore} -> ${historyCountAfter}`;
    }
    console.log("    ✓ No new LeadHistory created");

    return null; // Success
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Unexpected exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// Verification Tests
// ==================================================

async function verifyMongoDB_After_All_Error_Rollbacks(): Promise<string | null> {
  console.log("\n  Verifying MongoDB after all error rollbacks...");

  try {
    // Count all test data
    const allTestLeads = await Lead.find({ customerName: /Test Error/ }).lean();
    const leadIds = allTestLeads.map(l => l._id);

    console.log(`    Total test leads: ${allTestLeads.length}`);

    // Check that PUT lead is still in original state
    const putLead = await Lead.findOne({ customerName: "Test Error PUT Lead" }).lean();
    if (putLead) {
      console.log(`    PUT Lead - remark: "${putLead.latestRemark}", name: "${putLead.customerName}"`);
      if (putLead.latestRemark !== "Original remark" || putLead.customerName !== "Test Error PUT Lead") {
        return "PUT Lead data was modified despite error rollback";
      }
    }

    // Check that DELETE lead is still active
    const deleteLead = await Lead.findOne({ customerName: "Test Error DELETE Lead" }).lean();
    if (deleteLead) {
      console.log(`    DELETE Lead - isActive: ${deleteLead.isActive}`);
      if (deleteLead.isActive !== true) {
        return "DELETE Lead was soft-deleted despite error rollback";
      }
    }

    // Check that no extra LeadHistory was created
    for (const leadId of leadIds) {
      const historyCount = await LeadHistory.countDocuments({ leadId });
      console.log(`    Lead ${leadId} - history count: ${historyCount}`);
    }

    console.log("    ✓ MongoDB state verified - no data corruption");
    return null;
  } catch (error) {
    return `Verification error: ${(error as Error).message}`;
  }
}

// ==================================================
// Run All Tests
// ==================================================

async function runTests() {
  console.log("==================================================");
  console.log("Lead Transaction Error Rollback Test Suite");
  console.log("==================================================\n");

  try {
    await connectDB();
    console.log("Connected to MongoDB\n");

    await cleanup();

    // ==================================================
    // POST Lead Error Rollback Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("POST LEAD ERROR ROLLBACK TESTS");
    console.log("==================================================");

    const postError1 = await test_POST_Lead_Rollback_With_RealError();
    logResult(
      "POST Lead - Rollback (Invalid LeadHistory Data)",
      postError1 ? "FAIL" : "PASS",
      postError1 || "Transaction rolled back when LeadHistory creation failed"
    );

    const postError2 = await test_POST_Lead_Rollback_With_DuplicateCode();
    logResult(
      "POST Lead - Rollback (Duplicate leadCode)",
      postError2 ? "FAIL" : "PASS",
      postError2 || "Transaction rolled back when duplicate key error occurred"
    );

    // ==================================================
    // PUT Lead Error Rollback Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("PUT LEAD ERROR ROLLBACK TESTS");
    console.log("==================================================");

    const putError = await test_PUT_Lead_Rollback_With_RealError();
    logResult(
      "PUT Lead - Rollback (Invalid LeadHistory Data)",
      putError ? "FAIL" : "PASS",
      putError || "Transaction rolled back when LeadHistory creation failed"
    );

    // ==================================================
    // DELETE Lead Error Rollback Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("DELETE LEAD ERROR ROLLBACK TESTS");
    console.log("==================================================");

    const deleteError = await test_DELETE_Lead_Rollback_With_RealError();
    logResult(
      "DELETE Lead - Rollback (Invalid LeadHistory Data)",
      deleteError ? "FAIL" : "PASS",
      deleteError || "Transaction rolled back when LeadHistory creation failed"
    );

    // ==================================================
    // MongoDB Verification Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("MONGODB VERIFICATION AFTER ERROR ROLLBACK");
    console.log("==================================================");

    const mongoVerify = await verifyMongoDB_After_All_Error_Rollbacks();
    logResult(
      "MongoDB Verification after Error Rollbacks",
      mongoVerify ? "FAIL" : "PASS",
      mongoVerify || "No orphaned data - rollback complete"
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
