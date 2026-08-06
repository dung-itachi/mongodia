/**
 * Marketing Input Page (Sprint 5.2, 8.5, 8.5 Extension — Marketing Input)
 *
 * Lead management page for marketing team.
 * Layout: PageHeader → MarketingInputSection → LeadTable → Pagination → Drawer
 *
 * Sprint 8.5: Added "Đẩy sang Sale" functionality with row selection.
 * Sprint 8.5 Extension: Added MarketingInputSection for product selection,
 *                     lead input, and staging area.
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { message, Modal } from "antd";
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
import { usePushLeadsToSale } from "@/hooks/usePushLeadsToSale";
import MarketingLeadToolbar from "./MarketingLeadToolbar";
import LeadTable from "./LeadTable";
import LeadDrawer, { type LeadFormData } from "./LeadDrawer";
import MarketingInputSection from "@/components/marketing/input/MarketingInputSection";
import type { MarketingLead } from "@/types/marketing-lead";

export default function MarketingInputPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<MarketingLeadFilters>({
    page: 1,
    limit: 20,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<MarketingLead | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingLead, setDeletingLead] = useState<MarketingLead | null>(null);
  
  // Sprint 8.5: Row selection for bulk push to Sale
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [pushConfirmOpen, setPushConfirmOpen] = useState(false);

  const { leads, total, page, loading, error, refetch } =
    useMarketingLeads(filters);

  const createMutation = useCreateLead();
  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const pushToSaleMutation = usePushLeadsToSale();

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

  const handleViewLead = useCallback(
    (lead: MarketingLead) => {
      void router.push(`/marketing/input/${lead._id}`);
    },
    [router]
  );

  // Sprint 8.5: Selection handlers
  const handleSelectionChange = useCallback((keys: string[]) => {
    setSelectedRowKeys(keys);
  }, []);

  const handlePushToSale = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      void message.warning("Vui lòng chọn ít nhất một lead để đẩy");
      return;
    }
    setPushConfirmOpen(true);
  }, [selectedRowKeys]);

  const handleConfirmPush = useCallback(() => {
    pushToSaleMutation.mutate(
      { leadIds: selectedRowKeys },
      {
        onSuccess: (result) => {
          void message.success(`Đã đẩy ${result.pushedCount} lead sang Sale`);
          setPushConfirmOpen(false);
          setSelectedRowKeys([]);
        },
        onError: (err) => {
          void message.error(`Lỗi: ${err.message}`);
          setPushConfirmOpen(false);
        },
      }
    );
  }, [selectedRowKeys, pushToSaleMutation]);

  // Handle leads created from input section
  const handleLeadsCreated = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageContainer>
      <PageHeader
        title="Nhập số"
        subtitle="Quản lý leads cho marketing"
      />

      {/* Sprint 8.5 Extension: Marketing Input Section */}
      <CardSection>
        <MarketingInputSection onLeadsCreated={handleLeadsCreated} />
      </CardSection>

      <CardSection>
        <MarketingLeadToolbar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={() => {
            void refetch();
          }}
          onCreate={() => setDrawerOpen(true)}
          onPushToSale={handlePushToSale}
          selectedCount={selectedRowKeys.length}
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
              selectedRowKeys={selectedRowKeys}
              onSelectionChange={handleSelectionChange}
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

      {/* Sprint 8.5: Push to Sale confirmation modal */}
      <Modal
        title="Xác nhận đẩy sang Sale"
        open={pushConfirmOpen}
        onOk={handleConfirmPush}
        onCancel={() => setPushConfirmOpen(false)}
        okText="Đẩy sang Sale"
        cancelText="Hủy"
        okButtonProps={{
          loading: pushToSaleMutation.isPending,
        }}
      >
        <p>
          Bạn có chắc muốn đẩy <strong>{selectedRowKeys.length}</strong> lead sang Sale?
        </p>
        <p style={{ color: "#8c8c8c", marginTop: 8 }}>
          Các lead đã được gán Sale sẽ không được chọn.
        </p>
      </Modal>
    </PageContainer>
  );
}
