"use client";

/**
 * Marketing Input Page (Sprint 5.2 — Marketing Input)
 *
 * Lead management page for marketing team.
 * Layout: PageHeader → Toolbar → Table → Pagination → Drawer
 */

import { useState, useCallback } from "react";
import { message } from "antd";
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
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  type MarketingLeadFilters,
} from "@/hooks/useMarketingLeads";
import MarketingLeadToolbar from "./MarketingLeadToolbar";
import LeadTable from "./LeadTable";
import LeadDrawer, { type LeadFormData } from "./LeadDrawer";
import type { MarketingLead } from "@/types/marketing-lead";

export default function MarketingInputPage() {
  const [filters, setFilters] = useState<MarketingLeadFilters>({
    page: 1,
    limit: 20,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<MarketingLead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState<MarketingLead | null>(null);

  const { leads, total, page, loading, error, refetch } =
    useMarketingLeads(filters);

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

  const handleCreateLead = useCallback(
    (data: LeadFormData) => {
      createMutation.mutate(data as unknown as Record<string, unknown>, {
        onSuccess: () => {
          void message.success("Tạo lead thành công");
          setDrawerOpen(false);
        },
        onError: (err) => {
          void message.error(`Lỗi: ${err.message}`);
        },
      });
    },
    [createMutation]
  );

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

  return (
    <PageContainer>
      <PageHeader
        title="Nhập số"
        subtitle="Quản lý leads cho marketing"
      />

      <CardSection>
        <MarketingLeadToolbar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={() => {
            void refetch();
          }}
          onCreate={() => setDrawerOpen(true)}
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
              onEdit={handleEditLead}
              onDelete={handleDeleteClick}
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
        loading={createMutation.isPending || updateMutation.isPending}
        lead={editingLead}
        onClose={handleDrawerClose}
        onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
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
    </PageContainer>
  );
}
