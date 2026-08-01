/**
 * ==================================================
 * STOCK ENGINE ERROR CLASSES
 * ==================================================
 *
 * Chuẩn hoá error layer cho Stock Engine.
 *
 * Mọi error do Stock Engine throw đều kế thừa `StockEngineError`
 * để API Route (Phase sau) có thể `instanceof` và trả HTTP code chuẩn:
 *
 *   - `InsufficientStockError`          → 409 Conflict
 *   - `InsufficientReservedStockError`  → 409 Conflict
 *   - `InventoryNotFoundError`          → 404 Not Found
 *   - `WarehouseNotFoundError`          → 404 Not Found
 *   - `InvalidStockInputError`          → 400 Bad Request
 *   - `UnsupportedActionError`          → 400 Bad Request
 *
 * Các error đều carry `context` (metadata) để UI / log truy vết.
 * KHÔNG tự throw `Error` thường trong Stock Engine.
 * ==================================================
 */

/**
 * Base class cho mọi Stock Engine error.
 *
 * - `name`: cố định theo subclass (không dùng "Error")
 * - `code`: enum string cho API layer map sang HTTP status
 * - `context`: payload tuỳ biến (item id, requested quantity, available, ...)
 * - `statusCode`: HTTP status code tương ứng (default 500)
 */
export abstract class StockEngineError extends Error {
  public abstract readonly name: string;
  public abstract readonly code: string;
  public abstract readonly statusCode: number;
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.context = context;
    // Đảm bảo prototype chain đúng cho instanceof check.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ==================================================
// 4xx — Client errors
// ==================================================

/**
 * Throw khi `availableQuantity < requested quantity` (RESERVE / TRANSFER_OUT).
 *
 * → 409 Conflict (business conflict, không phải validation 400).
 */
export class InsufficientStockError extends StockEngineError {
  public readonly name = "InsufficientStockError";
  public readonly code = "INSUFFICIENT_STOCK";
  public readonly statusCode = 409;

  constructor(context: {
    warehouseId?: string;
    productVariantId?: string;
    comboId?: string;
    availableQuantity: number;
    requestedQuantity: number;
  }) {
    super(
      `Không đủ tồn khả dụng. Khả dụng: ${context.availableQuantity}, yêu cầu: ${context.requestedQuantity}`,
      context
    );
  }
}

/**
 * Throw khi `reservedQuantity < requested quantity` (UNRESERVE / OUT).
 *
 * → 409 Conflict.
 */
export class InsufficientReservedStockError extends StockEngineError {
  public readonly name = "InsufficientReservedStockError";
  public readonly code = "INSUFFICIENT_RESERVED";
  public readonly statusCode = 409;

  constructor(context: {
    warehouseId?: string;
    productVariantId?: string;
    comboId?: string;
    reservedQuantity: number;
    requestedQuantity: number;
  }) {
    super(
      `Không đủ tồn đang giữ chỗ. Đang giữ: ${context.reservedQuantity}, yêu cầu: ${context.requestedQuantity}`,
      context
    );
  }
}

/**
 * Throw khi `quantity < |adjustChange|` (ADJUST giảm / OUT).
 *
 * → 409 Conflict.
 */
export class InsufficientQuantityError extends StockEngineError {
  public readonly name = "InsufficientQuantityError";
  public readonly code = "INSUFFICIENT_QUANTITY";
  public readonly statusCode = 409;

  constructor(context: {
    warehouseId?: string;
    productVariantId?: string;
    comboId?: string;
    quantity: number;
    requestedQuantity: number;
  }) {
    super(
      `Không đủ tồn tổng. Tồn: ${context.quantity}, yêu cầu: ${context.requestedQuantity}`,
      context
    );
  }
}

/**
 * Throw khi Inventory row không tồn tại trong kho (RESERVE / OUT / UNRESERVE / TRANSFER_OUT).
 *
 * → 404 Not Found.
 */
export class InventoryNotFoundError extends StockEngineError {
  public readonly name = "InventoryNotFoundError";
  public readonly code = "INVENTORY_NOT_FOUND";
  public readonly statusCode = 404;

  constructor(context: {
    warehouseId: string;
    productVariantId?: string;
    comboId?: string;
  }) {
    super(
      `Không tìm thấy Inventory row trong kho. Cần nhập kho trước khi thực hiện thao tác này.`,
      context
    );
  }
}

/**
 * Throw khi WarehouseId không tồn tại / không active.
 *
 * → 404 Not Found.
 */
export class WarehouseNotFoundError extends StockEngineError {
  public readonly name = "WarehouseNotFoundError";
  public readonly code = "WAREHOUSE_NOT_FOUND";
  public readonly statusCode = 404;

  constructor(context: { warehouseId: string }) {
    super(`Không tìm thấy kho hoặc kho đã ngừng hoạt động.`, context);
  }
}

/**
 * Throw khi input invalid (StockLineItem sai, quantity không phải số nguyên dương, ...).
 *
 * → 400 Bad Request.
 */
export class InvalidStockInputError extends StockEngineError {
  public readonly name = "InvalidStockInputError";
  public readonly code = "INVALID_STOCK_INPUT";
  public readonly statusCode = 400;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, context);
  }
}

/**
 * Throw khi caller truyền action không được hỗ trợ (vd: ADJUST phải qua adjustStock riêng).
 *
 * → 400 Bad Request.
 */
export class UnsupportedActionError extends StockEngineError {
  public readonly name = "UnsupportedActionError";
  public readonly code = "UNSUPPORTED_ACTION";
  public readonly statusCode = 400;

  constructor(context: { action: string }) {
    super(`Action không được hỗ trợ: ${context.action}`, context);
  }
}