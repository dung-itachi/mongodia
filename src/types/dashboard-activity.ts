/**
 * Dashboard Activity Types (Sprint 4.3 - Dashboard Activity & Quick Actions)
 *
 * Type definitions for recent activities and quick actions.
 */

export type RecentOrder = {
  /** Order ID */
  id: string;
  /** Order code (e.g. "DH-2026-001") */
  code: string;
  /** Customer name */
  customer: string;
  /** Order status (e.g. "PENDING", "SHIPPING", "DELIVERED") */
  status: string;
  /** Order total amount */
  total: number;
  /** Order creation timestamp (ISO string) */
  createdAt: string;
};

export type RecentLead = {
  /** Lead ID */
  id: string;
  /** Lead name */
  name: string;
  /** Lead source (e.g. "Facebook", "TikTok") */
  source: string;
  /** Assigned sales person */
  sale: string;
  /** Lead status (e.g. "NEW", "CONTACTED", "CLOSED") */
  status: string;
  /** Lead creation timestamp (ISO string) */
  createdAt: string;
};

export type RecentInventory = {
  /** Inventory adjustment ID */
  id: string;
  /** Product name */
  product: string;
  /** Adjustment type: "IN" or "OUT" */
  type: "IN" | "OUT";
  /** Quantity changed */
  quantity: number;
  /** Adjustment timestamp (ISO string) */
  createdAt: string;
};

export type NotificationItem = {
  /** Notification ID */
  id: string;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Notification type for icon/color */
  type: "info" | "success" | "warning" | "error";
  /** Notification timestamp (ISO string) */
  createdAt: string;
};

export type DashboardActivityData = {
  recentOrders: RecentOrder[];
  recentLeads: RecentLead[];
  recentInventory: RecentInventory[];
  notifications: NotificationItem[];
};

export type DashboardActivityApiResponse = {
  success: boolean;
  data: DashboardActivityData;
  message?: string;
};

export type QuickAction = {
  /** Quick action ID */
  id: string;
  /** Action label (e.g. "Lead", "Đơn hàng") */
  label: string;
  /** Action icon name (Ant Design icon name) */
  icon: string;
  /** Action color (e.g. "blue", "purple") */
  color: string;
  /** Target route path (UI only for now) */
  route: string;
};

export type DashboardQuickActionsApiResponse = {
  success: boolean;
  data: QuickAction[];
  message?: string;
};