export const PERMISSIONS = [
  // Dashboard
  {
    code: "dashboard.view",
    name: "View Dashboard",
  },

  // Employee
  {
    code: "employee.view",
    name: "View Employee",
  },
  {
    code: "employee.create",
    name: "Create Employee",
  },
  {
    code: "employee.update",
    name: "Update Employee",
  },
  {
    code: "employee.delete",
    name: "Delete Employee",
  },

  // Account management
  { code: "account.view", name: "View Accounts" },
  { code: "account.create", name: "Create Accounts" },
  { code: "account.update", name: "Update Accounts" },
  { code: "account.disable", name: "Disable Accounts" },
  { code: "account.resetPassword", name: "Reset Account Password" },
  { code: "account.manageAll", name: "Manage All Accounts" },
  { code: "self-account.view", name: "View My Account" },
  { code: "self-account.update", name: "Update My Account" },
  { code: "self-account.changePassword", name: "Change My Password" },

  // Department
{
  code: "department.view",
  name: "View Department",
},
{
  code: "department.create",
  name: "Create Department",
},
{
  code: "department.update",
  name: "Update Department",
},
{
  code: "department.delete",
  name: "Delete Department",
},

  // Team
  {
    code: "team.view",
    name: "View Team",
  },
  {
    code: "team.create",
    name: "Create Team",
  },
  {
    code: "team.update",
    name: "Update Team",
  },
  {
    code: "team.delete",
    name: "Delete Team",
  },

  // Role
  {
    code: "role.view",
    name: "View Role",
  },
  {
    code: "role.create",
    name: "Create Role",
  },
  {
    code: "role.update",
    name: "Update Role",
  },
  {
    code: "role.delete",
    name: "Delete Role",
  },

  // Phase 9 — Role-Permission Tree (RBAC management)
  // Lets the holder READ and WRITE the role↔permission mapping via
  // /api/roles/[id]/permissions and view the Permission Tree UI.
  // Intentionally NOT granted to MANAGER by default — only ADMIN can
  // change RBAC.
  {
    code: "role.permission.manage",
    name: "Manage Role Permissions",
  },


  // Area
{
  code: "area.view",
  name: "View Area",
},
{
  code: "area.create",
  name: "Create Area",
},
{
  code: "area.update",
  name: "Update Area",
},
{
  code: "area.delete",
  name: "Delete Area",
},

  // Product
  {
    code: "product.view",
    name: "View Product",
  },
  {
    code: "product.create",
    name: "Create Product",
  },
  {
    code: "product.update",
    name: "Update Product",
  },
  {
    code: "product.delete",
    name: "Delete Product",
  },

  // Category
{
  code: "category.view",
  name: "View Category",
},
{
  code: "category.create",
  name: "Create Category",
},
{
  code: "category.update",
  name: "Update Category",
},
{
  code: "category.delete",
  name: "Delete Category",
},

// Variant Option
{
  code: "variant-option.view",
  name: "View Variant Option",
},
{
  code: "variant-option.create",
  name: "Create Variant Option",
},
{
  code: "variant-option.update",
  name: "Update Variant Option",
},
{
  code: "variant-option.delete",
  name: "Delete Variant Option",
},

// Variant Value
{
  code: "variant-value.view",
  name: "View Variant Value",
},
{
  code: "variant-value.create",
  name: "Create Variant Value",
},
{
  code: "variant-value.update",
  name: "Update Variant Value",
},
{
  code: "variant-value.delete",
  name: "Delete Variant Value",
},

// Product Variant
{
  code: "product-variant.view",
  name: "View Product Variant",
},
{
  code: "product-variant.create",
  name: "Create Product Variant",
},
{
  code: "product-variant.update",
  name: "Update Product Variant",
},
{
  code: "product-variant.delete",
  name: "Delete Product Variant",
},

// Customer
{
  code: "customer.view",
  name: "View Customer",
},
{
  code: "customer.create",
  name: "Create Customer",
},
{
  code: "customer.update",
  name: "Update Customer",
},
{
  code: "customer.delete",
  name: "Delete Customer",
},

// Customer Activity
{
  code: "customer-activity.view",
  name: "View Customer Activity",
},
{
  code: "customer-activity.create",
  name: "Create Customer Activity",
},
{
  code: "customer-activity.update",
  name: "Update Customer Activity",
},
{
  code: "customer-activity.delete",
  name: "Delete Customer Activity",
},

// Supplier
{
  code: "supplier.view",
  name: "View Supplier",
},
{
  code: "supplier.create",
  name: "Create Supplier",
},
{
  code: "supplier.update",
  name: "Update Supplier",
},
{
  code: "supplier.delete",
  name: "Delete Supplier",
},

// Warehouse
{
  code: "warehouse.view",
  name: "View Warehouse",
},
{
  code: "warehouse.create",
  name: "Create Warehouse",
},
{
  code: "warehouse.update",
  name: "Update Warehouse",
},
{
  code: "warehouse.delete",
  name: "Delete Warehouse",
},

// Inventory
  {
    code: "inventory.view",
    name: "View Inventory",
  },
  { code: "warehouse.import", name: "Import Warehouse Stock" },
  { code: "warehouse.transfer", name: "Transfer Warehouse Stock" },
  { code: "warehouse.receive", name: "Receive Warehouse Transfer" },
  { code: "warehouse.adjust", name: "Adjust Warehouse Stock" },
  { code: "warehouse.ship", name: "Ship Order From Warehouse" },
  { code: "warehouse.return", name: "Return Order To Warehouse" },

// Inventory Adjustment
{
  code: "inventory-adjustment.view",
  name: "View Inventory Adjustment",
},
{
  code: "inventory-adjustment.create",
  name: "Create Inventory Adjustment",
},

  // Order
  {
    code: "order.view",
    name: "View Order",
  },
  {
    code: "order.create",
    name: "Create Order",
  },
  {
    code: "order.update",
    name: "Update Order",
  },
  {
    code: "order.delete",
    name: "Delete Order",
  },
  {
    code: "order.confirm",
    name: "Confirm Order",
  },
  {
    code: "order.cancel",
    name: "Cancel Order",
  },
  {
    code: "order.history",
    name: "View Order History",
  },
  {
    code: "order.revenue",
    name: "View Order Revenue",
  },
  {
    code: "order.reserve_stock",
    name: "Reserve Stock For Order",
  },

// Facebook Page
{
  code: "facebook-page.view",
  name: "View Facebook Page",
},
{
  code: "facebook-page.create",
  name: "Create Facebook Page",
},
{
  code: "facebook-page.update",
  name: "Update Facebook Page",
},
{
  code: "facebook-page.delete",
  name: "Delete Facebook Page",
},

// Facebook Page Assignment
{
  code: "facebook-page-assignment.view",
  name: "View Facebook Page Assignment",
},
{
  code: "facebook-page-assignment.create",
  name: "Create Facebook Page Assignment",
},
{
  code: "facebook-page-assignment.update",
  name: "Update Facebook Page Assignment",
},
{
  code: "facebook-page-assignment.delete",
  name: "Delete Facebook Page Assignment",
},

// Combo
{
  code: "combo.view",
  name: "View Combo",
},
{
  code: "combo.create",
  name: "Create Combo",
},
{
  code: "combo.update",
  name: "Update Combo",
},
{
  code: "combo.delete",
  name: "Delete Combo",
},

// Gift
{
  code: "gift.view",
  name: "View Gift",
},
{
  code: "gift.create",
  name: "Create Gift",
},
{
  code: "gift.update",
  name: "Update Gift",
},
{
  code: "gift.delete",
  name: "Delete Gift",
},

// Lead
{
  code: "lead.view",
  name: "View Lead",
},
{
  code: "lead.create",
  name: "Create Lead",
},
{
  code: "lead.update",
  name: "Update Lead",
},
{
  code: "lead.delete",
  name: "Delete Lead",
},
{
  code: "lead.assign",
  name: "Assign Lead",
},

// Marketing Expense
{
  code: "marketing-expense.view",
  name: "View Marketing Expense",
},
{
  code: "marketing-expense.create",
  name: "Create Marketing Expense",
},
{
  code: "marketing-expense.update",
  name: "Update Marketing Expense",
},
{
  code: "marketing-expense.delete",
  name: "Delete Marketing Expense",
},
{
  code: "marketing-expense.lock",
  name: "Lock Marketing Expense",
},
{
  code: "marketing-expense.reopen",
  name: "Reopen Marketing Expense",
},

// Sales Dashboard
{
  code: "sales.dashboard.view",
  name: "View Sales Dashboard",
},

// Sales KPI
{
  code: "sales.kpi.view",
  name: "View Sales KPI",
},
{
  code: "sales.kpi.update",
  name: "Update Sales KPI Target",
},

// Report
  {
    code: "report.view",
    name: "View Report",
  },

  // Sprint Settings — Exchange Rate
  {
    code: "settings.exchange_rate.view",
    name: "View Exchange Rate",
  },
  {
    code: "settings.exchange_rate.update",
    name: "Update Exchange Rate",
  },

  // Sprint Settings — Shipping Fee
  {
    code: "settings.shipping_fee.view",
    name: "View Shipping Fee",
  },
  {
    code: "settings.shipping_fee.update",
    name: "Update Shipping Fee",
  },

  // System Settings — Module-level gate (Phase 8 — Permission Audit)
  // `system-settings.view` is required to open the Cài đặt hệ thống module
  //   (covers both /settings/exchange-rate and /settings/shipping-fee).
  // `system-settings.manage` is required to mutate any setting (PUT).
  // Users who only have `system-settings.view` can browse but not edit.
  {
    code: "system-settings.view",
    name: "View System Settings",
  },
  {
    code: "system-settings.manage",
    name: "Manage System Settings",
  },

  // Notification
  {
    code: "notification.view",
    name: "View Notifications",
  },
  {
    code: "notification.read",
    name: "Mark Notification as Read",
  },
  {
    code: "notification.readAll",
    name: "Mark All Notifications as Read",
  },
  {
    code: "notification.manage",
    name: "Manage Notifications",
  },

  // Language Settings
  {
    code: "settings.language.view",
    name: "View Language Settings",
  },
  {
    code: "settings.language.update",
    name: "Update Language Settings",
  },
];