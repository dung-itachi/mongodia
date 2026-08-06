/**
 * Marketing Orders Page - Quản lý đơn hàng (Sprint 8.5)
 *
 * Trang này hiển thị tất cả leads đã tạo, cho phép Marketing xem/sửa/xóa.
 */

"use client";

import { useState, useCallback } from "react";
import { message, Modal } from "antd";
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
import {
  useMarketingLeads,
  useUpdateLead,
  useDeleteLead,
  type MarketingLeadFilters,
} from "@/hooks/useMarketingLeads";
import MarketingLeadToolbar from "@/app/(protected)/marketing/input/MarketingLeadToolbar";
import LeadTable from "@/app/(protected)/marketing/input/LeadTable";
import type { MarketingLead } from "@/types/marketing-lead";
import LeadDrawer from "@/app/(protected)/marketing/input/LeadDrawer";
import type { LeadFormData } from "@/app/(protected)/marketing/input/LeadDrawer";
import { LeadDetailView } from "@/components/marketing/leads/LeadDetailView";

export default function MarketingOrdersPage() {
  const [filters, setFilters] = useState<MarketingLeadFilters>({
    page: 1,
    limit: 20,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<MarketingLead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState<MarketingLead | null>(null);
  const [viewingLead, setViewingLead] = useState<MarketingLead | null>(null);

  const { leads, total, page, loading, error, refetch } =
    useMarketingLeads(filters);

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

  const handleUpdateLead = useCallback(
    (data: LeadFormData) => {
      if (!editingLead) return;

      updateMutation.mutate(
        { id: editingLead._id, data: data as unknown as Record<string, unknown> },
        {
          onSuccess: () => {
            void message.success("Cập nhật lead thành công");
            setDrawerOpen(false);
            setEditingLead(null);
          },
          onError: (err) => {
            void message.error(`Lỗi: ${err.message}`);
          },
        }
      );
    },
    [editingLead, updateMutation]
  );

  const handleDeleteClick = useCallback((lead: MarketingLead) => {
    setDeletingLead(lead);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deletingLead) return;

    deleteMutation.mutate(deletingLead._id, {
      onSuccess: () => {
        void message.success("Xóa lead thành công");
        setDeleteConfirmOpen(false);
        setDeletingLead(null);
      },
      onError: (err) => {
        void message.error(`Lỗi: ${err.message}`);
      },
    });
  }, [deletingLead, deleteMutation]);

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
        title="QL đơn hàng MKT"
        subtitle="Danh sách leads đã tạo"
      />

      <CardSection>
        <MarketingLeadToolbar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={() => {
            void refetch();
          }}
          onCreate={() => setDrawerOpen(true)}
          selectedCount={0}
          loading={loading}
        />

        {loading && leads.length === 0 ? (
          <SkeletonTable rows={5} columns={10} />
        ) : error ? (
          <EmptyState
            title="Lỗi tải dữ liệu"
            description={error}
            action={
              <button onClick={() => { void refetch(); }}>Thử lại</button>
            }
          />
        ) : leads.length === 0 ? (
          <EmptyState
            title="Chưa có lead nào"
            description="Bắt đầu bằng cách tạo lead mới"
            action={
              <button onClick={() => setDrawerOpen(true)}>Tạo Lead</button>
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
            />

            {total > 0 && (
              <PaginationComponent
                current={page}
                pageSize={filters.limit ?? 20}
                total={total}
                onChange={handlePageChange}
                showTotal={(t) => `Tổng: ${t} leads`}
              />
            )}
          </>
        )}
      </CardSection>

      <LeadDrawer
        open={drawerOpen}
        loading={updateMutation.isPending}
        lead={editingLead}
        onClose={handleDrawerClose}
        onSubmit={handleUpdateLead}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Xác nhận xóa"
        content={`Bạn có chắc muốn xóa lead "${deletingLead?.customerName}" không?`}
        type="delete"
        confirmText="Xóa"
        cancelText="Hủy"
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
            Chi tiết Lead
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
