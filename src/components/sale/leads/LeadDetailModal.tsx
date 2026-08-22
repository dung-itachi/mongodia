"use client";

/**
 * ==================================================
 * LEAD DETAIL MODAL (Sale Leads)
 * ==================================================
 *
 * Modal xem nhanh thông tin chi tiết của một Sale Lead.
 * Hiển thị thông tin khách hàng, sản phẩm, trạng thái, v.v.
 */

import { Modal, Descriptions, Spin, Alert, Tag, Divider, Space, Typography } from "antd";
import {
  PhoneOutlined,
  UserOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  CalendarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { SaleLead } from "@/hooks/useSaleLeads";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/constants/leadStatus";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./lead-detail-modal.module.css";

const { Text } = Typography;

export type LeadDetailModalProps = {
  open: boolean;
  lead: SaleLead | null;
  onClose: () => void;
};

function formatCurrency(value: number, currency: string = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status: LeadStatus): string {
  switch (status) {
    case LeadStatus.NEW:
      return "purple";
    case LeadStatus.CONTACTED:
      return "blue";
    case LeadStatus.NO_ANSWER:
      return "orange";
    case LeadStatus.POTENTIAL:
      return "green";
    case LeadStatus.QUALIFIED:
      return "cyan";
    case LeadStatus.LOST:
      return "red";
    case LeadStatus.CLOSED:
      return "default";
    default:
      return "default";
  }
}

export default function LeadDetailModal({ open, lead, onClose }: LeadDetailModalProps) {
  const lang = useLanguageStore((s) => s.language);
  if (!lead) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={600}
        title={t("Chi tiết Khách hàng", lang)}
      >
        <div className={styles.center}>
          <Spin />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnHidden
      title={
        <Space>
          <UserOutlined />
          <span>{t("Chi tiết Khách hàng", lang)}</span>
          <Tag color="blue">{lead.leadCode}</Tag>
        </Space>
      }
    >
      <div className={styles.body}>
        {/* Customer Info */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <UserOutlined /> {t("Thông tin khách hàng", lang)}
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label={t("Tên khách hàng", lang)}>
              <Text strong>{lead.customerName}</Text>
            </Descriptions.Item>

            <Descriptions.Item label={t("Số điện thoại", lang)}>
              <Space>
                <PhoneOutlined />
                <Text strong>{lead.phone || t("Không có", lang)}</Text>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label={t("Địa chỉ", lang)}>
              <Space>
                <EnvironmentOutlined />
                <Text>{lead.address || t("Không có", lang)}</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Product Info */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <ShopOutlined /> {t("Sản phẩm / Combo", lang)}
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label={t("Sản phẩm", lang)}>
              {lead.product?.name || "-"}
            </Descriptions.Item>

            <Descriptions.Item label={t("Combo", lang)}>
              {lead.combo?.name || "-"}
            </Descriptions.Item>

            <Descriptions.Item label={t("Số lượng", lang)}>
              {lead.quantity || "-"}
            </Descriptions.Item>

            <Descriptions.Item label={t("Đơn giá (MNT)", lang)}>
              {lead.unitPriceMNT ? (
                <Text strong style={{ color: "#52c41a" }}>
                  {lead.unitPriceMNT.toLocaleString("vi-VN")} ₮
                </Text>
              ) : (
                "-"
              )}
            </Descriptions.Item>

            {lead.exchangeRate && (
              <Descriptions.Item label={t("Tỷ giá", lang)}>
                1 ₮ = {lead.exchangeRate.toLocaleString("vi-VN")} VND
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Status & Source */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <CalendarOutlined /> {t("Trạng thái & Nguồn", lang)}
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label={t("Trạng thái", lang)}>
              <Tag color={getStatusColor(lead.status)} style={{ fontSize: 13 }}>
                {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
              </Tag>
              {lead.noAnswerCount && lead.noAnswerCount > 0 && (
                <Tag color={lead.noAnswerCount >= 3 ? "red" : "orange"}>
                  📵 {t("K nghe", lang)}: {lead.noAnswerCount}
                </Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label={t("Nguồn", lang)}>
              <Tag>
                {LEAD_SOURCE_LABELS[lead.sourceType as LeadSource] ?? lead.sourceType}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label={t("Trang Facebook", lang)}>
              {lead.facebookPage?.name || "-"}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Assignment Info */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <TeamOutlined /> {t("Phân công", lang)}
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label={t("NV Marketing", lang)}>
              {lead.marketingEmployeeId?.name
                ? `${lead.marketingEmployeeId.name} (${lead.marketingEmployeeId.employeeCode})`
                : "-"}
            </Descriptions.Item>

            <Descriptions.Item label={t("NV Sale phụ trách", lang)}>
              {lead.saleEmployeeId?.name
                ? `${lead.saleEmployeeId.name} (${lead.saleEmployeeId.employeeCode})`
                : <Text type="secondary">{t("Chưa phân công", lang)}</Text>}
            </Descriptions.Item>

            <Descriptions.Item label={t("Ngày phân công", lang)}>
              {formatDate(lead.assignedAt)}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Timeline */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <CalendarOutlined /> {t("Timeline", lang)}
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label={t("Ngày tạo", lang)}>
              {formatDate(lead.createdAt)}
            </Descriptions.Item>

            <Descriptions.Item label={t("Cập nhật lần cuối", lang)}>
              {formatDate(lead.updatedAt)}
            </Descriptions.Item>

            <Descriptions.Item label={t("Đã chốt đơn", lang)}>
              {lead.isConverted ? (
                <Tag color="green">✓ {t("Đã chốt", lang)}</Tag>
              ) : (
                <Tag>{t("Chưa chốt", lang)}</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>
    </Modal>
  );
}
