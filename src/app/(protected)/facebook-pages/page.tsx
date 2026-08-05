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

import { useFacebookPages } from "@/hooks/useFacebookPages";
import { useDebounce } from "@/hooks/useDebounce";

import FacebookPagesToolbar from "./FacebookPagesToolbar";
import FacebookPagesTable from "./FacebookPagesTable";
import FacebookPageDrawer from "./FacebookPageDrawer";

import styles from "./facebook-pages.module.css";

export default function FacebookPagesListPage() {
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

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const errorMsg = useMemo(() => {
    if (!error) return null;
    return error.message || "Đã xảy ra lỗi";
  }, [error]);

  // ── Handlers ────────────────────────────────────────────────────────────────
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
      <PageHeader
        title="Facebook Pages"
        subtitle="Quản lý Facebook Pages cho Marketing"
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
            title="Không thể tải dữ liệu"
            description={errorMsg}
            action={
              <Button onClick={() => { void refetch(); }}>
                Thử lại
              </Button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="Chưa có Facebook Page"
            description="Tạo Facebook Page đầu tiên để bắt đầu"
            action={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
              >
                Tạo Facebook Page
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
