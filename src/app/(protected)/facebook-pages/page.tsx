"use client";

/**
 * Facebook Pages List Page (Sprint 7.4 — Facebook Page & Campaign Management)
 *
 * Route: /facebook-pages
 *
 * Components:
 *   - PageHeader
 *   - FacebookPagesToolbar (search, filter, refresh)
 *   - FacebookPagesTable (columns, sort, action menu)
 *   - FacebookPageDrawer (create/edit)
 *
 * Hook: useFacebookPages()
 */

import { useState, useCallback, useMemo } from "react";

import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";
import { toast } from "@/components/common/feedback/Toast";

import { useFacebookPages, useUpdateFacebookPage } from "@/hooks/useFacebookPages";
import type { FacebookPage } from "@/hooks/useFacebookPages";
import { useDebounce } from "@/hooks/useDebounce";

import FacebookPagesToolbar from "./FacebookPagesToolbar";
import FacebookPagesTable from "./FacebookPagesTable";
import FacebookPageDrawer from "./FacebookPageDrawer";

import styles from "./facebook-pages.module.css";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";


export default function FacebookPagesListPage() {
  const lang = useLanguageStore((s) => s.language);
  // ── Search state ───────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | undefined>(undefined);

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
      status,
      page,
      pageSize,
      sortField,
      sortOrder,
    }),
    [debouncedKeyword, status, page, pageSize, sortField, sortOrder]
  );

  // ── Query ───────────────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useFacebookPages(filterParams);

  const updateMutation = useUpdateFacebookPage();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const errorMsg = useMemo(() => {
    if (!error) return null;
    return error.message || t("Đã xảy ra lỗi", lang);
  }, [error, lang]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggleActive = useCallback(
    (page: FacebookPage, checked: boolean) => {
      updateMutation.mutate(
        { id: page._id, data: { status: checked ? "ACTIVE" : "INACTIVE" } },
        {
          onSuccess: () => {
            toast.success(checked ? t("Đã bật trạng thái hoạt động", lang) : t("Đã tắt trạng thái hoạt động", lang));
            void refetch();
          },
          onError: (err: Error) => {
            toast.error(err.message || t("Lỗi khi cập nhật trạng thái", lang));
          },
        }
      );
    },
    [updateMutation, refetch, lang]
  );

  const handleToolbarFiltersChange = useCallback(
    (newFilters: {
      keyword?: string;
      status?: "ACTIVE" | "INACTIVE" | undefined;
    }) => {
      if (newFilters.keyword !== undefined) setKeyword(newFilters.keyword);
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
      <PageHeader title={t("Facebook Pages", lang)} subtitle={t("Quản lý Facebook Pages cho Marketing", lang)}
      />

      <div className={styles["fb-page"]}>
        <FacebookPagesToolbar
          keyword={keyword}
          status={status}
          onFiltersChange={handleToolbarFiltersChange}
          onCreate={handleCreate}
          onRefresh={() => { void refetch(); }}
        />

        {isLoading ? (
          <SkeletonTable columns={6} rows={10} />
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
            title={t("Chưa có Facebook Page", lang)}
            description={t("Tạo Facebook Page đầu tiên để bắt đầu", lang)}
            action={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                {t("Tạo Facebook Page", lang)}
              </Button>
            }
          />
        ) : (
          <FacebookPagesTable
            data={items}
            total={total}
            page={page}
            pageSize={pageSize}
            sortField={sortField}
            sortOrder={sortOrder}
            onPageChange={handlePageChange}
            onSortChange={handleSortChange}
            onEdit={handleEdit}
            onToggleActive={handleToggleActive}
          />
        )}
      </div>

      <FacebookPageDrawer
        mode={drawerMode}
        open={drawerOpen}
        recordId={editingRecordId}
        onClose={handleDrawerClose}
        onSuccess={handleDrawerSuccess}
      />
    </PageContainer>
  );
}
