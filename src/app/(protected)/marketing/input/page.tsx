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
import { Modal } from "antd";
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
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

export default function MarketingInputPage() {
  const router = useRouter();
  const message = useMessage();
  const lang = useLanguageStore((s) => s.language);
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

  const handleEditLead = useCallback((lead: MarketingLead) => {
    setEditingLead(lead);
    setDrawerOpen(true);
  }, []);

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
      void message.warning(t("Vui lòng chọn ít nhất một lead để đẩy", lang));
      return;
    }
    setPushConfirmOpen(true);
  }, [selectedRowKeys, lang]);

  const handleConfirmPush = useCallback(() => {
    pushToSaleMutation.mutate(
      { leadIds: selectedRowKeys },
      {
        onSuccess: (result) => {
          void message.success(`${t("Đã đẩy", lang)} ${result.pushedCount} ${t("lead sang Sale", lang)}`);
          setPushConfirmOpen(false);
          setSelectedRowKeys([]);
        },
        onError: (err) => {
          void message.error(`${t("Lỗi:", lang)} ${err.message}`);
          setPushConfirmOpen(false);
        },
      }
    );
  }, [selectedRowKeys, pushToSaleMutation, lang]);

  // Handle leads created from input section
  const handleLeadsCreated = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageContainer>
      <PageHeader
        title={t("Nhập số", lang)}
        subtitle={t("Quản lý leads cho marketing", lang)}
      />

      {/* Sprint 8.5 Extension: Marketing Input Section */}
      <CardSection>
        <MarketingInputSection onLeadsCreated={handleLeadsCreated} />
      </CardSection>

      {/* Lead list (table + pagination) moved to /marketing/orders — hidden here. */}
      {false && (
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
            title={t("Lỗi tải dữ liệu", lang)}
            description={error ?? undefined}
            action={
              <button onClick={() => { void refetch(); }}>{t("Thử lại", lang)}</button>
            }
          />
        ) : leads.length === 0 ? (
          <EmptyState
            title={t("Chưa có lead nào", lang)}
            description={t("Bắt đầu bằng cách tạo lead mới", lang)}
            action={
              <button onClick={() => setDrawerOpen(true)}>{t("Tạo Lead", lang)}</button>
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
                showTotal={(total) => `${t("Tổng:", lang)} ${total} ${t("leads", lang)}`}
              />
            )}
          </>
        )}
      </CardSection>
      )}

      <LeadDrawer
        open={drawerOpen}
        loading={createMutation.isPending || updateMutation.isPending}
        lead={editingLead}
        onClose={handleDrawerClose}
        onSubmit={editingLead ? handleUpdateLead : handleCreateLead}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={t("Xác nhận xóa", lang)}
        content={`${t("Bạn có chắc muốn xóa lead", lang)} "${deletingLead?.customerName}"?`}
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

      {/* Sprint 8.5: Push to Sale confirmation modal */}
      <Modal
        title={t("Xác nhận đẩy sang Sale", lang)}
        open={pushConfirmOpen}
        onOk={handleConfirmPush}
        onCancel={() => setPushConfirmOpen(false)}
        okText={t("Đẩy sang Sale", lang)}
        cancelText={t("Hủy", lang)}
        okButtonProps={{
          loading: pushToSaleMutation.isPending,
        }}
      >
        <p>
          {t("Bạn có chắc muốn đẩy", lang)} <strong>{selectedRowKeys.length}</strong> {t("lead sang Sale?", lang)}
        </p>
        <p style={{ color: "#8c8c8c", marginTop: 8 }}>
          {t("Các lead đã được gán Sale sẽ không được chọn.", lang)}
        </p>
      </Modal>
    </PageContainer>
  );
}
