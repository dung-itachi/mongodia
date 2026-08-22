"use client";

/**
 * Marketing Expense List Page (Sprint 6.9 — Marketing Expense List UI)
 * Sprint 6.10 — Added Drawer for Create/Edit
 * Sprint 6.11 — Added Workflow UI
 *
 * Route: /marketing/expense
 *
 * Components:
 *   - PageHeader
 *   - MarketingExpenseToolbar (search, filter, refresh)
 *   - MarketingExpenseTable (columns, sort, action menu)
 *   - MarketingExpenseDrawer (create/edit + workflow)
 *
 * Hook: useMarketingExpenses() — Sprint 6.8
 *
 * Architecture:
 *   Page → useMarketingExpenses() → API Route → Service → Repository → MongoDB
 */

import { useState, useCallback, useMemo } from "react";

import PageContainer from "@/components/common/layout/PageContainer";
import PageHeader from "@/components/common/layout/PageHeader";
import EmptyState from "@/components/common/display/EmptyState";
import SkeletonTable from "@/components/common/overlay/SkeletonTable";

import { useMarketingExpenses } from "@/hooks/useMarketingExpenses";
import { useDebounce } from "@/hooks/useDebounce";

import MarketingExpenseToolbar from "./MarketingExpenseToolbar";
import MarketingExpenseTable from "./MarketingExpenseTable";
import MarketingExpenseDrawer from "@/components/marketing-expense/MarketingExpenseDrawer";

import type { MarketingExpenseFilter } from "@/hooks/useMarketingExpenses";
import { MarketingExpenseReportStatus } from "@/constants/marketing-expense";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

// ============================================================================
// Page
// ============================================================================

export default function MarketingExpenseListPage() {
  const lang = useLanguageStore((s) => s.language);

  // ── Search state ───────────────────────────────────────────────────────────
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 500);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<MarketingExpenseReportStatus | undefined>(undefined);
  const [marketingEmployeeId, setMarketingEmployeeId] = useState<string | undefined>(undefined);
  const [facebookPageId, setFacebookPageId] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);

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
      marketingEmployeeId,
      facebookPageId,
      dateFrom,
      dateTo,
      page,
      pageSize,
      sortField,
      sortOrder,
    }),
    [debouncedKeyword, status, marketingEmployeeId, facebookPageId, dateFrom, dateTo, page, pageSize, sortField, sortOrder]
  );

  // ── Query ───────────────────────────────────────────────────────────────────
  const {
    expenses,
    total,
    loading,
    error,
    refetch,
  } = useMarketingExpenses(filterParams);

  const errorMsg = useMemo(() => {
    if (!error) return null;
    return error || t("Đã xảy ra lỗi", lang);
  }, [error, lang]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToolbarFiltersChange = useCallback(
    (filters: Partial<MarketingExpenseFilter>) => {
      setStatus(filters.status);
      setFacebookPageId(filters.facebookPageId);
      setMarketingEmployeeId(filters.marketingEmployeeId);
      setDateFrom(filters.dateFrom);
      setDateTo(filters.dateTo);
      setPage(1);
    },
    []
  );

  const handleSortChange = useCallback(
    (field: string, order: "asc" | "desc" | undefined) => {
      setSortField(order ? field : undefined);
      setSortOrder(order);
      setPage(1);
    },
    []
  );

  const handleTableChange = useCallback(
    (_pagination: unknown, _filters: unknown, sorter: unknown) => {
      const s = sorter as { field?: string; order?: string } | undefined;
      if (s?.field && s?.order) {
        const field = typeof s.field === "string" ? s.field : undefined;
        const order: "asc" | "desc" =
          s.order === "ascend" ? "asc" : "desc";
        if (field) handleSortChange(field, order);
      } else {
        setSortField(undefined);
        setSortOrder(undefined);
        setPage(1);
      }
    },
    [handleSortChange]
  );

  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
    if (newPage === 1) {
      // nothing special
    }
  }, []);

  // ── Drawer handlers ─────────────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    setDrawerMode("create");
    setEditingRecordId(null);
    setDrawerOpen(true);
  }, []);

  const handleOpenEdit = useCallback((recordId: string) => {
    setDrawerMode("edit");
    setEditingRecordId(recordId);
    setDrawerOpen(true);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingRecordId(null);
  }, []);

  const handleDrawerSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  // ── Pagination config (Ant Design style) ─────────────────────────────────────
  const pagination = useMemo(
    () => ({
      current: page,
      pageSize,
      total,
      showSizeChanger: true,
      showQuickJumper: true,
      pageSizeOptions: ["10", "20", "50", "100"] as string[],
      showTotal: (totalCount: number) => `${t("Tổng:", lang)} ${totalCount}`,
      onChange: handlePageChange,
    }),
    [page, pageSize, total, handlePageChange, lang]
  );

  // ── Render helpers ───────────────────────────────────────────────────────────
  if (errorMsg) {
    return (
      <PageContainer>
        <EmptyState
          title={t("Không thể tải dữ liệu", lang)}
          description={errorMsg}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={t("Chi phí Marketing", lang)}
        subtitle={t("Quản lý báo cáo chi phí marketing", lang)}
        actions={null}
      />

      <MarketingExpenseToolbar
        keyword={keyword}
        onKeywordChange={setKeyword}
        filters={{
          status,
          marketingEmployeeId,
          facebookPageId,
          dateFrom,
          dateTo,
        }}
        onFiltersChange={handleToolbarFiltersChange}
        loading={loading}
        onRefresh={refetch}
        onCreate={handleOpenCreate}
      />

      {loading && expenses.length === 0 ? (
        <SkeletonTable rows={8} columns={10} />
      ) : (
        <MarketingExpenseTable
          data={expenses}
          loading={loading}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onChange={handleTableChange}
          onEdit={handleOpenEdit}
        />
      )}

      <MarketingExpenseDrawer
        mode={drawerMode}
        open={drawerOpen}
        recordId={editingRecordId}
        onClose={handleCloseDrawer}
        onSuccess={handleDrawerSuccess}
      />
    </PageContainer>
  );
}
