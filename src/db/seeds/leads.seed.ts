/**
 * ==================================================
 * LEAD SEED DATA
 * ==================================================
 *
 * Mục tiêu:
 *   - Tạo ~16 Lead bao phủ đầy đủ 8 trạng thái:
 *     NEW / ASSIGNED / PROCESSING / NO_ANSWER / POTENTIAL /
 *     ORDER_CREATED / REJECTED / CANCELLED
 *   - Mỗi Lead có LeadHistory gồm tối thiểu:
 *     CREATED → ASSIGNED → STATUS_CHANGED → NOTE_UPDATED
 *   - Đa dạng tình huống:
 *       * Lead mới
 *       * Lead trùng SĐT (cùng phone với Lead khác)
 *       * Lead trùng Facebook (cùng facebookLink với Lead khác)
 *       * Lead đã có Customer (linked) / chưa có Customer
 *       * Lead đã có Sale / chưa có Sale
 *   - Lead code lấy từ Counter "LEAD" (atomic $inc) - KHÔNG hardcode.
 *   - Customer chưa có seed riêng nên file này tự tạo một vài
 *     Customer tối thiểu để phục vụ "Lead đã có Customer".
 * ==================================================
 */

import Counter from "@/models/Counter";
import { Lead } from "@/models/Lead";
import { LeadHistory } from "@/models/LeadHistory";
import Customer, { type IAddress } from "@/models/Customer";
import Employee from "@/models/Employee";
import FacebookPage from "@/models/FacebookPage";
import Combo from "@/models/Combo";
import Product from "@/models/Product";
import Area from "@/models/Area";
import Team from "@/models/Team";

import { LeadStatus } from "@/constants/leadStatus";
import { LeadAction } from "@/constants/leadAction";

// ==================================================
// Helpers
// ==================================================

/**
 * Atomic counter increment (giống pattern các service khác).
 * Returns padded code: LE000001, LE000002, ...
 * Fix: ensure unique by skipping existing codes.
 */
async function nextLeadCode(): Promise<string> {
  const COUNTER_KEY = "LEAD";
  const MAX_ATTEMPTS = 100;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const updated = await Counter.findOneAndUpdate(
      { key: COUNTER_KEY },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    ).exec();
    const value = updated?.seq ?? 1;
    const code = `LE${String(value).padStart(6, "0")}`;

    // Check if code already exists, skip if so
    const exists = await Lead.findOne({ leadCode: code }).select("_id").lean();
    if (!exists) {
      return code;
    }
    // Code exists, loop will try again with incremented counter
  }

  throw new Error("Failed to generate unique lead code after 100 attempts");
}

/** Tạo Customer mới (1 lần, upsert theo phone). Trả về _id. */
async function ensureCustomer(args: {
  code: string;
  name: string;
  phone: string;
  marketingEmployeeId: string;
  address?: Partial<IAddress>;
}): Promise<string> {
  const area = await Area.findOne({ code: "PVD" });
  const team = await Team.findOne({ code: "SALE" });
  if (!area) throw new Error("Seed Lead: missing area PVD");
  if (!team) throw new Error("Seed Lead: missing team SALE");

  const doc = await Customer.findOneAndUpdate(
    { phone: args.phone },
    {
      $set: {
        customerCode: args.code,
        fullName: args.name,
        phone: args.phone,
        areaId: area._id,
        teamId: team._id,
        marketingEmployeeId: args.marketingEmployeeId,
        address: {
          street: args.address?.street ?? "",
        },
        gender: "other",
        isActive: true,
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).exec();
  return doc!._id.toString();
}

/** Ghi 1 LeadHistory (idempotent: skip nếu đã tồn tại cùng leadId+action+oldValue+newValue). */
async function pushHistory(args: {
  leadId: string;
  employeeId: string;
  action: LeadAction;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt?: Date;
}) {
  if (!args.leadId) return false;
  const exists = await LeadHistory.findOne({
    leadId: args.leadId,
    action: args.action,
    oldValue: args.oldValue ?? null,
    newValue: args.newValue ?? null,
  }).lean();
  if (exists) return false;
  await LeadHistory.create({
    leadId: args.leadId,
    employeeId: args.employeeId,
    action: args.action,
    oldValue: args.oldValue,
    newValue: args.newValue,
    note: args.note,
    createdAt: args.createdAt ?? new Date(),
  });
  return true;
}

/** Convert Lead._id to string sau khi insert. Chấp nhận null/undefined → trả về "" */
function idOf(doc: unknown): string {
  if (!doc || typeof doc !== "object" || !("_id" in doc)) return "";
  const oid = (doc as { _id: unknown })._id;
  return oid && typeof (oid as { toString?: () => string }).toString === "function"
    ? (oid as { toString: () => string }).toString()
    : "";
}

// ==================================================
// Main seed
// ==================================================

export async function seedLeads() {
  // ---- Resolve references ------------------------------------------------
  const mktA = await Employee.findOne({ employeeCode: "EMP_MKT001" });
  const mktB = await Employee.findOne({ employeeCode: "EMP_MKT002" });
  const saleA = await Employee.findOne({ employeeCode: "EMP_SALE001" });
  const saleB = await Employee.findOne({ employeeCode: "EMP_SALE002" });
  const saleC = await Employee.findOne({ employeeCode: "EMP_SALE003" });

  if (!mktA || !mktB || !saleA || !saleB || !saleC) {
    throw new Error("Seed Lead: missing required employees (MKT001/002, SALE001/002/003)");
  }

  const fbIphone = await FacebookPage.findOne({ code: "PAGE_IPHONE" });
  const fbSamsung = await FacebookPage.findOne({ code: "PAGE_SAMSUNG" });
  const fbLaptop = await FacebookPage.findOne({ code: "PAGE_LAPTOP" });

  const combo1 = await Combo.findOne({ code: "COMBO-1HOP" });
  const combo2 = await Combo.findOne({ code: "COMBO-2HOP" });
  const productIphone = await Product.findOne({ code: "IPHONE16" });
  const productGalaxy = await Product.findOne({ code: "GALAXYS25" });

  // ---- Pre-create Customers cho "Lead đã có Customer" -------------------
  const customerDuongId = await ensureCustomer({
    code: "KH000001",
    name: "Nguyễn Hải Đường",
    phone: "0912345001",
    marketingEmployeeId: idOf(mktA),
  });
  const customerPhongId = await ensureCustomer({
    code: "KH000002",
    name: "Trần Thanh Phong",
    phone: "0912345002",
    marketingEmployeeId: idOf(mktA),
  });
  const customerLongId = await ensureCustomer({
    code: "KH000003",
    name: "Phạm Bá Long",
    phone: "0912345003",
    marketingEmployeeId: idOf(mktB),
  });
  const customerLinhId = await ensureCustomer({
    code: "KH000004",
    name: "Đỗ Khánh Linh",
    phone: "0912345004",
    marketingEmployeeId: idOf(mktB),
  });
  const customerHuyId = await ensureCustomer({
    code: "KH000005",
    name: "Võ Quang Huy",
    phone: "0912345005",
    marketingEmployeeId: idOf(mktA),
  });

  // ---- Tạo Lead trước, collect _id để feed các Lead sau có customer -----
  // Dùng plain upsert theo phone để seed idempotent.
  type LeadSpec = {
    phone: string;
    customerName: string;
    facebookLink?: string;
    sourceType: "LANDING_PAGE" | "FACEBOOK_COMMENT" | "FACEBOOK_INBOX" | "OTHER";
    facebookPageId?: string;
    marketingEmployeeId: string;
    saleEmployeeId?: string;
    comboId?: string;
    productId?: string;
    quantity?: number;
    unitPriceMNT?: number;
    status: LeadStatus;
    customerId?: string;
    latestRemark?: string;
    note?: string;
    isDuplicate?: boolean;
    assignmentType?: "AUTO" | "MANUAL";
    assignedAt?: Date;
    /** Thời gian đơn hàng (Sprint 8.x) - thời gian khách đặt. */
    orderDate?: Date;
    /** Thời gian nhận đơn (Sprint 8.x) - thời gian Marketing nhận được. */
    receivedDate?: Date;
  };

  const specs: LeadSpec[] = [
    // 1. NEW - chưa assign, chưa có Customer
    {
      phone: "0987000001",
      customerName: "Lê Minh Anh",
      sourceType: "FACEBOOK_INBOX",
      facebookPageId: idOf(fbIphone),
      marketingEmployeeId: idOf(mktA),
      status: LeadStatus.NEW,
      latestRemark: "Vừa nhận lead từ inbox",
      orderDate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 giờ trước
    },

    // 2. ASSIGNED - đã có Sale, chưa có Customer
    {
      phone: "0987000002",
      customerName: "Ngô Thanh Tùng",
      sourceType: "FACEBOOK_COMMENT",
      facebookPageId: idOf(fbSamsung),
      marketingEmployeeId: idOf(mktA),
      saleEmployeeId: idOf(saleA),
      status: LeadStatus.ASSIGNED,
      comboId: idOf(combo1),
      unitPriceMNT: 45000,
      quantity: 1,
      latestRemark: "Đã phân cho Sale A xử lý",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 1.5 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 1.2 * 24 * 3600 * 1000),
    },

    // 3. PROCESSING - đã có Sale, đã có Customer
    {
      phone: "0912345001",
      customerName: "Nguyễn Hải Đường",
      sourceType: "LANDING_PAGE",
      facebookPageId: idOf(fbIphone),
      marketingEmployeeId: idOf(mktA),
      saleEmployeeId: idOf(saleB),
      customerId: customerDuongId,
      comboId: idOf(combo2),
      unitPriceMNT: 90000,
      quantity: 1,
      status: LeadStatus.PROCESSING,
      latestRemark: "Đang chốt deal",
      note: "Khách quan tâm combo 2 hộp",
      assignmentType: "MANUAL",
      assignedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 2.5 * 24 * 3600 * 1000),
    },

    // 4. NO_ANSWER - gọi 3 lần không nghe
    {
      phone: "0987000003",
      customerName: "Bùi Văn Nam",
      sourceType: "FACEBOOK_INBOX",
      facebookPageId: idOf(fbLaptop),
      marketingEmployeeId: idOf(mktB),
      saleEmployeeId: idOf(saleA),
      productId: idOf(productIphone),
      unitPriceMNT: 25000000,
      quantity: 1,
      status: LeadStatus.NO_ANSWER,
      latestRemark: "Gọi 3 lần không nghe",
      note: "Hẹn gọi lại sau 18h",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 5.5 * 24 * 3600 * 1000),
    },

    // 5. POTENTIAL - có Customer, sale tiềm năng
    {
      phone: "0912345002",
      customerName: "Trần Thanh Phong",
      sourceType: "FACEBOOK_COMMENT",
      facebookPageId: idOf(fbIphone),
      marketingEmployeeId: idOf(mktA),
      saleEmployeeId: idOf(saleC),
      customerId: customerPhongId,
      comboId: idOf(combo1),
      unitPriceMNT: 45000,
      quantity: 1,
      status: LeadStatus.POTENTIAL,
      latestRemark: "Khách hẹn chuyển khoản trong hôm nay",
      note: "Lead chất lượng",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 3.5 * 24 * 3600 * 1000),
    },

    // 6. ORDER_CREATED - đã lên đơn
    {
      phone: "0912345003",
      customerName: "Phạm Bá Long",
      sourceType: "LANDING_PAGE",
      facebookPageId: idOf(fbIphone),
      marketingEmployeeId: idOf(mktB),
      saleEmployeeId: idOf(saleB),
      customerId: customerLongId,
      comboId: idOf(combo2),
      unitPriceMNT: 90000,
      quantity: 2,
      status: LeadStatus.ORDER_CREATED,
      latestRemark: "Đã tạo đơn hàng #ORD000001",
      note: "Đã chốt",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 4.5 * 24 * 3600 * 1000),
    },

    // 7. REJECTED - khách từ chối
    {
      phone: "0987000004",
      customerName: "Đặng Văn Hùng",
      sourceType: "FACEBOOK_COMMENT",
      facebookPageId: idOf(fbSamsung),
      marketingEmployeeId: idOf(mktA),
      saleEmployeeId: idOf(saleA),
      productId: idOf(productGalaxy),
      unitPriceMNT: 18000000,
      quantity: 1,
      status: LeadStatus.REJECTED,
      latestRemark: "Khách không có nhu cầu",
      note: "Từ chối vì giá cao",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 6.5 * 24 * 3600 * 1000),
    },

    // 8. CANCELLED - đơn bị hủy
    {
      phone: "0987000005",
      customerName: "Hoàng Thị Mai",
      sourceType: "LANDING_PAGE",
      facebookPageId: idOf(fbIphone),
      marketingEmployeeId: idOf(mktB),
      saleEmployeeId: idOf(saleC),
      comboId: idOf(combo1),
      unitPriceMNT: 45000,
      quantity: 1,
      status: LeadStatus.CANCELLED,
      latestRemark: "Khách hủy sau khi đặt",
      note: "Hủy vì thay đổi ý định",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 7 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 8 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 7.5 * 24 * 3600 * 1000),
    },

    // 9. NEW - trùng SĐT với Lead #3 (Customer Đường - nhắn lại)
    {
      phone: "0912345001",
      customerName: "Nguyễn Hải Đường (lần 2)",
      sourceType: "FACEBOOK_INBOX",
      facebookPageId: idOf(fbIphone),
      marketingEmployeeId: idOf(mktA),
      status: LeadStatus.NEW,
      latestRemark: "Khách quay lại - trùng SĐT KH000001",
      isDuplicate: true,
      orderDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    },

    // 10. ASSIGNED - trùng Facebook với Lead #3
    {
      phone: "0987000010",
      customerName: "Lý Văn Sơn",
      facebookLink: "https://facebook.com/nguyen.haiduong.demo",
      sourceType: "FACEBOOK_COMMENT",
      facebookPageId: idOf(fbIphone),
      marketingEmployeeId: idOf(mktA),
      saleEmployeeId: idOf(saleB),
      productId: idOf(productIphone),
      unitPriceMNT: 25000000,
      quantity: 1,
      status: LeadStatus.ASSIGNED,
      latestRemark: "Trùng Facebook với Lead cũ",
      isDuplicate: true,
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 1.5 * 24 * 3600 * 1000),
    },

    // 11. PROCESSING - chưa có Customer, chưa có Sale (lạ - đang chờ Sale)
    {
      phone: "0987000011",
      customerName: "Nguyễn Thị Thu",
      sourceType: "FACEBOOK_COMMENT",
      facebookPageId: idOf(fbLaptop),
      marketingEmployeeId: idOf(mktB),
      comboId: idOf(combo2),
      unitPriceMNT: 90000,
      quantity: 1,
      status: LeadStatus.PROCESSING,
      latestRemark: "Đang chờ Sale nhận",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 1.5 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 1.2 * 24 * 3600 * 1000),
    },

    // 12. POTENTIAL - đã có Customer + Sale
    {
      phone: "0912345004",
      customerName: "Đỗ Khánh Linh",
      sourceType: "FACEBOOK_INBOX",
      facebookPageId: idOf(fbSamsung),
      marketingEmployeeId: idOf(mktB),
      saleEmployeeId: idOf(saleA),
      customerId: customerLinhId,
      productId: idOf(productGalaxy),
      unitPriceMNT: 18000000,
      quantity: 1,
      status: LeadStatus.POTENTIAL,
      latestRemark: "Khách so sánh giá",
      note: "Cần follow-up 2 ngày",
      assignmentType: "MANUAL",
      assignedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 2.5 * 24 * 3600 * 1000),
    },

    // 13. NO_ANSWER - trùng SĐT với Lead #12
    {
      phone: "0912345004",
      customerName: "Đỗ Khánh Linh (nhắn lại)",
      sourceType: "FACEBOOK_INBOX",
      facebookPageId: idOf(fbSamsung),
      marketingEmployeeId: idOf(mktB),
      saleEmployeeId: idOf(saleA),
      status: LeadStatus.NO_ANSWER,
      latestRemark: "Trùng SĐT - khách gửi lại",
      isDuplicate: true,
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 1.2 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 1.1 * 24 * 3600 * 1000),
    },

    // 14. ORDER_CREATED - chưa có Customer
    {
      phone: "0987000014",
      customerName: "Trịnh Văn Kiên",
      sourceType: "LANDING_PAGE",
      facebookPageId: idOf(fbIphone),
      marketingEmployeeId: idOf(mktA),
      saleEmployeeId: idOf(saleC),
      comboId: idOf(combo1),
      unitPriceMNT: 45000,
      quantity: 3,
      status: LeadStatus.ORDER_CREATED,
      latestRemark: "Đã tạo đơn #ORD000002",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 4 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 3.5 * 24 * 3600 * 1000),
    },

    // 15. NEW - đã có Customer, chưa Sale
    {
      phone: "0912345005",
      customerName: "Võ Quang Huy",
      sourceType: "OTHER",
      marketingEmployeeId: idOf(mktA),
      customerId: customerHuyId,
      status: LeadStatus.NEW,
      latestRemark: "Khách cũ quay lại",
      orderDate: new Date(Date.now() - 0.5 * 24 * 3600 * 1000),
    },

    // 16. CANCELLED - đã có Customer + Sale
    {
      phone: "0987000016",
      customerName: "Phan Thanh Bình",
      sourceType: "FACEBOOK_COMMENT",
      facebookPageId: idOf(fbLaptop),
      marketingEmployeeId: idOf(mktB),
      saleEmployeeId: idOf(saleB),
      productId: idOf(productIphone),
      unitPriceMNT: 25000000,
      quantity: 1,
      status: LeadStatus.CANCELLED,
      latestRemark: "Không liên lạc được sau 5 ngày",
      assignmentType: "AUTO",
      assignedAt: new Date(Date.now() - 8 * 24 * 3600 * 1000),
      orderDate: new Date(Date.now() - 9 * 24 * 3600 * 1000),
      receivedDate: new Date(Date.now() - 8.5 * 24 * 3600 * 1000),
    },
  ];

  // ---- Insert từng Lead + LeadHistory ----------------------------------
  // Reset counter về 0 trước khi seed để LE000001 là Lead đầu tiên,
  // nhưng CHỈ khi chưa có Lead nào (tránh phá Lead đã có).
  const existingLeadCount = await Lead.countDocuments({});
  if (existingLeadCount === 0) {
    await Counter.updateOne(
      { key: "LEAD" },
      { $set: { seq: 0 } },
      { upsert: true }
    ).exec();
  }

  let createdCount = 0;
  let historyCreatedCount = 0;

  for (const spec of specs) {
    // Idempotent: lookup theo phone + sourceType + customerName.
    let leadDoc = await Lead.findOne({
      phone: spec.phone,
      sourceType: spec.sourceType,
      customerName: spec.customerName,
    });

    const leadCode = leadDoc?.leadCode ?? (await nextLeadCode());

    if (!leadDoc) {
      leadDoc = await Lead.create({
        leadCode,
        customerId: spec.customerId,
        customerName: spec.customerName,
        facebookLink: spec.facebookLink,
        phone: spec.phone,
        sourceType: spec.sourceType,
        facebookPageId: spec.facebookPageId,
        marketingEmployeeId: spec.marketingEmployeeId,
        saleEmployeeId: spec.saleEmployeeId,
        assignmentType: spec.assignmentType,
        assignedAt: spec.assignedAt,
        comboId: spec.comboId,
        productId: spec.productId,
        unitPriceMNT: spec.unitPriceMNT,
        quantity: spec.quantity ?? 1,
        status: spec.status,
        latestRemark: spec.latestRemark,
        note: spec.note,
        isDuplicate: spec.isDuplicate ?? false,
        isActive: true,
        // Sprint 8.x: Thời gian đơn hàng và nhận đơn
        orderDate: spec.orderDate,
        receivedDate: spec.receivedDate,
      });
      createdCount += 1;
    }

    const leadId = idOf(leadDoc);

    // ---- LeadHistory: CREATED ---------------------------------------
    if (
      await pushHistory({
        leadId,
        employeeId: spec.marketingEmployeeId,
        action: LeadAction.CREATED,
        newValue: spec.status,
        note: `Tạo Lead từ ${spec.sourceType}`,
        createdAt: spec.assignedAt ?? new Date(),
      })
    )
      historyCreatedCount += 1;

    // ---- LeadHistory: ASSIGNED (nếu có Sale) -----------------------
    if (spec.saleEmployeeId) {
      if (
        await pushHistory({
          leadId,
          employeeId: spec.marketingEmployeeId,
          action: LeadAction.ASSIGNED,
          newValue: spec.saleEmployeeId,
          note: "Phân công Sale",
          createdAt: spec.assignedAt ?? new Date(),
        })
      )
        historyCreatedCount += 1;
    }

    // ---- LeadHistory: STATUS_CHANGED (nếu khác NEW) ----------------
    if (spec.status !== LeadStatus.NEW) {
      if (
        await pushHistory({
          leadId,
          employeeId: spec.marketingEmployeeId,
          action: LeadAction.STATUS_CHANGED,
          oldValue: LeadStatus.NEW,
          newValue: spec.status,
          note: `Chuyển sang ${spec.status}`,
          createdAt: spec.assignedAt ?? new Date(),
        })
      )
        historyCreatedCount += 1;
    }

    // ---- LeadHistory: NOTE_UPDATED (nếu có note) ------------------
    if (spec.note) {
      if (
        await pushHistory({
          leadId,
          employeeId: spec.saleEmployeeId ?? spec.marketingEmployeeId,
          action: LeadAction.NOTE_UPDATED,
          newValue: spec.note,
          note: "Cập nhật ghi chú",
          createdAt: new Date(),
        })
      )
        historyCreatedCount += 1;
    }
  }

  console.log(`[OK] Leads (${createdCount} mới)`);
  console.log(`[OK] Lead Histories (${historyCreatedCount} mới)`);
}