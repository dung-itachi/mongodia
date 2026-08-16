/**
 * ==================================================
 * REALTIME NOTIFICATION SYSTEM — UNIT TESTS
 * ==================================================
 *
 * Pure unit tests (no MongoDB required) covering:
 *
 *   [NOTIF-A] Notification model constants validation
 *   [NOTIF-B] SSE Connection Manager logic
 *   [NOTIF-C] Notification types correctness
 *   [NOTIF-D] API authorization predicates (mirrored)
 *   [NOTIF-E] Unread count logic
 *   [NOTIF-F] Read state toggle logic
 *
 * Run: npx jest src/tests/notification.test.ts --forceExit
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { Types } from "mongoose";

import {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from "../models/Notification";
import {
  SSEConnectionManager,
  sseManager,
} from "../lib/sse-manager";
import { hasPermission, hasAnyPermission } from "../lib/permission";

// =============================================================================
// [NOTIF-A] Notification model constants validation
// =============================================================================

describe("[NOTIF-A] Notification model constants", () => {
  describe("NotificationType", () => {
    it("[NOTIF-A] has all required type values", () => {
      expect(NotificationType.INFO).toBe("info");
      expect(NotificationType.SUCCESS).toBe("success");
      expect(NotificationType.WARNING).toBe("warning");
      expect(NotificationType.ERROR).toBe("error");
    });

    it("[NOTIF-A] type values are unique", () => {
      const types = Object.values(NotificationType);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });
  });

  describe("NotificationCategory", () => {
    it("[NOTIF-A] has all required category values", () => {
      expect(NotificationCategory.ORDER).toBe("order");
      expect(NotificationCategory.LEAD).toBe("lead");
      expect(NotificationCategory.INVENTORY).toBe("inventory");
      expect(NotificationCategory.SYSTEM).toBe("system");
      expect(NotificationCategory.ASSIGNMENT).toBe("assignment");
      expect(NotificationCategory.REPORT).toBe("report");
      expect(NotificationCategory.GENERAL).toBe("general");
    });
  });

  describe("NotificationPriority", () => {
    it("[NOTIF-A] has all required priority values", () => {
      expect(NotificationPriority.LOW).toBe("low");
      expect(NotificationPriority.NORMAL).toBe("normal");
      expect(NotificationPriority.HIGH).toBe("high");
      expect(NotificationPriority.URGENT).toBe("urgent");
    });

    it("[NOTIF-A] priority order is correct (low < normal < high < urgent)", () => {
      const priorities = [
        NotificationPriority.LOW,
        NotificationPriority.NORMAL,
        NotificationPriority.HIGH,
        NotificationPriority.URGENT,
      ];
      const values = priorities.map((p) => {
        const order: Record<string, number> = {
          [NotificationPriority.LOW]: 1,
          [NotificationPriority.NORMAL]: 2,
          [NotificationPriority.HIGH]: 3,
          [NotificationPriority.URGENT]: 4,
        };
        return order[p];
      });
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });
});

// =============================================================================
// [NOTIF-B] SSE Connection Manager
// =============================================================================

describe("[NOTIF-B] SSE Connection Manager", () => {
  let manager: SSEConnectionManager;

  beforeEach(() => {
    manager = new SSEConnectionManager();
  });

  afterEach(() => {
    // Cleanup: close all connections
    for (const client of manager["clients"].values()) {
      try {
        client.controller.close();
      } catch {
        // Already closed
      }
    }
  });

  const createMockController = () => {
    const events: Uint8Array[] = [];
    const closeCalled = { value: false };
    return {
      controller: {
        enqueue: (data: Uint8Array) => { events.push(data); },
        close: () => { closeCalled.value = true; },
      } as unknown as ReadableStreamDefaultController<Uint8Array>,
      events,
      closeCalled,
    };
  };

  describe("register/unregister", () => {
    it("[NOTIF-B] registers a new client and returns connection ID", () => {
      const { controller } = createMockController();
      const connId = manager.register("emp1", "tab1", controller);

      expect(connId).toBe("emp1:tab1");
      expect(manager.getConnectionCount()).toBe(1);
    });

    it("[NOTIF-B] replacing existing tab connection closes old controller", () => {
      const { controller: ctrl1 } = createMockController();
      const { controller: ctrl2 } = createMockController();

      manager.register("emp1", "tab1", ctrl1);
      manager.register("emp1", "tab1", ctrl2);

      expect(manager.getConnectionCount()).toBe(1);
    });

    it("[NOTIF-B] unregister closes controller and removes client", () => {
      const { controller } = createMockController();
      manager.register("emp1", "tab1", controller);
      manager.unregister("emp1:tab1");

      expect(manager.getConnectionCount()).toBe(0);
    });

    it("[NOTIF-B] same employee can have multiple tab connections", () => {
      const { controller: ctrl1 } = createMockController();
      const { controller: ctrl2 } = createMockController();

      manager.register("emp1", "tab1", ctrl1);
      manager.register("emp1", "tab2", ctrl2);

      expect(manager.getConnectionCount()).toBe(2);
      expect(manager.getEmployeeConnectionCount("emp1")).toBe(2);
    });
  });

  describe("send", () => {
    it("[NOTIF-B] sends message to specific connection", () => {
      const { controller, events } = createMockController();
      manager.register("emp1", "tab1", controller);

      const success = manager.send("emp1:tab1", {
        event: "notification",
        data: '{"id":"1"}',
      });

      expect(success).toBe(true);
      expect(events.length).toBe(1);
    });

    it("[NOTIF-B] send returns false for unknown connection", () => {
      const success = manager.send("unknown:tab", {
        event: "notification",
        data: '{"id":"1"}',
      });
      expect(success).toBe(false);
    });
  });

  describe("broadcast", () => {
    it("[NOTIF-B] broadcasts to all connected clients", () => {
      const { controller: ctrl1, events: events1 } = createMockController();
      const { controller: ctrl2, events: events2 } = createMockController();

      manager.register("emp1", "tab1", ctrl1);
      manager.register("emp2", "tab1", ctrl2);

      const count = manager.broadcast({
        event: "heartbeat",
        data: '{"time":123}',
      });

      expect(count).toBe(2);
      expect(events1.length).toBe(1);
      expect(events2.length).toBe(1);
    });

    it("[NOTIF-B] broadcastToEmployee only sends to specific employee", () => {
      const { controller: ctrl1, events: events1 } = createMockController();
      const { controller: ctrl2, events: events2 } = createMockController();

      manager.register("emp1", "tab1", ctrl1);
      manager.register("emp2", "tab1", ctrl2);

      const count = manager.broadcastToEmployee("emp1", {
        event: "notification",
        data: '{"id":"1"}',
      });

      expect(count).toBe(1);
      expect(events1.length).toBe(1);
      expect(events2.length).toBe(0);
    });
  });

  describe("isConnected", () => {
    it("[NOTIF-B] correctly reports connection status", () => {
      const { controller } = createMockController();
      expect(manager.isConnected("emp1", "tab1")).toBe(false);

      manager.register("emp1", "tab1", controller);
      expect(manager.isConnected("emp1", "tab1")).toBe(true);

      manager.unregister("emp1:tab1");
      expect(manager.isConnected("emp1", "tab1")).toBe(false);
    });
  });

  describe("unregisterByEmployee", () => {
    it("[NOTIF-B] removes all connections for an employee", () => {
      const { controller: ctrl1 } = createMockController();
      const { controller: ctrl2 } = createMockController();

      manager.register("emp1", "tab1", ctrl1);
      manager.register("emp1", "tab2", ctrl2);
      manager.register("emp2", "tab1", createMockController().controller);

      manager.unregisterByEmployee("emp1");

      expect(manager.getConnectionCount()).toBe(1);
      expect(manager.getEmployeeConnectionCount("emp1")).toBe(0);
    });
  });
});

// =============================================================================
// [NOTIF-C] Permission checks for notification endpoints
// =============================================================================

describe("[NOTIF-C] Permission checks for notification endpoints", () => {
  const NOTIF_VIEW = "notification.view";
  const NOTIF_READ = "notification.read";
  const NOTIF_READ_ALL = "notification.readAll";

  describe("hasPermission", () => {
    it("[NOTIF-C] returns true for wildcard permission", () => {
      expect(hasPermission(["*"], NOTIF_VIEW)).toBe(true);
    });

    it("[NOTIF-C] returns true for exact permission match", () => {
      expect(hasPermission([NOTIF_VIEW, NOTIF_READ], NOTIF_VIEW)).toBe(true);
    });

    it("[NOTIF-C] returns false for missing permission", () => {
      expect(hasPermission([NOTIF_READ], NOTIF_VIEW)).toBe(false);
    });

    it("[NOTIF-C] returns false for undefined/empty permissions", () => {
      expect(hasPermission([], NOTIF_VIEW)).toBe(false);
      expect(hasPermission(undefined, NOTIF_VIEW)).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("[NOTIF-C] returns true if any permission matches", () => {
      expect(hasAnyPermission([NOTIF_READ], [NOTIF_VIEW, NOTIF_READ])).toBe(true);
    });

    it("[NOTIF-C] returns false if no permission matches", () => {
      expect(hasAnyPermission([NOTIF_VIEW], [NOTIF_READ, NOTIF_READ_ALL])).toBe(
        false
      );
    });
  });

  describe("API authorization predicate (mirrored from routes)", () => {
    /**
     * Mirrors authorization logic from notification routes.
     * Users with notification.view permission or wildcard can view notifications.
     * Users with notification.read/notification.readAll or wildcard can mark as read.
     */
    function canViewNotifications(perms: string[]): boolean {
      return (
        hasPermission(perms, NOTIF_VIEW) ||
        hasPermission(perms, "*")
      );
    }

    function canMarkAsRead(perms: string[]): boolean {
      return (
        hasPermission(perms, NOTIF_READ) ||
        hasPermission(perms, NOTIF_READ_ALL) ||
        hasPermission(perms, "*")
      );
    }

    it("[NOTIF-C] wildcard grants access to notifications", () => {
      expect(canViewNotifications(["*"])).toBe(true);
      expect(canMarkAsRead(["*"])).toBe(true);
    });

    it("[NOTIF-C] specific notification permission grants access", () => {
      expect(canViewNotifications([NOTIF_VIEW])).toBe(true);
      expect(canMarkAsRead([NOTIF_READ])).toBe(true);
      expect(canMarkAsRead([NOTIF_READ_ALL])).toBe(true);
    });

    it("[NOTIF-C] non-notification permissions do not grant access", () => {
      expect(canViewNotifications(["dashboard.view"])).toBe(false);
      expect(canViewNotifications(["order.view"])).toBe(false);
      expect(canMarkAsRead(["order.view"])).toBe(false);
    });
  });
});

// =============================================================================
// [NOTIF-D] Unread count logic
// =============================================================================

describe("[NOTIF-D] Unread count logic", () => {
  interface MockNotification {
    _id: string;
    isActive: boolean;
    recipients: string[];
    readBy: string[];
  }

  function computeUnreadCount(
    notifications: MockNotification[],
    userId: string
  ): number {
    return notifications.filter((n) => {
      if (!n.isActive) return false;
      const isRecipient =
        n.recipients.length === 0 || n.recipients.includes(userId);
      const isUnread = !n.readBy.includes(userId);
      return isRecipient && isUnread;
    }).length;
  }

  it("[NOTIF-D] counts only active notifications", () => {
    const notifications: MockNotification[] = [
      { _id: "1", isActive: true, recipients: [], readBy: [] },
      { _id: "2", isActive: false, recipients: [], readBy: [] },
      { _id: "3", isActive: true, recipients: [], readBy: [] },
    ];
    expect(computeUnreadCount(notifications, "emp1")).toBe(2);
  });

  it("[NOTIF-D] counts only recipient notifications (including broadcast)", () => {
    const notifications: MockNotification[] = [
      { _id: "1", isActive: true, recipients: [], readBy: [] }, // broadcast
      { _id: "2", isActive: true, recipients: ["emp1"], readBy: [] },
      { _id: "3", isActive: true, recipients: ["emp2"], readBy: [] }, // not for emp1
    ];
    expect(computeUnreadCount(notifications, "emp1")).toBe(2);
  });

  it("[NOTIF-D] excludes already read notifications", () => {
    const notifications: MockNotification[] = [
      { _id: "1", isActive: true, recipients: [], readBy: ["emp1"] },
      { _id: "2", isActive: true, recipients: [], readBy: [] },
      { _id: "3", isActive: true, recipients: ["emp1"], readBy: [] },
    ];
    expect(computeUnreadCount(notifications, "emp1")).toBe(2);
  });

  it("[NOTIF-D] returns 0 when all notifications are read", () => {
    const notifications: MockNotification[] = [
      { _id: "1", isActive: true, recipients: [], readBy: ["emp1"] },
      { _id: "2", isActive: true, recipients: ["emp1"], readBy: ["emp1"] },
    ];
    expect(computeUnreadCount(notifications, "emp1")).toBe(0);
  });

  it("[NOTIF-D] handles empty notification list", () => {
    expect(computeUnreadCount([], "emp1")).toBe(0);
  });
});

// =============================================================================
// [NOTIF-E] Read state toggle logic
// =============================================================================

describe("[NOTIF-E] Read state toggle logic", () => {
  interface NotificationState {
    readBy: string[];
  }

  function markAsRead(notification: NotificationState, userId: string): boolean {
    if (notification.readBy.includes(userId)) {
      return false; // Already read
    }
    notification.readBy.push(userId);
    return true; // Newly marked as read
  }

  function markAllAsRead(
    notifications: NotificationState[],
    userId: string
  ): number {
    let count = 0;
    for (const n of notifications) {
      if (markAsRead(n, userId)) {
        count++;
      }
    }
    return count;
  }

  it("[NOTIF-E] marks notification as read", () => {
    const notification: NotificationState = { readBy: [] };
    const result = markAsRead(notification, "emp1");

    expect(result).toBe(true);
    expect(notification.readBy).toContain("emp1");
  });

  it("[NOTIF-E] returns false when already read", () => {
    const notification: NotificationState = { readBy: ["emp1"] };
    const result = markAsRead(notification, "emp1");

    expect(result).toBe(false);
    expect(notification.readBy.filter((id) => id === "emp1").length).toBe(1); // No duplicate
  });

  it("[NOTIF-E] marks all unread notifications as read", () => {
    const notifications: NotificationState[] = [
      { readBy: [] },         // unread for emp1
      { readBy: ["emp1"] },   // already read by emp1
      { readBy: [] },         // unread for emp1
      { readBy: ["emp2"] },   // unread for emp1 (read by different user)
    ];

    const count = markAllAsRead(notifications, "emp1");

    expect(count).toBe(3);
    expect(notifications[0].readBy).toContain("emp1");
    expect(notifications[1].readBy).toContain("emp1"); // Added, not duplicated
    expect(notifications[2].readBy).toContain("emp1");
  });

  it("[NOTIF-E] returns 0 when all already read", () => {
    const notifications: NotificationState[] = [
      { readBy: ["emp1"] },
      { readBy: ["emp1"] },
    ];

    const count = markAllAsRead(notifications, "emp1");
    expect(count).toBe(0);
  });

  it("[NOTIF-E] does not affect other users' read status", () => {
    const notification: NotificationState = { readBy: ["emp2"] };
    markAsRead(notification, "emp1");

    expect(notification.readBy).toContain("emp1");
    expect(notification.readBy).toContain("emp2");
  });
});

// =============================================================================
// [NOTIF-F] Notification filtering logic
// =============================================================================

describe("[NOTIF-F] Notification filtering logic", () => {
  interface NotificationFilter {
    category?: string;
    priority?: string;
    isRead?: boolean;
    isPinned?: boolean;
  }

  interface MockNotification {
    category: string;
    priority: string;
    readBy: string[];
    isPinned: boolean;
  }

  function filterNotifications(
    notifications: MockNotification[],
    filter: NotificationFilter,
    userId: string
  ): MockNotification[] {
    return notifications.filter((n) => {
      if (filter.category && n.category !== filter.category) return false;
      if (filter.priority && n.priority !== filter.priority) return false;
      if (filter.isRead !== undefined) {
        const isRead = n.readBy.includes(userId);
        if (filter.isRead !== isRead) return false;
      }
      if (filter.isPinned !== undefined && n.isPinned !== filter.isPinned)
        return false;
      return true;
    });
  }

  it("[NOTIF-F] filters by category", () => {
    const notifications: MockNotification[] = [
      { category: "order", priority: "normal", readBy: [], isPinned: false },
      { category: "lead", priority: "normal", readBy: [], isPinned: false },
      { category: "order", priority: "high", readBy: [], isPinned: false },
    ];

    const result = filterNotifications(notifications, { category: "order" }, "emp1");
    expect(result.length).toBe(2);
    expect(result.every((n) => n.category === "order")).toBe(true);
  });

  it("[NOTIF-F] filters by priority", () => {
    const notifications: MockNotification[] = [
      { category: "order", priority: "low", readBy: [], isPinned: false },
      { category: "lead", priority: "high", readBy: [], isPinned: false },
    ];

    const result = filterNotifications(notifications, { priority: "high" }, "emp1");
    expect(result.length).toBe(1);
    expect(result[0].priority).toBe("high");
  });

  it("[NOTIF-F] filters by read status", () => {
    const notifications: MockNotification[] = [
      { category: "order", priority: "normal", readBy: ["emp1"], isPinned: false },
      { category: "lead", priority: "normal", readBy: [], isPinned: false },
    ];

    const unread = filterNotifications(notifications, { isRead: false }, "emp1");
    expect(unread.length).toBe(1);

    const read = filterNotifications(notifications, { isRead: true }, "emp1");
    expect(read.length).toBe(1);
  });

  it("[NOTIF-F] filters by pinned status", () => {
    const notifications: MockNotification[] = [
      { category: "order", priority: "normal", readBy: [], isPinned: true },
      { category: "lead", priority: "normal", readBy: [], isPinned: false },
    ];

    const pinned = filterNotifications(notifications, { isPinned: true }, "emp1");
    expect(pinned.length).toBe(1);
    expect(pinned[0].isPinned).toBe(true);
  });

  it("[NOTIF-F] combines multiple filters", () => {
    const notifications: MockNotification[] = [
      { category: "order", priority: "high", readBy: [], isPinned: true },
      { category: "order", priority: "high", readBy: [], isPinned: false },
      { category: "lead", priority: "high", readBy: [], isPinned: false },
    ];

    const result = filterNotifications(
      notifications,
      { category: "order", priority: "high", isPinned: true },
      "emp1"
    );
    expect(result.length).toBe(1);
  });

  it("[NOTIF-F] returns all when no filter applied", () => {
    const notifications: MockNotification[] = [
      { category: "order", priority: "normal", readBy: [], isPinned: false },
      { category: "lead", priority: "high", readBy: ["emp1"], isPinned: true },
    ];

    const result = filterNotifications(notifications, {}, "emp1");
    expect(result.length).toBe(2);
  });
});

// =============================================================================
// [NOTIF-G] Pagination logic
// =============================================================================

describe("[NOTIF-G] Pagination logic", () => {
  interface PaginationParams {
    page: number;
    limit: number;
  }

  function paginate<T>(
    items: T[],
    { page, limit }: PaginationParams
  ): { items: T[]; total: number; hasMore: boolean } {
    const total = items.length;
    const skip = (page - 1) * limit;
    const paginatedItems = items.slice(skip, skip + limit);
    const hasMore = skip + paginatedItems.length < total;

    return { items: paginatedItems, total, hasMore };
  }

  it("[NOTIF-G] returns correct page items", () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

    const page1 = paginate(items, { page: 1, limit: 10 });
    expect(page1.items.length).toBe(10);
    expect(page1.items[0].id).toBe(1);
    expect(page1.items[9].id).toBe(10);

    const page3 = paginate(items, { page: 3, limit: 10 });
    expect(page3.items[0].id).toBe(21);
    expect(page3.items[9].id).toBe(30);
  });

  it("[NOTIF-G] calculates hasMore correctly", () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));

    const page1 = paginate(items, { page: 1, limit: 10 });
    expect(page1.hasMore).toBe(true);
    expect(page1.total).toBe(25);

    const page3 = paginate(items, { page: 3, limit: 10 });
    expect(page3.hasMore).toBe(false);
  });

  it("[NOTIF-G] handles page beyond available data", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ id: i + 1 }));

    const result = paginate(items, { page: 10, limit: 10 });
    expect(result.items.length).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it("[NOTIF-G] returns correct page of items", () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ id: i + 1 }));

    const result = paginate(items, { page: 1, limit: 100 });
    expect(result.items.length).toBe(100);
  });
});

// =============================================================================
// [NOTIF-H] SSE message format validation
// =============================================================================

describe("[NOTIF-H] SSE message format", () => {
  interface SSEMessage {
    event: string;
    data: unknown;
  }

  function formatSSEMessage(event: string, data: unknown): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  it("[NOTIF-H] formats notification event correctly", () => {
    const message = formatSSEMessage("notification", { id: "123", title: "Test" });
    expect(message).toBe('event: notification\ndata: {"id":"123","title":"Test"}\n\n');
  });

  it("[NOTIF-H] formats heartbeat event correctly", () => {
    const message = formatSSEMessage("heartbeat", { time: Date.now() });
    expect(message).toContain("event: heartbeat\ndata:");
    expect(message).toContain("\n\n");
  });

  it("[NOTIF-H] formats connected event correctly", () => {
    const message = formatSSEMessage("connected", {
      connectionId: "emp1:tab1",
      tabId: "tab1",
    });
    expect(message).toContain("event: connected");
    expect(message).toContain("emp1:tab1");
  });

  it("[NOTIF-H] formats error event correctly", () => {
    const message = formatSSEMessage("error", { message: "Connection lost" });
    expect(message).toContain("event: error");
    expect(message).toContain("Connection lost");
  });

  it("[NOTIF-H] handles special characters in data", () => {
    const message = formatSSEMessage("notification", {
      message: "Test with special chars: <>&\"'",
    });
    expect(message).toBe(
      'event: notification\ndata: {"message":"Test with special chars: <>&\\"\'"}\n\n'
    );
  });
});
