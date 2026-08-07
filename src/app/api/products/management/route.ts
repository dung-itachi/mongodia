/**
 * ==================================================
 * GET /api/products/management
 * ==================================================
 *
 * Sprint 8.4.1 - Product Management
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
 */

import { connectDB } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

import Product from "@/models/Product";
import Category from "@/models/Category";
import Combo from "@/models/Combo";
import ProductVariant from "@/models/ProductVariant";
import Inventory from "@/models/Inventory";
import { Order } from "@/models/Order";
import Warehouse from "@/models/Warehouse";
import { InventoryHistory } from "@/models/InventoryHistory";
import { OrderStatus } from "@/constants/orderStatus";
import { InventoryTransactionType, InventoryAction } from "@/constants/inventoryStatus";

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
    packageSize: number;
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

    // Get all warehouses for inventory stats
    const warehouses = await Warehouse.find({ isActive: true })
      .select("_id code name")
      .lean();
    const warehouseMap = new Map(
      warehouses.map((w) => [w._id.toString(), { _id: w._id.toString(), code: w.code, name: w.name }])
    );

    // Build product filter
    const productFilter: Record<string, unknown> = { isActive: true };
    if (keyword) {
      productFilter.$or = [
        { code: { $regex: keyword, $options: "i" } },
        { name: { $regex: keyword, $options: "i" } },
      ];
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
      .select("_id code name productId sellingPrice packageSize isActive")
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

    // Build variant filter for inventory query
    const inventoryFilter: Record<string, unknown> = {
      productVariantId: { $in: variantIds },
    };
    if (warehouseId) {
      inventoryFilter.warehouseId = warehouseId;
    }

    // Fetch inventory records
    const inventories = await Inventory.find(inventoryFilter)
      .populate({ path: "warehouseId", select: "code name" })
      .lean();

    // Build inventory map: variantId -> warehouseId -> inventory
    const inventoryByVariantWarehouse = new Map<string, Map<string, typeof inventories[0]>>();
    for (const inv of inventories) {
      const variantId = inv.productVariantId.toString();
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
        let lastWarehouseReceiptDate: string | null = null;

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
          packageSize: c.packageSize,
          isActive: c.isActive,
        })),
        inventoryByWarehouse,
        closedOrdersCount: totalClosedOrders,
        totalClosedQuantity,
      };
    });

    return success({
      items,
      total: items.length,
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
