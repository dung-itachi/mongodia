"use client";

/**
 * Lead Detail View - Reusable component for viewing lead details
 * Can be used in both detail page and modal
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dropdown, Tabs, Modal, Tag, Space, Timeline } from "antd";
import type { MenuProps } from "antd";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  ArrowLeftOutlined,
  EditOutlined,
  UserSwitchOutlined,
  CheckCircleFilled,
  DeleteOutlined,
  MoreOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  PaperClipOutlined,
  PhoneOutlined,
} from "@ant-design/icons";

import { CardSection, DescriptionList, StatusBadge, SkeletonCard, EmptyState } from "@/components/common";
import AssignSaleDrawer from "@/components/marketing/leads/AssignSaleDrawer";
import CallLogTimeline from "@/components/sale/leads/CallLogTimeline";
import { useLeadTimeline, useConvertLead, useUpdateLead, useDeleteLead } from "@/hooks/useMarketingLeads";
import { useLeadCallHistory } from "@/hooks/useLeadCallLog";
import { LeadActivityProvider, useLeadActivityContext } from "@/components/sale/leads/LeadActivityContext";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LeadStatus } from "@/constants/leadStatus";
import type { MarketingLead } from "@/types/marketing-lead";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/permission";
import styles from "@/app/(protected)/marketing/input/[id]/lead-detail.module.css";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

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
  const lang = useLanguageStore.getState().language;
  const label = t(LEAD_SOURCE_LABELS[source as LeadSource] ?? String(source), lang);
  const color = LEAD_SOURCE_COLOR_MAP[source] ?? "#8c8c8c";
  return <Tag style={{ color, borderColor: color }}>{label}</Tag>;
}

// =============================================================================
// Tab: Thông tin
// =============================================================================

function LeadInfoTab({ lead }: { lead: MarketingLead }) {
  const lang = useLanguageStore((s) => s.language);
  return (
    <div className={styles["tab-content"]}>
      <CardSection>
        <DescriptionList
          title={t("Thông tin Khách hàng", lang)}
          columns={3}
          size="small"
          items={[
            {
              label: t("Mã Khách hàng", lang),
              value: <span className={styles["lead-code"]}>{lead.leadCode}</span>,
            },
            {
              label: t("Trạng thái", lang),
              value: getStatusTag(lead),
            },
            {
              label: t("Nguồn", lang),
              value: getSourceTag(lead.source),
            },
            {
              label: t("Ngày tạo", lang),
              value: formatDateTime(lead.createdAt),
            },
            {
              label: t("Cập nhật lần cuối", lang),
              value: formatDateTime(lead.updatedAt),
            },
            {
              label: t("Trùng lặp", lang),
              value: lead.isDuplicate ? t("Có", lang) : t("Không", lang),
            },
            {
              label: t("Trang Facebook", lang),
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
          title={t("Thông tin Khách hàng", lang)}
          columns={2}
          size="small"
          items={[
            {
              label: t("Tên khách hàng", lang),
              value: <span className={styles["primary-text"]}>{lead.customerName}</span>,
            },
            {
              label: t("Điện thoại", lang),
              value: lead.phone ?? "-",
            },
            {
              label: t("Điện thoại 2", lang),
              value: lead.phone2 ?? "-",
            },
            {
              label: t("Email", lang),
              value: lead.email ?? "-",
            },
            {
              label: t("Địa chỉ", lang),
              value: lead.address ?? "-",
            },
            {
              label: t("Facebook", lang),
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
            title={t("Thông tin Combo", lang)}
            columns={2}
            size="small"
            items={[
              {
                label: t("Tên Combo", lang),
                value: <span className={styles["combo-text"]}>{lead.combo.name}</span>,
              },
              {
                label: t("Mã Combo", lang),
                value: lead.combo.code ?? "-",
              },
            ]}
          />
        </CardSection>
      )}

      <CardSection>
        <DescriptionList
          title={t("Quà tặng", lang)}
          columns={2}
          size="small"
          items={[
            {
              label: t("Chế độ quà", lang),
              value: lead.giftMode ? (
                <Tag color={lead.giftMode === "CUSTOMER_SELECTED" ? "gold" : "blue"}>
                  {lead.giftMode === "CUSTOMER_SELECTED"
                    ? t("Khách tự chọn", lang)
                    : t("Ngẫu nhiên", lang)}
                </Tag>
              ) : (
                <span style={{ color: "#bfbfbf" }}>-</span>
              ),
            },
            {
              label: t("Tổng số quà", lang),
              value:
                lead.giftSelections && lead.giftSelections.length > 0
                  ? `${lead.giftSelections.reduce((sum, g) => sum + (g.quantity ?? 0), 0)} ${t("quà", lang)}`
                  : <span style={{ color: "#bfbfbf" }}>-</span>,
            },
            {
              label: t("Chi tiết quà", lang),
              span: 2,
              value:
                lead.giftSelections && lead.giftSelections.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {lead.giftSelections.map((gift, idx) => (
                      <div
                        key={`${gift.giftProductId}-${idx}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                        }}
                      >
                        <Tag color="purple">×{gift.quantity}</Tag>
                        <span>{gift.giftProductName || gift.giftProductId}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: "#bfbfbf" }}>{t("Chưa có chi tiết quà", lang)}</span>
                ),
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title={t("Thông tin Marketing", lang)}
          columns={2}
          size="small"
          items={[
            {
              label: t("Nhân viên Marketing", lang),
              value: lead.marketingEmployee?.name ?? "-",
            },
            {
              label: t("Mã Marketing", lang),
              value: lead.marketingEmployee?.employeeCode ?? "-",
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title={t("Thông tin Sale", lang)}
          columns={2}
          size="small"
          items={[
            {
              label: t("Nhân viên Sale", lang),
              value: lead.saleEmployee?.name ?? "-",
            },
            {
              label: t("Mã Sale", lang),
              value: lead.saleEmployee?.employeeCode ?? "-",
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title={t("Ghi chú", lang)}
          columns={1}
          size="small"
          items={[
            {
              label: t("Nội dung", lang),
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
  const lang = useLanguageStore((s) => s.language);
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
              label: t("Ngày tạo", lang),
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
  const lang = useLanguageStore((s) => s.language);
  const { timeline: items, loading, error } = useLeadActivityContext();

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
  const lang = useLanguageStore((s) => s.language);
  const { callHistory, loading, error } = useLeadActivityContext();

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
  const message = useMessage();
  const lang = useLanguageStore((s) => s.language);
  const queryClient = useQueryClient();

  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();
  const convertMutation = useConvertLead();

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
      void message.error(json.message ?? t(t("Phân công Sale thất bại", lang), lang));
      return;
    }

    void message.success(t(t("Phân công Sale thành công", lang), lang));
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
        void message.success(t("Chuyển đổi Khách hàng thành công", lang));
        setConvertModalOpen(false);
        void router.push(`/orders/${result.orderId}`);
      },
      onError: (err) => {
        void message.error(`${t("Lỗi:", lang)} ${err.message}`);
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
          {t("Thông tin", lang)}
        </span>
      ),
      children: <LeadInfoTab lead={lead} />,
    },
    {
      key: "history",
      label: (
        <span className={styles["tab-label"]}>
          <HistoryOutlined />
          {t("Lịch sử", lang)}
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
      key: "calls",
      label: (
        <span className={styles["tab-label"]}>
          <PhoneOutlined />
          {t("Cuộc gọi", lang)}
        </span>
      ),
      children: <CallLogTab leadId={lead._id} />,
    },
    {
      key: "attachments",
      label: (
        <span className={styles["tab-label"]}>
          <PaperClipOutlined />
          {t("File đính kèm", lang)}
        </span>
      ),
      children: <AttachmentsTab />,
    },
  ];

  const moreMenuItems: MenuProps["items"] = [
    { type: "divider" as const },
    {
      key: "delete",
      label: t("Xóa Khách hàng", lang),
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
          {hasPermission(permissions, "lead.update") && lead.status === LeadStatus.NEW && (
            <Button icon={<EditOutlined />} onClick={onEdit}>
              {t("Sửa", lang)}
            </Button>
          )}

          {hasPermission(permissions, "lead.assign") && !lead.saleEmployee && (
            <Button icon={<UserSwitchOutlined />} onClick={handleAssignSaleOpen}>
              {t("Giao Sale", lang)}
            </Button>
          )}

          {canConvert && (
            <Button
              type="primary"
              icon={<CheckCircleFilled />}
              onClick={handleConvert}
            >
              {t("Chuyển đổi", lang)}
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
        <LeadActivityProvider leadId={lead._id}>
          <Tabs defaultActiveKey="info" items={tabItems} />
        </LeadActivityProvider>
      </CardSection>

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
  const lang = useLanguageStore((s) => s.language);
  return (
    <Modal
      title={t("Xác nhận Chuyển đổi Khách hàng", lang)}
      open={open}
      okText={t("Chuyển đổi", lang)}
      cancelText={t("Hủy", lang)}
      onCancel={onCancel}
      onOk={onConfirm}
      okButtonProps={{ loading }}
    >
      <p>
        {t("Bạn có chắc muốn chuyển đổi khách hàng", lang)} <strong>{lead.leadCode}</strong> —{" "}
        <strong>{lead.customerName}</strong> {t("thành đơn hàng?", lang)}
      </p>
      <p style={{ color: "#8c8c8c", fontSize: 13 }}>
        {t("Hành động này sẽ tạo Order mới và không thể hoàn tác.", lang)}
      </p>
    </Modal>
  );
}
