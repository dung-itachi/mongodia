/**
 * ==================================================
 * ROLES & PERMISSION ASSIGNMENTS
 * ==================================================
 *
 * Mỗi role gồm:
 *   - `code`           : mã định danh (lưu DB + dùng trong code).
 *   - `name`           : tên hiển thị.
 *   - `permissions`    : danh sách permission code thuộc role.
 *   - `visibleGroups`  : danh sách NavGroupKey (từ modules.ts) mà role
 *                        ĐƯỢC PHÉP nhìn thấy trên sidebar (Sprint 8.6).
 *                        Admin thấy tất cả; các role khác chỉ thấy đúng
 *                        phần nghiệp vụ của mình.
 *
 * Nguyên tắc:
 *   - KHÔNG hardcode role trong middleware / route — chỉ check permission.
 *   - ADMIN dùng wildcard "*" (bypass toàn bộ check).
 *   - Permission định nghĩa ở `src/constants/permissions.ts` — đây là source
 *     of truth duy nhất cho permission code.
 *
 * Nghiệp vụ phân quyền (theo .theme/report.md):
 *   - MKT   → chỉ thấy MKT và Sản phẩm (bao gồm các item bên trong chúng)
 *   - SALE  → chỉ thấy Sale và Đơn hàng (bao gồm các item bên trong chúng)
 *   - KHO   → chỉ thấy Đơn hàng và Kho (bao gồm các item bên trong chúng)
 *   - LEADER các phần này → thấy thành viên mà leader quản lý (scope)
 * ==================================================
 */

export const ROLES = [
  {
    code: "ADMIN",
    name: "Administrator",
    permissions: ["*"],
    // Admin thấy tất cả groups; Sidebar sẽ bỏ qua filter nếu role = admin
    visibleGroups: [
      "DASHBOARD",
      "MKT",
      "SALE",
      "CUSTOMERS",
      "ORDERS",
      "PRODUCTS",
      "ACCOUNTS",
      "WAREHOUSE",
      "SETTINGS",
    ],
  },

  /**
   * MANAGER — quản lý cấp phòng ban.
   * Có quyền rộng; hiển thị đầy đủ group nghiệp vụ.
   */
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

      "campaign.view",
      "campaign.create",
      "campaign.update",

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

      // ---- Settings (Shipping Fee) ------------------------------------
      "settings.shipping_fee.view",
      "settings.shipping_fee.update",

      // ---- System Settings (module-level gate) ---------------------------
      // `system-settings.view` opens the module; `system-settings.manage`
      // covers all mutations in the module (Phase 8 — Permission Audit).
      "system-settings.view",
      "system-settings.manage",

      // ---- Notification (Phase 10) ---------------------------------------
      // Manager vận hành hệ thống; cần đọc và xử lý notification về
      // cảnh báo tồn kho, đơn hàng, vận chuyển. Manager cũng có quyền
      // quản lý (CRUD) thông báo hệ thống thông qua /settings/notifications.
      "notification.view",
      "notification.read",
      "notification.readAll",
      "notification.manage",
    ],
    visibleGroups: [
      "DASHBOARD",
      "MKT",
      "SALE",
      "CUSTOMERS",
      "ORDERS",
      "PRODUCTS",
      "ACCOUNTS",
      "WAREHOUSE",
      "SETTINGS",
    ],
  },

  /**
   * SALE — nhân viên kinh doanh.
   * Theo nghiệp vụ (report.md):
   *   - Được: Nhận Lead, Gọi điện, Ghi lịch sử gọi, Chỉnh đơn, Chốt đơn,
   *           Xác nhận, Đi hàng, Hoàn.
   *   - KHÔNG được: Tạo sản phẩm.
   *
   * Sidebar chỉ hiển thị: Dashboard, Sale, Đơn hàng.
   * Tuy nhiên Sale cần xem Sản phẩm/Combo để chọn cho khách → show PRODUCTS.
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

      // Sale cần xem sản phẩm/combo để chọn cho khách
      "product.view",
      "product-variant.view",
      "combo.view",

      // ---- Gift (Sale cần xem để chọn quà cho khách) ----------------
      "gift.view",

      // ---- Order (xem + chỉnh sửa đơn của mình + chốt) -----------
      "order.view",
      "order.create",
      "order.update",
      "order.history",

      // ---- Lead (nhận + cập nhật) -----------------------------------
      "lead.view",

      "report.view",

      // ---- Notification (Phase 10) ---------------------------------------
      // Mọi nhân viên đều cần đọc thông báo.
      "notification.view",
      "notification.read",
      "notification.readAll",
    ],
    visibleGroups: [
      "DASHBOARD",
      "SALE",
      "CUSTOMERS",
      "ORDERS",
      "PRODUCTS",
    ],
  },

  /**
   * WAREHOUSE — nhân viên kho.
   * Theo nghiệp vụ (report.md):
   *   - Lấy sản phẩm từ Module Sản phẩm (chỉ quản lý nhập/xuất, không tạo SP mới).
   *   - Quản lý nhập kho, chuyển kho, xuất kho.
   *
   * Sidebar chỉ hiển thị: Dashboard, Đơn hàng, Kho.
   * (Kho cần PRODUCTS để xem sản phẩm)
   */
  {
    code: "WAREHOUSE",
    name: "Warehouse",
    permissions: [
      "dashboard.view",

      // ---- Kho operations ----------------------------------------------
      "warehouse.view",
      "warehouse.import",
      "warehouse.transfer",
      "warehouse.receive",
      "warehouse.ship",
      "warehouse.return",
      "warehouse.adjust",
      "inventory.view",
      "inventory-adjustment.view",
      "inventory-adjustment.create",

      // Kho cần xem sản phẩm (không tạo/sửa)
      "product.view",
      "product-variant.view",

      // ---- Gift (Kho cần xem để xử lý xuất quà) -------------------
      "gift.view",

      "self-account.view",
      "self-account.update",
      "self-account.changePassword",

      // ---- Order (xem để biết cần xuất kho cho đơn nào) ----------
      "order.view",
      "order.reserve_stock",
      "order.history",

      // ---- Notification (Phase 10) ---------------------------------------
      "notification.view",
      "notification.read",
      "notification.readAll",
    ],
    visibleGroups: [
      "DASHBOARD",
      "ORDERS",
      "WAREHOUSE",
      "PRODUCTS",
    ],
  },

  /**
   * LEADER — trưởng nhóm.
   * Theo nghiệp vụ (report.md):
   *   - Thấy các thành viên mà leader quản lý (scope theo team MKT/SALE/WAREHOUSE).
   *   - Có quyền rộng trong phần mình quản lý + Marketing Expense.
   *   - Sidebar phụ thuộc vào team leader (MKT/SALE/KHO) → sẽ resolve động
   *     trong Sidebar dựa trên Employee.teamId.code.
   */
  {
    code: "LEADER",
    name: "Leader",
    permissions: [
      "dashboard.view",

      "self-account.view",
      "self-account.update",
      "self-account.changePassword",

      // Leader quản lý nhân viên thuộc team mình quản lý
      "employee.view",
      "account.view",
      "account.create",
      "account.update",
      "account.disable",
      "account.resetPassword",

      "team.view",

      "category.view",

      // Leader xem được sản phẩm/combo (scope team mình quản lý)
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

      "campaign.view",

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

      // ---- Notification (Phase 10) ---------------------------------------
      "notification.view",
      "notification.read",
      "notification.readAll",
    ],
    // LEADER có visibleGroups phụ thuộc vào team.code (MKT/SALE/WAREHOUSE);
    // sidebar sẽ resolve động bằng cách tra Employee.teamId.code.
    visibleGroups: [], // computed dynamically
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

      // ---- Notification (Phase 10) ---------------------------------------
      "notification.view",
      "notification.read",
      "notification.readAll",
    ],
    visibleGroups: [
      "DASHBOARD",
      "ORDERS",
      "PRODUCTS",
    ],
  },

  /**
   * MKT — Marketing.
   * Theo nghiệp vụ (report.md):
   *   - Được: Quản lý sản phẩm, Tạo Combo, Nhập Lead, Phân loại Lead,
   *           Gửi Sale, Theo dõi trạng thái đơn của mình.
   *   - KHÔNG được: Gọi khách.
   *
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

      "campaign.view",
      "campaign.create",
      "campaign.update",

      "customer.view",
      "customer.create",
      "customer.update",

      // MKT quản lý sản phẩm + tạo Combo
      "product.view",
      "product.create",
      "product.update",
      "product.delete",

      "category.view",
      "category.create",
      "category.update",

      "variant-option.view",
      "variant-option.create",
      "variant-option.update",

      "variant-value.view",
      "variant-value.create",
      "variant-value.update",

      "product-variant.view",
      "product-variant.create",
      "product-variant.update",

      "combo.view",
      "combo.create",
      "combo.update",
      "combo.delete",

      // ---- Gift (MKT cần xem quà) ----------------------------------
      "gift.view",

      // MKT nhập lead + phân loại + gửi sale
      "lead.view",
      "lead.create",
      "lead.update",
      "lead.assign",

      // ---- Order (chỉ xem đơn của mình) ----------------------------
      "order.view",

      // ---- Marketing Expense (Workflow Simplification) --------------------
      // Marketing tự lock khi hoàn thành báo cáo ngày.
      "marketing-expense.view",
      "marketing-expense.create",
      "marketing-expense.update",
      "marketing-expense.delete",
      "marketing-expense.lock",

      "report.view",

      // ---- Notification (Phase 10) ---------------------------------------
      "notification.view",
      "notification.read",
      "notification.readAll",
    ],
    visibleGroups: [
      "DASHBOARD",
      "MKT",
      "PRODUCTS",
    ],
  },
];