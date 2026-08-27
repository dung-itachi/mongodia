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
import { LeadActivityProvider, useLeadActivityContext } from "@/components/sale/leads/LeadActivityContext";
import { useConvertLead } from "@/hooks/useMarketingLeads";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LeadStatus, LEAD_STATUS_LABELS } from "@/constants/leadStatus";
import type { SaleLead } from "@/hooks/useSaleLeads";
import styles from "@/app/(protected)/marketing/input/[id]/lead-detail.module.css";
import { useMessage } from "@/contexts/MessageContext";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

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
  const lang = useLanguageStore((s) => s.language);
  const config = STATUS_COLOR_MAP[lead.status] ?? { color: "#8c8c8c", backgroundColor: "#fafafa" };
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <StatusBadge
        status={lead.status}
        mapping={{ [lead.status]: { ...config, label: LEAD_STATUS_LABELS[lead.status] ?? lead.status } }}
      />
      {lead.noAnswerCount !== undefined && lead.noAnswerCount > 0 && (
        <Tag color={lead.noAnswerCount >= 3 ? "red" : "gold"}>
          📵 {t("K nghe", lang)}: {lead.noAnswerCount}
        </Tag>
      )}
      {lead.isConverted && <Tag color="success">{t("Đã chốt đơn", lang)}</Tag>}
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
              value: getSourceTag(lead.sourceType),
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
          title={t("Thông tin liên hệ", lang)}
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

      <CardSection>
        <DescriptionList
          title={t("Sản phẩm & Combo", lang)}
          columns={2}
          size="small"
          items={[
            {
              label: t("Sản phẩm", lang),
              value: lead.product ? (
                <span className={styles["primary-text"]}>{lead.product.name}</span>
              ) : (
                <span style={{ color: "#bfbfbf" }}>-</span>
              ),
            },
            {
              label: t("Combo", lang),
              value: lead.combo ? (
                <span className={styles["combo-text"]}>{lead.combo.name}</span>
              ) : (
                <span style={{ color: "#bfbfbf" }}>-</span>
              ),
            },
            {
              label: t("Mã Combo", lang),
              value: lead.combo?.code ?? "-",
            },
            {
              label: t("Số lượng", lang),
              value: lead.quantity ?? "-",
            },
            {
              label: t("Đơn giá (MNT)", lang),
              value: lead.unitPriceMNT ? lead.unitPriceMNT.toLocaleString("vi-VN") + " ₮" : "-",
            },
            {
              label: t("Tỷ giá (1 ₮ = ? VND)", lang),
              value: lead.exchangeRate ? lead.exchangeRate.toLocaleString("vi-VN") : "-",
            },
          ]}
        />
      </CardSection>

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
              value: lead.marketingEmployeeId?.name ?? "-",
            },
            {
              label: t("Mã Marketing", lang),
              value: lead.marketingEmployeeId?.employeeCode ?? "-",
            },
            {
              label: t("Nhân viên Sale", lang),
              value: lead.saleEmployeeId?.name ?? (
                <span style={{ color: "#bfbfbf" }}>{t("Chưa phân công", lang)}</span>
              ),
            },
            {
              label: t("Mã Sale", lang),
              value: lead.saleEmployeeId?.employeeCode ?? "-",
            },
            {
              label: t("Ngày phân công", lang),
              value: formatDateTime(lead.assignedAt),
              span: 2,
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <DescriptionList
          title={t("Thời gian đơn hàng", lang)}
          columns={3}
          size="small"
          items={[
            {
              label: t("TG từ Landing Page", lang),
              value: formatDateTime(lead.leadDate),
            },
            {
              label: t("TG đơn hàng (khách đặt)", lang),
              value: formatDateTime(lead.orderDate),
            },
            {
              label: t("TG nhận đơn (MKT nhận)", lang),
              value: formatDateTime(lead.receivedDate),
            },
            {
              label: t("Đã chuyển đổi", lang),
              value: lead.isConverted ? t("Có", lang) : t("Chưa", lang),
            },
            {
              label: t("TG chuyển đổi", lang),
              value: formatDateTime(lead.convertedAt),
            },
            {
              label: t("Mã đơn hàng", lang),
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
          title={t("Ghi chú", lang)}
          columns={1}
          size="small"
          items={[
            {
              label: t("Nội dung", lang),
              value: lead.note || (
                <span style={{ color: "#bfbfbf" }}>{t("Không có ghi chú", lang)}</span>
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
  const lang = useLanguageStore((s) => s.language);
  return (
    <div className={styles["tab-content"]}>
      <CardSection>
        <DescriptionList
          title={t("Lịch sử thay đổi trạng thái", lang)}
          columns={2}
          size="small"
          items={[
            {
              label: t("Trạng thái hiện tại", lang),
              value: getStatusTag(lead),
              span: 2,
            },
            {
              label: t("Ngày tạo", lang),
              value: formatDateTime(lead.createdAt),
            },
            {
              label: t("Cập nhật cuối", lang),
              value: formatDateTime(lead.updatedAt),
            },
            {
              label: t("Ngày phân công", lang),
              value: formatDateTime(lead.assignedAt),
            },
            {
              label: t("Số lần không nghe", lang),
              value: lead.noAnswerCount ?? 0,
            },
          ]}
        />
      </CardSection>

      <CardSection>
        <p className={styles["coming-soon"]}>
          {t("Lịch sử chi tiết từng thay đổi trạng thái đang được phát triển.", lang)}
        </p>
      </CardSection>
    </div>
  );
}

// =============================================================================
// Tab: Timeline (using shared context)
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
            title={t("Không thể tải Timeline", lang)}
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
            title={t("Chưa có lịch sử Timeline", lang)}
            description={t("Các thay đổi của Khách hàng sẽ hiển thị tại đây.", lang)}
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
  const lang = useLanguageStore.getState().language;
  const labels: Record<string, string> = {
    CREATED: t("Khách hàng được tạo", lang),
    UPDATED: t("Khách hàng được cập nhật", lang),
    ASSIGNED: t("Sale được gán", lang),
    UNASSIGNED: t("Sale bị hủy gán", lang),
    STATUS_CHANGED: t("Trạng thái thay đổi", lang),
    ORDER_CREATED: t("Đơn hàng được tạo", lang),
    ORDER_CANCELLED: t("Đơn hàng bị hủy", lang),
    SALE_CHANGED: t("Sale phụ trách thay đổi", lang),
    MARKETING_CHANGED: t("Marketing phụ trách thay đổi", lang),
    NOTE_UPDATED: t("Ghi chú được cập nhật", lang),
    DELETED: t("Khách hàng bị xóa", lang),
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
            title={t("Không thể tải lịch sử cuộc gọi", lang)}
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
  const lang = useLanguageStore((s) => s.language);

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
      label: <span className={styles["tab-label"]}>{t("Timeline", lang)}</span>,
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
  ];

  return (
    <>
      {/* Action Bar */}
      <CardSection>
        <div className={styles["action-bar"]}>
          {onEdit && !lead.isConverted && (
            <Button icon={<EditOutlined />} onClick={onEdit}>
              {t("Sửa", lang)}
            </Button>
          )}

          {onReassign && (
            <Button icon={<UserSwitchOutlined />} onClick={onReassign}>
              {t("Phân công lại", lang)}
            </Button>
          )}

          {onLogCall && !lead.isConverted && (
            <Button
              type="primary"
              icon={<PhoneOutlined />}
              onClick={onLogCall}
            >
              {t("Gọi khách", lang)}
            </Button>
          )}

          {canConvert && onEdit && (
            <Button
              type="primary"
              icon={<CheckCircleFilled />}
              onClick={handleConvert}
              style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
            >
              {t("Chuyển đổi", lang)}
            </Button>
          )}

          {onClose && (
            <Button icon={<ArrowLeftOutlined />} onClick={onClose}>
              {t("Quay lại", lang)}
            </Button>
          )}
        </div>
      </CardSection>

      {/* Tabs */}
      <CardSection>
        <LeadActivityProvider leadId={lead._id}>
          <Tabs defaultActiveKey="info" items={tabItems} />
        </LeadActivityProvider>
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

export default SaleLeadDetailView;