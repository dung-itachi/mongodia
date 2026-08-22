"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Empty } from "antd";

import { useCan } from "@/hooks/useCan";
import {
  useInfiniteNotifications,
  useMarkAllRead,
  useMarkRead,
} from "@/hooks/useNotifications";
import { useNotificationStore } from "@/store/notification.store";
import type { NotificationItem } from "@/types/notification";
import NotificationItemRow from "@/components/notifications/NotificationItemRow";
import "@/components/notifications/notification.css";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

type ReadFilter = "all" | "unread";
type DateFilter = "1" | "3" | "7" | "all";
type ActiveFilter = "all" | "active" | "inactive";

export default function NotificationsPage() {
  const lang = useLanguageStore((s) => s.language);
  const canView = useCan("notification.view");
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
  } = useInfiniteNotifications({
    onlyUnread: readFilter === "unread",
    limit: 20,
    isActive:
      activeFilter === "active"
        ? true
        : activeFilter === "inactive"
          ? false
          : undefined,
  });

  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  // Client-side date filter — applied on top of the fetched items
  const filteredItems = useMemo<NotificationItem[]>(() => {
    const pages = data?.pages ?? [];
    const all = pages.flatMap((p) => p.items);

    if (dateFilter === "all") return all;

    const days = parseInt(dateFilter, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return all.filter((n) => new Date(n.createdAt) >= cutoff);
  }, [data, dateFilter]);

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markRead.mutate(item.id);
    }
    if (item.link) {
      window.location.assign(item.link);
    }
  };

  // IntersectionObserver for "load more" — replaces a button when the
  // list is long enough to scroll, but keeps the button as fallback when
  // the viewport is short.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const READ_TABS_T = useMemo(
    () => [
      { key: "all" as ReadFilter, label: t("Tất cả", lang) },
      { key: "unread" as ReadFilter, label: t("Chưa đọc", lang) },
    ],
    [lang]
  );

  const DATE_FILTERS_T = useMemo(
    () => [
      { key: "1" as DateFilter, label: t("1 ngày", lang) },
      { key: "3" as DateFilter, label: t("3 ngày", lang) },
      { key: "7" as DateFilter, label: t("7 ngày", lang) },
      { key: "all" as DateFilter, label: t("Tất cả", lang) },
    ],
    [lang]
  );

  const ACTIVE_FILTERS_T = useMemo(
    () => [
      { key: "all" as ActiveFilter, label: t("Tất cả", lang) },
      { key: "active" as ActiveFilter, label: t("Hoạt động", lang) },
      { key: "inactive" as ActiveFilter, label: t("Không hoạt động", lang) },
    ],
    [lang]
  );

  if (!canView) {
    return (
      <div className="np-page">
        <div className="np-empty">
          <div className="np-empty-icon">🔒</div>
          <div className="np-empty-title">{t("Không có quyền truy cập", lang)}</div>
          <div className="np-empty-message">
            {t("Bạn không có quyền xem thông báo. Liên hệ quản trị viên nếu bạn cho rằng đây là nhầm lẫn.", lang)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="np-page">
      <div className="np-header">
        <h1 className="np-title">{t("Thông báo", lang)}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="np-date-filters" role="group" aria-label={t("Lọc theo ngày", lang)}>
            {DATE_FILTERS_T.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`np-date-btn${dateFilter === d.key ? " is-active" : ""}`}
                onClick={() => setDateFilter(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <div className="np-tabs" role="tablist" aria-label={t("Lọc theo trạng thái hoạt động", lang)}>
            {ACTIVE_FILTERS_T.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={activeFilter === f.key}
                className={`np-tab${activeFilter === f.key ? " is-active" : ""}`}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="np-tabs" role="tablist" aria-label={t("Lọc theo trạng thái đọc", lang)}>
            {READ_TABS_T.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={readFilter === tab.key}
                className={`np-tab${readFilter === tab.key ? " is-active" : ""}`}
                onClick={() => setReadFilter(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="nb-popup-header"
            style={{
              padding: "4px 10px",
              border: "1px solid var(--line)",
              borderRadius: 4,
              background: "var(--card)",
              cursor: unreadCount === 0 ? "default" : "pointer",
              color: unreadCount === 0 ? "var(--muted)" : "var(--accent)",
              fontSize: 11,
              fontWeight: 600,
            }}
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            {t("Đọc tất cả", lang)}
          </button>
        </div>
      </div>

      <div className="np-list" role="list" aria-label={t("Danh sách thông báo", lang)}>
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="np-skeleton" aria-hidden="true">
              <div className="np-skeleton-bar" style={{ width: 36, height: 36, borderRadius: 18 }} />
              <div style={{ flex: 1 }}>
                <div className="np-skeleton-bar" style={{ width: "60%" }} />
                <div
                  className="np-skeleton-bar"
                  style={{ width: "90%", marginTop: 8 }}
                />
              </div>
            </div>
          ))
        ) : isError ? (
          <div className="np-error">
            <div>{error?.message ?? t("Không thể tải thông báo", lang)}</div>
            <button type="button" onClick={() => refetch()}>
              {t("Thử lại", lang)}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="np-empty">
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                readFilter === "unread"
                  ? t("Bạn đã đọc hết thông báo", lang)
                  : t("Bạn chưa có thông báo nào", lang)
              }
            />
          </div>
        ) : (
          <>
            {filteredItems.map((n) => (
              <div role="listitem" key={n.id}>
                <NotificationItemRow
                  item={n}
                  variant="page"
                  onClick={handleItemClick}
                />
              </div>
            ))}
            <div ref={sentinelRef} />
            {hasNextPage && (
              <div className="np-load-more">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? t("Đang tải...", lang) : t("Tải thêm", lang)}
                </button>
              </div>
            )}
            {!hasNextPage && filteredItems.length >= 20 && (
              <div className="np-load-more" style={{ color: "var(--muted)" }}>
                {t("Đã hiển thị tất cả thông báo", lang)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
