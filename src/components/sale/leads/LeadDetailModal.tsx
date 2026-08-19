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
  if (!lead) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={600}
        title="Chi tiết Khách hàng"
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
          <span>Chi tiết Khách hàng</span>
          <Tag color="blue">{lead.leadCode}</Tag>
        </Space>
      }
    >
      <div className={styles.body}>
        {/* Customer Info */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <UserOutlined /> Thông tin khách hàng
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label="Tên khách hàng">
              <Text strong>{lead.customerName}</Text>
            </Descriptions.Item>

            <Descriptions.Item label="Số điện thoại">
              <Space>
                <PhoneOutlined />
                <Text strong>{lead.phone || "Không có"}</Text>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Địa chỉ">
              <Space>
                <EnvironmentOutlined />
                <Text>{lead.address || "Không có"}</Text>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Product Info */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <ShopOutlined /> Sản phẩm / Combo
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label="Sản phẩm">
              {lead.product?.name || "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Combo">
              {lead.combo?.name || "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Số lượng">
              {lead.quantity || "-"}
            </Descriptions.Item>

            <Descriptions.Item label="Đơn giá (MNT)">
              {lead.unitPriceMNT ? (
                <Text strong style={{ color: "#52c41a" }}>
                  {lead.unitPriceMNT.toLocaleString("vi-VN")} ₮
                </Text>
              ) : (
                "-"
              )}
            </Descriptions.Item>

            {lead.exchangeRate && (
              <Descriptions.Item label="Tỷ giá">
                1 ₮ = {lead.exchangeRate.toLocaleString("vi-VN")} VND
              </Descriptions.Item>
            )}
          </Descriptions>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Status & Source */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <CalendarOutlined /> Trạng thái & Nguồn
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label="Trạng thái">
              <Tag color={getStatusColor(lead.status)} style={{ fontSize: 13 }}>
                {LEAD_STATUS_LABELS[lead.status] ?? lead.status}
              </Tag>
              {lead.noAnswerCount && lead.noAnswerCount > 0 && (
                <Tag color={lead.noAnswerCount >= 3 ? "red" : "orange"}>
                  📵 K nghe: {lead.noAnswerCount}
                </Tag>
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Nguồn">
              <Tag>
                {LEAD_SOURCE_LABELS[lead.sourceType as LeadSource] ?? lead.sourceType}
              </Tag>
            </Descriptions.Item>

            <Descriptions.Item label="Trang Facebook">
              {lead.facebookPage?.name || "-"}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Assignment Info */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <TeamOutlined /> Phân công
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label="NV Marketing">
              {lead.marketingEmployeeId?.name
                ? `${lead.marketingEmployeeId.name} (${lead.marketingEmployeeId.employeeCode})`
                : "-"}
            </Descriptions.Item>

            <Descriptions.Item label="NV Sale phụ trách">
              {lead.saleEmployeeId?.name
                ? `${lead.saleEmployeeId.name} (${lead.saleEmployeeId.employeeCode})`
                : <Text type="secondary">Chưa phân công</Text>}
            </Descriptions.Item>

            <Descriptions.Item label="Ngày phân công">
              {formatDate(lead.assignedAt)}
            </Descriptions.Item>
          </Descriptions>
        </div>

        <Divider style={{ margin: "16px 0" }} />

        {/* Timeline */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <CalendarOutlined /> Timeline
          </div>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 160, fontWeight: 600 } }}
          >
            <Descriptions.Item label="Ngày tạo">
              {formatDate(lead.createdAt)}
            </Descriptions.Item>

            <Descriptions.Item label="Cập nhật lần cuối">
              {formatDate(lead.updatedAt)}
            </Descriptions.Item>

            <Descriptions.Item label="Đã chốt đơn">
              {lead.isConverted ? (
                <Tag color="green">✓ Đã chốt</Tag>
              ) : (
                <Tag>Chưa chốt</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        </div>
      </div>
    </Modal>
  );
}
