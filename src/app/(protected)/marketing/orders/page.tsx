/**
 * Marketing Orders Page - Quản lý đơn hàng (Sprint 8.5, 8.x)
 *
 * Trang này hiển thị tất cả leads đã tạo, cho phép Marketing xem/sửa/xóa.
 * Sprint 8.x: Admin thấy cột Marketing/Sale phụ trách.
 */

"use client";

import { useState, useCallback } from "react";
import { Modal } from "antd";
import { EyeOutlined } from "@ant-design/icons";
import {
  PageContainer,
  PageHeader,
  CardSection,
  PaginationComponent,
  ConfirmDialog,
  EmptyState,
  SkeletonTable,
} from "@/components/common";
import { useAntApp } from "@/providers/AntdProvider";
import { useAuthStore } from "@/store/auth.store";
import {
  useMarketingLeads,
  useMarketingLeadsStats,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  type MarketingLeadFilters,
} from "@/hooks/useMarketingLeads";
import { useShippingFee } from "@/hooks/useShippingFee";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import MarketingLeadToolbar from "@/app/(protected)/marketing/input/MarketingLeadToolbar";
import LeadTable from "@/app/(protected)/marketing/input/LeadTable";
import OrdersStatsCard from "./OrdersStatsCard";
import type { MarketingLead } from "@/types/marketing-lead";
import LeadDrawer from "@/app/(protected)/marketing/input/LeadDrawer";
import type { LeadFormData } from "@/app/(protected)/marketing/input/LeadDrawer";
import { LeadDetailView } from "@/components/marketing/leads/LeadDetailView";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export default function MarketingOrdersPage() {
  const { message } = useAntApp();
  const user = useAuthStore((s) => s.user);
  const lang = useLanguageStore((s) => s.language);

  // Sprint 8.x: Check permissions for admin features
  // - View all orders: marketing-order.viewAll (ADMIN/ADMIN equivalent)
  // - Filter by area: marketing-order.filterByArea
  const permissions = user?.permissions ?? [];
  const canViewAllOrders = permissions.includes("*") ||
    permissions.includes("account.manageAll") ||
    permissions.includes("marketing-order.viewAll");
  const canFilterByArea = permissions.includes("*") ||
    permissions.includes("marketing-order.filterByArea") ||
    canViewAllOrders;

  const [filters, setFilters] = useState<MarketingLeadFilters>({
    page: 1,
    limit: 20,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<MarketingLead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState<MarketingLead | null>(null);
  const [viewingLead, setViewingLead] = useState<MarketingLead | null>(null);

  // Đơn vị tiền chung cho cả stats card và bảng (click icon để toggle)
  const [currency, setCurrency] = useState<"MNT" | "VND">("MNT");

  const { leads, total, page, loading, error, refetch } =
    useMarketingLeads(filters);

  // Thống kê đơn hàng (đếm & doanh thu từ đơn đã chốt)
  // Truyền cùng filter với bảng để số liệu phản ánh scope đang xem.
  const { stats: ordersStats, loading: statsLoading } = useMarketingLeadsStats({
    keyword: filters.keyword,
    source: filters.source,
    teamId: filters.teamId,
    areaId: filters.areaId,
    marketingEmployeeId: filters.marketingEmployeeId,
  });

  // Phí ship hiện tại (MNT) — dùng để tính cột Doanh thu = giá combo - phí ship
  const { data: shippingFeeData } = useShippingFee();
  const shippingFee = shippingFeeData?.fee ?? 0;

  // Tỷ giá MNT → VND — click vào ô tiền sẽ toggle MNT ↔ VND
  const { data: exchangeRateData } = useExchangeRate();
  const exchangeRate = exchangeRateData?.rate ?? 0;

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();

  const handleFiltersChange = useCallback((newFilters: MarketingLeadFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1,
    }));
  }, []);

  const handlePageChange = useCallback((newPage: number, newLimit: number) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
      limit: newLimit,
    }));
  }, []);

  const handleEditLead = useCallback((lead: MarketingLead) => {
    setEditingLead(lead);
    setDrawerOpen(true);
  }, []);

  const handleCreateLead = useCallback(
    (data: LeadFormData) => {
      createMutation.mutate(data as unknown as Record<string, unknown>, {
        onSuccess: () => {
          void message.success(t("Tạo lead thành công", lang));
          setDrawerOpen(false);
        },
        onError: (err) => {
          void message.error(`${t("Lỗi:", lang)} ${err.message}`);
        },
      });
    },
    [createMutation, lang]
  );

  const handleUpdateLead = useCallback(
    (data: LeadFormData) => {
      if (!editingLead) return;

      // Filter out empty string values for optional ObjectId fields
      // so that opening edit form doesn't wipe existing productId/comboId
      // when user hasn't touched the dropdown.
      const cleanedData: Record<string, unknown> = { ...data };
      const optionalObjectIdFields = [
        "facebookPageId",
        "comboId",
        "productId",
        "categoryId",
        "marketingEmployeeId",
        "saleEmployeeId",
      ];
      for (const field of optionalObjectIdFields) {
        if (cleanedData[field] === "" || cleanedData[field] === undefined) {
          delete cleanedData[field];
        }
      }

      updateMutation.mutate(
        { id: editingLead._id, data: cleanedData },
        {
          onSuccess: () => {
            void message.success(t("Cập nhật lead thành công", lang));
            setDrawerOpen(false);
            setEditingLead(null);
          },
          onError: (err) => {
            void message.error(`${t("Lỗi:", lang)} ${err.message}`);
          },
        }
      );
    },
    [editingLead, updateMutation, lang]
  );

  const handleDeleteClick = useCallback((lead: MarketingLead) => {
    setDeletingLead(lead);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deletingLead) return;

    deleteMutation.mutate(deletingLead._id, {
      onSuccess: () => {
        void message.success(t("Xóa lead thành công", lang));
        setDeleteConfirmOpen(false);
        setDeletingLead(null);
      },
      onError: (err) => {
        void message.error(`${t("Lỗi:", lang)} ${err.message}`);
      },
    });
  }, [deletingLead, deleteMutation, lang]);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setEditingLead(null);
  }, []);

  const handleViewLead = useCallback((lead: MarketingLead) => {
    setViewingLead(lead);
  }, []);

  const handleViewEdit = useCallback(() => {
    if (viewingLead) {
      setViewingLead(null);
      setEditingLead(viewingLead);
      setDrawerOpen(true);
    }
  }, [viewingLead]);

  const handleViewDelete = useCallback(() => {
    if (viewingLead) {
      setViewingLead(null);
      setDeletingLead(viewingLead);
      setDeleteConfirmOpen(true);
    }
  }, [viewingLead]);

  return (
    <PageContainer>
      <PageHeader
        title={t("QL đơn hàng MKT", lang)}
        subtitle={t("Danh sách leads đã tạo", lang)}
      />

      <CardSection>
        <MarketingLeadToolbar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={() => {
            void refetch();
          }}
          onCreate={() => setDrawerOpen(true)}
          onPushToSale={() => {}}
          selectedCount={0}
          loading={loading}
          createLabel={t("Thêm đơn hàng", lang)}
          showAreaFilter={canFilterByArea}
        />

        <OrdersStatsCard
          stats={ordersStats}
          loading={statsLoading}
          currency={currency}
          onToggleCurrency={() =>
            setCurrency((c) => (c === "MNT" ? "VND" : "MNT"))
          }
          exchangeRate={exchangeRate}
        />

        {loading && leads.length === 0 ? (
          <SkeletonTable rows={5} columns={10} />
        ) : error ? (
          <EmptyState
            title={t("Lỗi tải dữ liệu", lang)}
            description={error}
            action={
              <button onClick={() => { void refetch(); }}>{t("Thử lại", lang)}</button>
            }
          />
        ) : leads.length === 0 ? (
          <EmptyState
            title={t("Chưa có đơn hàng nào", lang)}
            description={t("Bắt đầu bằng cách tạo đơn hàng mới", lang)}
            action={
              <button onClick={() => setDrawerOpen(true)}>{t("Tạo đơn hàng", lang)}</button>
            }
          />
        ) : (
          <>
            <LeadTable
              data={leads}
              onView={handleViewLead}
              onEdit={handleEditLead}
              onDelete={handleDeleteClick}
              selectedRowKeys={[]}
              onSelectionChange={() => {}}
              loading={loading}
              showEmployeeColumns={canViewAllOrders}
              shippingFee={shippingFee}
              exchangeRate={exchangeRate}
              currency={currency}
              onCurrencyToggle={() =>
                setCurrency((c) => (c === "MNT" ? "VND" : "MNT"))
              }
            />

            {total > 0 && (
              <PaginationComponent
                current={page}
                pageSize={filters.limit ?? 20}
                total={total}
                onChange={handlePageChange}
                showTotal={(total) => `${t("Tổng:", lang)} ${total} ${t("leads", lang)}`}
              />
            )}
          </>
        )}
      </CardSection>

      <LeadDrawer
        open={drawerOpen}
        loading={createMutation.isPending || updateMutation.isPending}
        lead={editingLead}
        onClose={handleDrawerClose}
        onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
        createTitle={t("Thêm đơn hàng", lang)}
        editTitle={t("Sửa đơn hàng", lang)}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t("Xác nhận xóa", lang)}
        content={`${t("Bạn có chắc muốn xóa đơn hàng", lang)} "${deletingLead?.customerName}"?`}
        type="delete"
        confirmText={t("Xóa", lang)}
        cancelText={t("Hủy", lang)}
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setDeletingLead(null);
        }}
      />

      {/* View Lead Modal */}
      <Modal
        title={
          <span>
            <EyeOutlined style={{ marginRight: 8 }} />
            {t("Chi tiết đơn hàng", lang)}
          </span>
        }
        open={!!viewingLead}
        onCancel={() => setViewingLead(null)}
        footer={null}
        width={900}
      >
        {viewingLead && (
          <LeadDetailView
            lead={viewingLead}
            onEdit={handleViewEdit}
            onClose={() => setViewingLead(null)}
            onDelete={handleViewDelete}
          />
        )}
      </Modal>
    </PageContainer>
  );
}
