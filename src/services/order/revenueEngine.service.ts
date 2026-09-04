/**
 * ==================================================
 * ORDER REVENUE ENGINE SERVICE
 * ==================================================
 *
 * Engine Layer cho Order Revenue Lock.
 *
 * Layer này:
 *   - ĐỌC Mongo (Order collection)
 *   - DÙNG Transaction
 *   - UPDATE Order (revenueLocked / revenueOwnerOrderId / revenueLockReason)
 *   - GHI OrderHistory
 *
 * Layer này KHÔNG:
 *   - Tự viết rule logic.
 *   - Tự quyết định priority / lock / unlock.
 *   Mọi quyết định phải đến từ `revenueRule.service.ts`.
 *
 * ─────────────────────────────────────────────────
 *  Flow
 * ─────────────────────────────────────────────────
 *
 *  resolveCustomerRevenue(customerId, session?)
 *     1. Load TẤT CẢ Order của Customer (active).
 *     2. Map sang OrderRuleInput DTO.
 *     3. Gọi decideForAll() từ rule layer.
 *     4. Persist kết quả vào Order + OrderHistory.
 *     5. Commit transaction.
 *
 *  Khi nào gọi engine?
 *    - Sau khi tạo Order mới (POST /api/orders).
 *    - Sau khi đổi customerId / productId / comboId / status / isPrepaid
 *      trên Order đã tồn tại (PUT /api/orders/:id).
 *    - Sau khi cancel Order (PUT status → CANCELLED).
 *
 *  KHÔNG gọi từ route handler trực tiếp (Phase 4 sẽ wire).
 *  Service này đứng độc lập để engine không bị leak qua HTTP.
 * ==================================================
 */

import mongoose from "mongoose";

import { Order } from "@/models/Order";
import { OrderHistory } from "@/models/OrderHistory";
import { OrderAction } from "@/constants/orderStatus";
import { RevenueState, RevenueLockReason } from "@/constants/revenueRule";

import {
  decideForAll,
  type OrderRuleInput,
  type RevenueDecision,
} from "./revenueRule.service";

// ==================================================
// Result types
// ==================================================

export interface CustomerRevenueResult {
  customerId: string;
  totalOrders: number;
  eligible: number;
  locked: number;
  unlocked: number;
  exempted: number;
  /** Số Order thực sự được update trong DB. */
  persistedCount: number;
  /** Số Order có decision thay đổi so với DB. */
  changedCount: number;
  /** Duration ms cho debug. */
  elapsedMs: number;
}

export interface ResolveOptions {
  /** Optional: caller muốn truyền session riêng (vd: cùng transaction với POST/PUT). */
  session?: mongoose.ClientSession;
  /**
   * Optional: EmployeeId cho OrderHistory ghi nhận action.
   * Nếu null → engine không ghi history (vd: seed / migration).
   */
  actorEmployeeId?: mongoose.Types.ObjectId | null;
  /**
   * Skip nếu customer không có Order nào thay đổi.
   * Mặc định: false (vẫn re-eval — rule có thể đổi do cancel).
   */
  force?: boolean;
}

// ==================================================
// Mappers: Order doc → OrderRuleInput DTO
// ==================================================

function orderToRuleInput(doc: {
  _id: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId | null;
  comboId?: mongoose.Types.ObjectId | null;
  status: string;
  isPrepaid: boolean;
  orderType: string;
  createdAt?: Date;
  isActive: boolean;
}): OrderRuleInput {
  return {
    _id: doc._id.toString(),
    customerId: doc.customerId.toString(),
    productId: doc.productId ? doc.productId.toString() : null,
    comboId: doc.comboId ? doc.comboId.toString() : null,
    status: doc.status as OrderRuleInput["status"],
    isPrepaid: doc.isPrepaid,
    orderType: doc.orderType as OrderRuleInput["orderType"],
    createdAt: doc.createdAt ?? null,
  };
}

function reasonToString(r: RevenueLockReason): string {
  return r;
}

function decisionToPersist(
  decision: RevenueDecision,
  subjectId: string
): {
  revenueLocked: boolean;
  revenueOwnerOrderId: mongoose.Types.ObjectId | null;
  revenueLockReason: string;
} {
  switch (decision.state) {
    case RevenueState.EXEMPTED:
      return {
        revenueLocked: false,
        revenueOwnerOrderId: null,
        revenueLockReason: decision.reason,
      };

    case RevenueState.UNLOCKED:
      return {
        revenueLocked: false,
        revenueOwnerOrderId: null,
        revenueLockReason: decision.reason,
      };

    case RevenueState.LOCKED: {
      const owner =
        decision.ownerOrderId && decision.ownerOrderId !== subjectId
          ? new mongoose.Types.ObjectId(decision.ownerOrderId)
          : null;
      return {
        revenueLocked: true,
        revenueOwnerOrderId: owner,
        revenueLockReason: decision.reason,
      };
    }

    case RevenueState.ELIGIBLE:
    default:
      return {
        revenueLocked: false,
        revenueOwnerOrderId: new mongoose.Types.ObjectId(subjectId),
        revenueLockReason: RevenueLockReason.NONE,
      };
  }
}

// ==================================================
// Helpers
// ==================================================

function isOwnerIdValid(
  persistedOwner: mongoose.Types.ObjectId | string | null | undefined,
  decisionOwner: string | null,
  subjectId: string
): boolean {
  if (!decisionOwner && !persistedOwner) return true;
  if (decisionOwner && persistedOwner) {
    return persistedOwner.toString() === decisionOwner;
  }
  // mismatch
  if (decisionOwner === subjectId && !persistedOwner) return true;
  if (!decisionOwner && persistedOwner) return false;
  return persistedOwner?.toString() === decisionOwner;
}

function pickHistoryAction(
  decision: RevenueDecision,
  previousLocked: boolean,
  previousReason: string
): OrderAction | null {
  if (decision.state === RevenueState.EXEMPTED) return null;
  if (decision.state === RevenueState.UNLOCKED) {
    if (previousLocked || previousReason !== decision.reason) {
      return OrderAction.REVENUE_UNLOCKED;
    }
    return null;
  }
  if (decision.state === RevenueState.LOCKED && !previousLocked) {
    return OrderAction.REVENUE_LOCKED;
  }
  if (decision.state === RevenueState.ELIGIBLE && previousLocked) {
    return OrderAction.REVENUE_UNLOCKED;
  }
  if (previousReason !== decision.reason) {
    return OrderAction.REVENUE_RECALCULATED;
  }
  return null;
}

// ==================================================
// Core: resolveCustomerRevenue
// ==================================================

/**
 * Tính lại revenue cho TẤT CẢ Order của 1 Customer.
 *
 * - Load orders active
 * - Decide qua rule layer
 * - Persist + history trong transaction
 */
export async function resolveCustomerRevenue(
  customerId: string | mongoose.Types.ObjectId,
  options: ResolveOptions = {}
): Promise<CustomerRevenueResult> {
  const start = Date.now();

  const customerObjectId =
    typeof customerId === "string"
      ? new mongoose.Types.ObjectId(customerId)
      : customerId;

  // Load active orders
  const orders = await Order.find({
    customerId: customerObjectId,
    isActive: true,
  })
    .select(
      "_id customerId productId comboId status isPrepaid orderType createdAt isActive revenueLocked revenueOwnerOrderId revenueLockReason marketingRevenueRaw saleRevenueRaw"
    )
    .lean();

  // Map → DTO
  const inputs: OrderRuleInput[] = orders.map(orderToRuleInput);

  // Decide
  const decisions = decideForAll(inputs);

  // Nếu caller truyền session riêng → dùng chung, không start mới.
  const ownsSession = !options.session;
  const session = options.session ?? (await mongoose.startSession());

  let persistedCount = 0;
  let changedCount = 0;

  try {
    if (ownsSession) {
      session.startTransaction();
    }

    for (const doc of orders) {
      const subjectId = doc._id.toString();
      const decision = decisions.get(subjectId);
      if (!decision) continue;

      const persist = decisionToPersist(decision, subjectId);
      const previousLocked = Boolean(doc.revenueLocked);
      const previousReason = doc.revenueLockReason ?? RevenueLockReason.NONE;
      const previousOwner = (doc.revenueOwnerOrderId as unknown) as
        | mongoose.Types.ObjectId
        | string
        | null
        | undefined;

      // Detect thay đổi
      const ownerChanged = !isOwnerIdValid(
        previousOwner,
        decision.ownerOrderId,
        subjectId
      );
      const lockedChanged = previousLocked !== persist.revenueLocked;
      const reasonChanged = previousReason !== persist.revenueLockReason;

      const expectedMarketingFinal = decision.state === RevenueState.ELIGIBLE ? (doc.marketingRevenueRaw ?? 0) : 0;
      const expectedSaleFinal = decision.state === RevenueState.ELIGIBLE ? (doc.saleRevenueRaw ?? 0) : 0;
      const revenueFinalChanged =
        (doc.marketingRevenueFinal ?? 0) !== expectedMarketingFinal ||
        (doc.saleRevenueFinal ?? 0) !== expectedSaleFinal;

      if (!ownerChanged && !lockedChanged && !reasonChanged && !revenueFinalChanged) {
        if (!options.force) continue;
      }

      // Persist
      const persistUpdate: Record<string, unknown> = {
        revenueLocked: persist.revenueLocked,
        revenueOwnerOrderId: persist.revenueOwnerOrderId,
        revenueLockReason: persist.revenueLockReason,
        revenueCalculatedAt: new Date(),
      };

      // Calculate final revenue based on decision state (Sprint Revenue Feature)
      // Only orders with ELIGIBLE state get revenue; LOCKED/EXEMPTED/UNLOCKED get 0
      if (decision.state === RevenueState.ELIGIBLE) {
        persistUpdate.revenueEligible = true;
        persistUpdate.marketingRevenueFinal = doc.marketingRevenueRaw ?? 0;
        persistUpdate.saleRevenueFinal = doc.saleRevenueRaw ?? 0;
      } else {
        persistUpdate.revenueEligible = false;
        persistUpdate.marketingRevenueFinal = 0;
        persistUpdate.saleRevenueFinal = 0;
      }

      await Order.updateOne(
        { _id: doc._id },
        { $set: persistUpdate },
        { session }
      );
      persistedCount += 1;

      // History — chỉ ghi khi có actor (bỏ qua nếu là seed/migration)
      if (options.actorEmployeeId) {
        const historyAction = pickHistoryAction(
          decision,
          previousLocked,
          previousReason
        );
        if (historyAction) {
          await OrderHistory.create(
            [
              {
                orderId: doc._id,
                employeeId: options.actorEmployeeId,
                action: historyAction,
                fieldName: "revenue",
                oldValue: previousReason,
                newValue: persist.revenueLockReason,
                note:
                  historyAction === OrderAction.REVENUE_LOCKED
                    ? `Revenue locked. Owner: ${persist.revenueOwnerOrderId?.toString() ?? "n/a"}`
                    : historyAction === OrderAction.REVENUE_UNLOCKED
                      ? "Revenue unlocked"
                      : "Revenue recalculated",
              },
            ],
            { session }
          );
        }
      }
      if (ownerChanged || lockedChanged || reasonChanged) {
        changedCount += 1;
      }
    }

    if (ownsSession) {
      await session.commitTransaction();
    }

    // Thống kê
    let eligible = 0;
    let locked = 0;
    let unlocked = 0;
    let exempted = 0;
    for (const d of decisions.values()) {
      switch (d.state) {
        case RevenueState.ELIGIBLE:
          eligible += 1;
          break;
        case RevenueState.LOCKED:
          locked += 1;
          break;
        case RevenueState.UNLOCKED:
          unlocked += 1;
          break;
        case RevenueState.EXEMPTED:
          exempted += 1;
          break;
      }
    }

    return {
      customerId: customerObjectId.toString(),
      totalOrders: orders.length,
      eligible,
      locked,
      unlocked,
      exempted,
      persistedCount,
      changedCount,
      elapsedMs: Date.now() - start,
    };
  } catch (err) {
    if (ownsSession) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (ownsSession) {
      session.endSession();
    }
  }
}

// ==================================================
// Bulk: resolveAllCustomers
// ==================================================
//
// Quét TẤT CẢ Customer có Order active và re-eval.
// Dùng cho cron / migration / manual trigger.
//
export async function resolveAllCustomers(
  actorEmployeeId: mongoose.Types.ObjectId | null = null
): Promise<CustomerRevenueResult[]> {
  const customerIds = await Order.distinct("customerId", { isActive: true });

  const results: CustomerRevenueResult[] = [];

  for (const cid of customerIds) {
    try {
      results.push(
        await resolveCustomerRevenue(cid as mongoose.Types.ObjectId, {
          actorEmployeeId,
          force: true,
        })
      );
    } catch (err) {
      // Không throw tiếp — log + continue
      // eslint-disable-next-line no-console
      console.error(`resolveAllCustomers failed for ${String(cid)}`, err);
    }
  }

  return results;
}