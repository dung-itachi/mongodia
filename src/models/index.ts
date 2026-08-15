// Central export for all models - ensures models are registered with Mongoose
// Import this file early (e.g., in mongodb.ts) to ensure all models are registered

export { default as AuditLog } from "./AuditLog";

export { default as Area } from "./Area";

export { default as Category } from "./Category";

export { default as Combo } from "./Combo";

export { default as Country } from "./Country";

export { default as Counter } from "./Counter";

export { default as Customer } from "./Customer";

export { default as Department } from "./Department";

export { default as Employee } from "./Employee";

export { default as FacebookPage } from "./FacebookPage";

export { default as FacebookPageAssignment } from "./FacebookPageAssignment";

export { default as File } from "./File";

export { default as Gift } from "./Gift";

export { default as GiftInventoryHistory } from "./GiftInventoryHistory";

export { default as Inventory } from "./Inventory";

// InventoryHistory uses named export
export { InventoryHistory } from "./InventoryHistory";

// Lead uses named export
export { Lead } from "./Lead";

// LeadHistory uses named export
export { LeadHistory } from "./LeadHistory";

export { default as LoginHistory } from "./LoginHistory";

export { default as MarketingExpenseReport } from "./MarketingExpenseReport";

export { default as Notification } from "./Notification";

export { default as Order } from "./Order";

// OrderHistory uses named export
export { OrderHistory } from "./OrderHistory";

export { default as Permission } from "./Permission";

export { default as Product } from "./Product";

export { default as ProductVariant } from "./ProductVariant";

export { default as RefreshToken } from "./RefreshToken";

export { default as Role } from "./Role";

export { default as RolePermission } from "./RolePermission";

export { default as Setting } from "./Setting";

export { default as Supplier } from "./Supplier";

export { default as Team } from "./Team";

export { default as VariantOption } from "./VariantOption";

export { default as VariantValue } from "./VariantValue";

export { default as Warehouse } from "./Warehouse";
export { default as WarehouseInventory } from "./WarehouseInventory";
export { default as WarehouseReceipt } from "./WarehouseReceipt";
export { default as WarehouseTransfer } from "./WarehouseTransfer";
export { default as WarehouseStockMovement } from "./WarehouseStockMovement";
