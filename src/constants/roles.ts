/**
 * ==================================================
 * ROLES & PERMISSION ASSIGNMENTS
 * ==================================================
 *
 * Mỗi role gồm:
 *   - `code`           : mã định danh (lưu DB + dùng trong code).
 *   - `name`           : tên hiển thị.
 *   - `permissions`    : danh sách permission code thuộc role.
 *
 * Nguyên tắc:
 *   - KHÔNG hardcode role trong middleware / route — chỉ check permission.
 *   - ADMIN dùng wildcard "*" (bypass toàn bộ check).
 *   - Permission định nghĩa ở `src/constants/permissions.ts` — đây là source
 *     of truth duy nhất cho permission code.
 *
 * Phase 5.1 (Order Permissions):
 *   - Order giờ có 9 permission: view / create / update / delete / confirm /
 *     cancel / history / revenue / reserve_stock.
 *   - Phân quyền theo nghiệp vụ:
 *       ADMIN       → Full (wildcard).
 *       MANAGER     → Toàn bộ Order.
 *       SALE        → view / create / update / history (chốt + sửa đơn của mình).
 *       MKT         → chỉ view (xem đơn phát sinh từ Lead).
 *       WAREHOUSE   → view / reserve_stock (giữ / trả chỗ kho cho đơn).
 *       LEADER      → view / create / update (giữ tương thích với role cũ).
 *       EMPLOYEE    → view (giữ tương thích — chỉ xem).
 * ==================================================
 */

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

      "self-account.view",
      "self-account.update",
      "self-account.changePassword",

      "employee.view",
      "employee.create",
      "employee.update",

      "account.view",
      "account.create",
      "account.update",
      "account.disable",
      "account.resetPassword",

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
      "warehouse.import",
      "warehouse.transfer",
      "warehouse.receive",
      "warehouse.adjust",
      "warehouse.ship",
      "warehouse.return",

      "inventory.view",

      // ---- Order (Full) --------------------------------------------
      "order.view",
      "order.create",
      "order.update",
      "order.delete",
      "order.confirm",
      "order.cancel",
      "order.history",
      "order.revenue",
      "order.reserve_stock",

      "facebook-page.view",
      "facebook-page.create",
      "facebook-page.update",

      "facebook-page-assignment.view",
      "facebook-page-assignment.create",
      "facebook-page-assignment.update",

      "combo.view",
      "combo.create",
      "combo.update",

      // ---- Gift (Sprint 8.x) -----------------------------------------
      "gift.view",
      "gift.create",
      "gift.update",
      "gift.delete",

      "lead.view",
      "lead.create",
      "lead.update",
      "lead.assign",

      // ---- Marketing Expense (Workflow Simplification) -----------------
      "marketing-expense.view",
      "marketing-expense.create",
      "marketing-expense.update",
      "marketing-expense.delete",
      "marketing-expense.lock",
      "marketing-expense.reopen",

      // ---- Sales KPI ---------------------------------------------
      "sales.kpi.view",
      "sales.kpi.update",

      "report.view",

      // ---- Settings (Exchange Rate) ------------------------------------
      "settings.exchange_rate.view",
      "settings.exchange_rate.update",
    ],
  },

  /**
   * SALE — nhân viên kinh doanh.
   * Chốt đơn, sửa đơn, xem timeline. KHÔNG xóa đơn, KHÔNG reserve/release
   * kho (do WAREHOUSE phụ trách), KHÔNG xem revenue detail.
   */
  {
    code: "SALE",
    name: "Sales",
    permissions: [
      "dashboard.view",

      // ---- Sales Dashboard ----------------------------------------------
      "sales.dashboard.view",

      // ---- Sales KPI ---------------------------------------------
      "sales.kpi.view",

      "customer.view",
      "customer.create",
      "customer.update",

      // ---- Customer Activity (Timeline) -----------------------------------
      "customer-activity.view",
      "customer-activity.create",
      "customer-activity.update",
      "customer-activity.delete",

      "self-account.view",
      "self-account.update",
      "self-account.changePassword",

      "product.view",
      "product-variant.view",
      "combo.view",

      // ---- Gift (Sale cần xem để chọn quà cho khách) ----------------
      "gift.view",

      // ---- Order --------------------------------------------------
      "order.view",
      "order.create",
      "order.update",
      "order.history",

      "lead.view",

      "report.view",
    ],
  },

  /**
   * WAREHOUSE — nhân viên kho.
   * Xem đơn để biết cần giữ / trả chỗ kho cho đơn nào.
   * KHÔNG sửa thông tin đơn, KHÔNG xóa đơn.
   */
  {
    code: "WAREHOUSE",
    name: "Warehouse",
    permissions: [
      "dashboard.view",

      "warehouse.view",
      "warehouse.import",
      "warehouse.transfer",
      "warehouse.receive",
      "warehouse.ship",
      "warehouse.return",
      "inventory.view",
      "inventory-adjustment.view",

      "product.view",
      "product-variant.view",

      // ---- Gift (Kho cần xem để xử lý xuất quà) -------------------
      "gift.view",

      "self-account.view",
      "self-account.update",
      "self-account.changePassword",

      // ---- Order --------------------------------------------------
      "order.view",
      "order.reserve_stock",
      "order.history",
    ],
  },

  /**
   * LEADER — giữ tương thích với role cũ (Phase trước). Có thêm
   * `order.confirm` / `order.cancel` so với SALE.
   */
  {
    code: "LEADER",
    name: "Leader",
    permissions: [
      "dashboard.view",

      "self-account.view",
      "self-account.update",
      "self-account.changePassword",

      "employee.view",
      "account.view",
      "account.create",
      "account.update",
      "account.disable",
      "account.resetPassword",

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

      // ---- Order --------------------------------------------------
      "order.view",
      "order.create",
      "order.update",
      "order.confirm",
      "order.cancel",
      "order.history",

      "facebook-page.view",

      "facebook-page-assignment.view",

      "combo.view",

      // ---- Gift (Leader cần xem quà) -------------------------------
      "gift.view",

      "lead.view",
      "lead.assign",

      // ---- Marketing Expense (Workflow Simplification) --------------------
      // Marketing tự lock khi hoàn thành báo cáo ngày.
      "marketing-expense.view",
      "marketing-expense.create",
      "marketing-expense.update",
      "marketing-expense.delete",
      "marketing-expense.lock",

      "report.view",
    ],
  },

  /**
   * EMPLOYEE — nhân viên cơ bản. Chỉ xem Order + tạo mới.
   */
  {
    code: "EMPLOYEE",
    name: "Employee",
    permissions: [
      "dashboard.view",

      "self-account.view",
      "self-account.update",
      "self-account.changePassword",

      "product.view",

      "inventory.view",
      "inventory-adjustment.view",
      "inventory-adjustment.create",

      // ---- Order --------------------------------------------------
      "order.view",
      "order.create",

      "combo.view",

      // ---- Gift (Employee cần xem quà) -----------------------------
      "gift.view",

      "lead.view",
    ],
  },

  /**
   * MKT — Marketing.
   * Workflow Simplification (Aug 2026):
   *   - view / create / update / delete: làm việc với report của chính mình
   *     (kiểm tra ownership trong Service/Repository, không phải ở đây).
   *   - lock: tự khóa báo cáo khi hoàn thành.
   */
  {
    code: "MKT",
    name: "Marketing",
    permissions: [
      "dashboard.view",

      "self-account.view",
      "self-account.update",
      "self-account.changePassword",

      "facebook-page.view",
      "facebook-page.create",
      "facebook-page.update",

      "facebook-page-assignment.view",
      "facebook-page-assignment.create",
      "facebook-page-assignment.update",

      "customer.view",
      "customer.create",
      "customer.update",

      "product.view",

      "combo.view",
      "combo.create",
      "combo.update",

      // ---- Gift (MKT cần xem quà) ----------------------------------
      "gift.view",

      "lead.view",
      "lead.create",
      "lead.update",
      "lead.assign",

      // ---- Order (chỉ xem) ---------------------------------------
      "order.view",

      // ---- Marketing Expense (Workflow Simplification) --------------------
      // Marketing tự lock khi hoàn thành báo cáo ngày.
      "marketing-expense.view",
      "marketing-expense.create",
      "marketing-expense.update",
      "marketing-expense.delete",
      "marketing-expense.lock",

      "report.view",
    ],
  },
];