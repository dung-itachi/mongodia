export const PERMISSIONS = {
  // Employee
  EMPLOYEE_READ: "employee.read",
  EMPLOYEE_CREATE: "employee.create",
  EMPLOYEE_UPDATE: "employee.update",
  EMPLOYEE_DELETE: "employee.delete",

  // Role
  ROLE_READ: "role.read",
  ROLE_CREATE: "role.create",
  ROLE_UPDATE: "role.update",
  ROLE_DELETE: "role.delete",

  // Product
  PRODUCT_READ: "product.read",
  PRODUCT_CREATE: "product.create",
  PRODUCT_UPDATE: "product.update",
  PRODUCT_DELETE: "product.delete",

  // Order (Sprint 6.0)
  ORDER_VIEW: "order.view",
  ORDER_CREATE: "order.create",
  ORDER_UPDATE: "order.update",
  ORDER_DELETE: "order.delete",
  ORDER_CONFIRM: "order.confirm",
  ORDER_CANCEL: "order.cancel",
  ORDER_HISTORY: "order.history",
  ORDER_REVENUE: "order.revenue",
  ORDER_RESERVE_STOCK: "order.reserve_stock",

  // Lead
  LEAD_READ: "lead.read",
  LEAD_CREATE: "lead.create",
  LEAD_UPDATE: "lead.update",
  LEAD_DELETE: "lead.delete",
  LEAD_ASSIGN: "lead.assign",

  // Customer
  CUSTOMER_READ: "customer.read",
  CUSTOMER_CREATE: "customer.create",
  CUSTOMER_UPDATE: "customer.update",
  CUSTOMER_DELETE: "customer.delete",

  // Marketing
  MARKETING_READ: "marketing.read",
  MARKETING_CREATE: "marketing.create",
  MARKETING_UPDATE: "marketing.update",
  MARKETING_DELETE: "marketing.delete",

  // Warehouse
  WAREHOUSE_READ: "warehouse.read",
  WAREHOUSE_CREATE: "warehouse.create",
  WAREHOUSE_UPDATE: "warehouse.update",
  WAREHOUSE_DELETE: "warehouse.delete",

  // Combo
  COMBO_READ: "combo.read",
  COMBO_CREATE: "combo.create",
  COMBO_UPDATE: "combo.update",
  COMBO_DELETE: "combo.delete",

  // Facebook
  FACEBOOK_READ: "facebook.read",
  FACEBOOK_CREATE: "facebook.create",
  FACEBOOK_UPDATE: "facebook.update",
  FACEBOOK_DELETE: "facebook.delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
