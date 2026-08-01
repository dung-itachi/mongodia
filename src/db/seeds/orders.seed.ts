/**
 * ==================================================
 * ORDER SEED DATA
 * ==================================================
 *
 * Mục tiêu:
 *   - Tạo 18 Order bao phủ đầy đủ:
 *       Status (7):     PENDING / CONFIRMED / PREPAID / SHIPPING /
 *                       COMPLETED / CANCELLED / FAILED
 *       OrderType (5):  NORMAL / COMBO / GIFT / EXCHANGE / REPLACEMENT
 *       OrderSource (5):FACEBOOK / IMPORT / PHONE / WEBSITE / MANUAL
 *   - Mix revenueLocked = true / false.
 *   - Mix stockReserved = true / false (audit-only field).
 *   - Đa dạng:
 *       * có payments (CASH / BANK_TRANSFER / MOMO, partial / full)
 *       * có shipping (đầy đủ tracking / carrier / estimatedDelivery)
 *       * có warehouse + productVariantId + comboId + lead + customer
 *       * từng orderType có orders riêng để test rule (GIFT/EXCHANGE/REPLACEMENT
 *         không tính revenue; COMBO có comboId; NORMAL có variant).
 *   - Mỗi Order có OrderHistory tối thiểu CREATED; nhiều Order có thêm
 *     STATUS_CHANGED / PAYMENT_ADDED / SHIPPING_UPDATED / STOCK_RESERVED /
 *     STOCK_RELEASED / REVENUE_LOCKED / DELETED (nếu status phù hợp).
 *   - Seed idempotent theo orderCode (lookup upsert).
 *   - Chưa có seed Warehouse riêng, nên file này tự tạo 2 Warehouse
 *     "WH-PVD-01" / "WH-PVD-02" idempotent (giống pattern Customer
 *     của Lead seed).
 *
 * PHỤ THUỘC (phải seed theo thứ tự này trước):
 *   - Permissions / Roles / Employees / Areas / Teams
 *   - Products / ProductVariants / Combos
 *   - Customers (Lead seed đã tạo 5 Customer đầu tiên)
 *   - Leads
 * ==================================================
 */

import { Order } from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";

import Customer from "@/models/Customer";
import Employee from "@/models/Employee";
import { Lead } from "@/models/Lead";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import Combo from "@/models/Combo";
import Area from "@/models/Area";
import Team from "@/models/Team";
import Warehouse from "@/models/Warehouse";

import {
  OrderStatus,
  OrderType,
  OrderSource,
  OrderAction,
  REVENUE_UNLOCK_STATUSES,
} from "@/constants/orderStatus";

// ==================================================
// Types (dùng nội bộ)
// ==================================================

type ShippingPayload = {
  receiverName: string;
  receiverPhone: string;
  address: string;
  province?: string;
  district?: string;
  ward?: string;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippingFee?: number;
  shippingFeeCurrency?: "VND" | "MNT" | "USD";
  /**
   * Free text — note cho shipping (vd: "Giao ngoài giờ HC", "Đổi hàng bảo hành", ...).
   * KHÔNG ghi đè `Order.note` (note của Order).
   */
  note?: string;
};

type PaymentPayload = {
  method: "CASH" | "BANK_TRANSFER" | "MOMO" | "ZALO_PAY" | "VNPAY" | "OTHER";
  amount: number;
  currency: "VND" | "MNT" | "USD";
  paidAt: Date;
  transactionId?: string;
  note?: string;
};

type OrderSpec = {
  /**
   * Seed key cố định (dùng cho idempotent lookup), KHÔNG phải orderCode.
   * Ví dụ: "OD2508010001".
   */
  seedCode: string;

  status: OrderStatus;
  orderType: OrderType;
  orderSource: OrderSource;
  customerName: string;
  customerPhone?: string;
  /** Override Customer nếu cần (lookup trước khi tạo Customer mới). */
  customerCode?: string;
  leadCode?: string; // liên kết với Lead nếu có
  /** Worker identifiers. */
  marketingEmployeeCode: string;
  saleEmployeeCode?: string;

  productCode?: string;
  productVariantSku?: string;
  comboCode?: string;
  warehouseCode?: string;

  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: "VND" | "MNT" | "USD";
  estimatedWeight?: number;

  isPrepaid?: boolean;

  payments?: PaymentPayload[];
  shipping?: ShippingPayload;

  /** Revenue Lock — chỉ áp dụng cho orderType NORMAL/COMBO. */
  revenueLocked?: boolean;
  marketingRevenueRaw?: number;
  saleRevenueRaw?: number;
  revenueEligible?: boolean;
  revenueLockReason?: string;
  revenueCalculatedAt?: Date;

  /** Stock reservation audit (Phase 4.3 refactor — KHÔNG dùng làm source of truth). */
  stockReservedAt?: Date;

  note?: string;

  /** Extra OrderHistory (CREATED luôn được push; các action này là optional). */
  extraHistory?: Array<{
    action: OrderAction;
    employeeCode: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    note?: string;
    createdAtOffsetDays?: number; // offset từ ngày tạo, mặc định 0
  }>;

  /** Soft-delete flag — nếu true, Order sẽ có isActive=false + history DELETED. */
  isDeleted?: boolean;
};

// ==================================================
// Helpers
// ==================================================

const DAY_MS = 24 * 3600 * 1000;

/** Lookup 1 doc theo code/unique key → string id ("" nếu thiếu). */
function idOf(doc: unknown): string {
  if (!doc || typeof doc !== "object" || !("_id" in doc)) return "";
  const oid = (doc as { _id: unknown })._id;
  return oid && typeof (oid as { toString?: () => string }).toString === "function"
    ? (oid as { toString: () => string }).toString()
    : "";
}

/**
 * Đảm bảo Customer tồn tại (lookup theo code hoặc tạo mới).
 * Idempotent: upsert theo `code`.
 */
async function ensureCustomer(args: {
  code: string;
  name: string;
  phone: string;
  marketingEmployeeId: string;
}): Promise<string> {
  const area = await Area.findOne({ code: "PVD" });
  const team = await Team.findOne({ code: "SALE" });
  if (!area) throw new Error("Seed Order: missing area PVD");
  if (!team) throw new Error("Seed Order: missing team SALE");

  const doc = await Customer.findOneAndUpdate(
    { code: args.code },
    {
      $set: {
        code: args.code,
        name: args.name,
        phone: args.phone,
        areaId: area._id,
        teamId: team._id,
        marketingEmployeeId: args.marketingEmployeeId,
        gender: "OTHER",
        address: "",
        isActive: true,
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).exec();
  return doc!._id.toString();
}

/**
 * Đảm bảo Warehouse tồn tại (idempotent theo `code`).
 * Vì chưa có seed Warehouse riêng, file Order seed tự upsert.
 */
async function ensureWarehouse(args: {
  code: string;
  name: string;
  managerId?: string;
}): Promise<string> {
  const area = await Area.findOne({ code: "PVD" });
  if (!area) throw new Error("Seed Order: missing area PVD");

  const doc = await Warehouse.findOneAndUpdate(
    { code: args.code },
    {
      $set: {
        code: args.code,
        name: args.name,
        areaId: area._id,
        managerId: args.managerId ?? null,
        address: "",
        isActive: true,
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  ).exec();
  return doc!._id.toString();
}

/**
 * Ghi 1 OrderHistory (idempotent: skip nếu đã tồn tại cùng orderId+action+note).
 */
async function pushHistory(args: {
  orderId: string;
  employeeId: string;
  action: OrderAction;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
  createdAt?: Date;
}): Promise<boolean> {
  if (!args.orderId) return false;
  const exists = await OrderHistory.findOne({
    orderId: args.orderId,
    action: args.action,
    note: args.note ?? null,
  }).lean();
  if (exists) return false;
  await OrderHistory.create({
    orderId: args.orderId,
    employeeId: args.employeeId,
    action: args.action,
    fieldName: args.fieldName,
    oldValue: args.oldValue,
    newValue: args.newValue,
    note: args.note,
    createdAt: args.createdAt ?? new Date(),
  });
  return true;
}

// ==================================================
// Order specs
// ==================================================

function buildOrderSpecs(args: {
  baseDate: Date;
  leadIds: Record<string, string>;
}): OrderSpec[] {
  const { baseDate, leadIds } = args;

  const baseDateKey = `${baseDate.getFullYear().toString().slice(-2)}${String(
    baseDate.getMonth() + 1
  ).padStart(2, "0")}${String(baseDate.getDate()).padStart(2, "0")}`;

  // Approx "now" timestamps cho từng trạng thái.
  const createdOffset = (daysAgo: number) =>
    new Date(baseDate.getTime() - daysAgo * DAY_MS);

  // Dùng shipping/carrier đa dạng.
  const shippingVNPost = (overrides: Partial<ShippingPayload> = {}): ShippingPayload => ({
    receiverName: "Nguyễn Văn Nhận",
    receiverPhone: "0987654321",
    address: "123 Nguyễn Trãi, Phường Thanh Xuân",
    province: "Hà Nội",
    district: "Thanh Xuân",
    ward: "Thanh Xuân Trung",
    trackingNumber: `VNPOST${Math.floor(100000000 + Math.random() * 900000000)}`,
    carrier: "VNPost",
    estimatedDelivery: new Date(baseDate.getTime() + 2 * DAY_MS),
    shippingFee: 30000,
    shippingFeeCurrency: "VND",
    ...overrides,
  });

  const shippingJNT = (overrides: Partial<ShippingPayload> = {}): ShippingPayload => ({
    receiverName: "Trần Thị Nhận",
    receiverPhone: "0987654322",
    address: "456 Lê Lợi, Phường Bến Nghé",
    province: "TP. Hồ Chí Minh",
    district: "Quận 1",
    ward: "Bến Nghé",
    trackingNumber: `JNT${Math.floor(100000000 + Math.random() * 900000000)}`,
    carrier: "J&T Express",
    estimatedDelivery: new Date(baseDate.getTime() + 3 * DAY_MS),
    shippingFee: 35000,
    shippingFeeCurrency: "VND",
    ...overrides,
  });

  // Payment templates.
  const paymentCashFull = (amount: number): PaymentPayload => ({
    method: "CASH",
    amount,
    currency: "VND",
    paidAt: createdOffset(3),
  });

  const paymentCashPartial = (amount: number): PaymentPayload => ({
    method: "CASH",
    amount,
    currency: "VND",
    paidAt: createdOffset(1),
    note: "Đặt cọc trước",
  });

  const paymentBankFull = (amount: number): PaymentPayload => ({
    method: "BANK_TRANSFER",
    amount,
    currency: "VND",
    paidAt: createdOffset(2),
    transactionId: `TX${Math.floor(100000 + Math.random() * 900000)}`,
    note: "Chuyển khoản ngân hàng",
  });

  const paymentBankPartial = (
    amount: number,
    note?: string
  ): PaymentPayload => ({
    method: "BANK_TRANSFER",
    amount,
    currency: "VND",
    paidAt: createdOffset(1),
    transactionId: `TX${Math.floor(100000 + Math.random() * 900000)}`,
    note: note ?? "Đặt cọc chuyển khoản",
  });

  const paymentMomoFull = (amount: number): PaymentPayload => ({
    method: "MOMO",
    amount,
    currency: "VND",
    paidAt: createdOffset(4),
    transactionId: `MOMO${Math.floor(100000 + Math.random() * 900000)}`,
  });

  // Order specs 18 đơn.
  const specs: OrderSpec[] = [
    // ============================================================
    // #1 — PENDING · NORMAL · FACEBOOK · chưa thanh toán, đã reserve kho
    // ============================================================
    {
      seedCode: `${baseDateKey}0001`,
      status: OrderStatus.PENDING,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.FACEBOOK,
      customerName: "Nguyễn Hải Đường",
      customerCode: "KH000001",
      customerPhone: "0912345001",
      leadCode: leadIds.duongProcessing,
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE001",
      productCode: "IPHONE16",
      productVariantSku: "IP16-BLK-128",
      warehouseCode: "WH-PVD-01",
      quantity: 1,
      unitPrice: 24990000,
      totalAmount: 24990000,
      currency: "VND",
      estimatedWeight: 170,
      isPrepaid: false,
      payments: [paymentCashPartial(5000000)],
      stockReservedAt: createdOffset(0),
      note: "Khách inbox fanpage iPhone",
      extraHistory: [
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE001",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 0,
        },
        {
          action: OrderAction.PAYMENT_ADDED,
          employeeCode: "EMP_SALE001",
          fieldName: "payments",
          oldValue: "0",
          newValue: "5000000",
          note: "Cập nhật thanh toán",
          createdAtOffsetDays: 0,
        },
      ],
    },

    // ============================================================
    // #2 — CONFIRMED · COMBO · PHONE · đã thanh toán cọc, đã reserve
    // ============================================================
    {
      seedCode: `${baseDateKey}0002`,
      status: OrderStatus.CONFIRMED,
      orderType: OrderType.COMBO,
      orderSource: OrderSource.PHONE,
      customerName: "Trần Thanh Phong",
      customerCode: "KH000002",
      customerPhone: "0912345002",
      leadCode: leadIds.phongPotential,
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE003",
      comboCode: "COMBO-1HOP",
      warehouseCode: "WH-PVD-01",
      quantity: 1,
      unitPrice: 45000,
      totalAmount: 45000,
      currency: "VND",
      estimatedWeight: 50,
      isPrepaid: true,
      payments: [paymentCashPartial(45000)],
      revenueLocked: true,
      revenueEligible: true,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 9000,
      saleRevenueRaw: 22500,
      stockReservedAt: createdOffset(2),
      note: "Khách gọi điện chốt combo 1 hộp",
      extraHistory: [
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE003",
          fieldName: "status",
          oldValue: OrderStatus.PENDING,
          newValue: OrderStatus.CONFIRMED,
          note: "Đổi trạng thái",
          createdAtOffsetDays: 1,
        },
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE003",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 0,
        },
        {
          action: OrderAction.PAYMENT_ADDED,
          employeeCode: "EMP_SALE003",
          fieldName: "payments",
          oldValue: "0",
          newValue: "45000",
          note: "Cập nhật thanh toán",
          createdAtOffsetDays: 0,
        },
        {
          action: OrderAction.REVENUE_LOCKED,
          employeeCode: "EMP_SALE003",
          note: "Khóa doanh thu",
          createdAtOffsetDays: 1,
        },
      ],
    },

    // ============================================================
    // #3 — PREPAID · NORMAL · WEBSITE · full payment bank, shipping
    // ============================================================
    {
      seedCode: `${baseDateKey}0003`,
      status: OrderStatus.PREPAID,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.WEBSITE,
      customerName: "Phạm Bá Long",
      customerCode: "KH000003",
      customerPhone: "0912345003",
      marketingEmployeeCode: "EMP_MKT002",
      saleEmployeeCode: "EMP_SALE002",
      productCode: "GALAXYS25",
      productVariantSku: "GS25-BLK-256",
      warehouseCode: "WH-PVD-02",
      quantity: 1,
      unitPrice: 22990000,
      totalAmount: 22990000,
      currency: "VND",
      estimatedWeight: 168,
      isPrepaid: true,
      payments: [paymentBankFull(22990000)],
      shipping: shippingVNPost(),
      revenueLocked: true,
      revenueEligible: true,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 4598000,
      saleRevenueRaw: 11495000,
      note: "Khách đặt trên website",
      extraHistory: [
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE002",
          fieldName: "status",
          oldValue: OrderStatus.CONFIRMED,
          newValue: OrderStatus.PREPAID,
          note: "Đổi trạng thái",
          createdAtOffsetDays: 3,
        },
        {
          action: OrderAction.PAYMENT_ADDED,
          employeeCode: "EMP_SALE002",
          fieldName: "payments",
          oldValue: "0",
          newValue: "22990000",
          note: "Thanh toán đủ",
          createdAtOffsetDays: 3,
        },
        {
          action: OrderAction.SHIPPING_UPDATED,
          employeeCode: "EMP_SALE002",
          fieldName: "shipping",
          note: "Cập nhật vận chuyển",
          createdAtOffsetDays: 2,
        },
      ],
    },

    // ============================================================
    // #4 — SHIPPING · NORMAL · FACEBOOK · full payment, đã shipped
    // ============================================================
    {
      seedCode: `${baseDateKey}0004`,
      status: OrderStatus.SHIPPING,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.FACEBOOK,
      customerName: "Đỗ Khánh Linh",
      customerCode: "KH000004",
      customerPhone: "0912345004",
      leadCode: leadIds.linhPotential,
      marketingEmployeeCode: "EMP_MKT002",
      saleEmployeeCode: "EMP_SALE001",
      productCode: "MACBOOKPRO",
      productVariantSku: "MBP-16G-512",
      warehouseCode: "WH-PVD-01",
      quantity: 1,
      unitPrice: 49990000,
      totalAmount: 49990000,
      currency: "VND",
      estimatedWeight: 1580,
      isPrepaid: true,
      payments: [paymentCashFull(49990000)],
      shipping: shippingJNT({
        estimatedDelivery: createdOffset(-1),
      }),
      revenueLocked: true,
      revenueEligible: true,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 9998000,
      saleRevenueRaw: 24995000,
      stockReservedAt: createdOffset(7),
      note: "Khách mua MacBook qua inbox",
      extraHistory: [
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE001",
          fieldName: "status",
          oldValue: OrderStatus.PREPAID,
          newValue: OrderStatus.SHIPPING,
          note: "Đổi trạng thái",
          createdAtOffsetDays: 1,
        },
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE001",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 7,
        },
        {
          action: OrderAction.SHIPPING_UPDATED,
          employeeCode: "EMP_SALE001",
          fieldName: "shipping",
          note: "Đã gửi J&T",
          createdAtOffsetDays: 2,
        },
      ],
    },

    // ============================================================
    // #5 — COMPLETED · COMBO · IMPORT · delivered
    // ============================================================
    {
      seedCode: `${baseDateKey}0005`,
      status: OrderStatus.COMPLETED,
      orderType: OrderType.COMBO,
      orderSource: OrderSource.IMPORT,
      customerName: "Võ Quang Huy",
      customerCode: "KH000005",
      customerPhone: "0912345005",
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE003",
      comboCode: "COMBO-2HOP",
      warehouseCode: "WH-PVD-01",
      quantity: 2,
      unitPrice: 90000,
      totalAmount: 180000,
      currency: "VND",
      estimatedWeight: 100,
      isPrepaid: true,
      payments: [paymentMomoFull(180000)],
      shipping: shippingVNPost({
        actualDelivery: createdOffset(-2),
        estimatedDelivery: createdOffset(-3),
      }),
      revenueLocked: true,
      revenueEligible: true,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 36000,
      saleRevenueRaw: 90000,
      note: "Combo 2 hộp import",
      extraHistory: [
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE003",
          fieldName: "status",
          oldValue: OrderStatus.SHIPPING,
          newValue: OrderStatus.COMPLETED,
          note: "Hoàn tất đơn",
          createdAtOffsetDays: 1,
        },
        {
          action: OrderAction.PAYMENT_ADDED,
          employeeCode: "EMP_SALE003",
          fieldName: "payments",
          oldValue: "0",
          newValue: "180000",
          note: "Thanh toán MOMO",
          createdAtOffsetDays: 8,
        },
      ],
    },

    // ============================================================
    // #6 — COMPLETED · NORMAL · MANUAL · full payment + delivered
    // ============================================================
    {
      seedCode: `${baseDateKey}0006`,
      status: OrderStatus.COMPLETED,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.MANUAL,
      customerName: "Nguyễn Hải Đường",
      customerCode: "KH000001",
      customerPhone: "0912345001",
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE002",
      productCode: "IPHONE16",
      productVariantSku: "IP16-WHT-128",
      warehouseCode: "WH-PVD-02",
      quantity: 1,
      unitPrice: 24990000,
      totalAmount: 24990000,
      currency: "VND",
      estimatedWeight: 170,
      isPrepaid: true,
      payments: [paymentBankFull(24990000)],
      shipping: shippingVNPost({
        actualDelivery: createdOffset(-1),
        estimatedDelivery: createdOffset(-3),
        receiverName: "Nguyễn Hải Đường",
        receiverPhone: "0912345001",
        address: "12 Nguyễn Du, Hai Bà Trưng",
      }),
      revenueLocked: true,
      revenueEligible: true,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 4998000,
      saleRevenueRaw: 12495000,
      stockReservedAt: createdOffset(15),
      note: "Đơn tạo tay tại cửa hàng",
      extraHistory: [
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE002",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 15,
        },
        {
          action: OrderAction.SHIPPING_UPDATED,
          employeeCode: "EMP_SALE002",
          fieldName: "shipping",
          note: "Khách nhận trực tiếp",
          createdAtOffsetDays: 5,
        },
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE002",
          fieldName: "status",
          oldValue: OrderStatus.SHIPPING,
          newValue: OrderStatus.COMPLETED,
          note: "Hoàn tất đơn",
          createdAtOffsetDays: 3,
        },
      ],
    },

    // ============================================================
    // #7 — CANCELLED · NORMAL · PHONE · khách hủy (revenue unlock)
    // ============================================================
    {
      seedCode: `${baseDateKey}0007`,
      status: OrderStatus.CANCELLED,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.PHONE,
      customerName: "Lê Minh Anh",
      customerPhone: "0987000001",
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE001",
      productCode: "IPHONE16",
      productVariantSku: "IP16-BLK-128",
      warehouseCode: "WH-PVD-01",
      quantity: 1,
      unitPrice: 24990000,
      totalAmount: 24990000,
      currency: "VND",
      isPrepaid: false,
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "ORDER_CANCELLED",
      note: "Khách đổi ý",
      extraHistory: [
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE001",
          fieldName: "status",
          oldValue: OrderStatus.PENDING,
          newValue: OrderStatus.CANCELLED,
          note: "Khách hủy",
          createdAtOffsetDays: 2,
        },
        {
          action: OrderAction.REVENUE_UNLOCKED,
          employeeCode: "EMP_SALE001",
          note: "Mở khóa doanh thu",
          createdAtOffsetDays: 2,
        },
      ],
    },

    // ============================================================
    // #8 — FAILED · NORMAL · WEBSITE · giao thất bại (revenue unlock)
    // ============================================================
    {
      seedCode: `${baseDateKey}0008`,
      status: OrderStatus.FAILED,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.WEBSITE,
      customerName: "Ngô Thanh Tùng",
      customerPhone: "0987000002",
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE001",
      productCode: "GALAXYS25",
      productVariantSku: "GS25-BLK-256",
      warehouseCode: "WH-PVD-02",
      quantity: 1,
      unitPrice: 22990000,
      totalAmount: 22990000,
      currency: "VND",
      isPrepaid: true,
      payments: [paymentCashPartial(5000000)],
      shipping: shippingJNT({
        actualDelivery: createdOffset(-1),
        note: "Đã giao thử nhưng khách không nhận",
      }),
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "ORDER_CANCELLED",
      note: "Giao thất bại - khách không nhận hàng",
      extraHistory: [
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE001",
          fieldName: "status",
          oldValue: OrderStatus.SHIPPING,
          newValue: OrderStatus.FAILED,
          note: "Giao thất bại",
          createdAtOffsetDays: 2,
        },
        {
          action: OrderAction.REVENUE_UNLOCKED,
          employeeCode: "EMP_SALE001",
          note: "Mở khóa doanh thu",
          createdAtOffsetDays: 2,
        },
      ],
    },

    // ============================================================
    // #9 — CONFIRMED · GIFT · MANUAL · đơn quà tặng (không tính revenue)
    // ============================================================
    {
      seedCode: `${baseDateKey}0009`,
      status: OrderStatus.CONFIRMED,
      orderType: OrderType.GIFT,
      orderSource: OrderSource.MANUAL,
      customerName: "Công ty ABC (quà tặng)",
      customerPhone: "0999999999",
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE002",
      comboCode: "COMBO-3HOP-QUA",
      warehouseCode: "WH-PVD-01",
      quantity: 5,
      unitPrice: 150000,
      totalAmount: 750000,
      currency: "VND",
      estimatedWeight: 250,
      isPrepaid: false,
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      note: "Đơn quà tặng khách hàng VIP",
    },

    // ============================================================
    // #10 — SHIPPING · EXCHANGE · IMPORT · đổi hàng
    // ============================================================
    {
      seedCode: `${baseDateKey}0010`,
      status: OrderStatus.SHIPPING,
      orderType: OrderType.EXCHANGE,
      orderSource: OrderSource.IMPORT,
      customerName: "Trần Thanh Phong",
      customerCode: "KH000002",
      customerPhone: "0912345002",
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE003",
      productCode: "IPHONE16",
      productVariantSku: "IP16-BLK-256",
      warehouseCode: "WH-PVD-01",
      quantity: 1,
      unitPrice: 27990000,
      totalAmount: 27990000,
      currency: "VND",
      isPrepaid: true,
      payments: [paymentBankPartial(27990000, "Bù thêm chênh lệch đổi hàng")],
      shipping: shippingVNPost(),
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      stockReservedAt: createdOffset(3),
      note: "Đổi từ IP16-BLK-128 sang BLK-256",
      extraHistory: [
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE003",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 3,
        },
        {
          action: OrderAction.SHIPPING_UPDATED,
          employeeCode: "EMP_SALE003",
          fieldName: "shipping",
          note: "Gửi VNPost hàng đổi",
          createdAtOffsetDays: 1,
        },
      ],
    },

    // ============================================================
    // #11 — COMPLETED · REPLACEMENT · PHONE · hàng bảo hành đổi mới
    // ============================================================
    {
      seedCode: `${baseDateKey}0011`,
      status: OrderStatus.COMPLETED,
      orderType: OrderType.REPLACEMENT,
      orderSource: OrderSource.PHONE,
      customerName: "Phạm Bá Long",
      customerCode: "KH000003",
      customerPhone: "0912345003",
      marketingEmployeeCode: "EMP_MKT002",
      saleEmployeeCode: "EMP_SALE002",
      productCode: "GALAXYS25",
      productVariantSku: "GS25-BLK-256",
      warehouseCode: "WH-PVD-02",
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      currency: "VND",
      isPrepaid: false,
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      shipping: shippingVNPost({
        actualDelivery: createdOffset(-3),
        trackingNumber: "VNPOST-REPL001",
        note: "Hàng bảo hành đổi mới",
      }),
      note: "Bảo hành đổi mới máy lỗi",
      extraHistory: [
        {
          action: OrderAction.SHIPPING_UPDATED,
          employeeCode: "EMP_SALE002",
          fieldName: "shipping",
          note: "Hoàn tất đổi bảo hành",
          createdAtOffsetDays: 3,
        },
      ],
    },

    // ============================================================
    // #12 — PENDING · COMBO · WEBSITE · đã reserve kho
    // ============================================================
    {
      seedCode: `${baseDateKey}0012`,
      status: OrderStatus.PENDING,
      orderType: OrderType.COMBO,
      orderSource: OrderSource.WEBSITE,
      customerName: "Đỗ Khánh Linh",
      customerCode: "KH000004",
      customerPhone: "0912345004",
      marketingEmployeeCode: "EMP_MKT002",
      saleEmployeeCode: "EMP_SALE001",
      comboCode: "COMBO-5HOP",
      warehouseCode: "WH-PVD-01",
      quantity: 1,
      unitPrice: 230000,
      totalAmount: 230000,
      currency: "VND",
      estimatedWeight: 250,
      isPrepaid: false,
      payments: [paymentCashPartial(100000)],
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      stockReservedAt: createdOffset(0),
      note: "Khách đặt combo 5 hộp trên web",
      extraHistory: [
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE001",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 0,
        },
        {
          action: OrderAction.PAYMENT_ADDED,
          employeeCode: "EMP_SALE001",
          fieldName: "payments",
          oldValue: "0",
          newValue: "100000",
          note: "Đặt cọc 100k",
          createdAtOffsetDays: 0,
        },
      ],
    },

    // ============================================================
    // #13 — PREPAID · NORMAL · FACEBOOK · đã reserve + full payment
    // ============================================================
    {
      seedCode: `${baseDateKey}0013`,
      status: OrderStatus.PREPAID,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.FACEBOOK,
      customerName: "Võ Quang Huy",
      customerCode: "KH000005",
      customerPhone: "0912345005",
      leadCode: leadIds.huyNew,
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE003",
      productCode: "IPHONE16",
      productVariantSku: "IP16-BLK-256",
      warehouseCode: "WH-PVD-01",
      quantity: 1,
      unitPrice: 27990000,
      totalAmount: 27990000,
      currency: "VND",
      estimatedWeight: 170,
      isPrepaid: true,
      payments: [paymentMomoFull(27990000)],
      revenueLocked: true,
      revenueEligible: true,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 5598000,
      saleRevenueRaw: 13995000,
      stockReservedAt: createdOffset(1),
      note: "Khách inbox MKT chuyển MKT",
      extraHistory: [
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE003",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 1,
        },
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE003",
          fieldName: "status",
          oldValue: OrderStatus.PENDING,
          newValue: OrderStatus.CONFIRMED,
          note: "Đổi trạng thái",
          createdAtOffsetDays: 2,
        },
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE003",
          fieldName: "status",
          oldValue: OrderStatus.CONFIRMED,
          newValue: OrderStatus.PREPAID,
          note: "Đã nhận đủ tiền",
          createdAtOffsetDays: 1,
        },
        {
          action: OrderAction.PAYMENT_ADDED,
          employeeCode: "EMP_SALE003",
          fieldName: "payments",
          oldValue: "0",
          newValue: "27990000",
          note: "Thanh toán MOMO",
          createdAtOffsetDays: 1,
        },
      ],
    },

    // ============================================================
    // #14 — CONFIRMED · NORMAL · MANUAL · reserved chờ xử lý
    // ============================================================
    {
      seedCode: `${baseDateKey}0014`,
      status: OrderStatus.CONFIRMED,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.MANUAL,
      customerName: "Bùi Văn Nam",
      customerPhone: "0987000003",
      marketingEmployeeCode: "EMP_MKT002",
      saleEmployeeCode: "EMP_SALE001",
      productCode: "MACBOOKPRO",
      productVariantSku: "MBP-16G-512",
      warehouseCode: "WH-PVD-02",
      quantity: 1,
      unitPrice: 49990000,
      totalAmount: 49990000,
      currency: "VND",
      estimatedWeight: 1580,
      isPrepaid: false,
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      stockReservedAt: createdOffset(0),
      note: "Khách vãng lai tại cửa hàng",
      extraHistory: [
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE001",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 0,
        },
        {
          action: OrderAction.STATUS_CHANGED,
          employeeCode: "EMP_SALE001",
          fieldName: "status",
          oldValue: OrderStatus.PENDING,
          newValue: OrderStatus.CONFIRMED,
          note: "Đổi trạng thái",
          createdAtOffsetDays: 0,
        },
      ],
    },

    // ============================================================
    // #15 — SHIPPING · COMBO · FACEBOOK · revenue locked + reserve
    // ============================================================
    {
      seedCode: `${baseDateKey}0015`,
      status: OrderStatus.SHIPPING,
      orderType: OrderType.COMBO,
      orderSource: OrderSource.FACEBOOK,
      customerName: "Trịnh Văn Kiên",
      customerPhone: "0987000014",
      leadCode: leadIds.kienOrderCreated,
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE003",
      comboCode: "COMBO-2HOP",
      warehouseCode: "WH-PVD-01",
      quantity: 3,
      unitPrice: 90000,
      totalAmount: 270000,
      currency: "VND",
      estimatedWeight: 150,
      isPrepaid: true,
      payments: [paymentBankPartial(100000)],
      shipping: shippingJNT(),
      revenueLocked: true,
      revenueEligible: true,
      revenueLockReason: "NONE",
      marketingRevenueRaw: 54000,
      saleRevenueRaw: 135000,
      stockReservedAt: createdOffset(3),
      note: "Combo 2 hộp x 3",
      extraHistory: [
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE003",
          note: "Giữ chỗ tồn kho (3)",
          createdAtOffsetDays: 3,
        },
        {
          action: OrderAction.SHIPPING_UPDATED,
          employeeCode: "EMP_SALE003",
          fieldName: "shipping",
          note: "Gửi J&T",
          createdAtOffsetDays: 0,
        },
        {
          action: OrderAction.PAYMENT_ADDED,
          employeeCode: "EMP_SALE003",
          fieldName: "payments",
          oldValue: "0",
          newValue: "100000",
          note: "Đặt cọc",
          createdAtOffsetDays: 2,
        },
      ],
    },

    // ============================================================
    // #16 — CANCELLED · GIFT · WEBSITE · đơn quà hủy
    // ============================================================
    {
      seedCode: `${baseDateKey}0016`,
      status: OrderStatus.CANCELLED,
      orderType: OrderType.GIFT,
      orderSource: OrderSource.WEBSITE,
      customerName: "Đặng Văn Hùng",
      customerPhone: "0987000004",
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE001",
      comboCode: "COMBO-1HOP",
      warehouseCode: "WH-PVD-01",
      quantity: 1,
      unitPrice: 45000,
      totalAmount: 45000,
      currency: "VND",
      isPrepaid: false,
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "ORDER_CANCELLED",
      note: "Đơn quà tặng bị hủy do thay đổi người nhận",
    },

    // ============================================================
    // #17 — COMPLETED · EXCHANGE · PHONE · đổi hàng hoàn tất
    // ============================================================
    {
      seedCode: `${baseDateKey}0017`,
      status: OrderStatus.COMPLETED,
      orderType: OrderType.EXCHANGE,
      orderSource: OrderSource.PHONE,
      customerName: "Phan Thanh Bình",
      customerPhone: "0987000016",
      leadCode: leadIds.binhCancelled,
      marketingEmployeeCode: "EMP_MKT002",
      saleEmployeeCode: "EMP_SALE002",
      productCode: "IPHONE16",
      productVariantSku: "IP16-WHT-128",
      warehouseCode: "WH-PVD-02",
      quantity: 1,
      unitPrice: 0,
      totalAmount: 0,
      currency: "VND",
      isPrepaid: false,
      shipping: shippingVNPost({
        actualDelivery: createdOffset(-2),
      }),
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      note: "Đổi màu - không phát sinh doanh thu",
      extraHistory: [
        {
          action: OrderAction.SHIPPING_UPDATED,
          employeeCode: "EMP_SALE002",
          fieldName: "shipping",
          note: "Hoàn tất đổi hàng",
          createdAtOffsetDays: 2,
        },
      ],
    },

    // ============================================================
    // #18 — PENDING · NORMAL · WEBSITE · đơn mới, đã reserve
    // ============================================================
    {
      seedCode: `${baseDateKey}0018`,
      status: OrderStatus.PENDING,
      orderType: OrderType.NORMAL,
      orderSource: OrderSource.WEBSITE,
      customerName: "Lý Văn Sơn",
      customerPhone: "0987000010",
      marketingEmployeeCode: "EMP_MKT001",
      saleEmployeeCode: "EMP_SALE002",
      productCode: "GALAXYS25",
      productVariantSku: "GS25-BLK-256",
      warehouseCode: "WH-PVD-02",
      quantity: 1,
      unitPrice: 22990000,
      totalAmount: 22990000,
      currency: "VND",
      estimatedWeight: 168,
      isPrepaid: false,
      revenueLocked: false,
      revenueEligible: false,
      revenueLockReason: "NONE",
      stockReservedAt: createdOffset(0),
      note: "Khách đặt website tối nay",
      extraHistory: [
        {
          action: OrderAction.STOCK_RESERVED,
          employeeCode: "EMP_SALE002",
          note: "Giữ chỗ tồn kho (1)",
          createdAtOffsetDays: 0,
        },
      ],
    },
  ];

  return specs;
}

// ==================================================
// Main seed
// ==================================================

export async function seedOrders() {
  // ---- Resolve reference employees (used for marketing/sale/createdBy) ---
  const empSaleA = await Employee.findOne({ employeeCode: "EMP_SALE001" });
  const empSaleB = await Employee.findOne({ employeeCode: "EMP_SALE002" });
  const empSaleC = await Employee.findOne({ employeeCode: "EMP_SALE003" });
  const empMktA = await Employee.findOne({ employeeCode: "EMP_MKT001" });
  const empMktB = await Employee.findOne({ employeeCode: "EMP_MKT002" });
  const empWhA = await Employee.findOne({ employeeCode: "EMP_WH001" });

  if (!empSaleA || !empSaleB || !empSaleC || !empMktA || !empMktB || !empWhA) {
    throw new Error("Seed Order: missing required employees");
  }

  // ---- Ensure warehouses (chưa có Warehouse seed riêng) ----------------
  const wh1Id = await ensureWarehouse({
    code: "WH-PVD-01",
    name: "Kho PVD - Tổng",
    managerId: idOf(empWhA),
  });
  const wh2Id = await ensureWarehouse({
    code: "WH-PVD-02",
    name: "Kho PVD - Phụ kiện",
    managerId: idOf(empWhA),
  });

  // ---- Resolve Customers (đã tạo ở Lead seed) ---------------------------
  const customerDuongId = idOf(await Customer.findOne({ code: "KH000001" }));
  const customerPhongId = idOf(await Customer.findOne({ code: "KH000002" }));
  const customerLongId = idOf(await Customer.findOne({ code: "KH000003" }));
  const customerLinhId = idOf(await Customer.findOne({ code: "KH000004" }));
  const customerHuyId = idOf(await Customer.findOne({ code: "KH000005" }));

  if (
    !customerDuongId ||
    !customerPhongId ||
    !customerLongId ||
    !customerLinhId ||
    !customerHuyId
  ) {
    throw new Error("Seed Order: missing seed Customers from Lead seed");
  }

  // ---- Resolve Leads ----------------------------------------------------
  const leadDuongProcessing = idOf(
    await Lead.findOne({ leadCode: "LE000003" })
  );
  const leadPhongPotential = idOf(
    await Lead.findOne({ leadCode: "LE000005" })
  );
  const leadLinhPotential = idOf(
    await Lead.findOne({ leadCode: "LE000012" })
  );
  const leadHuyNew = idOf(await Lead.findOne({ leadCode: "LE000015" }));
  const leadKienOrderCreated = idOf(
    await Lead.findOne({ leadCode: "LE000014" })
  );
  const leadBinhCancelled = idOf(
    await Lead.findOne({ leadCode: "LE000016" })
  );

  // ---- Build OrderSpecs -------------------------------------------------
  // seedCode cho từng spec cố định theo baseDateKey — đảm bảo idempotent
  // vì Order.findOne({ orderCode }) sẽ return cùng doc qua các lần seed.
  // Lưu ý: KHÔNG dùng shared Counter (vì counter có thể khác khi re-seed
  // ngoài cùng ngày) — dùng luôn seedCode làm orderCode.
  const baseDate = new Date();

  const orderSpecs = buildOrderSpecs({
    baseDate,
    leadIds: {
      duongProcessing: leadDuongProcessing,
      phongPotential: leadPhongPotential,
      linhPotential: leadLinhPotential,
      huyNew: leadHuyNew,
      kienOrderCreated: leadKienOrderCreated,
      binhCancelled: leadBinhCancelled,
    },
  });

  // ---- Idempotent seed -------------------------------------------------
  // Mỗi `spec.seedCode` đã deterministic (= `OD${baseDateKey}${seq 4 chữ số}`),
  // nên Order.findOne({ orderCode }) lookup sẽ trả về đúng doc ở mọi lần seed.
  // KHÔNG cần reset counter, KHÔNG cần sinh seq khi seed.

  // ---- Insert từng Order + Histories ------------------------------------
  let orderCreatedCount = 0;
  let historyCreatedCount = 0;

  for (const spec of orderSpecs) {
    // Idempotent lookup theo orderCode ưu tiên, fallback theo seedCode (phone + customerName + product).
    let orderDoc = await Order.findOne({ orderCode: spec.seedCode });

    if (!orderDoc) {
      // Nếu chưa có Order với orderCode này → lookup thêm theo signature
      // để tránh tạo trùng nếu spec.seedCode khác với orderCode thật.
      const existingSig = await Order.findOne({
        customerName: spec.customerName,
        customerPhone: spec.customerPhone,
        totalAmount: spec.totalAmount,
        productVariantId: spec.productVariantSku
          ? (await ProductVariant.findOne({ sku: spec.productVariantSku }))?._id
          : undefined,
        comboId: spec.comboCode
          ? (await Combo.findOne({ code: spec.comboCode }))?._id
          : undefined,
        createdAt: {
          $gte: new Date(baseDate.getTime() - 60 * 60 * 1000),
          $lte: new Date(baseDate.getTime() + 60 * 60 * 1000),
        },
      });
      if (existingSig) {
        orderDoc = existingSig;
      }
    }

    // Customer ID (lookup theo code, fallback ensureCustomer).
    const customerDoc = spec.customerCode
      ? await Customer.findOne({ code: spec.customerCode })
      : null;
    let customerId = idOf(customerDoc);
    if (!customerId && spec.customerPhone && spec.customerName) {
      customerId = await ensureCustomer({
        code: spec.customerCode ?? `KH-SPEC-${spec.seedCode.slice(-4)}`,
        name: spec.customerName,
        phone: spec.customerPhone,
        marketingEmployeeId: idOf(empMktA),
      });
    }
    if (!customerId) {
      throw new Error(
        `Seed Order: cannot resolve Customer for ${spec.seedCode}`
      );
    }

    // Build order payload (tất cả field dùng trong Order model).
    const employeeId =
      (await Employee.findOne({
        employeeCode: spec.saleEmployeeCode ?? spec.marketingEmployeeCode,
      }))?._id ?? empSaleA._id;

    const payload: Record<string, unknown> = {
      orderCode: orderDoc?.orderCode ?? spec.seedCode,
      customerId,
      customerName: spec.customerName,
      customerPhone: spec.customerPhone,
      leadId: spec.leadCode
        ? (await Lead.findOne({ leadCode: spec.leadCode }))?._id
        : undefined,
      productId: spec.productCode
        ? (await Product.findOne({ code: spec.productCode }))?._id
        : undefined,
      productVariantId: spec.productVariantSku
        ? (await ProductVariant.findOne({ sku: spec.productVariantSku }))?._id
        : undefined,
      comboId: spec.comboCode
        ? (await Combo.findOne({ code: spec.comboCode }))?._id
        : undefined,
      quantity: spec.quantity,
      unitPrice: spec.unitPrice,
      totalAmount: spec.totalAmount,
      currency: spec.currency,
      estimatedWeight: spec.estimatedWeight,
      warehouseId: spec.warehouseCode
        ? (await Warehouse.findOne({ code: spec.warehouseCode }))?._id
        : undefined,
      marketingEmployeeId: (
        await Employee.findOne({ employeeCode: spec.marketingEmployeeCode })
      )?._id,
      saleEmployeeId: spec.saleEmployeeCode
        ? (await Employee.findOne({
            employeeCode: spec.saleEmployeeCode,
          }))?._id
        : undefined,
      status: spec.status,
      isPrepaid: spec.isPrepaid ?? false,
      orderType: spec.orderType,
      orderSource: spec.orderSource,
      payments: (spec.payments ?? []).map((p) => ({
        method: p.method,
        amount: p.amount,
        currency: p.currency,
        paidAt: p.paidAt,
        transactionId: p.transactionId ?? "",
        note: p.note ?? "",
      })),
      totalPaid: (spec.payments ?? []).reduce((s, p) => s + p.amount, 0),
      shipping: spec.shipping
        ? {
            receiverName: spec.shipping.receiverName,
            receiverPhone: spec.shipping.receiverPhone,
            address: spec.shipping.address,
            province: spec.shipping.province,
            district: spec.shipping.district,
            ward: spec.shipping.ward,
            trackingNumber: spec.shipping.trackingNumber ?? "",
            carrier: spec.shipping.carrier ?? "",
            estimatedDelivery: spec.shipping.estimatedDelivery,
            actualDelivery: spec.shipping.actualDelivery,
            shippingFee: spec.shipping.shippingFee ?? 0,
            shippingFeeCurrency: spec.shipping.shippingFeeCurrency ?? "VND",
          }
        : undefined,
      // ---- Revenue defaults (mirror route POST defaults) ----
      revenueLocked: spec.revenueLocked ?? false,
      marketingRevenueRaw: spec.marketingRevenueRaw ?? 0,
      marketingRevenueFinal: 0,
      saleRevenueRaw: spec.saleRevenueRaw ?? 0,
      saleRevenueFinal: 0,
      revenueEligible: spec.revenueEligible ?? false,
      revenueLockReason: spec.revenueLockReason ?? "NONE",
      revenueCalculatedAt: spec.revenueCalculatedAt,
      // ---- Stock audit-only ----
      stockReservedAt: spec.stockReservedAt,
      note: spec.note ?? "",
      isActive: !spec.isDeleted,
    };

    if (!orderDoc) {
      // Hết signature fallback → tạo Order mới với orderCode = spec.seedCode.
      // (Bỏ counter để deterministic & idempotent theo spec.)
      orderDoc = await Order.create({
        ...payload,
        orderCode: spec.seedCode,
      });
      orderCreatedCount += 1;
    } else {
      // Đã có Order → cập nhật $set (giữ nguyên orderCode).
      const { orderCode: _ignored, ...payloadWithoutCode } = payload;
      void _ignored;
      await Order.updateOne(
        { _id: orderDoc._id },
        { $set: payloadWithoutCode }
      );
    }

    const orderId = idOf(orderDoc);

    // ---- History: CREATED (bắt buộc) --------------------------------
    if (
      await pushHistory({
        orderId,
        employeeId: idOf(employeeId),
        action: OrderAction.CREATED,
        newValue: spec.status,
        note: `Tạo đơn từ ${spec.orderSource}`,
        createdAt: spec.stockReservedAt
          ? new Date(spec.stockReservedAt.getTime() - 60 * 60 * 1000)
          : baseDate,
      })
    )
      historyCreatedCount += 1;

    // ---- History: extra (tùy spec) --------------------------------
    for (const extra of spec.extraHistory ?? []) {
      const extraEmployee = await Employee.findOne({
        employeeCode: extra.employeeCode,
      });
      if (!extraEmployee) continue;
      const offsetDays = extra.createdAtOffsetDays ?? 0;
      const createdAt = new Date(
        baseDate.getTime() - offsetDays * DAY_MS
      );
      if (
        await pushHistory({
          orderId,
          employeeId: idOf(extraEmployee),
          action: extra.action,
          fieldName: extra.fieldName,
          oldValue: extra.oldValue,
          newValue: extra.newValue,
          note: extra.note,
          createdAt,
        })
      )
        historyCreatedCount += 1;
    }

    // ---- History: DELETED (nếu isDeleted) ------------------------------
    if (spec.isDeleted) {
      const actor =
        (await Employee.findOne({
          employeeCode: spec.saleEmployeeCode ?? spec.marketingEmployeeCode,
        })) ??
        empSaleA;
      if (
        await pushHistory({
          orderId,
          employeeId: idOf(actor),
          action: OrderAction.DELETED,
          note: "Xóa đơn hàng (soft delete)",
          createdAt: new Date(baseDate.getTime() - 1 * DAY_MS),
        })
      )
        historyCreatedCount += 1;
    }
  }

  // Thông tin coverage cho dễ verify.
  const stats = await Order.aggregate([
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const statsByType = await Order.aggregate([
    { $group: { _id: "$orderType", n: { $sum: 1 } } },
  ]);
  const statsBySource = await Order.aggregate([
    { $group: { _id: "$orderSource", n: { $sum: 1 } } },
  ]);
  const revenueStats = await Order.aggregate([
    { $group: { _id: "$revenueLocked", n: { $sum: 1 } } },
  ]);

  console.log(
    `[OK] Orders (${orderCreatedCount} mới) — total ${await Order.countDocuments({})}`
  );
  console.log(
    `[OK] Order Histories (${historyCreatedCount} mới) — total ${await OrderHistory.countDocuments({})}`
  );
  console.log(
    `    Status : ${stats.map((s) => `${s._id}=${s.n}`).join(", ")}`
  );
  console.log(
    `    Type   : ${statsByType.map((s) => `${s._id}=${s.n}`).join(", ")}`
  );
  console.log(
    `    Source : ${statsBySource.map((s) => `${s._id}=${s.n}`).join(", ")}`
  );
  console.log(
    `    revenueLocked=${revenueStats.map((s) => `${s._id}=${s.n}`).join(", ")}`
  );

  // Note phụ về unlock statuses — chỉ log để verify.
  const unlockCount = await Order.countDocuments({
    status: { $in: Array.from(REVENUE_UNLOCK_STATUSES) },
  });
  console.log(`    [INFO] unlock-status orders: ${unlockCount}`);
}
