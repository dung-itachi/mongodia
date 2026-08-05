/**
 * ==================================================
 * MARKETING EXPENSE REPORT SEED
 * ==================================================
 *
 * Workflow Simplification Refactor (Aug 2026)
 *
 * Mục tiêu:
 *   - Seed ~80 MarketingExpenseReport để phục vụ Dashboard, Report.
 *   - Phân bố theo date:
 *       30% (24) trong 7 ngày gần nhất
 *       40% (32) trong 30 ngày gần nhất
 *       30% (24) trong 90 ngày gần nhất
 *   - Status distribution (workflow hợp lệ):
 *       DRAFT     40%
 *       LOCKED    40%
 *       REOPENED  20%
 *   - Mỗi report có 1~3 budget slots (MORNING/AFTERNOON/URGENT).
 *   - Tất cả metric (CPA/ROAS/conversionRate/remainingBudget) đều
 *     dùng MarketingExpenseCalculator.calculateAll.
 *   - Idempotent theo (reportDate, marketingEmployeeId, facebookPageId).
 */

import Employee from "@/models/Employee";
import FacebookPage from "@/models/FacebookPage";
import { Order } from "@/models/Order";
import {
  MarketingExpenseReport,
  type IBudgetAllocation,
} from "@/models/MarketingExpenseReport";
import { MarketingExpenseReportStatus } from "@/constants/marketing-expense";
import { MarketingExpenseCalculator } from "@/utils/marketing-expense-calculator";

// ============================================================================
// Constants
// ============================================================================

const TOTAL_REPORTS = 80;

const PRNG_SEED = 0x4d45_525f >>> 0;

const STATUS_DISTRIBUTION: Array<{
  status: MarketingExpenseReportStatus;
  weight: number;
}> = [
  { status: MarketingExpenseReportStatus.DRAFT, weight: 0.4 },
  { status: MarketingExpenseReportStatus.LOCKED, weight: 0.4 },
  { status: MarketingExpenseReportStatus.REOPENED, weight: 0.2 },
];

const DATE_WINDOWS: Array<{
  label: string;
  daysBack: number;
  ratio: number;
}> = [
  { label: "7 ngày gần nhất", daysBack: 7, ratio: 0.3 },
  { label: "8-30 ngày", daysBack: 30, ratio: 0.4 },
  { label: "31-90 ngày", daysBack: 90, ratio: 0.3 },
];

const SLOT_TYPES = ["MORNING", "AFTERNOON", "URGENT"] as const;
type SlotType = (typeof SLOT_TYPES)[number];

const NOTE_TEMPLATES = [
  "Hoạt động Ads bình thường",
  "Có 1 đợt scale-up budget buổi tối",
  "Phân bổ theo plan tháng",
  "Đẩy mạnh trước campaign cuối tuần",
  "Giảm budget do ROAS thấp",
  "Test creative mới",
  "",
];

// ============================================================================
// Seeded PRNG (mulberry32)
// ============================================================================

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Prng {
  nextInt(min: number, max: number): number;
  nextFloat(min: number, max: number, decimals?: number): number;
  pick<T>(arr: readonly T[]): T;
  pickN<T>(arr: readonly T[], n: number): T[];
}

function makePrng(seed: number): Prng {
  const r = mulberry32(seed);
  const nextInt = (min: number, max: number) =>
    Math.floor(r() * (max - min + 1)) + min;
  const nextFloat = (min: number, max: number, decimals = 2) => {
    const v = r() * (max - min) + min;
    const f = Math.pow(10, decimals);
    return Math.round(v * f) / f;
  };
  const pick = <T,>(arr: readonly T[]): T =>
    arr[Math.floor(r() * arr.length)];
  const pickN = <T,>(arr: readonly T[], n: number): T[] => {
    const copy = [...arr];
    const result: T[] = [];
    const take = Math.min(n, copy.length);
    for (let i = 0; i < take; i++) {
      const idx = Math.floor(r() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  };
  return { nextInt, nextFloat, pick, pickN };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function distributeCounts(): Array<{ daysBack: number; count: number }> {
  const raw = DATE_WINDOWS.map((w) => ({
    daysBack: w.daysBack,
    raw: TOTAL_REPORTS * w.ratio,
  }));

  const counts = raw.map((c) => Math.floor(c.raw));
  let remainder = TOTAL_REPORTS - counts.reduce((s, x) => s + x, 0);

  const fractional = raw
    .map((c, i) => ({ i, frac: c.raw - Math.floor(c.raw) }))
    .sort((a, b) => b.frac - a.frac);

  for (const f of fractional) {
    if (remainder <= 0) break;
    counts[f.i] += 1;
    remainder -= 1;
  }

  return raw.map((c, i) => ({ daysBack: c.daysBack, count: counts[i] }));
}

function pickStatus(prng: Prng): MarketingExpenseReportStatus {
  const r = prng.nextFloat(0, 1, 6);
  let cumulative = 0;
  for (const item of STATUS_DISTRIBUTION) {
    cumulative += item.weight;
    if (r < cumulative) return item.status;
  }
  return STATUS_DISTRIBUTION[STATUS_DISTRIBUTION.length - 1].status;
}

function generateBudgets(prng: Prng): {
  requested: IBudgetAllocation;
  spent: IBudgetAllocation;
} {
  const requested: IBudgetAllocation = {
    morning: 0,
    afternoon: 0,
    emergency: 0,
  };
  const spent: IBudgetAllocation = {
    morning: 0,
    afternoon: 0,
    emergency: 0,
  };

  const slotCount = prng.nextInt(1, SLOT_TYPES.length);
  const picked = prng.pickN(SLOT_TYPES, slotCount);

  for (const slot of picked) {
    const req = prng.nextInt(1_000_000, 8_000_000);
    const sp = Math.floor(req * prng.nextFloat(0.5, 1.0));
    if (slot === "MORNING") {
      requested.morning = req;
      spent.morning = sp;
    } else if (slot === "AFTERNOON") {
      requested.afternoon = req;
      spent.afternoon = sp;
    } else {
      requested.emergency = req;
      spent.emergency = sp;
    }
  }

  return { requested, spent };
}

async function lookupRevenueFromOrders(args: {
  marketingEmployeeId: string;
  reportDate: Date;
}): Promise<number | null> {
  const start = startOfDay(args.reportDate);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  const orders = await Order.find({
    marketingEmployeeId: args.marketingEmployeeId,
    createdAt: { $gte: start, $lte: end },
    isActive: true,
  })
    .select("totalAmount")
    .lean();

  if (orders.length === 0) return null;

  let total = 0;
  for (const o of orders) {
    total += (o as { totalAmount?: number }).totalAmount ?? 0;
  }
  return total;
}

// ============================================================================
// Seed
// ============================================================================

export async function seedMarketingExpenseReports() {
  const employees = await Employee.find({ isActive: true })
    .populate({
      path: "roleId",
      match: { code: "MKT", isActive: true },
    })
    .lean();

  const marketingEmployees = employees.filter(
    (e) => (e.roleId as { code?: string } | null)?.code === "MKT"
  );

  if (marketingEmployees.length === 0) {
    throw new Error(
      "Seed MarketingExpense: no active employees with role MKT"
    );
  }

  const facebookPages = await FacebookPage.find({ isActive: true }).lean();
  if (facebookPages.length === 0) {
    throw new Error("Seed MarketingExpense: no active FacebookPages");
  }

  const adminEmp = await Employee.findOne({ username: "admin" });
  if (!adminEmp) throw new Error("Seed MarketingExpense: missing admin");

  const prng = makePrng(PRNG_SEED);

  const today = startOfDay(new Date());
  const counts = distributeCounts();

  type PlanEntry = {
    reportDate: Date;
    facebookPageId: string | null;
    marketingEmployeeId: string;
  };

  const seen = new Set<string>();
  const plan: PlanEntry[] = [];

  const tryPush = (entry: PlanEntry): boolean => {
    const key = `${entry.reportDate.toISOString()}|${entry.marketingEmployeeId}|${entry.facebookPageId ?? "null"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    plan.push(entry);
    return true;
  };

  for (const { daysBack, count } of counts) {
    let added = 0;
    let attempts = 0;
    while (added < count && attempts < count * 5) {
      attempts += 1;
      const daysAgo = prng.nextInt(1, daysBack);
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);

      const useNull = prng.nextFloat(0, 1, 4) < 0.1;
      const fbDoc = useNull
        ? null
        : facebookPages[prng.nextInt(0, facebookPages.length - 1)];
      const facebookPageId = fbDoc ? fbDoc._id.toString() : null;

      const mktEmp = marketingEmployees[
        prng.nextInt(0, marketingEmployees.length - 1)
      ];

      if (
        tryPush({
          reportDate: date,
          facebookPageId,
          marketingEmployeeId: mktEmp._id.toString(),
        })
      ) {
        added += 1;
      }
    }
  }

  let toGenerate = TOTAL_REPORTS - plan.length;
  let safety = 0;
  while (toGenerate > 0 && safety < 1000) {
    safety += 1;
    const window = DATE_WINDOWS[prng.nextInt(0, DATE_WINDOWS.length - 1)];
    const daysAgo = prng.nextInt(1, window.daysBack);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const useNull = prng.nextFloat(0, 1, 4) < 0.1;
    const fbDoc = useNull
      ? null
      : facebookPages[prng.nextInt(0, facebookPages.length - 1)];
    const facebookPageId = fbDoc ? fbDoc._id.toString() : null;

    const mktEmp = marketingEmployees[
      prng.nextInt(0, marketingEmployees.length - 1)
    ];

    if (
      tryPush({
        reportDate: date,
        facebookPageId,
        marketingEmployeeId: mktEmp._id.toString(),
      })
    ) {
      toGenerate -= 1;
    }
  }

  let inserted = 0;
  let updated = 0;

  for (const entry of plan) {
    const status = pickStatus(prng);
    const { requested, spent } = generateBudgets(prng);

    const reportDate = startOfDay(entry.reportDate);
    const facebookPageId = entry.facebookPageId;

    const existing = await MarketingExpenseReport.findOne({
      reportDate,
      marketingEmployeeId: entry.marketingEmployeeId,
      ...(facebookPageId
        ? { facebookPageId }
        : { facebookPageId: null }),
    });

    const totalLeads = prng.nextInt(0, 50);
    const closedLeads = prng.nextInt(0, Math.min(totalLeads, 15));

    let totalRevenue: number;
    const fromOrders = await lookupRevenueFromOrders({
      marketingEmployeeId: entry.marketingEmployeeId,
      reportDate,
    });
    if (fromOrders !== null && fromOrders > 0) {
      totalRevenue = fromOrders;
    } else {
      const spentTotal =
        spent.morning + spent.afternoon + spent.emergency;
      totalRevenue = Math.max(
        0,
        Math.floor(spentTotal * prng.nextFloat(1.2, 3.5))
      );
    }

    const calc = MarketingExpenseCalculator.calculateAll({
      requestedBudget: requested,
      spentBudget: spent,
      totalRevenue,
      totalLeads,
      closedLeads,
    });

    const now = new Date();
    const audit: Record<string, unknown> = {};

    if (status === MarketingExpenseReportStatus.LOCKED) {
      audit.lockedBy = adminEmp._id;
      audit.lockedAt = new Date(
        now.getTime() - prng.nextInt(1, 12) * 3600 * 1000
      );
    } else if (status === MarketingExpenseReportStatus.REOPENED) {
      audit.reopenedBy = adminEmp._id;
      audit.reopenedAt = new Date(
        now.getTime() - prng.nextInt(1, 6) * 3600 * 1000
      );
    }

    const note = prng.pick(NOTE_TEMPLATES);

    const payload = {
      reportDate,
      marketingEmployeeId: entry.marketingEmployeeId,
      ...(facebookPageId ? { facebookPageId } : { facebookPageId: null }),
      requestedBudget: requested,
      spentBudget: spent,
      remainingBudget: calc.remainingBudget,
      totalRevenue,
      totalLeads,
      closedLeads,
      conversionRate: calc.conversionRate,
      roas: calc.roas,
      cpa: calc.cpa,
      status,
      createdBy: adminEmp._id,
      note,
      ...audit,
    };

    if (existing) {
      await MarketingExpenseReport.updateOne(
        { _id: existing._id },
        { $set: payload }
      );
      updated += 1;
    } else {
      await MarketingExpenseReport.create(
        payload as unknown as Parameters<
          typeof MarketingExpenseReport.create
        >[0]
      );
      inserted += 1;
    }
  }

  const stats = await MarketingExpenseReport.aggregate<{
    _id: string;
    n: number;
  }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]);

  console.log(
    `[OK] MarketingExpenseReports (inserted=${inserted}, updated=${updated}) — total ${await MarketingExpenseReport.countDocuments({})}`
  );
  console.log(
    `    Status : ${stats.map((s) => `${s._id}=${s.n}`).join(", ")}`
  );
}
