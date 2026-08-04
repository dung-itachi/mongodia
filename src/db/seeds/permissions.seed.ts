import Permission from "@/models/Permission";
import { PERMISSIONS } from "@/constants/permissions";

const MODULE_MAP: Record<string, string> = {
  "dashboard.view": "Dashboard",

  "employee.view": "Employee",
  "employee.create": "Employee",
  "employee.update": "Employee",
  "employee.delete": "Employee",

  "department.view": "Department",
  "department.create": "Department",
  "department.update": "Department",
  "department.delete": "Department",

  "team.view": "Team",
  "team.create": "Team",
  "team.update": "Team",
  "team.delete": "Team",

  "role.view": "Role",
  "role.create": "Role",
  "role.update": "Role",
  "role.delete": "Role",

  "area.view": "Area",
  "area.create": "Area",
  "area.update": "Area",
  "area.delete": "Area",

  "product.view": "Product",
  "product.create": "Product",
  "product.update": "Product",
  "product.delete": "Product",

  "category.view": "Category",
  "category.create": "Category",
  "category.update": "Category",
  "category.delete": "Category",

  "variant-option.view": "VariantOption",
  "variant-option.create": "VariantOption",
  "variant-option.update": "VariantOption",
  "variant-option.delete": "VariantOption",

  "variant-value.view": "VariantValue",
  "variant-value.create": "VariantValue",
  "variant-value.update": "VariantValue",
  "variant-value.delete": "VariantValue",

  "product-variant.view": "ProductVariant",
  "product-variant.create": "ProductVariant",
  "product-variant.update": "ProductVariant",
  "product-variant.delete": "ProductVariant",

  "customer.view": "Customer",
  "customer.create": "Customer",
  "customer.update": "Customer",
  "customer.delete": "Customer",

  "supplier.view": "Supplier",
  "supplier.create": "Supplier",
  "supplier.update": "Supplier",
  "supplier.delete": "Supplier",

  "warehouse.view": "Warehouse",
  "warehouse.create": "Warehouse",
  "warehouse.update": "Warehouse",
  "warehouse.delete": "Warehouse",

  "inventory.view": "Inventory",
  "inventory-adjustment.view": "InventoryAdjustment",
  "inventory-adjustment.create": "InventoryAdjustment",

  "order.view": "Order",
  "order.create": "Order",
  "order.update": "Order",
  "order.delete": "Order",
  "order.confirm": "Order",
  "order.cancel": "Order",
  "order.history": "Order",
  "order.revenue": "Order",
  "order.reserve_stock": "Order",

  "facebook-page.view": "FacebookPage",
  "facebook-page.create": "FacebookPage",
  "facebook-page.update": "FacebookPage",
  "facebook-page.delete": "FacebookPage",

  "facebook-page-assignment.view": "FacebookPageAssignment",
  "facebook-page-assignment.create": "FacebookPageAssignment",
  "facebook-page-assignment.update": "FacebookPageAssignment",
  "facebook-page-assignment.delete": "FacebookPageAssignment",

  "combo.view": "Combo",
  "combo.create": "Combo",
  "combo.update": "Combo",
  "combo.delete": "Combo",

  "lead.view": "Lead",
  "lead.create": "Lead",
  "lead.update": "Lead",
  "lead.delete": "Lead",
  "lead.assign": "Lead",

  "marketing-expense.view": "MarketingExpense",
  "marketing-expense.create": "MarketingExpense",
  "marketing-expense.update": "MarketingExpense",
  "marketing-expense.delete": "MarketingExpense",
  "marketing-expense.submit": "MarketingExpense",
  "marketing-expense.approve": "MarketingExpense",
  "marketing-expense.lock": "MarketingExpense",
  "marketing-expense.reject": "MarketingExpense",
  "marketing-expense.reopen": "MarketingExpense",

  "report.view": "Report",
};

export async function seedPermissions() {
  for (const permission of PERMISSIONS) {
    const module = MODULE_MAP[permission.code] ?? "General";

    await Permission.updateOne(
      { code: permission.code },
      {
        $set: {
          code: permission.code,
          name: permission.name,
          module,
          description: "",
          isActive: true,
        },
      },
      { upsert: true }
    );
  }

  console.log("[OK] Permissions");
}
