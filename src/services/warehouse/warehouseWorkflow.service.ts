import mongoose from "mongoose";
import WarehouseInventory from "@/models/WarehouseInventory";
import WarehouseReceipt from "@/models/WarehouseReceipt";
import WarehouseTransfer from "@/models/WarehouseTransfer";
import WarehouseStockMovement, { type WarehouseStockMovementType } from "@/models/WarehouseStockMovement";
import ProductVariant from "@/models/ProductVariant";
import Product from "@/models/Product";
import Gift from "@/models/Gift";
import Counter from "@/models/Counter";

import {
  validateImportTarget,
  validateTransferDirection,
} from "@/config/warehouse-topology.config";

export type WarehouseItemInput = {
  productId?: string;
  variantId?: string;
  giftId?: string;
  orderedQuantity?: number;
  receivedQuantity?: number;
  quantity?: number;
};

type NormalizedItem = {
  itemType: "PRODUCT" | "GIFT";
  productId?: mongoose.Types.ObjectId | null;
  variantId?: mongoose.Types.ObjectId | null;
  giftId?: mongoose.Types.ObjectId | null;
  quantity: number;
};

function oid(value: string, field: string) {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new Error(`${field} không hợp lệ`);
  return new mongoose.Types.ObjectId(value);
}

function positive(value: number | undefined, field: string) {
  if (!Number.isInteger(value) || (value as number) <= 0) throw new Error(`${field} phải là số nguyên > 0`);
  return value as number;
}

async function normalizeItem(input: WarehouseItemInput): Promise<Omit<NormalizedItem, "quantity">> {
  const supplied = [input.variantId, input.productId && !input.variantId ? input.productId : undefined, input.giftId].filter(Boolean);
  if (supplied.length !== 1) throw new Error("Mỗi dòng phải chọn đúng một variant, product không variant hoặc gift");

  if (input.giftId) {
    const giftId = oid(input.giftId, "Gift ID");
    if (!(await Gift.exists({ _id: giftId, isActive: true }))) throw new Error("Gift không tồn tại hoặc đã ngừng hoạt động");
    return { itemType: "GIFT", giftId, productId: null, variantId: null };
  }

  if (input.variantId) {
    const variantId = oid(input.variantId, "Variant ID");
    const variant = await ProductVariant.findOne({ _id: variantId, isActive: true }).select("productId").lean();
    if (!variant) throw new Error("ProductVariant không tồn tại hoặc đã ngừng hoạt động");
    return { itemType: "PRODUCT", productId: variant.productId, variantId, giftId: null };
  }

  const productId = oid(input.productId!, "Product ID");
  if (!(await Product.exists({ _id: productId, isActive: true }))) throw new Error("Product không tồn tại hoặc đã ngừng hoạt động");
  return { itemType: "PRODUCT", productId, variantId: null, giftId: null };
}

function itemFilter(warehouseId: mongoose.Types.ObjectId, item: Omit<NormalizedItem, "quantity">) {
  return {
    warehouseId,
    itemType: item.itemType,
    productId: item.productId ?? null,
    variantId: item.variantId ?? null,
    giftId: item.giftId ?? null,
    isActive: true,
  };
}

async function nextCode(prefix: "WR" | "TR", session: mongoose.ClientSession) {
  const date = new Date();
  const key = `${prefix.toLowerCase()}_${date.toISOString().slice(0, 10).replace(/-/g, "")}`;
  const counter = await Counter.findOneAndUpdate({ key }, { $inc: { seq: 1 } }, { upsert: true, new: true, session });
  return `${prefix}${key.slice(-8)}${String(counter?.seq ?? 1).padStart(4, "0")}`;
}

async function movement(data: Omit<Parameters<typeof WarehouseStockMovement.create>[0], "_id">, session: mongoose.ClientSession) {
  const docs = await WarehouseStockMovement.create([data], { session });
  return docs[0];
}

async function adjustInventory(
  warehouseId: mongoose.Types.ObjectId,
  item: Omit<NormalizedItem, "quantity">,
  change: number,
  session: mongoose.ClientSession,
  field: "quantity" | "inTransitQuantity" = "quantity"
) {
  const filter = itemFilter(warehouseId, item);

  if (change > 0) {
    // Increase: add to quantity and availableQuantity
    const update = {
      $inc: {
        [field]: change,
        ...(field === "quantity" ? { availableQuantity: change } : {}),
      },
      $setOnInsert: { inTransitQuantity: 0, shippedQuantity: 0, reservedQuantity: 0, isActive: true },
    };
    const result = await WarehouseInventory.findOneAndUpdate(
      filter,
      update,
      { upsert: true, new: true, session, setDefaultsOnInsert: true }
    );
    return result;
  } else {
    // Decrease: check available or quantity
    const query = field === "quantity"
      ? { ...filter, availableQuantity: { $gte: Math.abs(change) } }
      : { ...filter, [field]: { $gte: Math.abs(change) } };

    const update: Record<string, Record<string, number>> = field === "quantity"
      ? { $inc: { [field]: change, availableQuantity: change } }
      : { $inc: { [field]: change } };

    const result = await WarehouseInventory.findOneAndUpdate(
      query,
      update,
      { returnDocument: "after", session }
    );
    if (!result) throw new Error(`Không đủ tồn kho: cần ${Math.abs(change)}`);
    return result;
  }
}

export class WarehouseWorkflowService {
  async createReceipt(input: { warehouseId: string; items: WarehouseItemInput[]; note?: string; employeeId: string }) {
    if (!input.items.length) throw new Error("Phiếu nhập phải có ít nhất một mặt hàng");
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const warehouseId = oid(input.warehouseId, "Warehouse ID");

      // Topology rule: IMPORT t� nhà sản xuất chỉ được vào KHO1 (kho trung gian).
      // Reject IMPORT trực tiếp vào KHO2 (sẽ bypass transfer workflow).
      await validateImportTarget(warehouseId, session);

      const createdItems = [];
      for (const raw of input.items) {
        const item = await normalizeItem(raw);
        const orderedQuantity = positive(raw.orderedQuantity, "orderedQuantity");
        const receivedQuantity = positive(raw.receivedQuantity, "receivedQuantity");
        await adjustInventory(warehouseId, item, receivedQuantity, session);
        createdItems.push({ ...item, orderedQuantity, receivedQuantity, difference: receivedQuantity - orderedQuantity });
      }
      const receiptCode = await nextCode("WR", session);
      const receipt = await WarehouseReceipt.create([{ receiptCode, warehouseId, items: createdItems, note: input.note ?? "", createdBy: oid(input.employeeId, "Employee ID") }], { session });
      for (const item of createdItems) {
        await movement({ warehouseId, itemType: item.itemType, productId: item.productId, variantId: item.variantId, giftId: item.giftId, type: "IMPORT", quantity: item.receivedQuantity, referenceType: "RECEIPT", referenceId: receipt[0]._id, referenceCode: receiptCode, createdBy: oid(input.employeeId, "Employee ID"), note: input.note ?? "" }, session);
      }
      await session.commitTransaction();
      return receipt[0];
    } catch (error) { await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }

  async createTransfer(input: { sourceWarehouseId: string; destinationWarehouseId: string; items: WarehouseItemInput[]; note?: string; employeeId: string; status?: "DRAFT" | "SENT" | "COMPLETED" }) {
    if (input.sourceWarehouseId === input.destinationWarehouseId) throw new Error("Kho nguồn và kho đích phải khác nhau");
    if (!input.items.length) throw new Error("Phiếu chuyển phải có ít nhất một mặt hàng");
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const sourceWarehouseId = oid(input.sourceWarehouseId, "Kho nguồn");
      const destinationWarehouseId = oid(input.destinationWarehouseId, "Kho đích");

      // Topology rule: TRANSFER chỉ hợp lệ theo chiều KHO1 → KHO2.
      // Reject: KHO2 → KHO1, KHO1 → KHO1, KHO2 → KHO2, và bất kỳ kho nào
      // không có code trong topology resolver.
      await validateTransferDirection(sourceWarehouseId, destinationWarehouseId, session);

      const employeeId = oid(input.employeeId, "Employee ID");
      const normalized = [];
      for (const raw of input.items) normalized.push({ ...(await normalizeItem(raw)), quantity: positive(raw.quantity, "quantity") });
      const transferCode = await nextCode("TR", session);
      const status = input.status ?? "SENT";
      const transferItems = normalized.map((item) => ({ ...item, sentQuantity: item.quantity, receivedQuantity: status === "COMPLETED" ? item.quantity : 0, difference: 0 }));
      const transfer = await WarehouseTransfer.create([{ transferCode, sourceWarehouseId, destinationWarehouseId, items: transferItems, status, note: input.note ?? "", createdBy: employeeId, sentAt: status !== "DRAFT" ? new Date() : undefined, receivedAt: status === "COMPLETED" ? new Date() : undefined, receivedBy: status === "COMPLETED" ? employeeId : undefined }], { session });
      if (status !== "DRAFT") {
        for (const item of normalized) {
          await adjustInventory(sourceWarehouseId, item, -item.quantity, session);
          await movement({ warehouseId: sourceWarehouseId, ...item, type: "TRANSFER_OUT", quantity: item.quantity, referenceType: "TRANSFER", referenceId: transfer[0]._id, referenceCode: transferCode, createdBy: employeeId, note: input.note ?? "" }, session);
          if (status === "COMPLETED") {
            await adjustInventory(destinationWarehouseId, item, item.quantity, session);
            await movement({ warehouseId: destinationWarehouseId, ...item, type: "TRANSFER_IN", quantity: item.quantity, referenceType: "TRANSFER", referenceId: transfer[0]._id, referenceCode: transferCode, createdBy: employeeId, note: input.note ?? "" }, session);
          } else {
            await adjustInventory(destinationWarehouseId, item, item.quantity, session, "inTransitQuantity");
          }
        }
      }
      await session.commitTransaction();
      return transfer[0];
    } catch (error) { await session.abortTransaction(); throw error; } finally { await session.endSession(); }
  }

  async receiveTransfer(input: { transferId: string; employeeId: string; receivedQuantities: number[]; note?: string }) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // ── 1. Atomic status guard ────────────────────────────────────────
      // Find the transfer AND atomically flip its status SENT → RECEIVED.
      // This is the single point that prevents two concurrent requests from
      // both passing a "check then mutate" guard. Only one findOneAndUpdate
      // can match {_id, status: "SENT"}; every subsequent call sees
      // status: "RECEIVED" and the filter returns null.
      const transferObjectId = oid(input.transferId, "Transfer ID");
      const employeeId = oid(input.employeeId, "Employee ID");

      const claimed = await WarehouseTransfer.findOneAndUpdate(
        { _id: transferObjectId, status: "SENT" },
        {
          $set: {
            status: "RECEIVED",
            receivedAt: new Date(),
            receivedBy: employeeId,
          },
        },
        { returnDocument: "after", session }
      );

      if (!claimed) {
        // Either the transfer does not exist or it is no longer SENT.
        // Distinguish 404 vs conflict so the API layer can map correctly.
        const exists = await WarehouseTransfer.findById(transferObjectId).session(session).lean();
        if (!exists) throw new Error("Phiếu chuyển không tồn tại");
        // Already received (or any non-SENT status): idempotent no-op.
        // Throw a typed marker so the API layer can answer 409 instead of 500.
        const err = new Error("Phiếu chuyển không ở trạng thái SENT") as Error & { code?: string; status?: number };
        err.code = "TRANSFER_NOT_SENT";
        err.status = 409;
        throw err;
      }

      // ── 2. Validate payload against the freshly-claimed transfer ───────
      if (input.receivedQuantities.length !== claimed.items.length) {
        throw new Error("Số dòng nhận kho không khớp phiếu chuyển");
      }

      // ── 3. Apply inventory + write TRANSFER_IN (atomic, same session) ──
      for (let i = 0; i < claimed.items.length; i++) {
        const line = claimed.items[i];
        const received = input.receivedQuantities[i];
        if (!Number.isInteger(received) || received < 0 || received > line.sentQuantity) {
          throw new Error("Số lượng thực nhận không hợp lệ");
        }
        const item = {
          itemType: (line.giftId ? "GIFT" : "PRODUCT") as "GIFT" | "PRODUCT",
          productId: line.productId ?? null,
          variantId: line.variantId ?? null,
          giftId: line.giftId ?? null,
        };
        await adjustInventory(claimed.destinationWarehouseId, item, -line.sentQuantity, session, "inTransitQuantity");
        if (received > 0) {
          await adjustInventory(claimed.destinationWarehouseId, item, received, session);
          await movement(
            {
              warehouseId: claimed.destinationWarehouseId,
              ...item,
              type: "TRANSFER_IN",
              quantity: received,
              referenceType: "TRANSFER",
              referenceId: claimed._id,
              referenceCode: claimed.transferCode,
              createdBy: employeeId,
              note: input.note ?? "",
            },
            session
          );
        }
      }

      // ── 4. Persist per-line receivedQuantity + difference ──────────────
      // Status is already RECEIVED from step 1; only update the line totals.
      const itemsUpdate = claimed.items.map((line, i) => ({
        productId: line.productId ?? null,
        variantId: line.variantId ?? null,
        giftId: line.giftId ?? null,
        sentQuantity: line.sentQuantity,
        receivedQuantity: input.receivedQuantities[i],
        difference: input.receivedQuantities[i] - line.sentQuantity,
      }));
      await WarehouseTransfer.updateOne(
        { _id: claimed._id },
        { $set: { items: itemsUpdate } },
        { session }
      );

      await session.commitTransaction();

      // Return a plain object (no .save side-effects).
      const result = await WarehouseTransfer.findById(claimed._id).lean();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async listInventory(filters: { warehouseId?: string; itemType?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1; const limit = filters.limit ?? 20;
    const query: Record<string, unknown> = { isActive: true };
    if (filters.warehouseId) query.warehouseId = oid(filters.warehouseId, "Warehouse ID");
    if (filters.itemType) query.itemType = filters.itemType;
    const [items, total] = await Promise.all([
      WarehouseInventory.find(query).populate("warehouseId", "_id code name").populate("productId", "_id code name").populate("variantId", "_id sku variantValues").populate("giftId", "_id name").sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WarehouseInventory.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async listTransfers(filters: { status?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1; const limit = filters.limit ?? 20;
    const query: Record<string, unknown> = filters.status ? { status: filters.status } : {};
    const [items, total] = await Promise.all([
      WarehouseTransfer.find(query).populate("sourceWarehouseId", "_id code name").populate("destinationWarehouseId", "_id code name").populate("createdBy", "_id employeeCode fullName").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WarehouseTransfer.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async listReceipts(filters: { warehouseId?: string; search?: string; productId?: string; createdBy?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1; const limit = filters.limit ?? 20;
    const query: Record<string, unknown> = {};
    if (filters.warehouseId) query.warehouseId = oid(filters.warehouseId, "Warehouse ID");
    if (filters.createdBy) query.createdBy = oid(filters.createdBy, "Created By");

    // Search by receiptCode (case-insensitive) — pre-query for product IDs since they're nested in items
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, "i");
      const matchingProducts = await Product.find({ $or: [{ name: searchRegex }, { code: searchRegex }], isActive: true }).select("_id").limit(100).lean();
      const productIds = matchingProducts.map((p) => p._id);
      const searchConditions: Record<string, unknown>[] = [{ receiptCode: searchRegex }];
      if (productIds.length) searchConditions.push({ "items.productId": { $in: productIds } });
      query.$and = [{ $or: searchConditions }];
    }

    // Filter by a specific product nested in items
    if (filters.productId) {
      const productObjectId = oid(filters.productId, "Product ID");
      query["items.productId"] = productObjectId;
    }

    const [items, total] = await Promise.all([
      WarehouseReceipt.find(query).populate("warehouseId", "_id code name").populate("createdBy", "_id employeeCode fullName").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WarehouseReceipt.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }

  async listMovements(filters: { warehouseId?: string; type?: string; startDate?: string; endDate?: string; search?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1; const limit = filters.limit ?? 20;
    const query: Record<string, unknown> = {};
    if (filters.warehouseId) query.warehouseId = oid(filters.warehouseId, "Warehouse ID");
    if (filters.type) query.type = filters.type as WarehouseStockMovementType;
    
    // Date range filter - use start/end of day in UTC to avoid timezone issues
    if (filters.startDate || filters.endDate) {
      const start = filters.startDate ? new Date(filters.startDate + "T00:00:00.000Z") : undefined;
      const end = filters.endDate ? new Date(filters.endDate + "T23:59:59.999Z") : undefined;
      query.createdAt = {};
      if (start) (query.createdAt as Record<string, unknown>).$gte = start;
      if (end) (query.createdAt as Record<string, unknown>).$lte = end;
    }
    
    // Search filter - must pre-query IDs since MongoDB $or doesn't work on populated fields in find()
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, "i");
      const searchConditions: Record<string, unknown>[] = [{ referenceCode: searchRegex }];
      
      // Find matching product/variant/gift IDs
      const [matchingProducts, matchingVariants, matchingGifts] = await Promise.all([
        Product.find({ name: searchRegex, isActive: true }).select("_id").limit(100).lean(),
        ProductVariant.find({ sku: searchRegex, isActive: true }).select("_id").limit(100).lean(),
        Gift.find({ name: searchRegex, isActive: true }).select("_id").limit(100).lean(),
      ]);
      
      const productIds = matchingProducts.map(p => p._id);
      const variantIds = matchingVariants.map(v => v._id);
      const giftIds = matchingGifts.map(g => g._id);
      
      // Add ID-based conditions to search
      if (productIds.length) searchConditions.push({ productId: { $in: productIds } });
      if (variantIds.length) searchConditions.push({ variantId: { $in: variantIds } });
      if (giftIds.length) searchConditions.push({ giftId: { $in: giftIds } });
      
      if (searchConditions.length > 1) {
        query.$and = [{ $or: searchConditions }];
      } else if (searchConditions.length === 1) {
        // Only referenceCode match
        Object.assign(query, searchConditions[0]);
      }
    }
    
    const [items, total] = await Promise.all([
      WarehouseStockMovement.find(query).populate("warehouseId", "_id code name").populate("productId", "_id code name").populate("variantId", "_id sku").populate("giftId", "_id name").populate("createdBy", "_id employeeCode fullName").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      WarehouseStockMovement.countDocuments(query),
    ]);
    return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }
}

export const warehouseWorkflowService = new WarehouseWorkflowService();
