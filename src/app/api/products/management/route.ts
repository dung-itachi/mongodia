/**
 * ==================================================
 * GET /api/products/management
 * ==================================================
 *
 * Sprint 8.4.1 - Product Management
 * Sprint 8.4.2 - Added category & date filters
 * Sprint 8.4.3 - Performance optimization (v2)
 *   - Aggregation pipeline thay vì nhiều queries riêng lẻ
 *   - Pagination để tránh load toàn bộ data
 *   - Composite indexes trên Order & InventoryHistory
 *   - Promise.all cho parallel queries
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
 * - page: Số trang (default: 1)
 * - limit: Số items per page (default: 50, max: 100)
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
  comboCount: number;
  combos: Array<{
    _id: string;
    code: string;
    name: string;
    sellingPrice: number;
    packageQuantity: number;
    isActive: boolean;
  }>;
  inventoryByWarehouse: Record<string, {
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    importedQuantity: number;
    currentQuantity: number;
    lastImportDate: string | null;
    lastWarehouseReceiptDate: string | null;
  }>;
  closedOrdersCount: number;
  totalClosedQuantity: number;
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
    
    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    // Get all warehouses for inventory stats
    const warehouses = await Warehouse.find({ isActive: true })
      .select("_id code name")
      .lean();

    // Resolve categoryCode -> categoryId(s) for filtering
    let categoryIdsFilter: Types.ObjectId[] | null = null;
    if (categoryCode) {
      const categoryDocs = await Category.find({ code: categoryCode })
        .select("_id")
        .lean();
      categoryIdsFilter = categoryDocs.map((c) => c._id);
      if (categoryIdsFilter.length === 0) {
        return success({
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
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

    // Count total products for pagination
    const totalProducts = await Product.countDocuments(productFilter);

    // Fetch paginated products
    const products = await Product.find(productFilter)
      .populate({ path: "categoryId", select: "code name" })
      .sort({ code: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const productIds = products.map((p) => p._id);

    if (productIds.length === 0) {
      return success({
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        warehouses: warehouses.map((w) => ({
          _id: w._id.toString(),
          code: w.code,
          name: w.name,
        })),
      });
    }

    // Parallel queries
    const [combos, variants, orderStatsResult] = await Promise.all([
      Combo.find({ productId: { $in: productIds }, isActive: true })
        .select("_id code name productId sellingPrice packageQuantity isActive")
        .lean(),
      
      ProductVariant.find({ productId: { $in: productIds }, isActive: true })
        .select("_id productId sku")
        .lean(),
      
      Order.aggregate([
        {
          $match: {
            productId: { $in: productIds },
            status: OrderStatus.DELIVERED,
            isActive: true,
            ...(warehouseId && { warehouseId: new Types.ObjectId(warehouseId) }),
          },
        },
        { $group: { _id: "$productId", closedOrdersCount: { $sum: 1 }, totalClosedQuantity: { $sum: "$quantity" } } },
      ]),
    ]);

    const variantIds = variants.map((v) => v._id);
    const comboIds = combos.map((c) => c._id);

    // More parallel queries
    const [comboOrderStatsResult, historyAggregation, inventoryDocs] = await Promise.all([
      comboIds.length > 0
        ? Order.aggregate([
            { $match: { comboId: { $in: comboIds }, status: OrderStatus.DELIVERED, isActive: true, ...(warehouseId && { warehouseId: new Types.ObjectId(warehouseId) }) } },
            { $group: { _id: "$comboId", closedOrdersCount: { $sum: 1 }, totalClosedQuantity: { $sum: "$quantity" } } },
          ])
        : Promise.resolve([]),
      
      InventoryHistory.aggregate([
        {
          $match: {
            productVariantId: { $in: variantIds },
            transactionType: InventoryTransactionType.INBOUND,
            ...(warehouseId && { warehouseId: new Types.ObjectId(warehouseId) }),
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: { productVariantId: "$productVariantId", warehouseId: "$warehouseId" },
            totalImported: { $sum: { $abs: "$changeQuantity" } },
            lastImportDate: { $first: "$createdAt" },
          },
        },
      ]),
      
      WarehouseInventory.find({
        itemType: "PRODUCT",
        variantId: { $in: variantIds },
        isActive: true,
        ...(warehouseId && { warehouseId: new Types.ObjectId(warehouseId) }),
      })
        .select("variantId warehouseId quantity")
        .populate({ path: "warehouseId", select: "code name" })
        .lean(),
    ]);

    // Build lookup maps
    const variantByProduct = new Map<string, string[]>();
    for (const variant of variants) {
      const productId = variant.productId.toString();
      if (!variantByProduct.has(productId)) variantByProduct.set(productId, []);
      variantByProduct.get(productId)!.push(variant._id.toString());
    }

    const combosByProduct = new Map<string, typeof combos>();
    for (const combo of combos) {
      const productId = combo.productId.toString();
      if (!combosByProduct.has(productId)) combosByProduct.set(productId, []);
      combosByProduct.get(productId)!.push(combo);
    }

    const orderStatsMap = new Map(orderStatsResult.map((s) => [s._id.toString(), { closedOrdersCount: s.closedOrdersCount, totalClosedQuantity: s.totalClosedQuantity }]));
    const comboOrderStatsMap = new Map(comboOrderStatsResult.map((s) => [s._id.toString(), { closedOrdersCount: s.closedOrdersCount, totalClosedQuantity: s.totalClosedQuantity }]));

    // History map
    const historyMap = new Map<string, Map<string, { totalImported: number; lastImportDate: Date }>>();
    for (const hist of historyAggregation) {
      const variantId = hist._id.productVariantId.toString();
      const warehouseIdStr = hist._id.warehouseId.toString();
      if (!historyMap.has(variantId)) historyMap.set(variantId, new Map());
      historyMap.get(variantId)!.set(warehouseIdStr, { totalImported: hist.totalImported, lastImportDate: hist.lastImportDate });
    }

    // Inventory map
    const inventoryMap = new Map<string, Map<string, number>>();
    for (const inv of inventoryDocs) {
      const variantId = inv.variantId?.toString();
      if (!variantId) continue;
      const warehouseIdStr = (inv.warehouseId as unknown as { _id: string })._id.toString();
      if (!inventoryMap.has(variantId)) inventoryMap.set(variantId, new Map());
      inventoryMap.get(variantId)!.set(warehouseIdStr, inv.quantity);
    }

    // Build items
    const items: ProductManagementItem[] = products.map((product) => {
      const productId = product._id.toString();
      const categoryId = (product.categoryId as unknown as { _id: string; code: string; name: string }) || null;
      const productCombos = combosByProduct.get(productId) || [];
      const productVariantIds = variantByProduct.get(productId) || [];

      const inventoryByWarehouse: ProductManagementItem["inventoryByWarehouse"] = {};

      for (const warehouse of warehouses) {
        const wid = warehouse._id.toString();
        if (warehouseId && wid !== warehouseId) continue;

        let totalImported = 0;
        let totalCurrent = 0;
        let lastImportDate: string | null = null;

        for (const variantId of productVariantIds) {
          const history = historyMap.get(variantId)?.get(wid);
          if (history) {
            totalImported += history.totalImported;
            const histDate = history.lastImportDate.toISOString();
            if (!lastImportDate || histDate > lastImportDate) lastImportDate = histDate;
          }
          totalCurrent += inventoryMap.get(variantId)?.get(wid) || 0;
        }

        inventoryByWarehouse[wid] = {
          warehouseId: wid,
          warehouseCode: warehouse.code,
          warehouseName: warehouse.name,
          importedQuantity: totalImported,
          currentQuantity: totalCurrent,
          lastImportDate,
          lastWarehouseReceiptDate: null,
        };
      }

      // Order stats
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
        category: categoryId ? { _id: categoryId._id.toString(), code: categoryId.code, name: categoryId.name } : null,
        image: product.image,
        description: product.description,
        isActive: product.isActive,
        comboCount: productCombos.length,
        combos: productCombos.map((c) => ({ _id: c._id.toString(), code: c.code, name: c.name, sellingPrice: c.sellingPrice, packageQuantity: c.packageQuantity, isActive: c.isActive })),
        inventoryByWarehouse,
        closedOrdersCount: totalClosedOrders,
        totalClosedQuantity,
      };
    });

    // Date filter (in-memory vì đã paginated rồi)
    let filteredItems = items;
    let filteredTotal = totalProducts;

    if (dateFrom || dateTo) {
      const dateFromMs = dateFrom ? Date.parse(`${dateFrom}T00:00:00.000Z`) : null;
      const dateToMs = dateTo ? Date.parse(`${dateTo}T23:59:59.999Z`) : null;

      filteredItems = items.filter((item) => {
        let lastImportIso: string | null = null;
        for (const stats of Object.values(item.inventoryByWarehouse)) {
          if (stats.lastImportDate && (!lastImportIso || stats.lastImportDate > lastImportIso)) {
            lastImportIso = stats.lastImportDate;
          }
        }
        if (!lastImportIso) return false;
        const ms = Date.parse(lastImportIso);
        if (dateFromMs !== null && ms < dateFromMs) return false;
        if (dateToMs !== null && ms > dateToMs) return false;
        return true;
      });
      filteredTotal = filteredItems.length;
    }

    return success({
      items: filteredItems,
      total: filteredTotal,
      page,
      limit,
      totalPages: Math.ceil(filteredTotal / limit),
      warehouses: warehouses.map((w) => ({ _id: w._id.toString(), code: w.code, name: w.name })),
    });
  } catch (error) {
    console.error("Product Management Error:", error);
    return errorResponse("Không thể lấy danh sách sản phẩm", 500);
  }
}
