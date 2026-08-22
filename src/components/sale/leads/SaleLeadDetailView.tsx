"use client";

/**
 * SaleLeadDetailView - Tabs view cho Sale Leads
 *
 * Tương tự LeadDetailView nhưng dùng cho SaleLead type, với 4 tabs:
 * - Thông tin: Toàn bộ thông tin khách hàng, sản phẩm, combo, phân công
 * - Lịch sử: Trạng thái + timeline cập nhật
 * - Timeline: Hoạt động chi tiết của Lead (tạo, sửa, gán, đổi trạng thái)
 * - Cuộc gọi: Lịch sử các cuộc gọi của Sale với khách
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Tabs, Tag, Modal, Timeline } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserSwitchOutlined,
  CheckCircleFilled,
  PhoneOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

import { CardSection, DescriptionList, StatusBadge, SkeletonCard, EmptyState } from "@/components/common";
import CallLogTimeline from "@/components/sale/leads/CallLogTimeline";
import { useLeadTimeline, useConvertLead } from "@/hooks/useMarketingLeads";
import { useLeadCallHistory } from "@/hooks/useLeadCallLog";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LeadStatus, LEAD_STATUS_LABELS } from "@/constants/leadStatus";
import type { SaleLead } from "@/hooks/useSaleLeads";
import styles from "@/app/(protected)/marketing/input/[id]/lead-detail.module.css";
import { useMessage } from "@/contexts/MessageContext";

dayjs.extend(relativeTime);

const STATUS_COLOR_MAP: Record<string, { color: string; backgroundColor: string }> = {
  NEW: { color: "#722ed1", backgroundColor: "#f9f0ff" },
  CONTACTED: { color: "#1890ff", backgroundColor: "#e6f7ff" },
  ASSIGNED: { color: "#722ed1", backgroundColor: "#f9f0ff" },
  QUALIFIED: { color: "#52c41a", backgroundColor: "#f6ffed" },
  CLOSED: { color: "#52c41a", backgroundColor: "#f6ffed" },
  CANCELLED: { color: "#ff4d4f", backgroundColor: "#fff1f0" },
  POTENTIAL: { color: "#52c41a", backgroundColor: "#f6ffed" },
  NO_ANSWER: { color: "#fa8c16", backgroundColor: "#fff7e6" },
  LOST: { color: "#ff4d4f", backgroundColor: "#fff1f0" },
  PROCESSING: { color: "#faad14", backgroundColor: "#fffbe6" },
  ORDER_CREATED: { color: "#13c2c2", backgroundColor: "#e6fffb" },
  REJECTED: { color: "#fa541c", backgroundColor: "#fff2e8" },
};

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

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getStatusTag(lead: SaleLead) {
  const config = STATUS_COLOR_MAP[lead.status] ?? { color: "#8c8c8c", backgroundColor: "#fafafa" };
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <StatusBadge
        status={lead.status}
        mapping={{ [lead.status]: { ...config, label: LEAD_STATUS_LABELS[lead.status] ?? lead.status } }}
      />
      {lead.noAnswerCount !== undefined && lead.noAnswerCount > 0 && (
        <Tag color={lead.noAnswerCount >= 3 ? "red" : "gold"}>
          📵 K nghe: {lead.noAnswerCount}
        </Tag>
      )}
      {lead.isConverted && <Tag color="success">✓ Đã chốt đơn</Tag>}
    </div>
  );
}

function getSourceTag(sourceType: string) {
  const label = LEAD_SOURCE_LABELS[sourceType as LeadSource] ?? sourceType;
  return <Tag color="geekblue">{label}</Tag>;
}

// =============================================================================
// Tab: Thông tin
// =============================================================================

function LeadInfoTab({ lead }: { lead: SaleLead }) {
  return (
    <div className={styles["tab-content"]}>
      <CardSection>
        <DescriptionList
          title="Thông tin Khách hàng"
          columns={3}
          size="small"
          items={[
            {
              label: "Mã Khách hàng",
              value: <span className={styles["lead-code"]}>{lead.leadCode}</span>,
            },
            {
              label: "Trạng thái",
              value: getStatusTag(lead),
            },
            {
              label: "Nguồn",
              value: getSourceTag(lead.sourceType),
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
          title="Thông tin liên hệ"
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

      <CardSection>
        <DescriptionList
          title="Sản phẩm & Combo"
          columns={2}
          size="small"
          items={[
            {
              label: "Sản phẩm",
              value: lead.product ? (
                <span className={styles["primary-text"]}>{lead.product.name}</span>
              ) : (
                <span style={{ color: "#bfbfbf" }}>-</span>
              ),
            },
            {
              label: "Combo",
              value: lead.combo ? (
                <span className={styles["combo-text"]}>{lead.combo.name}</span>
              ) : (
                <span style={{ color: "#bfbfbf" }}>-</span>
              ),
            },
            {
              label: "Mã Combo",
              value: lead.combo?.code ?? "-",
            },
            {
              label: "Số lượng",
              value: lead.quantity ?? "-",
            },
            {
              label: "Đơn giá (MNT)",
              value: lead.unitPriceMNT ? lead.unitPriceMNT.toLocaleString("vi-VN") + " ₮" : "-",
            },
            {
              label: "Tỷ giá (1 ₮ = ? VND)",
              value: lead.exchangeRate ? lead.exchangeRate.toLocaleString("vi-VN") : "-",
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title="Thông tin Marketing"
          columns={2}
          size="small"
          items={[
            {
              label: "Nhân viên Marketing",
              value: lead.marketingEmployeeId?.name ?? "-",
            },
            {
              label: "Mã Marketing",
              value: lead.marketingEmployeeId?.employeeCode ?? "-",
            },
            {
              label: "Nhân viên Sale",
              value: lead.saleEmployeeId?.name ?? (
                <span style={{ color: "#bfbfbf" }}>Chưa phân công</span>
              ),
            },
            {
              label: "Mã Sale",
              value: lead.saleEmployeeId?.employeeCode ?? "-",
            },
            {
              label: "Ngày phân công",
              value: formatDateTime(lead.assignedAt),
              span: 2,
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title="Thời gian đơn hàng (Sprint 8.x)"
          columns={3}
          size="small"
          items={[
            {
              label: "TG từ Landing Page",
              value: formatDateTime(lead.leadDate),
            },
            {
              label: "TG đơn hàng (khách đặt)",
              value: formatDateTime(lead.orderDate),
            },
            {
              label: "TG nhận đơn (MKT nhận)",
              value: formatDateTime(lead.receivedDate),
            },
            {
              label: "Đã chuyển đổi",
              value: lead.isConverted ? "Có" : "Chưa",
            },
            {
              label: "TG chuyển đổi",
              value: formatDateTime(lead.convertedAt),
            },
            {
              label: "Mã đơn hàng",
              value: lead.convertedOrderId ? (
                <span className={styles["lead-code"]}>{lead.convertedOrderId}</span>
              ) : (
                "-"
              ),
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
              value: lead.note || (
                <span style={{ color: "#bfbfbf" }}>Không có ghi chú</span>
              ),
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

function HistoryTab({ lead }: { lead: SaleLead }) {
  return (
    <div className={styles["tab-content"]}>
      <CardSection>
        <DescriptionList
          title="Lịch sử thay đổi trạng thái"
          columns={2}
          size="small"
          items={[
            {
              label: "Trạng thái hiện tại",
              value: getStatusTag(lead),
              span: 2,
            },
            {
              label: "Ngày tạo",
              value: formatDateTime(lead.createdAt),
            },
            {
              label: "Cập nhật cuối",
              value: formatDateTime(lead.updatedAt),
            },
            {
              label: "Ngày phân công",
              value: formatDateTime(lead.assignedAt),
            },
            {
              label: "Số lần không nghe",
              value: lead.noAnswerCount ?? 0,
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
            description="Các thay đổi của Khách hàng sẽ hiển thị tại đây."
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
              content: (
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
    CREATED: "Khách hàng được tạo",
    UPDATED: "Khách hàng được cập nhật",
    ASSIGNED: "Sale được gán",
    UNASSIGNED: "Sale bị hủy gán",
    STATUS_CHANGED: "Trạng thái thay đổi",
    ORDER_CREATED: "Đơn hàng được tạo",
    ORDER_CANCELLED: "Đơn hàng bị hủy",
    SALE_CHANGED: "Sale phụ trách thay đổi",
    MARKETING_CHANGED: "Marketing phụ trách thay đổi",
    NOTE_UPDATED: "Ghi chú được cập nhật",
    DELETED: "Khách hàng bị xóa",
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
// Tab: Cuộc gọi (Module 6 - Nhật ký cuộc gọi)
// =============================================================================

function CallLogTab({ leadId }: { leadId: string }) {
  const { callHistory, loading, error } = useLeadCallHistory(leadId);

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
            title="Không thể tải lịch sử cuộc gọi"
            description={error}
          />
        </CardSection>
      </div>
    );
  }

  return (
    <div className={styles["tab-content"]}>
      <CardSection>
        <CallLogTimeline callHistory={callHistory} showSaleName />
      </CardSection>
    </div>
  );
}

// =============================================================================
// Props & Main Component
// =============================================================================

export interface SaleLeadDetailViewProps {
  lead: SaleLead;
  onEdit?: () => void;
  onClose?: () => void;
  onReassign?: () => void;
  onLogCall?: () => void;
}

export function SaleLeadDetailView({
  lead,
  onEdit,
  onClose,
  onReassign,
  onLogCall,
}: SaleLeadDetailViewProps) {
  const router = useRouter();
  const message = useMessage();

  const convertMutation = useConvertLead();
  const [convertModalOpen, setConvertModalOpen] = useState(false);

  // Allow convert only when lead is qualified/potential and not yet converted
  const canConvert =
    !lead.isConverted &&
    (lead.status === LeadStatus.QUALIFIED ||
      lead.status === LeadStatus.POTENTIAL ||
      lead.status === LeadStatus.NEW);

  const handleConvert = () => {
    setConvertModalOpen(true);
  };

  const handleConvertConfirm = () => {
    convertMutation.mutate(lead._id, {
      onSuccess: (result) => {
        void message.success("Chuyển đổi Khách hàng thành công");
        setConvertModalOpen(false);
        void router.push(`/orders/${result.orderId}`);
      },
      onError: (err) => {
        void message.error(`Lỗi: ${err.message}`);
        setConvertModalOpen(false);
      },
    });
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
      label: <span className={styles["tab-label"]}>Timeline</span>,
      children: <TimelineTab leadId={lead._id} />,
    },
    {
      key: "calls",
      label: (
        <span className={styles["tab-label"]}>
          <PhoneOutlined />
          Cuộc gọi
        </span>
      ),
      children: <CallLogTab leadId={lead._id} />,
    },
  ];

  return (
    <>
      {/* Action Bar */}
      <CardSection>
        <div className={styles["action-bar"]}>
          {onEdit && !lead.isConverted && (
            <Button icon={<EditOutlined />} onClick={onEdit}>
              Sửa
            </Button>
          )}

          {onReassign && (
            <Button icon={<UserSwitchOutlined />} onClick={onReassign}>
              Phân công lại
            </Button>
          )}

          {onLogCall && !lead.isConverted && (
            <Button
              type="primary"
              icon={<PhoneOutlined />}
              onClick={onLogCall}
            >
              Gọi khách
            </Button>
          )}

          {canConvert && onEdit && (
            <Button
              type="primary"
              icon={<CheckCircleFilled />}
              onClick={handleConvert}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              Chuyển đổi
            </Button>
          )}

          {onClose && (
            <Button icon={<ArrowLeftOutlined />} onClick={onClose}>
              Quay lại
            </Button>
          )}
        </div>
      </CardSection>

      {/* Tabs */}
      <CardSection>
        <Tabs defaultActiveKey="info" items={tabItems} />
      </CardSection>

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

function ConvertConfirmModal({
  lead,
  open,
  loading,
  onConfirm,
  onCancel,
}: {
  lead: SaleLead;
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      title="Xác nhận Chuyển đổi Khách hàng"
      open={open}
      okText="Chuyển đổi"
      cancelText="Hủy"
      onCancel={onCancel}
      onOk={onConfirm}
      okButtonProps={{ loading }}
    >
      <p>
        Bạn có chắc muốn chuyển đổi khách hàng <strong>{lead.leadCode}</strong> —{" "}
        <strong>{lead.customerName}</strong> thành đơn hàng?
      </p>
      <p style={{ color: "#8c8c8c", fontSize: 13 }}>
        Hành động này sẽ tạo Order mới và không thể hoàn tác.
      </p>
    </Modal>
  );
}

export default SaleLeadDetailView;