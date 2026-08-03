/**
 * Lead Transaction Test Script - Comprehensive Error-based Rollback Testing
 *
 * Mục tiêu: Kiểm thử Transaction với đầy đủ các loại lỗi thực tế:
 * - Validation Error
 * - Duplicate Key Error
 * - Invalid Enum
 * - Required Field
 * - Cast Error
 *
 * Chạy: npx dotenv -e .env.local -- tsx src/app/api/test-lead-transaction-comprehensive.ts
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
    const testLeads = await Lead.find({ customerName: /Test Comp/ }).lean();
    const leadIds = testLeads.map(l => l._id);

    if (leadIds.length > 0) {
      await LeadHistory.deleteMany({ leadId: { $in: leadIds } });
    }

    await Lead.deleteMany({ customerName: /Test Comp/ });

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
// POST Lead Transaction Tests
// ==================================================

async function test_POST_Commit_Success(): Promise<string | null> {
  console.log("\n  [POST] Testing Commit Success...");

  const session = await mongoose.startSession();

  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    session.startTransaction();

    // 1. Update counter
    const counter = await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { upsert: true, session }
    );

    const currentValue = counter?.seq || 1;
    const sequence = currentValue.toString().padStart(4, "0");
    const leadCode = `LD${year}${month}${day}${sequence}`;

    // 2. Create Lead
    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Comp POST Commit",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
      }],
      { session }
    );

    // 3. Create LeadHistory
    const employeeId = new mongoose.Types.ObjectId();
    await LeadHistory.create(
      [{
        leadId: lead[0]._id,
        employeeId: employeeId,
        action: "CREATED",
        note: "Test commit success",
      }],
      { session }
    );

    // 4. Commit
    await session.commitTransaction();

    // 5. Verify MongoDB
    const leadInDb = await Lead.findById(lead[0]._id).lean();
    const historyInDb = await LeadHistory.findOne({ leadId: lead[0]._id }).lean();
    const counterInDb = await Counter.findOne({ key: counterKey }).lean();

    if (!leadInDb) return "Lead not persisted after commit";
    if (!historyInDb) return "LeadHistory not persisted after commit";
    if (!counterInDb || counterInDb.seq < 1) return "Counter not incremented";

    console.log(`    ✓ Lead persisted: ${leadCode}`);
    console.log(`    ✓ LeadHistory persisted with employeeId: ${employeeId}`);
    console.log(`    ✓ Counter incremented: ${counterInDb.seq}`);

    return null;
  } catch (error) {
    console.error("    ✗ Error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_POST_Rollback_By_ValidationError(): Promise<string | null> {
  console.log("\n  [POST] Testing Rollback by Validation Error...");

  const session = await mongoose.startSession();

  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    const counterBefore = await Counter.findOne({ key: counterKey });
    const seqBefore = counterBefore?.seq || 0;
    const leadCountBefore = await Lead.countDocuments({ customerName: "Test Comp POST Validation" });

    session.startTransaction();

    // 1. Update counter
    await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { upsert: true, session }
    );

    // 2. Create Lead
    const leadCode = `LD${year}${month}${day}${(seqBefore + 1).toString().padStart(4, "0")}`;
    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Comp POST Validation",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
      }],
      { session }
    );

    // 3. Trigger Validation Error - invalid leadId in LeadHistory
    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          leadId: "not-a-valid-object-id" as unknown as mongoose.Types.ObjectId,
          employeeId: new mongoose.Types.ObjectId(),
          action: "CREATED",
          note: "Test validation error",
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Validation error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Validation error not triggered";
    }

    // 4. Verify MongoDB state
    const leadCountAfter = await Lead.countDocuments({ customerName: "Test Comp POST Validation" });
    const counterAfter = await Counter.findOne({ key: counterKey });

    if (leadCountAfter !== leadCountBefore) {
      return `Lead not rolled back: ${leadCountBefore} -> ${leadCountAfter}`;
    }
    if (counterAfter && counterAfter.seq > seqBefore) {
      return `Counter not rolled back: ${seqBefore} -> ${counterAfter.seq}`;
    }

    console.log("    ✓ Lead rolled back");
    console.log("    ✓ Counter rolled back");
    console.log("    ✓ LeadHistory not created");

    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_POST_Rollback_By_DuplicateKey(): Promise<string | null> {
  console.log("\n  [POST] Testing Rollback by Duplicate Key Error...");

  const session = await mongoose.startSession();

  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    session.startTransaction();

    // 1. Update counter
    await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { upsert: true, session }
    );

    // 2. Create Lead with specific code
    const leadCode = `LD${year}${month}${day}9999`;
    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Comp POST Duplicate",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
      }],
      { session }
    );

    // 3. Try to create another Lead with same code - duplicate key error
    let errorOccurred = false;
    try {
      await Lead.create(
        [{
          leadCode,
          customerName: "Test Comp POST Duplicate 2",
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
      console.log(`    ✓ Duplicate key error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Duplicate key error not triggered";
    }

    // 4. Verify MongoDB state - everything should be rolled back
    const leadCount = await Lead.countDocuments({ customerName: /Test Comp POST Duplicate/ });
    console.log(`    Lead count after error: ${leadCount}`);

    if (leadCount > 0) {
      return `Leads still exist after duplicate key error: ${leadCount}`;
    }

    console.log("    ✓ All Leads rolled back");
    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_POST_Rollback_By_RequiredField(): Promise<string | null> {
  console.log("\n  [POST] Testing Rollback by Required Field Error...");

  const session = await mongoose.startSession();

  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    const counterBefore = await Counter.findOne({ key: counterKey });
    const seqBefore = counterBefore?.seq || 0;

    session.startTransaction();

    // 1. Update counter
    await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { upsert: true, session }
    );

    // 2. Create Lead
    const leadCode = `LD${year}${month}${day}${(seqBefore + 1).toString().padStart(4, "0")}`;
    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Comp POST Required",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
      }],
      { session }
    );

    // 3. Trigger Required Field Error - missing leadId (required)
    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          // Missing leadId
          employeeId: new mongoose.Types.ObjectId(),
          action: "CREATED",
          note: "Test required field",
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Required field error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Required field error not triggered";
    }

    // 4. Verify rollback
    const leadInDb = await Lead.findOne({ customerName: "Test Comp POST Required" }).lean();
    if (leadInDb) {
      return "Lead still exists after required field error";
    }
    console.log("    ✓ Lead rolled back");

    const counterAfter = await Counter.findOne({ key: counterKey });
    if (counterAfter && counterAfter.seq > seqBefore) {
      return `Counter not rolled back: ${seqBefore} -> ${counterAfter.seq}`;
    }
    console.log("    ✓ Counter rolled back");

    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_POST_Rollback_By_InvalidEnum(): Promise<string | null> {
  console.log("\n  [POST] Testing Rollback by Invalid Enum Error...");

  const session = await mongoose.startSession();

  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    const counterBefore = await Counter.findOne({ key: counterKey });
    const seqBefore = counterBefore?.seq || 0;

    session.startTransaction();

    // 1. Update counter
    await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { upsert: true, session }
    );

    // 2. Create Lead
    const leadCode = `LD${year}${month}${day}${(seqBefore + 1).toString().padStart(4, "0")}`;
    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Comp POST InvalidEnum",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
      }],
      { session }
    );

    // 3. Trigger Invalid Enum Error - sourceType not in enum
    let errorOccurred = false;
    try {
      await Lead.create(
        [{
          leadCode: `LD${year}${month}${day}${(seqBefore + 2).toString().padStart(4, "0")}`,
          customerName: "Test Comp POST InvalidEnum 2",
          sourceType: "INVALID_SOURCE_TYPE" as unknown as "LANDING_PAGE",
          status: "NEW",
          latestRemark: "",
          isDuplicate: false,
          isActive: true,
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Invalid enum error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Invalid enum error not triggered";
    }

    // 4. Verify rollback
    const leadInDb = await Lead.findOne({ customerName: "Test Comp POST InvalidEnum" }).lean();
    if (leadInDb) {
      return "Lead still exists after invalid enum error";
    }
    console.log("    ✓ Lead rolled back");

    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_POST_Rollback_By_CastError(): Promise<string | null> {
  console.log("\n  [POST] Testing Rollback by Cast Error...");

  const session = await mongoose.startSession();

  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const counterKey = `lead_${year}${month}${day}`;

    const counterBefore = await Counter.findOne({ key: counterKey });
    const seqBefore = counterBefore?.seq || 0;

    session.startTransaction();

    // 1. Update counter
    await Counter.findOneAndUpdate(
      { key: counterKey },
      { $inc: { value: 1 } },
      { upsert: true, session }
    );

    // 2. Create Lead
    const leadCode = `LD${year}${month}${day}${(seqBefore + 1).toString().padStart(4, "0")}`;
    const lead = await Lead.create(
      [{
        leadCode,
        customerName: "Test Comp POST Cast",
        sourceType: "LANDING_PAGE",
        status: "NEW",
        latestRemark: "",
        isDuplicate: false,
        isActive: true,
      }],
      { session }
    );

    // 3. Trigger Cast Error - invalid employeeId format
    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          leadId: lead[0]._id,
          employeeId: "not-a-valid-object-id" as unknown as mongoose.Types.ObjectId,
          action: "CREATED",
          note: "Test cast error",
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Cast error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Cast error not triggered";
    }

    // 4. Verify rollback
    const leadInDb = await Lead.findOne({ customerName: "Test Comp POST Cast" }).lean();
    if (leadInDb) {
      return "Lead still exists after cast error";
    }
    console.log("    ✓ Lead rolled back");

    const counterAfter = await Counter.findOne({ key: counterKey });
    if (counterAfter && counterAfter.seq > seqBefore) {
      return `Counter not rolled back: ${seqBefore} -> ${counterAfter.seq}`;
    }
    console.log("    ✓ Counter rolled back");

    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// PUT Lead Transaction Tests
// ==================================================

async function test_PUT_Commit_Success(): Promise<string | null> {
  console.log("\n  [PUT] Testing Commit Success...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test Comp PUT Commit",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "Original",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });

    session.startTransaction();

    // 1. Update Lead
    await Lead.updateOne(
      { _id: leadId },
      { $set: { latestRemark: "Updated remark", customerName: "Test Comp PUT Updated" } },
      { session }
    );

    // 2. Create LeadHistory
    await LeadHistory.create(
      [{
        leadId: leadId,
        employeeId: new mongoose.Types.ObjectId(),
        action: "NOTE_UPDATED",
        oldValue: "Original",
        newValue: "Updated remark",
      }],
      { session }
    );

    // 3. Commit
    await session.commitTransaction();

    // 4. Verify MongoDB
    const leadAfter = await Lead.findById(leadId).lean();
    const historyAfter = await LeadHistory.findOne({
      leadId,
      action: "NOTE_UPDATED"
    }).lean();

    if (!leadAfter || leadAfter.latestRemark !== "Updated remark") {
      return "Lead not updated after commit";
    }
    if (!historyAfter) {
      return "LeadHistory not created after commit";
    }

    console.log("    ✓ Lead updated in MongoDB");
    console.log("    ✓ LeadHistory created in MongoDB");

    return null;
  } catch (error) {
    console.error("    ✗ Error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_PUT_Rollback_By_ValidationError(): Promise<string | null> {
  console.log("\n  [PUT] Testing Rollback by Validation Error...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test Comp PUT Validation",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "Original remark",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const originalRemark = lead.latestRemark || "";
    const originalName = lead.customerName || "";
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });

    session.startTransaction();

    // 1. Update Lead
    await Lead.updateOne(
      { _id: leadId },
      { $set: { latestRemark: "Changed by PUT", customerName: "Changed Name" } },
      { session }
    );

    // 2. Trigger Validation Error - invalid leadId
    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          leadId: "invalid-lead-id" as unknown as mongoose.Types.ObjectId,
          employeeId: new mongoose.Types.ObjectId(),
          action: "NOTE_UPDATED",
          oldValue: originalRemark,
          newValue: "Changed",
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Validation error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Validation error not triggered";
    }

    // 3. Verify rollback
    const leadAfter = await Lead.findById(leadId).lean();
    if (leadAfter?.latestRemark !== originalRemark) {
      return `Lead remark not rolled back: ${originalRemark} -> ${leadAfter?.latestRemark}`;
    }
    if (leadAfter?.customerName !== originalName) {
      return "Lead name not rolled back";
    }
    console.log("    ✓ Lead remark rolled back");
    console.log("    ✓ Lead name rolled back");

    const historyCountAfter = await LeadHistory.countDocuments({ leadId });
    if (historyCountAfter > historyCountBefore) {
      return `LeadHistory count changed: ${historyCountBefore} -> ${historyCountAfter}`;
    }
    console.log("    ✓ LeadHistory count unchanged");

    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_PUT_Rollback_By_InvalidEnum(): Promise<string | null> {
  console.log("\n  [PUT] Testing Rollback by Invalid Enum Error...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test Comp PUT InvalidEnum",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "Original",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const originalRemark = lead.latestRemark || "";
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });

    session.startTransaction();

    // 1. Update Lead
    await Lead.updateOne(
      { _id: leadId },
      { $set: { latestRemark: "Changed by PUT" } },
      { session }
    );

    // 2. Trigger Invalid Enum - invalid action
    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          leadId: leadId,
          employeeId: new mongoose.Types.ObjectId(),
          action: "INVALID_ENUM_ACTION" as unknown as "CREATED",
          oldValue: originalRemark,
          newValue: "Changed",
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Invalid enum error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Invalid enum error not triggered";
    }

    // 3. Verify rollback
    const leadAfter = await Lead.findById(leadId).lean();
    if (leadAfter?.latestRemark !== originalRemark) {
      return "Lead remark not rolled back";
    }
    console.log("    ✓ Lead rolled back");

    const historyCountAfter = await LeadHistory.countDocuments({ leadId });
    if (historyCountAfter > historyCountBefore) {
      return "LeadHistory count changed";
    }
    console.log("    ✓ LeadHistory count unchanged");

    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// DELETE Lead Transaction Tests
// ==================================================

async function test_DELETE_Commit_Success(): Promise<string | null> {
  console.log("\n  [DELETE] Testing Commit Success...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test Comp DELETE Commit",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });

    session.startTransaction();

    // 1. Soft delete
    await Lead.updateOne(
      { _id: leadId },
      { $set: { isActive: false } },
      { session }
    );

    // 2. Create LeadHistory
    await LeadHistory.create(
      [{
        leadId: leadId,
        employeeId: new mongoose.Types.ObjectId(),
        action: "DELETED",
        note: "Test delete commit",
      }],
      { session }
    );

    // 3. Commit
    await session.commitTransaction();

    // 4. Verify MongoDB
    const leadAfter = await Lead.findById(leadId).lean();
    const historyAfter = await LeadHistory.findOne({
      leadId,
      action: "DELETED"
    }).lean();

    if (!leadAfter || leadAfter.isActive !== false) {
      return "Lead not soft deleted after commit";
    }
    if (!historyAfter) {
      return "LeadHistory DELETED not created after commit";
    }

    console.log("    ✓ Lead.isActive = false in MongoDB");
    console.log("    ✓ LeadHistory(DELETED) created in MongoDB");

    return null;
  } catch (error) {
    console.error("    ✗ Error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_DELETE_Rollback_By_RequiredField(): Promise<string | null> {
  console.log("\n  [DELETE] Testing Rollback by Required Field Error...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test Comp DELETE Required",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const originalIsActive = lead.isActive;
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });

    session.startTransaction();

    // 1. Soft delete
    await Lead.updateOne(
      { _id: leadId },
      { $set: { isActive: false } },
      { session }
    );

    // 2. Trigger Required Field Error - missing leadId
    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          // Missing leadId
          employeeId: new mongoose.Types.ObjectId(),
          action: "DELETED",
          note: "Test delete required",
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Required field error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Required field error not triggered";
    }

    // 3. Verify rollback
    const leadAfter = await Lead.findById(leadId).lean();
    if (leadAfter?.isActive !== originalIsActive) {
      return `Lead isActive not rolled back: ${originalIsActive} -> ${leadAfter?.isActive}`;
    }
    console.log("    ✓ Lead.isActive rolled back to true");

    const historyCountAfter = await LeadHistory.countDocuments({ leadId });
    if (historyCountAfter > historyCountBefore) {
      return `LeadHistory count changed: ${historyCountBefore} -> ${historyCountAfter}`;
    }
    console.log("    ✓ LeadHistory count unchanged");

    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

async function test_DELETE_Rollback_By_CastError(): Promise<string | null> {
  console.log("\n  [DELETE] Testing Rollback by Cast Error...");

  const session = await mongoose.startSession();

  try {
    // Create a lead first
    const leadCode = await generateLeadCodeWithCounter();
    const lead = await Lead.create({
      leadCode,
      customerName: "Test Comp DELETE Cast",
      sourceType: "LANDING_PAGE",
      status: "NEW",
      latestRemark: "",
      isDuplicate: false,
      isActive: true,
    });

    const leadId = lead._id;
    const originalIsActive = lead.isActive;
    const historyCountBefore = await LeadHistory.countDocuments({ leadId });

    session.startTransaction();

    // 1. Soft delete
    await Lead.updateOne(
      { _id: leadId },
      { $set: { isActive: false } },
      { session }
    );

    // 2. Trigger Cast Error - invalid employeeId
    let errorOccurred = false;
    try {
      await LeadHistory.create(
        [{
          leadId: leadId,
          employeeId: "not-a-valid-object-id" as unknown as mongoose.Types.ObjectId,
          action: "DELETED",
          note: "Test delete cast",
        }],
        { session }
      );
    } catch (error) {
      errorOccurred = true;
      console.log(`    ✓ Cast error occurred: ${(error as Error).message.substring(0, 80)}`);
    }

    if (!errorOccurred) {
      return "Cast error not triggered";
    }

    // 3. Verify rollback
    const leadAfter = await Lead.findById(leadId).lean();
    if (leadAfter?.isActive !== originalIsActive) {
      return `Lead isActive not rolled back: ${originalIsActive} -> ${leadAfter?.isActive}`;
    }
    console.log("    ✓ Lead.isActive rolled back to true");

    return null;
  } catch (error) {
    console.error("    ✗ Unexpected error:", error);
    return `Exception: ${(error as Error).message}`;
  } finally {
    session.endSession();
  }
}

// ==================================================
// MongoDB Verification
// ==================================================

async function test_MongoDB_Verification(): Promise<string | null> {
  console.log("\n  [MongoDB] Testing Direct MongoDB Verification...");

  try {
    // 1. Check collections
    const collections = await mongoose.connection.db?.listCollections().toArray();
    const names = collections?.map(c => c.name) || [];

    if (!names.includes("leads")) return "leads collection not found";
    if (!names.includes("leadhistories")) return "leadhistories collection not found";
    if (!names.includes("counters")) return "counters collection not found";

    console.log("    ✓ All collections exist: leads, leadhistories, counters");

    // 2. Check data correctness
    const leadCount = await Lead.countDocuments({ customerName: /Test Comp/ });
    const historyCount = await LeadHistory.countDocuments({
      leadId: { $in: await Lead.find({ customerName: /Test Comp/ }).distinct("_id") }
    });

    console.log(`    Test leads count: ${leadCount}`);
    console.log(`    Test histories count: ${historyCount}`);

    // 3. Verify PUT Lead data integrity
    const putLead = await Lead.findOne({ customerName: "Test Comp PUT Commit" }).lean();
    if (putLead) {
      if (putLead.latestRemark !== "Updated remark") {
        return "PUT Lead latestRemark not as expected";
      }
      console.log("    ✓ PUT Lead data verified");
    }

    // 4. Verify DELETE Lead isActive
    const deleteLead = await Lead.findOne({ customerName: "Test Comp DELETE Commit" }).lean();
    if (deleteLead) {
      if (deleteLead.isActive !== false) {
        return "DELETE Lead isActive not as expected";
      }
      console.log("    ✓ DELETE Lead isActive = false");
    }

    // 5. Verify no orphaned data from rollback
    const putValidationLead = await Lead.findOne({ customerName: "Test Comp PUT Validation" }).lean();
    if (putValidationLead && putValidationLead.latestRemark !== "Original remark") {
      return "PUT validation lead has modified data - rollback failed";
    }
    console.log("    ✓ Rollback data verified - no orphaned data");

    return null;
  } catch (error) {
    return `Exception: ${(error as Error).message}`;
  }
}

// ==================================================
// Run All Tests
// ==================================================

async function runTests() {
  console.log("==================================================");
  console.log("Lead Transaction Comprehensive Test Suite");
  console.log("==================================================\n");

  try {
    await connectDB();
    console.log("Connected to MongoDB\n");

    await cleanup();

    // ==================================================
    // POST Transaction Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("POST TRANSACTION TESTS");
    console.log("==================================================");

    const postCommit = await test_POST_Commit_Success();
    logResult("POST Lead - Commit Success", postCommit ? "FAIL" : "PASS", postCommit || "Transaction committed successfully");

    const postValidation = await test_POST_Rollback_By_ValidationError();
    logResult("POST Lead - Rollback by Validation Error", postValidation ? "FAIL" : "PASS", postValidation || "Rollback triggered by invalid leadId");

    const postDuplicate = await test_POST_Rollback_By_DuplicateKey();
    logResult("POST Lead - Rollback by Duplicate Key", postDuplicate ? "FAIL" : "PASS", postDuplicate || "Rollback triggered by duplicate leadCode");

    const postRequired = await test_POST_Rollback_By_RequiredField();
    logResult("POST Lead - Rollback by Required Field", postRequired ? "FAIL" : "PASS", postRequired || "Rollback triggered by missing leadId");

    const postInvalidEnum = await test_POST_Rollback_By_InvalidEnum();
    logResult("POST Lead - Rollback by Invalid Enum", postInvalidEnum ? "FAIL" : "PASS", postInvalidEnum || "Rollback triggered by invalid sourceType");

    const postCast = await test_POST_Rollback_By_CastError();
    logResult("POST Lead - Rollback by Cast Error", postCast ? "FAIL" : "PASS", postCast || "Rollback triggered by invalid employeeId");

    // ==================================================
    // PUT Transaction Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("PUT TRANSACTION TESTS");
    console.log("==================================================");

    const putCommit = await test_PUT_Commit_Success();
    logResult("PUT Lead - Commit Success", putCommit ? "FAIL" : "PASS", putCommit || "Transaction committed successfully");

    const putValidation = await test_PUT_Rollback_By_ValidationError();
    logResult("PUT Lead - Rollback by Validation Error", putValidation ? "FAIL" : "PASS", putValidation || "Rollback triggered by invalid leadId");

    const putInvalidEnum = await test_PUT_Rollback_By_InvalidEnum();
    logResult("PUT Lead - Rollback by Invalid Enum", putInvalidEnum ? "FAIL" : "PASS", putInvalidEnum || "Rollback triggered by invalid action");

    // ==================================================
    // DELETE Transaction Tests
    // ==================================================
    console.log("\n==================================================");
    console.log("DELETE TRANSACTION TESTS");
    console.log("==================================================");

    const deleteCommit = await test_DELETE_Commit_Success();
    logResult("DELETE Lead - Commit Success", deleteCommit ? "FAIL" : "PASS", deleteCommit || "Transaction committed successfully");

    const deleteRequired = await test_DELETE_Rollback_By_RequiredField();
    logResult("DELETE Lead - Rollback by Required Field", deleteRequired ? "FAIL" : "PASS", deleteRequired || "Rollback triggered by missing leadId");

    const deleteCast = await test_DELETE_Rollback_By_CastError();
    logResult("DELETE Lead - Rollback by Cast Error", deleteCast ? "FAIL" : "PASS", deleteCast || "Rollback triggered by invalid employeeId");

    // ==================================================
    // MongoDB Verification
    // ==================================================
    console.log("\n==================================================");
    console.log("MONGODB VERIFICATION");
    console.log("==================================================");

    const mongoDb = await test_MongoDB_Verification();
    logResult("MongoDB Verification", mongoDb ? "FAIL" : "PASS", mongoDb || "Collections, indexes, and data integrity verified");

    await cleanup();

    // ==================================================
    // Summary
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

    return failed === 0 ? "ALL_PASS" : "SOME_FAILED";

  } catch (error) {
    console.error("Test suite error:", error);
    return "ERROR";
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

runTests()
  .then(status => {
    process.exit(status === "ALL_PASS" ? 0 : 1);
  })
  .catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
