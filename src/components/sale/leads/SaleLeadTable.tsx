/**
 * Sale Leads Table Component (Sprint 8.5)
 *
 * Table for displaying leads assigned to sale.
 * Includes action buttons for updating lead status.
 */

import { memo, useMemo } from "react";
import { Button, Space, Tag, Badge } from "antd";
import {
  PhoneOutlined,
  SwapOutlined,
  UserSwitchOutlined,
  EyeOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/constants/leadStatus";
import type { SaleLead } from "@/hooks/useSaleLeads";
import styles from "./sale-leads.module.css";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";

function getTranslated(key: string): string {
  const language = useLanguageStore.getState().language;
  return t(key, language);
}

export interface SaleLeadTableProps {
  data: SaleLead[];
  onUpdateStatus: (lead: SaleLead, status: LeadStatus) => void;
  onConvert: (lead: SaleLead) => void;
  onLogCall?: (lead: SaleLead) => void;
  onReassign?: (lead: SaleLead) => void;
  onViewDetail?: (lead: SaleLead) => void;
  onEdit?: (lead: SaleLead) => void;
  loading?: boolean;
  canReassign?: boolean;
  // Row selection for bulk operations
  selectedRowKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  selectionType?: "checkbox" | "none";
}

function SaleLeadTableInner({
  data,
  onUpdateStatus,
  onConvert,
  onLogCall,
  onReassign,
  onViewDetail,
  onEdit,
  loading,
  canReassign = false,
  selectedRowKeys = [],
  onSelectionChange,
  selectionType = "none",
}: SaleLeadTableProps) {
  const columns: Column[] = useMemo(
    () => [
      {
        key: "leadCode",
        title: getTranslated("Mã"),
        dataIndex: "leadCode",
        width: 130,
      },
      {
        key: "customerName",
        title: getTranslated("Tên khách hàng"),
        dataIndex: "customerName",
        width: 180,
        render: (value: unknown) => (
          <span className={styles.primaryText}>{String(value)}</span>
        ),
      },
      {
        key: "phone",
        title: getTranslated("SĐT"),
        dataIndex: "phone",
        width: 120,
        render: (value: unknown) => (
          <span className={styles.phoneText}>{String(value) || "-"}</span>
        ),
      },
      {
        key: "address",
        title: getTranslated("Địa chỉ"),
        dataIndex: "address",
        width: 200,
        render: (value: unknown) => String(value) || "-",
      },
      {
        key: "saleEmployee",
        title: getTranslated("Sale phụ trách"),
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          if (lead.saleEmployeeId) {
            return (
              <Tag color="blue" icon={<UserSwitchOutlined />}>
                {lead.saleEmployeeId.name || lead.saleEmployeeId.employeeCode}
              </Tag>
            );
          }
          return (
            <Tag color="default">{getTranslated("Chưa phân công")}</Tag>
          );
        },
      },
      {
        key: "sourceType",
        title: getTranslated("Nguồn"),
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          return LEAD_SOURCE_LABELS[lead.sourceType as LeadSource] ?? lead.sourceType;
        },
      },
      {
        key: "product",
        title: getTranslated("Sản phẩm"),
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          if (lead.product?.name) {
            return (
              <span className={styles.primaryText}>{lead.product.name}</span>
            );
          }
          return <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "combo",
        title: getTranslated("Combo"),
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          if (lead.combo?.name) {
            return (
              <span>{lead.combo.name}</span>
            );
          }
          return <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "facebookPage",
        title: getTranslated("Trang FB"),
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          return lead.facebookPage?.name || (
            <span className={styles.mutedText}>-</span>
          );
        },
      },
      {
        key: "price",
        title: getTranslated("Giá"),
        width: 120,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          if (lead.unitPriceMNT) {
            return (
              <span className={styles.priceText}>
                {lead.unitPriceMNT.toLocaleString("vi-VN")} ₮
              </span>
            );
          }
          return "-";
        },
      },
      {
        key: "status",
        title: getTranslated("Trạng thái"),
        dataIndex: "status",
        width: 160,
        render: (value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          const noAnswerCount = lead.noAnswerCount ?? 0;
          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              <StatusBadge status={String(value)} />
              {noAnswerCount > 0 && (
                <Tag
                  color={noAnswerCount >= 3 ? "red" : "gold"}
                  style={{ fontSize: 11, margin: 0, lineHeight: "18px" }}
                  title={getTranslated("Đã gọi ${count} lần không nghe máy").replace("${count}", String(noAnswerCount))}
                >
                  📵 {getTranslated("K nghe")}: {noAnswerCount}
                </Tag>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        title: getTranslated("Thao tác"),
        width: 380,
        align: "center" as const,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          const noAnswerCount = lead.noAnswerCount ?? 0;
          return (
            <div className={styles.actionGroup}>
              {/* Call Button - Module 6 */}
              {onLogCall && (
                <Button
                  size="small"
                  type="primary"
                  icon={<PhoneOutlined />}
                  onClick={() => onLogCall(lead)}
                  disabled={lead.status === LeadStatus.CLOSED}
                  className={styles.callBtn}
                >
                  {getTranslated("Gọi")}
                </Button>
              )}

              {/* No Answer Button with badge */}
              <Badge
                count={noAnswerCount}
                offset={[-4, 2]}
                size="small"
                style={{
                  backgroundColor: noAnswerCount >= 3 ? "#ff4d4f" : "#faad14",
                  boxShadow: "0 0 0 1px #fff",
                  fontSize: 10,
                }}
              >
                <Button
                  size="small"
                  danger={lead.status === LeadStatus.NO_ANSWER}
                  type={lead.status === LeadStatus.NO_ANSWER ? "primary" : "default"}
                  onClick={() => onUpdateStatus(lead, LeadStatus.NO_ANSWER)}
                  disabled={lead.status === LeadStatus.CLOSED}
                  title={
                    noAnswerCount > 0
                      ? getTranslated("Đã gọi ${count} lần không nghe").replace("${count}", String(noAnswerCount)) + (noAnswerCount >= 3 ? " - CẢNH BÁO!" : "")
                      : getTranslated("Chuyển sang trạng thái Không nghe máy")
                  }
                >
                  {getTranslated("K nghe")}
                </Button>
              </Badge>

              {/* Potential Button */}
              <Button
                size="small"
                type={lead.status === LeadStatus.POTENTIAL ? "primary" : "default"}
                className={lead.status === LeadStatus.POTENTIAL ? styles.potentialBtn : ""}
                onClick={() => onUpdateStatus(lead, LeadStatus.POTENTIAL)}
                disabled={lead.status === LeadStatus.CLOSED}
              >
                {getTranslated("Tiềm năng")}
              </Button>

              {/* Qualified Button */}
              <Button
                size="small"
                type={lead.status === LeadStatus.QUALIFIED ? "primary" : "default"}
                onClick={() => onUpdateStatus(lead, LeadStatus.QUALIFIED)}
                disabled={lead.status === LeadStatus.CLOSED}
              >
                {getTranslated("Đủ điều kiện")}
              </Button>

              {/* Lost Button */}
              <Button
                size="small"
                danger
                type={lead.status === LeadStatus.LOST ? "primary" : "default"}
                onClick={() => onUpdateStatus(lead, LeadStatus.LOST)}
                disabled={lead.status === LeadStatus.CLOSED}
                title={getTranslated("Khách từ chối, không có nhu cầu")}
              >
                {getTranslated("Không mua")}
              </Button>

              {/* Convert Button */}
              <Button
                size="small"
                type="primary"
                icon={<SwapOutlined />}
                onClick={() => onConvert(lead)}
                disabled={
                  lead.status === LeadStatus.CLOSED ||
                  (lead.status !== LeadStatus.POTENTIAL && lead.status !== LeadStatus.QUALIFIED)
                }
                className={styles.convertBtn}
              >
                {getTranslated("Chốt")}
              </Button>

              {/* Reassign Button - Only for Admin/Manager */}
              {canReassign && onReassign && (
                <Button
                  size="small"
                  icon={<UserSwitchOutlined />}
                  onClick={() => onReassign(lead)}
                >
                  {getTranslated("Phân công")}
                </Button>
              )}

              {/* View Detail Button */}
              {onViewDetail && (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => onViewDetail(lead)}
                  title={getTranslated("Xem chi tiết khách hàng")}
                >
                  {getTranslated("Chi tiết")}
                </Button>
              )}

              {/* Edit Button */}
              {onEdit && (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(lead)}
                  title={getTranslated("Sửa thông tin khách hàng")}
                >
                  {getTranslated("Sửa")}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [onUpdateStatus, onConvert, onLogCall, onReassign, onViewDetail, onEdit, canReassign]
  );

  // Row selection config
  const rowSelection = selectionType === "checkbox" && onSelectionChange
    ? {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => {
          onSelectionChange(keys as string[]);
        },
        columnTitle: (
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              cursor: "help",
            }}
            title={getTranslated("Phân công - Tick chọn các đơn rồi dùng thanh công cụ phía trên để phân công cho nhân viên Sale")}
          >
            {getTranslated("Phân công")}
          </div>
        ),
        width: 90,
      }
    : undefined;

  return (
    <DataTable
      columns={columns}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      pagination={false}
      rowKey="_id"
      size="small"
      scroll={{ x: 1800 }}
      rowSelection={rowSelection}
    />
  );
}

const SaleLeadTable = memo(SaleLeadTableInner);
export default SaleLeadTable;
