/**
 * ==================================================
 * GET /api/products/management
 * ==================================================
 *
 * Sprint 8.4.1 - Product Management
 * Sprint 8.4.2 - Added category & date filters
 *
 * Lấy danh sách sản phẩm kèm thông tin:
 * - Combo count (số lượng combo của sản phẩm)
 * - Combo list (danh sách combo hiện có)
 * - Inventory stats (SL nhập, SL đáp kho)
 * - Closed orders count (đơn chốt)
 * - Import dates, warehouse receipt dates
 *
 * Query params:
 * - warehouseId: Lọc theo kho cụ thể (optional)
 * - keyword: Tìm kiếm theo mã/tên sản phẩm
 * - categoryCode: Lọc theo danh mục (theo code)
 * - dateFrom: Lọc sản phẩm có ngày nhập gần nhất >= dateFrom (YYYY-MM-DD)
 * - dateTo: Lọc sản phẩm có ngày nhập gần nhất <= dateTo (YYYY-MM-DD)
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import { Types } from "mongoose";

import Product from "@/models/Product";
import Category from "@/models/Category";
import Combo from "@/models/Combo";
import ProductVariant from "@/models/ProductVariant";
import WarehouseInventory from "@/models/WarehouseInventory";
import { Order } from "@/models/Order";
import Warehouse from "@/models/Warehouse";
import { InventoryHistory } from "@/models/InventoryHistory";
import { OrderStatus } from "@/constants/orderStatus";
import { InventoryTransactionType } from "@/constants/inventoryStatus";

import { success, error as errorResponse } from "@/utils/response";

interface ProductManagementItem {
  _id: string;
  code: string;
  name: string;
  category: {
    _id: string;
    code: string;
    name: string;
  } | null;
  image?: string;
  description?: string;
  isActive?: boolean;
  // Combo info
  comboCount: number;
  combos: Array<{
    _id: string;
    code: string;
    name: string;
    sellingPrice: number;
    packageQuantity: number;
    isActive: boolean;
  }>;
  // Inventory stats (by warehouse)
  inventoryByWarehouse: Record<string, {
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    importedQuantity: number;    // SL nhập = tổng INBOUND
    currentQuantity: number;     // SL đáp kho hiện tại
    lastImportDate: string | null;
    lastWarehouseReceiptDate: string | null;
  }>;
  // Order stats
  closedOrdersCount: number;    // Đơn chốt = đơn COMPLETED
  totalClosedQuantity: number;   // Tổng số lượng đã chốt
}

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser(request);

    if (!currentUser.permissions.includes("product.view")) {
      return errorResponse("Bạn không có quyền xem sản phẩm", 403);
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const warehouseId = searchParams.get("warehouseId") ?? undefined;
    const keyword = searchParams.get("keyword") ?? "";
    const categoryCode = searchParams.get("categoryCode") ?? "";
    const dateFrom = searchParams.get("dateFrom") ?? "";
    const dateTo = searchParams.get("dateTo") ?? "";

    // Get all warehouses for inventory stats
    const warehouses = await Warehouse.find({ isActive: true })
      .select("_id code name")
      .lean();
    const warehouseMap = new Map(
      warehouses.map((w) => [w._id.toString(), { _id: w._id.toString(), code: w.code, name: w.name }])
    );

    // Resolve categoryCode -> categoryId(s) for filtering
    let categoryIdsFilter: Types.ObjectId[] | null = null;
    if (categoryCode) {
      const categoryDocs = await Category.find({ code: categoryCode })
        .select("_id")
        .lean();
      categoryIdsFilter = categoryDocs.map((c) => c._id);
      if (categoryIdsFilter.length === 0) {
        // No matching category → no product can match
        return success({
          items: [],
          total: 0,
          warehouses: warehouses.map((w) => ({
            _id: w._id.toString(),
            code: w.code,
            name: w.name,
          })),
        });
      }
    }

    // Build product filter
    const productFilter: Record<string, unknown> = { isActive: true };
    if (keyword) {
      productFilter.$or = [
        { code: { $regex: keyword, $options: "i" } },
        { name: { $regex: keyword, $options: "i" } },
      ];
    }
    if (categoryIdsFilter) {
      productFilter.categoryId = { $in: categoryIdsFilter };
    }

    // Fetch all products
    const products = await Product.find(productFilter)
      .populate({ path: "categoryId", select: "code name" })
      .sort({ code: 1 })
      .lean();

    const productIds = products.map((p) => p._id);

    // Fetch combos for these products
    const combos = await Combo.find({
      productId: { $in: productIds },
      isActive: true,
    })
      .select("_id code name productId sellingPrice packageQuantity isActive")
      .lean();

    const combosByProduct = new Map<string, typeof combos>();
    for (const combo of combos) {
      const productId = combo.productId.toString();
      if (!combosByProduct.has(productId)) {
        combosByProduct.set(productId, []);
      }
      combosByProduct.get(productId)!.push(combo);
    }

    // Get product variants for these products
    const variants = await ProductVariant.find({
      productId: { $in: productIds },
      isActive: true,
    })
      .select("_id productId sku")
      .lean();

    const variantIds = variants.map((v) => v._id);
    const variantByProduct = new Map<string, string[]>();
    for (const variant of variants) {
      const productId = variant.productId.toString();
      if (!variantByProduct.has(productId)) {
        variantByProduct.set(productId, []);
      }
      variantByProduct.get(productId)!.push(variant._id.toString());
    }

    // Build filter for WarehouseInventory (source of truth).
    // We query by the variants that belong to the loaded products,
    // filter to itemType: "PRODUCT" (gift inventory is excluded here).
    const inventoryFilter: Record<string, unknown> = {
      itemType: "PRODUCT",
      variantId: { $in: variantIds },
      isActive: true,
    };
    if (warehouseId) {
      inventoryFilter.warehouseId = warehouseId;
    }

    // Fetch inventory records (WarehouseInventory is the SoT).
    const inventories = await WarehouseInventory.find(inventoryFilter)
      .populate({ path: "warehouseId", select: "code name" })
      .lean();

    // Build inventory map: variantId -> warehouseId -> inventory
    const inventoryByVariantWarehouse = new Map<string, Map<string, typeof inventories[0]>>();
    for (const inv of inventories) {
      if (!inv.variantId) continue;
      const variantId = inv.variantId.toString();
      const warehouseIdStr = (inv.warehouseId as unknown as { _id: string })._id.toString();
      if (!inventoryByVariantWarehouse.has(variantId)) {
        inventoryByVariantWarehouse.set(variantId, new Map());
      }
      inventoryByVariantWarehouse.get(variantId)!.set(warehouseIdStr, inv);
    }

    // Fetch inventory history for import stats
    const historyFilter: Record<string, unknown> = {
      productVariantId: { $in: variantIds },
      transactionType: InventoryTransactionType.INBOUND,
    };
    if (warehouseId) {
      historyFilter.warehouseId = warehouseId;
    }

    const inventoryHistories = await InventoryHistory.find(historyFilter)
      .select("productVariantId warehouseId changeQuantity createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // Build history map: variantId -> warehouseId -> lastHistory
    const lastHistoryByVariantWarehouse = new Map<string, Map<string, typeof inventoryHistories[0]>>();
    for (const hist of inventoryHistories) {
      if (!hist.productVariantId) continue;
      const variantId = hist.productVariantId.toString();
      const warehouseIdStr = hist.warehouseId.toString();
      if (!lastHistoryByVariantWarehouse.has(variantId)) {
        lastHistoryByVariantWarehouse.set(variantId, new Map());
      }
      // Only keep the latest
      if (!lastHistoryByVariantWarehouse.get(variantId)!.has(warehouseIdStr)) {
        lastHistoryByVariantWarehouse.get(variantId)!.set(warehouseIdStr, hist);
      }
    }

    // Fetch order stats (closed orders by productId)
    // "Đơn chốt" = đơn đã giao thành công (DELIVERED)
    const orderFilter: Record<string, unknown> = {
      productId: { $in: productIds },
      status: OrderStatus.DELIVERED,
      isActive: true,
    };
    if (warehouseId) {
      orderFilter.warehouseId = warehouseId;
    }

    const orderStats = await Order.aggregate([
      { $match: orderFilter },
      {
        $group: {
          _id: "$productId",
          closedOrdersCount: { $sum: 1 },
          totalClosedQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    const orderStatsMap = new Map(
      orderStats.map((s) => [s._id.toString(), { closedOrdersCount: s.closedOrdersCount, totalClosedQuantity: s.totalClosedQuantity }])
    );

    // Fetch order stats by combo
    const comboIds = combos.map((c) => c._id);
    const comboOrderFilter: Record<string, unknown> = {
      comboId: { $in: comboIds },
      status: OrderStatus.DELIVERED,
      isActive: true,
    };
    if (warehouseId) {
      comboOrderFilter.warehouseId = warehouseId;
    }

    const comboOrderStats = await Order.aggregate([
      { $match: comboOrderFilter },
      {
        $group: {
          _id: "$comboId",
          closedOrdersCount: { $sum: 1 },
          totalClosedQuantity: { $sum: "$quantity" },
        },
      },
    ]);

    const comboOrderStatsMap = new Map(
      comboOrderStats.map((s) => [s._id.toString(), { closedOrdersCount: s.closedOrdersCount, totalClosedQuantity: s.totalClosedQuantity }])
    );

    // Build response
    const items: ProductManagementItem[] = products.map((product) => {
      const productId = product._id.toString();
      const categoryId = (product.categoryId as unknown as { _id: string; code: string; name: string }) || null;

      // Combos
      const productCombos = combosByProduct.get(productId) || [];
      const comboCount = productCombos.length;

      // Inventory by warehouse
      const inventoryByWarehouse: ProductManagementItem["inventoryByWarehouse"] = {};
      const productVariantIds = variantByProduct.get(productId) || [];

      for (const warehouse of warehouses) {
        const wid = warehouse._id.toString();

        // Skip if filtering by warehouse and not this one
        if (warehouseId && wid !== warehouseId) continue;

        let totalImported = 0;
        let totalCurrent = 0;
        let lastImportDate: string | null = null;
        const lastWarehouseReceiptDate: string | null = null;

        for (const variantId of productVariantIds) {
          const variantInventory = inventoryByVariantWarehouse.get(variantId)?.get(wid);
          if (variantInventory) {
            totalCurrent += variantInventory.quantity;
          }

          const history = lastHistoryByVariantWarehouse.get(variantId)?.get(wid);
          if (history) {
            totalImported += Math.abs(history.changeQuantity);
            const histDate = history.createdAt.toISOString();
            if (!lastImportDate || histDate > lastImportDate) {
              lastImportDate = histDate;
            }
          }
        }

        inventoryByWarehouse[wid] = {
          warehouseId: wid,
          warehouseCode: warehouse.code,
          warehouseName: warehouse.name,
          importedQuantity: totalImported,
          currentQuantity: totalCurrent,
          lastImportDate,
          lastWarehouseReceiptDate,
        };
      }

      // Order stats (product + combos)
      const productOrderStats = orderStatsMap.get(productId) || { closedOrdersCount: 0, totalClosedQuantity: 0 };
      let totalClosedOrders = productOrderStats.closedOrdersCount;
      let totalClosedQuantity = productOrderStats.totalClosedQuantity;

      for (const combo of productCombos) {
        const comboStats = comboOrderStatsMap.get(combo._id.toString());
        if (comboStats) {
          totalClosedOrders += comboStats.closedOrdersCount;
          totalClosedQuantity += comboStats.totalClosedQuantity;
        }
      }

      return {
        _id: productId,
        code: product.code,
        name: product.name,
        category: categoryId ? {
          _id: categoryId._id.toString(),
          code: categoryId.code,
          name: categoryId.name,
        } : null,
        image: product.image,
        description: product.description,
        isActive: product.isActive,
        comboCount,
        combos: productCombos.map((c) => ({
          _id: c._id.toString(),
          code: c.code,
          name: c.name,
          sellingPrice: c.sellingPrice,
          packageQuantity: c.packageQuantity,
          isActive: c.isActive,
        })),
        inventoryByWarehouse,
        closedOrdersCount: totalClosedOrders,
        totalClosedQuantity,
      };
    });

    // Apply date filter (lastImportDate) – ranges are inclusive of the day.
    // dateFrom/dateTo are YYYY-MM-DD strings; convert to ISO boundaries.
    const dateFromMs = dateFrom ? Date.parse(`${dateFrom}T00:00:00.000Z`) : null;
    const dateToMs = dateTo ? Date.parse(`${dateTo}T23:59:59.999Z`) : null;
    const filteredItems =
      dateFromMs !== null || dateToMs !== null
        ? items.filter((item) => {
            // Determine the product's "last import date" to compare against.
            // Use the selected warehouse if given, otherwise the max across all warehouses.
            let lastImportIso: string | null = null;
            for (const stats of Object.values(item.inventoryByWarehouse)) {
              if (!stats.lastImportDate) continue;
              if (!lastImportIso || stats.lastImportDate > lastImportIso) {
                lastImportIso = stats.lastImportDate;
              }
            }
            if (!lastImportIso) return false;
            const ms = Date.parse(lastImportIso);
            if (dateFromMs !== null && ms < dateFromMs) return false;
            if (dateToMs !== null && ms > dateToMs) return false;
            return true;
          })
        : items;

    return success({
      items: filteredItems,
      total: filteredItems.length,
      warehouses: warehouses.map((w) => ({
        _id: w._id.toString(),
        code: w.code,
        name: w.name,
      })),
    });
  } catch (error) {
    console.error("Product Management Error:", error);
    return errorResponse("Không thể lấy danh sách sản phẩm", 500);
  }
}
