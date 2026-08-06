"use client";

/**
 * Marketing Lead Detail Page (Sprint 5.5.1 — Marketing Lead Detail)
 *
 * Hiển thị toàn bộ thông tin của một Lead cho marketing team.
 * Action bar với Edit, Assign Sale, Convert, Delete (theo permission).
 * 404 notFound() nếu lead không tồn tại.
 */

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";

import { notFound } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/common";
import { useMarketingLead, useDeleteLead } from "@/hooks/useMarketingLeads";
import { LeadDetailView } from "@/components/marketing/leads/LeadDetailView";

// =============================================================================
// Main Page
// =============================================================================

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: lead, loading, error } = useMarketingLead(id);
  const deleteMutation = useDeleteLead();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // 404 if loaded and lead is null
  if (!loading && !lead && !error) {
    notFound();
  }

  const handleEdit = () => {
    void router.push("/marketing/input");
  };

  const handleDelete = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!lead) return;

    deleteMutation.mutate(lead._id, {
      onSuccess: () => {
        void message.success("Xóa lead thành công");
        setDeleteConfirmOpen(false);
        void router.push("/marketing/input");
      },
      onError: (err) => {
        void message.error(`Lỗi: ${err.message}`);
        setDeleteConfirmOpen(false);
      },
    });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Chi tiết Lead"
        breadcrumb={[
          { label: "Marketing", href: "/marketing" },
          { label: "Nhập số", href: "/marketing/input" },
          { label: lead?.leadCode ?? "..." },
        ]}
        actions={
          <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
            Quay lại
          </Button>
        }
      />

      {/* Lead Detail View */}
      {lead && !loading && (
        <LeadDetailView
          lead={lead}
          onEdit={handleEdit}
          onClose={() => router.back()}
          onDelete={handleDelete}
        />
      )}

      {/* Delete Confirm Modal */}
      {lead && deleteConfirmOpen && (
        <DeleteConfirmModal
          lead={lead}
          open={deleteConfirmOpen}
          loading={deleteMutation.isPending}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </PageContainer>
  );
}

// =============================================================================
// Delete Confirm Modal
// =============================================================================

function DeleteConfirmModal({
  lead,
  open,
  loading,
  onConfirm,
  onCancel,
}: {
  lead: { leadCode: string; customerName: string };
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { Modal } = require("antd");

  return (
    <Modal
      title="Xác nhận xóa Lead"
      open={open}
      okText="Xóa"
      okButtonProps={{ danger: true, loading }}
      cancelText="Hủy"
      onCancel={onCancel}
      onOk={onConfirm}
    >
      <p>
        Bạn có chắc muốn xóa lead <strong>{lead.leadCode}</strong> —{" "}
        <strong>{lead.customerName}</strong> không?
      </p>
      <p style={{ color: "#8c8c8c", fontSize: 13 }}>Hành động này không thể hoàn tác.</p>
    </Modal>
  );
}
