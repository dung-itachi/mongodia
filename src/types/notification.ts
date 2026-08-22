/**
 * Types for the Notification system.
 *
 * Re-exports are intentionally kept thin — the NotificationItem shape used
 * by the dashboard activity widget (in `src/types/dashboard-activity.ts`)
 * is replaced by this richer shape that includes the per-user `read` flag.
 */

export type NotificationItemType = "info" | "success" | "warning" | "error";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationItemType;
  category: string;
  priority: string;
  link: string | null;
  senderId: string;
  senderName: string;
  createdAt: string;
  read: boolean;
  readAt: string | null;
};

export type NotificationPage = {
  items: NotificationItem[];
  /** Cursor for the next page; `null` when there are no more pages. */
  nextCursor: string | null;
};

export type UnreadCount = {
  count: number;
};

/**
 * Realtime events emitted by the SSE stream.
 *
 *  - `created`  — a new notification just landed; the UI should prepend it
 *    to the list, bump the badge, and (if the user is not on the
 *    notifications page) show a toast.
 *  - `snapshot` — the unread count has changed (e.g. after a mark-read
 *    on another tab). The UI should sync the badge from `unreadCount`.
 *  - `ping`     — heartbeat; ignored by the UI.
 */
export type NotificationRealtimeEvent =
  | { kind: "created"; notification: NotificationItem }
  | { kind: "snapshot"; unreadCount: number }
  | { kind: "ping"; ts: number };

export type NotificationListQuery = {
  cursor?: string | null;
  limit?: number;
  onlyUnread?: boolean;
  isActive?: boolean;
};

/**
 * Admin-facing shape — used by the management page.
 *
 * Mirrors the rich shape stored in MongoDB so admins can edit every
 * field (title / message / category / type / priority / pinned / link).
 */
export type NotificationAdminItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationItemType;
  category: string;
  priority: string;
  isPinned: boolean;
  isActive: boolean;
  link: string | null;
  senderId: string;
  senderName: string;
  recipientsCount: number;
  readCount: number;
  createdAt: string;
  updatedAt: string;
};

export type NotificationAdminPage = {
  items: NotificationAdminItem[];
  total: number;
};

export type NotificationAdminListQuery = {
  search?: string;
  category?: string;
  type?: string;
  isPinned?: boolean;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
};

export type CreateNotificationInput = {
  title: string;
  message: string;
  type?: NotificationItemType;
  category?: string;
  priority?: string;
  isPinned?: boolean;
  link?: string | null;
  recipientIds?: string[];
  teamIds?: string[];
  leaderIds?: string[];
  roleFilters?: string[];
  broadcast?: boolean;
};

export type UpdateNotificationInput = {
  title?: string;
  message?: string;
  type?: NotificationItemType;
  category?: string;
  priority?: string;
  isPinned?: boolean;
  isActive?: boolean;
  link?: string | null;
  recipientIds?: string[];
  teamIds?: string[];
  leaderIds?: string[];
  roleFilters?: string[];
  broadcast?: boolean;
};

/**
 * Recipient selection modes for notifications
 */
export type RecipientSelectionMode =
  | "broadcast"    // All employees
  | "individual"    // Specific employees
  | "team"          // Entire teams
  | "leader"        // Leader + all employees under them
  | "role";         // By role (SALE, MKT, WAREHOUSE)

export interface RecipientValue {
  mode: RecipientSelectionMode;
  recipientIds: string[];
  teamIds?: string[];
  leaderIds?: string[];
  roleFilters?: string[];
}
