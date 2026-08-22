"use client";

/**
 * Campaigns List Page (Sprint 7.4 — Facebook Page & Campaign Management)
 *
 * Route: /campaigns
 *
 * Components:
 *   - PageHeader
 *   - CampaignsToolbar (search, filter by Facebook Page, refresh)
 *   - CampaignsTable (columns, sort, action menu)
 *   - CampaignDrawer (create/edit)
 *
 * Hook: useCampaigns()
 */

import { useState, useCallback, useMemo } from "react";
import { Button } from "antd";
import {
  PlusOutlined,
  RocketOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  FolderOutlined,
} from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";
import { PageStatsBanner } from "@/components/common";

import { useCampaigns } from "@/hooks/useCampaigns";
import { useDebounce } from "@/hooks/useDebounce";

import CampaignsToolbar from "./CampaignsToolbar";
import CampaignsTable from "./CampaignsTable";
import CampaignDrawer from "./CampaignDrawer";

import styles from "./campaigns.module.css";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export default function CampaignsListPage() {
  const lang = useLanguageStore((s) => s.language);
  // ── Search state ───────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [facebookPageId, setFacebookPageId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" | undefined>(undefined);

  // ── Sort state ──────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | undefined>(undefined);

  // ── Pagination state ───────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // ── Drawer state ───────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // ── Build filter params ────────────────────────────────────────────────────
  const filterParams = useMemo(
    () => ({
      keyword: debouncedKeyword || undefined,
      facebookPageId,
      status,
      page,
      pageSize,
      sortField,
      sortOrder,
    }),
    [debouncedKeyword, facebookPageId, status, page, pageSize, sortField, sortOrder]
  );

  // ── Query ───────────────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useCampaigns(filterParams);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // Calculate campaign stats
  const campaignStats = useMemo(() => {
    const active = items.filter((c) => c.status === "ACTIVE").length;
    const paused = items.filter((c) => c.status === "PAUSED").length;
    const completed = items.filter((c) => c.status === "COMPLETED").length;
    const archived = items.filter((c) => c.status === "ARCHIVED").length;
    return { total, active, paused, completed, archived };
  }, [items, total]);

  const errorMsg = useMemo(() => {
    if (!error) return null;
    return error.message || t("Đã xảy ra lỗi", lang);
  }, [error, lang]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToolbarFiltersChange = useCallback(
    (newFilters: {
      keyword?: string;
      facebookPageId?: string;
      status?: "ACTIVE" | "PAUSED" | "COMPLETED" | "ARCHIVED" | undefined;
    }) => {
      if (newFilters.keyword !== undefined) setKeyword(newFilters.keyword);
      if (newFilters.facebookPageId !== undefined) setFacebookPageId(newFilters.facebookPageId);
      if (newFilters.status !== undefined) setStatus(newFilters.status);
      setPage(1);
    },
    []
  );

  const handleSortChange = useCallback(
    (field: string, order: "asc" | "desc" | undefined) => {
      setSortField(field);
      setSortOrder(order);
    },
    []
  );

  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1);
    } else {
      setPage(newPage);
    }
  }, [pageSize]);

  const handleCreate = useCallback(() => {
    setDrawerMode("create");
    setEditingRecordId(null);
    setDrawerOpen(true);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setDrawerMode("edit");
    setEditingRecordId(id);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingRecordId(null);
  }, []);

  const handleDrawerSuccess = useCallback(() => {
    setDrawerOpen(false);
    setEditingRecordId(null);
    void refetch();
  }, [refetch]);

  return (
    <PageContainer>
      <PageHeader title={t("Campaigns", lang)}
        subtitle={`${total} ${t("campaigns cho Marketing", lang)}`}
      />

      {/* Stats Banner */}
      <PageStatsBanner
        stats={[
          {
            key: "total",
            value: campaignStats.total,
            label: t("Tổng Campaigns", lang),
            icon: <RocketOutlined style={{ color: "#1890ff" }} />,
            color: "blue",
          },
          {
            key: "active",
            value: campaignStats.active,
            label: t("Đang chạy", lang),
            icon: <PlayCircleOutlined style={{ color: "#52c41a" }} />,
            color: "green",
          },
          {
            key: "paused",
            value: campaignStats.paused,
            label: t("Tạm dừng", lang),
            icon: <PauseCircleOutlined style={{ color: "#fa8c16" }} />,
            color: "orange",
          },
          {
            key: "completed",
            value: campaignStats.completed,
            label: t("Hoàn thành", lang),
            icon: <CheckCircleOutlined style={{ color: "#722ed1" }} />,
            color: "purple",
          },
          {
            key: "archived",
            value: campaignStats.archived,
            label: t("Đã lưu trữ", lang),
            icon: <FolderOutlined style={{ color: "#8c8c8c" }} />,
            color: "gold",
          },
        ]}
        loading={isLoading}
        style={{ marginBottom: 16 }}
      />

      <div className={styles["campaign-page"]}>
        <CampaignsToolbar
          keyword={keyword}
          facebookPageId={facebookPageId}
          status={status}
          onFiltersChange={handleToolbarFiltersChange}
          onCreate={handleCreate}
          onRefresh={() => { void refetch(); }}
        />

        {isLoading ? (
          <SkeletonTable columns={7} rows={10} />
        ) : errorMsg ? (
          <EmptyState
            title={t("Không thể tải dữ liệu", lang)}
            description={errorMsg}
            action={
              <Button onClick={() => { void refetch(); }}>
                {t("Thử lại", lang)}
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={t("Chưa có Campaign", lang)}
            description={t("Tạo Campaign đầu tiên để bắt đầu", lang)}
            action={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                {t("Tạo Campaign", lang)}
              </Button>
            }
          />
        ) : (
          <CampaignsTable
            data={items}
            total={total}
            page={page}
            pageSize={pageSize}
            sortField={sortField}
            sortOrder={sortOrder}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
            onEdit={handleEdit}
          />
        )}
      </div>

      <CampaignDrawer
        mode={drawerMode}
        open={drawerOpen}
        recordId={editingRecordId}
        onClose={handleDrawerClose}
        onSuccess={handleDrawerSuccess}
      />
    </PageContainer>
  );
}
