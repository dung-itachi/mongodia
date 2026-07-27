export const ROLES = [
  {
    code: "ADMIN",
    name: "Administrator",
    permissions: ["*"],
  },

  {
    code: "MANAGER",
    name: "Manager",
    permissions: [
      "dashboard.view",

      "employee.view",
      "employee.create",
      "employee.update",

      "team.view",

      "category.view",
      "category.create",
      "category.update",

      "product.view",
      "product.create",
      "product.update",

      "variant-option.view",
      "variant-option.create",
      "variant-option.update",

      "variant-value.view",
      "variant-value.create",
      "variant-value.update",

      "product-variant.view",
      "product-variant.create",
      "product-variant.update",

      "customer.view",
      "customer.create",
      "customer.update",

      "supplier.view",
      "supplier.create",
      "supplier.update",

      "warehouse.view",
      "warehouse.create",
      "warehouse.update",

      "inventory.view",

      "order.view",
      "order.create",
      "order.update",

      "report.view",
    ],
  },

  {
    code: "LEADER",
    name: "Leader",
    permissions: [
      "dashboard.view",

      "employee.view",

      "team.view",
      "category.view",

      "product.view",

"variant-option.view",

      "variant-value.view",
      "product-variant.view",

      "customer.view",

      "supplier.view",

      "warehouse.view",

      "inventory.view",
      "inventory-adjustment.view",
      "inventory-adjustment.create",

      "order.view",
      "order.create",
      "order.update",

      "report.view",
    ],
  },

  {
    code: "EMPLOYEE",
    name: "Employee",
    permissions: [
      "dashboard.view",

      "product.view",

      "inventory.view",
      "inventory-adjustment.view",
      "inventory-adjustment.create",

      "order.view",
      "order.create",
    ],
  },
];