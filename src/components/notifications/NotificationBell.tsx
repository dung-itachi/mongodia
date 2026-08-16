"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Dropdown, Empty, Skeleton } from "antd";
import { BellOutlined } from "@ant-design/icons";

import { useCan } from "@/hooks/useCan";
import {
  useInfiniteNotifications,
  useMarkAllRead,
  useMarkRead,
} from "@/hooks/useNotifications";
import { useNotificationStore } from "@/store/notification.store";
import type { NotificationItem } from "@/types/notification";
import NotificationItemRow from "./NotificationItemRow";
import "./notification.css";

const POPUP_LIMIT = 5;

export default function NotificationBell() {
  const canView = useCan("notification.view");
  const unreadCount = useNotificationStore((s) => s.unreadCount);
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
  } = useInfiniteNotifications({ limit: POPUP_LIMIT });

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = useMemo<NotificationItem[]>(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

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
        <span>Thông báo</span>
        <button
          type="button"
          onClick={handleMarkAll}
          disabled={unreadCount === 0 || markAllRead.isPending}
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
        ) : items.length === 0 ? (
          <div className="nb-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Bạn không có thông báo nào"
            />
          </div>
        ) : (
          items.map((n) => (
            <NotificationItemRow
              key={n.id}
              item={n}
              variant="popup"
              onClick={handleItemClick}
            />
          ))
        )}
        {hasNextPage && (
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
          Xem tất cả
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
        className="nb-bell"
        aria-label={
          unreadCount > 0
            ? `Thông báo, ${unreadCount} chưa đọc`
            : "Thông báo"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Badge
          count={unreadCount}
          overflowCount={99}
          size="small"
          offset={[2, -2]}
        >
          <BellOutlined />
        </Badge>
      </button>
    </Dropdown>
  );
}
