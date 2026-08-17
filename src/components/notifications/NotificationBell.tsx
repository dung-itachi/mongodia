"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dropdown, Empty, Skeleton } from "antd";
import { BellOutlined } from "@ant-design/icons";

import { useCan } from "@/hooks/useCan";
import {
  useInfiniteNotifications,
  useMarkAllRead,
  useMarkRead,
} from "@/hooks/useNotifications";
import type { NotificationItem } from "@/types/notification";
import NotificationItemRow from "./NotificationItemRow";
import "./notification.css";

const POPUP_LIMIT = 10;

// Get start of today in local timezone
function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

// Filter notifications to only show today's
function filterTodayNotifications(items: NotificationItem[]): NotificationItem[] {
  const startOfToday = getStartOfToday();
  return items.filter((item) => {
    const createdAt = new Date(item.createdAt);
    return createdAt >= startOfToday;
  });
}

// Get today's date label
function getTodayLabel(): string {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}

export default function NotificationBell() {
  const canView = useCan("notification.view");
  const [open, setOpen] = useState(false);

  // Only fetch the dropdown list when the user actually opens it to avoid
  // a network round-trip on every page.
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteNotifications({ limit: 50 }); // Fetch more to filter by today

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  // Get all notifications from pages
  const allItems = useMemo<NotificationItem[]>(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  // Filter to only today's notifications
  const todayItems = useMemo<NotificationItem[]>(
    () => filterTodayNotifications(allItems),
    [allItems]
  );

  // Get unread count for today only
  const todayUnreadCount = useMemo<number>(
    () => todayItems.filter((n) => !n.read).length,
    [todayItems]
  );

  const hasUnread = todayUnreadCount > 0;

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markRead.mutate(item.id);
    }
    setOpen(false);
    if (item.link) {
      window.location.assign(item.link);
    }
  };

  const handleMarkAll = () => {
    markAllRead.mutate();
  };

  const popup = (
    <div
      className="nb-popup"
      role="dialog"
      aria-label="Danh sách thông báo"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="nb-popup-header">
        <span>Thông báo hôm nay ({getTodayLabel()})</span>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={todayUnreadCount === 0 || markAllRead.isPending}
        >
          Đánh dấu đã đọc tất cả
        </button>
      </div>
      <div className="nb-popup-body">
        {isLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="np-skeleton" aria-hidden="true">
                <Skeleton.Avatar active size={28} shape="circle" />
                <div style={{ flex: 1 }}>
                  <div className="np-skeleton-bar" style={{ width: "70%" }} />
                  <div
                    className="np-skeleton-bar"
                    style={{ width: "90%", marginTop: 6 }}
                  />
                </div>
              </div>
            ))}
          </>
        ) : isError ? (
          <div className="np-error">
            Không thể tải thông báo.
            <div>
              <button
                type="button"
                onClick={() => {
                  refetch();
                }}
              >
                Thử lại
              </button>
            </div>
          </div>
        ) : todayItems.length === 0 ? (
          <div className="nb-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Hôm nay không có thông báo nào"
            />
          </div>
        ) : (
          todayItems.map((n) => (
            <NotificationItemRow
              key={n.id}
              item={n}
              variant="popup"
              onClick={handleItemClick}
            />
          ))
        )}
        {hasNextPage && todayItems.length >= POPUP_LIMIT && (
          <div className="np-load-more">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Đang tải..." : "Tải thêm"}
            </button>
          </div>
        )}
      </div>
      <div className="nb-popup-footer">
        <Link href="/notifications" onClick={() => setOpen(false)}>
          Xem tất cả thông báo
        </Link>
      </div>
    </div>
  );

  if (!canView) return null;

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={["click"]}
      placement="bottomRight"
      popupRender={() => popup}
      classNames={{ root: "nb-dropdown" }}
    >
      <button
        type="button"
        className={`nb-bell ${hasUnread ? "has-unread" : ""}`}
        aria-label={
          hasUnread
            ? `Thông báo, ${todayUnreadCount} chưa đọc hôm nay`
            : "Thông báo"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="nb-badge-wrapper">
          <BellOutlined />
          <span
            className="nb-badge"
            data-open={hasUnread ? "true" : "false"}
            aria-hidden="true"
          >
            <span className="nb-badge-dot">
              {todayUnreadCount > 99 ? "99+" : todayUnreadCount}
            </span>
          </span>
        </span>
      </button>
    </Dropdown>
  );
}
