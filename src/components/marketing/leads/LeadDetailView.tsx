"use client";

/**
 * Lead Detail View - Reusable component for viewing lead details
 * Can be used in both detail page and modal
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, Tabs, message, Modal, Tag, Space, Timeline } from "antd";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserSwitchOutlined,
  CheckCircleFilled,
  SwapOutlined,
  DeleteOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";

import { CardSection, DescriptionList, StatusBadge, SkeletonCard, EmptyState } from "@/components/common";
import AssignSaleDrawer from "@/components/marketing/leads/AssignSaleDrawer";
import { useLeadTimeline, useConvertLead, useUpdateLead, useDeleteLead } from "@/hooks/useMarketingLeads";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LeadStatus } from "@/constants/leadStatus";
import { MARKETING_LEAD_STATUS_OPTIONS } from "@/types/marketing-lead";
import type { MarketingLead, MarketingLeadStatus } from "@/types/marketing-lead";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permission";
import styles from "@/app/(protected)/marketing/input/[id]/lead-detail.module.css";

dayjs.extend(relativeTime);

// =============================================================================
// Constants
// =============================================================================

const STATUS_COLOR_MAP: Record<string, { color: string; backgroundColor: string }> = {
  NEW: { color: "#1890ff", backgroundColor: "#e6f7ff" },
  CONTACTED: { color: "#fa8c16", backgroundColor: "#fff7e6" },
  ASSIGNED: { color: "#722ed1", backgroundColor: "#f9f0ff" },
  QUALIFIED: { color: "#52c41a", backgroundColor: "#f6ffed" },
  CLOSED: { color: "#52c41a", backgroundColor: "#f6ffed" },
  CANCELLED: { color: "#ff4d4f", backgroundColor: "#fff1f0" },
};

const LEAD_SOURCE_COLOR_MAP: Record<string, string> = {
  FACEBOOK: "#1877f2",
  ZALO: "#0068ff",
  WEBSITE: "#52c41a",
  REFERRAL: "#722ed1",
  HOTLINE: "#fa8c16",
  WALK_IN: "#8c8c8c",
};

// =============================================================================
// Helpers
// =============================================================================

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTag(lead: MarketingLead) {
  const config = STATUS_COLOR_MAP[lead.status] ?? { color: "#8c8c8c", backgroundColor: "#fafafa" };
  return (
    <StatusBadge
      status={lead.status}
      mapping={{ [lead.status]: { ...config, label: lead.statusLabel } }}
    />
  );
}

function getSourceTag(source: LeadSource | string) {
  const label = LEAD_SOURCE_LABELS[source as LeadSource] ?? source;
  const color = LEAD_SOURCE_COLOR_MAP[source] ?? "#8c8c8c";
  return <Tag style={{ color, borderColor: color }}>{label}</Tag>;
}

// =============================================================================
// Tab: Thông tin
// =============================================================================

function LeadInfoTab({ lead }: { lead: MarketingLead }) {
  return (
    <div className={styles["tab-content"]}>
      <CardSection>
        <DescriptionList
          title="Thông tin Lead"
          columns={3}
          size="small"
          items={[
            {
              label: "Mã Lead",
              value: <span className={styles["lead-code"]}>{lead.leadCode}</span>,
            },
            {
              label: "Trạng thái",
              value: getStatusTag(lead),
            },
            {
              label: "Nguồn",
              value: getSourceTag(lead.source),
            },
            {
              label: "Ngày tạo",
              value: formatDateTime(lead.createdAt),
            },
            {
              label: "Cập nhật lần cuối",
              value: formatDateTime(lead.updatedAt),
            },
            {
              label: "Trùng lặp",
              value: lead.isDuplicate ? "Có" : "Không",
            },
            {
              label: "Trang Facebook",
              value: lead.facebookPage ? (
                <span>
                  <Tag color="blue">{lead.facebookPage.name}</Tag>
                  <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                    {` (${lead.facebookPage.code})`}
                  </span>
                </span>
              ) : (
                <span style={{ color: "#bfbfbf" }}>-</span>
              ),
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title="Thông tin Khách hàng"
          columns={2}
          size="small"
          items={[
            {
              label: "Tên khách hàng",
              value: <span className={styles["primary-text"]}>{lead.customerName}</span>,
            },
            {
              label: "Điện thoại",
              value: lead.phone ?? "-",
            },
            {
              label: "Điện thoại 2",
              value: lead.phone2 ?? "-",
            },
            {
              label: "Email",
              value: lead.email ?? "-",
            },
            {
              label: "Địa chỉ",
              value: lead.address ?? "-",
            },
            {
              label: "Facebook",
              value: lead.facebookLink ? (
                <a href={lead.facebookLink} target="_blank" rel="noopener noreferrer">
                  {lead.facebookLink}
                </a>
              ) : (
                "-"
              ),
              span: 2,
            },
          ]}
        />
      </CardSection>

      {lead.combo && (
        <CardSection>
          <DescriptionList
            title="Thông tin Combo"
            columns={2}
            size="small"
            items={[
              {
                label: "Tên Combo",
                value: <span className={styles["combo-text"]}>{lead.combo.name}</span>,
              },
              {
                label: "Mã Combo",
                value: lead.combo.code ?? "-",
              },
            ]}
          />
        </CardSection>
      )}

      <CardSection>
        <DescriptionList
          title="Thông tin Marketing"
          columns={2}
          size="small"
          items={[
            {
              label: "Nhân viên Marketing",
              value: lead.marketingEmployee?.name ?? "-",
            },
            {
              label: "Mã Marketing",
              value: lead.marketingEmployee?.employeeCode ?? "-",
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title="Thông tin Sale"
          columns={2}
          size="small"
          items={[
            {
              label: "Nhân viên Sale",
              value: lead.saleEmployee?.name ?? "-",
            },
            {
              label: "Mã Sale",
              value: lead.saleEmployee?.employeeCode ?? "-",
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title="Ghi chú"
          columns={1}
          size="small"
          items={[
            {
              label: "Nội dung",
              value: lead.note || "Không có ghi chú",
              span: 1,
            },
          ]}
        />
      </CardSection>
    </div>
  );
}

// =============================================================================
// Tab: Lịch sử
// =============================================================================

function HistoryTab({ lead }: { lead: MarketingLead }) {
  return (
    <div className={styles["tab-content"]}>
      <CardSection>
        <DescriptionList
          title="Lịch sử thay đổi trạng thái"
          columns={1}
          size="small"
          items={[
            {
              label: "Trạng thái hiện tại",
              value: getStatusTag(lead),
            },
            {
              label: "Ngày tạo",
              value: formatDateTime(lead.createdAt),
            },
            {
              label: "Cập nhật cuối",
              value: formatDateTime(lead.updatedAt),
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <p className={styles["coming-soon"]}>
          Lịch sử chi tiết từng thay đổi trạng thái đang được phát triển.
        </p>
      </CardSection>
    </div>
  );
}

// =============================================================================
// Tab: Timeline
// =============================================================================

function TimelineTab({ leadId }: { leadId: string }) {
  const { items, loading, error } = useLeadTimeline(leadId);

  if (loading) {
    return (
      <div className={styles["tab-content"]}>
        <CardSection>
          <SkeletonCard rows={5} />
        </CardSection>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles["tab-content"]}>
        <CardSection>
          <EmptyState
            title="Không thể tải Timeline"
            description={error}
          />
        </CardSection>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles["tab-content"]}>
        <CardSection>
          <EmptyState
            title="Chưa có lịch sử Timeline"
            description="Các thay đổi của Lead sẽ hiển thị tại đây."
          />
        </CardSection>
      </div>
    );
  }

  return (
    <div className={styles["tab-content"]} aria-label="Lead Timeline">
      <CardSection>
        <Timeline
          aria-label="Lead activity timeline"
          items={items.map((item) => {
            const actionLabel = getActionLabel(item.action);
            const description = getActionDescription(item);

            return {
              color: getActionColor(item.action),
              children: (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{actionLabel}</div>
                  {description && (
                    <div style={{ color: "#595959", marginBottom: 4 }}>{description}</div>
                  )}
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                    {item.employee?.name ?? "Hệ thống"}
                    {" · "}
                    {dayjs(item.createdAt).fromNow()}
                  </div>
                </div>
              ),
            };
          })}
        />
      </CardSection>
    </div>
  );
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATED: "Lead được tạo",
    UPDATED: "Lead được cập nhật",
    ASSIGNED: "Sale được gán",
    UNASSIGNED: "Sale bị hủy gán",
    STATUS_CHANGED: "Trạng thái thay đổi",
    ORDER_CREATED: "Đơn hàng được tạo",
    ORDER_CANCELLED: "Đơn hàng bị hủy",
    SALE_CHANGED: "Sale phụ trách thay đổi",
    MARKETING_CHANGED: "Marketing phụ trách thay đổi",
    NOTE_UPDATED: "Ghi chú được cập nhật",
    DELETED: "Lead bị xóa",
  };
  return labels[action] ?? action;
}

function getActionDescription(item: {
  action: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}): React.ReactNode {
  if (item.action === "ASSIGNED" && item.note) {
    const parts = item.note.split("→");
    if (parts.length === 2) {
      const oldPart = parts[0].replace(/^.*\s/, "").replace(/[\(\)]/g, "").trim();
      const newPart = parts[1].replace(/[\(\)]/g, "").trim();
      return (
        <span>
          Sale: <strong>{oldPart}</strong> → <strong>{newPart}</strong>
        </span>
      );
    }
  }

  if (item.action === "STATUS_CHANGED" && item.oldValue && item.newValue) {
    return (
      <span>
        <Tag>{item.oldValue}</Tag> → <Tag>{item.newValue}</Tag>
      </span>
    );
  }

  if (item.note) {
    return <span>{item.note}</span>;
  }

  return null;
}

function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    CREATED: "blue",
    UPDATED: "gray",
    ASSIGNED: "green",
    UNASSIGNED: "orange",
    STATUS_CHANGED: "blue",
    ORDER_CREATED: "green",
    ORDER_CANCELLED: "red",
    SALE_CHANGED: "purple",
    MARKETING_CHANGED: "purple",
    NOTE_UPDATED: "gray",
    DELETED: "red",
  };
  return colors[action] ?? "gray";
}

// =============================================================================
// Tab: File đính kèm
// =============================================================================

function AttachmentsTab() {
  return (
    <div className={styles["tab-content"]}>
      <CardSection>
        <EmptyState
          title="Chưa có file đính kèm"
          description="Tính năng đính kèm file đang được phát triển."
        />
      </CardSection>
    </div>
  );
}

// =============================================================================
// Props
// =============================================================================

export interface LeadDetailViewProps {
  lead: MarketingLead;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function LeadDetailView({ lead, onEdit, onClose, onDelete }: LeadDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const convertMutation = useConvertLead();

  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<MarketingLeadStatus | null>(null);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const permissions = user?.permissions ?? [];

  const canConvert = lead.status === LeadStatus.QUALIFIED && !lead.isConverted && !!lead.saleEmployee;

  const handleAssignSaleOpen = () => {
    setAssignDrawerOpen(true);
  };

  const handleAssignSaleClose = () => {
    setAssignDrawerOpen(false);
  };

  const handleAssignSaleConfirm = async (saleEmployeeId: string) => {
    const res = await fetch(`/api/marketing/leads/${lead._id}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleEmployeeId }),
    });

    const json = await res.json();

    if (!json.success) {
      void message.error(json.message ?? "Phân công Sale thất bại");
      return;
    }

    void message.success("Phân công Sale thành công");
    setAssignDrawerOpen(false);

    await queryClient.invalidateQueries({ queryKey: ["marketing-lead", lead._id] });
    await queryClient.invalidateQueries({ queryKey: ["marketing-leads"] });
    await queryClient.invalidateQueries({ queryKey: ["marketing-dashboard"] });
  };

  const handleConvert = () => {
    setConvertModalOpen(true);
  };

  const handleConvertConfirm = () => {
    convertMutation.mutate(lead._id, {
      onSuccess: (result) => {
        void message.success("Convert Lead thành công");
        setConvertModalOpen(false);
        void router.push(`/orders/${result.orderId}`);
      },
      onError: (err) => {
        void message.error(`Lỗi: ${err.message}`);
        setConvertModalOpen(false);
      },
    });
  };

  const handleChangeStatus = (status: MarketingLeadStatus) => {
    setPendingStatus(status);
    setStatusChangeOpen(true);
  };

  const handleStatusConfirm = () => {
    if (!pendingStatus) return;

    updateMutation.mutate(
      { id: lead._id, data: { status: pendingStatus } as Record<string, unknown> },
      {
        onSuccess: () => {
          void message.success("Đổi trạng thái thành công");
          setStatusChangeOpen(false);
          setPendingStatus(null);
        },
        onError: (err) => {
          void message.error(`Lỗi: ${err.message}`);
        },
      }
    );
  };

  const tabItems = [
    {
      key: "info",
      label: (
        <span className={styles["tab-label"]}>
          <InfoCircleOutlined />
          Thông tin
        </span>
      ),
      children: <LeadInfoTab lead={lead} />,
    },
    {
      key: "history",
      label: (
        <span className={styles["tab-label"]}>
          <HistoryOutlined />
          Lịch sử
        </span>
      ),
      children: <HistoryTab lead={lead} />,
    },
    {
      key: "timeline",
      label: (
        <span className={styles["tab-label"]}>
          Timeline
        </span>
      ),
      children: <TimelineTab leadId={lead._id} />,
    },
    {
      key: "attachments",
      label: (
        <span className={styles["tab-label"]}>
          <PaperClipOutlined />
          File đính kèm
        </span>
      ),
      children: <AttachmentsTab />,
    },
  ];

  const statusMenuItems: MenuProps["items"] = MARKETING_LEAD_STATUS_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    disabled: opt.value === lead.status,
    onClick: () => handleChangeStatus(opt.value),
  }));

  const moreMenuItems: MenuProps["items"] = [
    {
      key: "status",
      label: "Đổi trạng thái",
      icon: <SwapOutlined />,
      children: statusMenuItems,
    },
    { type: "divider" as const },
    {
      key: "delete",
      label: "Xóa Lead",
      icon: <DeleteOutlined />,
      danger: true,
    },
  ];

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "delete") {
      onDelete();
    }
  };

  return (
    <>
      {/* Action Bar */}
      <CardSection>
        <div className={styles["action-bar"]}>
          {hasPermission(permissions, "lead.update") && (
            <Button icon={<EditOutlined />} onClick={onEdit}>
              Sửa
            </Button>
          )}

          {hasPermission(permissions, "lead.assign") && !lead.saleEmployee && (
            <Button icon={<UserSwitchOutlined />} onClick={handleAssignSaleOpen}>
              Giao Sale
            </Button>
          )}

          {canConvert && (
            <Button
              type="primary"
              icon={<CheckCircleFilled />}
              onClick={handleConvert}
            >
              Convert
            </Button>
          )}

          <Dropdown
            menu={{ items: moreMenuItems, onClick: handleMenuClick }}
            trigger={["click"]}
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      </CardSection>

      {/* Tabs */}
      <CardSection>
        <Tabs defaultActiveKey="info" items={tabItems} />
      </CardSection>

      {/* Status Change Modal */}
      <StatusChangeConfirmModal
        lead={lead}
        newStatus={pendingStatus}
        open={statusChangeOpen}
        loading={updateMutation.isPending}
        onConfirm={handleStatusConfirm}
        onCancel={() => {
          setStatusChangeOpen(false);
          setPendingStatus(null);
        }}
      />

      {/* Assign Sale Drawer */}
      <AssignSaleDrawer
        open={assignDrawerOpen}
        lead={lead}
        onClose={handleAssignSaleClose}
        onConfirm={handleAssignSaleConfirm}
      />

      {/* Convert Modal */}
      <ConvertConfirmModal
        lead={lead}
        open={convertModalOpen}
        loading={convertMutation.isPending}
        onConfirm={handleConvertConfirm}
        onCancel={() => setConvertModalOpen(false)}
      />
    </>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function StatusChangeConfirmModal({
  lead,
  newStatus,
  open,
  loading,
  onConfirm,
  onCancel,
}: {
  lead: MarketingLead;
  newStatus: MarketingLeadStatus | null;
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const newLabel = newStatus
    ? MARKETING_LEAD_STATUS_OPTIONS.find((o) => o.value === newStatus)?.label
    : "";
  const newConfig = newStatus ? STATUS_COLOR_MAP[newStatus] : null;

  return (
    <Modal
      title="Xác nhận đổi trạng thái"
      open={open}
      okText="Xác nhận"
      cancelText="Hủy"
      onCancel={onCancel}
      onOk={onConfirm}
      okButtonProps={{ loading }}
    >
      <p>
        Chuyển trạng thái lead <strong>{lead.leadCode}</strong> từ{" "}
        <StatusBadge
          status={lead.status}
          mapping={{
            [lead.status]: {
              ...(STATUS_COLOR_MAP[lead.status] ?? {}),
              label: lead.statusLabel,
            },
          }}
        />{" "}
        sang{" "}
        {newConfig && newLabel ? (
          <StatusBadge
            status={newStatus!}
            mapping={{ [newStatus!]: { ...newConfig, label: newLabel } }}
          />
        ) : (
          <strong>{newLabel}</strong>
        )}
        ?
      </p>
    </Modal>
  );
}

function ConvertConfirmModal({
  lead,
  open,
  loading,
  onConfirm,
  onCancel,
}: {
  lead: MarketingLead;
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title="Xác nhận Convert Lead"
      open={open}
      okText="Convert"
      cancelText="Hủy"
      onCancel={onCancel}
      onOk={onConfirm}
      okButtonProps={{ loading }}
    >
      <p>
        Bạn có chắc muốn chuyển đổi lead <strong>{lead.leadCode}</strong> —{" "}
        <strong>{lead.customerName}</strong> thành đơn hàng?
      </p>
      <p style={{ color: "#8c8c8c", fontSize: 13 }}>
        Hành động này sẽ tạo Order mới và không thể hoàn tác.
      </p>
    </Modal>
  );
}
