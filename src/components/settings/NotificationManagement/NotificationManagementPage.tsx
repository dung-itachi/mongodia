"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Space } from "antd";
import { useMessage } from "@/contexts/MessageContext";
import {
  PlusOutlined,
  BellOutlined,
  NotificationOutlined,
  PushpinOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { PageContainer } from "@/components/common";
import {
  useAdminNotificationList,
  useCreateNotification,
  useDeleteNotification,
  useTogglePin,
  useUpdateNotification,
} from "@/hooks/useNotificationsAdmin";
import type {
  CreateNotificationInput,
  NotificationAdminItem,
  UpdateNotificationInput,
} from "@/types/notification";
import NotificationFormDrawer from "./NotificationFormDrawer";
import NotificationTable from "./NotificationTable";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./notificationManagement.module.css";

export default function NotificationManagementPage() {
  const lang = useLanguageStore((s) => s.language);
  const message = useMessage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [pinnedOnly, setPinnedOnly] = useState<boolean | undefined>();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NotificationAdminItem | null>(
    null
  );

  const { data, isLoading, refetch } = useAdminNotificationList({
    search,
    category,
    type,
    isPinned: pinnedOnly,
    isActive:
      statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined,
    page,
    pageSize,
  });

  const createMutation = useCreateNotification();
  const updateMutation = useUpdateNotification();
  const deleteMutation = useDeleteNotification();
  const pinMutation = useTogglePin();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCount = items.filter((item) => {
      const itemDate = new Date(item.createdAt);
      itemDate.setHours(0, 0, 0, 0);
      return itemDate.getTime() === today.getTime();
    }).length;

    const pinnedCount = items.filter((item) => item.isPinned).length;
    const activeCount = items.filter((item) => item.isActive).length;

    return {
      total,
      today: todayCount,
      pinned: pinnedCount,
      active: activeCount,
    };
  }, [items, total]);

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((item: NotificationAdminItem) => {
    setEditingItem(item);
    setDrawerOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingItem(null);
  }, []);

  const handleSubmit = useCallback(
    (values: CreateNotificationInput | UpdateNotificationInput) => {
      if (editingItem) {
        updateMutation.mutate(
          { id: editingItem.id, input: values as UpdateNotificationInput },
          {
            onSuccess: handleClose,
          }
        );
      } else {
        createMutation.mutate(values as CreateNotificationInput, {
          onSuccess: () => {
            handleClose();
            setPage(1);
          },
        });
      }
    },
    [createMutation, editingItem, handleClose, updateMutation]
  );

  const handleDelete = useCallback(
    (item: NotificationAdminItem) => {
      deleteMutation.mutate(item.id, {
        onSuccess: () => {
          void message.success(t("Đã xóa thông báo thành công", lang));
        },
        onError: (err: Error) => {
          void message.error(err.message ?? t("Xóa thất bại", lang));
        },
      });
    },
    [deleteMutation, message, lang]
  );

  const handleTogglePin = useCallback(
    (item: NotificationAdminItem) => {
      pinMutation.mutate({ id: item.id, isPinned: !item.isPinned });
    },
    [pinMutation]
  );

  return (
    <PageContainer>
      {/* Header */}
      <div className={styles.headerSection}>
        <div className={styles.headerTop}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>{t("Quản lý thông báo", lang)}</h1>
            <p className={styles.pageSubtitle}>
              {t("Tạo, chỉnh sửa, ghim và xóa thông báo hệ thống", lang)}
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              size="large"
            >
              {t("Tạo thông báo", lang)}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconTotal}`}>
              <BellOutlined />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>{t("Tổng thông báo", lang)}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconToday}`}>
              <CalendarOutlined />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.today}</div>
              <div className={styles.statLabel}>{t("Hôm nay", lang)}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconPinned}`}>
              <PushpinOutlined />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.pinned}</div>
              <div className={styles.statLabel}>{t("Đã ghim", lang)}</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconUnread}`}>
              <NotificationOutlined />
            </div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{stats.active}</div>
              <div className={styles.statLabel}>{t("Đang hoạt động", lang)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <NotificationTable
        items={items}
        isLoading={isLoading}
        total={total}
        page={page}
        pageSize={pageSize}
        search={search}
        category={category}
        type={type}
        pinnedOnly={pinnedOnly}
        statusFilter={statusFilter}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onCategoryChange={(v) => {
          setCategory(v);
          setPage(1);
        }}
        onTypeChange={(v) => {
          setType(v);
          setPage(1);
        }}
        onPinnedOnlyChange={(v) => {
          setPinnedOnly(v);
          setPage(1);
        }}
        onStatusFilterChange={(v) => {
          if (v === "active") {
            setStatusFilter("active");
          } else if (v === "inactive") {
            setStatusFilter("inactive");
          } else {
            setStatusFilter("all");
          }
          setPage(1);
        }}
        onPageChange={setPage}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onRefresh={() => refetch()}
      />

      {/* Drawer */}
      <NotificationFormDrawer
        open={drawerOpen}
        onClose={handleClose}
        initial={editingItem}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />
    </PageContainer>
  );
}
