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

      "order.view",
      "order.create",
    ],
  },
];