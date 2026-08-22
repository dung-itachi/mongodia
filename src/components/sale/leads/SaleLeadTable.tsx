/**
 * Sale Leads Table Component (Sprint 8.5)
 *
 * Table for displaying leads assigned to sale.
 * Includes action buttons for updating lead status.
 */

import { memo, useMemo, useState } from "react";
import { Button, Tag, Badge, Tooltip } from "antd";
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
import { convertMNTtoVND, formatMNT, formatVND } from "@/lib/format";

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
  /**
   * Phí ship hiện tại (MNT) lấy từ /api/settings/shipping-fee.
   * Dùng để tính cột "Doanh thu" = giá combo - shippingFee.
   */
  shippingFee?: number;
  /**
   * Tỷ giá MNT → VND (VND per 1 MNT) lấy từ /api/settings/exchange-rate.
   * Click vào ô tiền sẽ toggle giữa MNT và VND.
   */
  exchangeRate?: number;
  /**
   * Optional controlled currency state. Khi truyền xuống, bảng sẽ dùng
   * giá trị này thay vì state nội bộ — cho phép đồng bộ với stats card
   * ở trên (Sprint 8.x+).
   */
  currency?: "MNT" | "VND";
  /** Toggle handler khi dùng controlled `currency`. */
  onCurrencyToggle?: () => void;
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
  shippingFee = 0,
  exchangeRate = 0,
  currency: controlledCurrency,
  onCurrencyToggle,
}: SaleLeadTableProps) {
  const lang = useLanguageStore((s) => s.language);
  const [internalCurrency, setInternalCurrency] = useState<"MNT" | "VND">("MNT");
  const isControlled = controlledCurrency !== undefined;
  const currency = isControlled ? controlledCurrency : internalCurrency;
  const setCurrency = (next: "MNT" | "VND" | ((prev: "MNT" | "VND") => "MNT" | "VND")) => {
    const value =
      typeof next === "function" ? next(currency) : next;
    if (isControlled) {
      if (value !== currency) onCurrencyToggle?.();
      return;
    }
    setInternalCurrency(value);
  };

  const renderCurrencyHeader = (label: string) => {
    const nextCurrency = currency === "MNT" ? "VND" : "MNT";
    const tooltipTitle = `Click để đổi sang ${nextCurrency}`;
    return (
      <Tooltip title={tooltipTitle} mouseEnterDelay={0.2}>
        <span
          role="button"
          tabIndex={0}
          onClick={() => setCurrency((c) => (c === "MNT" ? "VND" : "MNT"))}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setCurrency((c) => (c === "MNT" ? "VND" : "MNT"));
            }
          }}
          style={{ cursor: "pointer", userSelect: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <span>{t(label, lang)}</span>
          <Tag color={currency === "MNT" ? "blue" : "purple"} style={{ margin: 0, fontSize: 10, lineHeight: "16px", padding: "0 6px" }}>
            {currency}
          </Tag>
        </span>
      </Tooltip>
    );
  };

  const renderMoney = (mntAmount: number | undefined) => {
    if (typeof mntAmount !== "number") {
      return <span className={styles.mutedText}>-</span>;
    }
    const nextCurrency = currency === "MNT" ? "VND" : "MNT";
    const tooltipTitle = `Click để đổi sang ${nextCurrency}`;
    if (currency === "VND" && exchangeRate > 0) {
      const vnd = convertMNTtoVND(mntAmount, exchangeRate);
      return (
        <Tooltip title={tooltipTitle} mouseEnterDelay={0.2}>
          <span className={styles.priceText} style={{ cursor: "pointer" }}>
            {formatVND(vnd)}
          </span>
        </Tooltip>
      );
    }
    return (
      <Tooltip title={tooltipTitle} mouseEnterDelay={0.2}>
        <span className={styles.priceText} style={{ cursor: "pointer" }}>
          {formatMNT(mntAmount)}
        </span>
      </Tooltip>
    );
  };
  const columns: Column[] = useMemo(
    () => [
      // Cột STT chỉ dành cho UI, không liên kết với dữ liệu Lead.
      // Khi bật phân trang, có thể cần truyền currentPage/pageSize để số chạy liên tục giữa các trang.
      {
        key: "stt",
        title: t("STT", lang),
        width: 60,
        align: "center",
        fixed: "left",
        render: (_value: unknown, _record: Record<string, unknown>, index?: number) => (
          <span className={styles.mutedText}>{(index ?? 0) + 1}</span>
        ),
      },
      {
        key: "leadCode",
        title: t("Mã", lang),
        dataIndex: "leadCode",
        width: 130,
      },
      {
        key: "orderDate",
        title: t("TG đơn hàng", lang),
        dataIndex: "orderDate",
        width: 150,
        render: (value: unknown) =>
          value ? (
            new Date(String(value)).toLocaleString("vi-VN")
          ) : (
            <span className={styles.mutedText}>-</span>
          ),
      },
      {
        key: "receivedDate",
        title: t("TG nhận đơn", lang),
        dataIndex: "receivedDate",
        width: 150,
        render: (value: unknown) =>
          value ? (
            new Date(String(value)).toLocaleString("vi-VN")
          ) : (
            <span className={styles.mutedText}>-</span>
          ),
      },
      {
        key: "customerName",
        title: t("Tên khách hàng", lang),
        dataIndex: "customerName",
        width: 180,
        render: (value: unknown) => (
          <span className={styles.primaryText}>{String(value)}</span>
        ),
      },
      {
        key: "phone",
        title: t("SĐT", lang),
        dataIndex: "phone",
        width: 120,
        render: (value: unknown) => (
          <span className={styles.phoneText}>{String(value) || "-"}</span>
        ),
      },
      {
        key: "phone2",
        title: t("SĐT 2", lang),
        dataIndex: "phone2",
        width: 110,
        render: (value: unknown) =>
          value ? <span className={styles.phoneText}>{String(value)}</span> : (
            <span className={styles.mutedText}>-</span>
          ),
      },
      {
        key: "address",
        title: t("Địa chỉ", lang),
        dataIndex: "address",
        width: 200,
        render: (value: unknown) => String(value) || (
          <span className={styles.mutedText}>-</span>
        ),
      },
      {
        key: "marketingEmployee",
        title: t("MKT phụ trách", lang),
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          if (lead.marketingEmployeeId) {
            return (
              <Tag color="purple">
                {lead.marketingEmployeeId.name || lead.marketingEmployeeId.employeeCode}
              </Tag>
            );
          }
          return <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "saleEmployee",
        title: t("Sale phụ trách", lang),
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
            <Tag color="default">{t("Chưa phân công", lang)}</Tag>
          );
        },
      },
      {
        key: "sourceType",
        title: t("Nguồn", lang),
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          return LEAD_SOURCE_LABELS[lead.sourceType as LeadSource] ?? lead.sourceType;
        },
      },
      {
        key: "product",
        title: t("Sản phẩm", lang),
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
        title: t("Combo", lang),
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
        key: "quantity",
        title: t("SL", lang),
        width: 60,
        align: "center",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          return lead.quantity ?? <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "comboPrice",
        title: renderCurrencyHeader("Giá combo"),
        width: 150,
        align: "right",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const sellingPrice = (record as unknown as SaleLead).combo?.sellingPrice;
          const clickable = typeof sellingPrice === "number";
          return (
            <span
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : -1}
              onClick={() => {
                if (clickable) setCurrency((c) => (c === "MNT" ? "VND" : "MNT"));
              }}
              onKeyDown={(e) => {
                if (clickable && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setCurrency((c) => (c === "MNT" ? "VND" : "MNT"));
                }
              }}
              style={clickable ? { cursor: "pointer" } : undefined}
            >
              {renderMoney(sellingPrice)}
            </span>
          );
        },
      },
      {
        key: "revenue",
        title: renderCurrencyHeader("Doanh thu"),
        width: 150,
        align: "right",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const sellingPrice = (record as unknown as SaleLead).combo?.sellingPrice;
          if (typeof sellingPrice !== "number") {
            return <span className={styles.mutedText}>-</span>;
          }
          const revenue = Math.max(sellingPrice - (shippingFee ?? 0), 0);
          return (
            <span
              role="button"
              tabIndex={0}
              onClick={() => setCurrency((c) => (c === "MNT" ? "VND" : "MNT"))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCurrency((c) => (c === "MNT" ? "VND" : "MNT"));
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {renderMoney(revenue)}
            </span>
          );
        },
      },
      {
        key: "facebookPage",
        title: t("Trang FB", lang),
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          return lead.facebookPage?.name || (
            <span className={styles.mutedText}>-</span>
          );
        },
      },
      {
        key: "note",
        title: t("Ghi chú", lang),
        width: 180,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          if (lead.note) {
            return (
              <span className={styles.noteText} title={lead.note}>
                {lead.note.length > 25 ? `${lead.note.substring(0, 25)}...` : lead.note}
              </span>
            );
          }
          return <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "status",
        title: t("Trạng thái", lang),
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
                  title={t("Đã gọi ${count} lần không nghe máy", lang).replace("${count}", String(noAnswerCount))}
                >
                  📵 {t("K nghe", lang)}: {noAnswerCount}
                </Tag>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        title: t("Thao tác", lang),
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
                  {t("Gọi", lang)}
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
                      ? t("Đã gọi ${count} lần không nghe", lang).replace("${count}", String(noAnswerCount)) + (noAnswerCount >= 3 ? " - CẢNH BÁO!" : "")
                      : t("Chuyển sang trạng thái Không nghe máy", lang)
                  }
                >
                  {t("K nghe", lang)}
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
                {t("Tiềm năng", lang)}
              </Button>

              {/* Qualified Button */}
              <Button
                size="small"
                type={lead.status === LeadStatus.QUALIFIED ? "primary" : "default"}
                onClick={() => onUpdateStatus(lead, LeadStatus.QUALIFIED)}
                disabled={lead.status === LeadStatus.CLOSED}
              >
                {t("Đủ điều kiện", lang)}
              </Button>

              {/* Lost Button */}
              <Button
                size="small"
                danger
                type={lead.status === LeadStatus.LOST ? "primary" : "default"}
                onClick={() => onUpdateStatus(lead, LeadStatus.LOST)}
                disabled={lead.status === LeadStatus.CLOSED}
                title={t("Khách từ chối, không có nhu cầu", lang)}
              >
                {t("Không mua", lang)}
              </Button>

              {/* Convert Button */}
              <Button
                size="small"
                type="primary"
                icon={<SwapOutlined />}
                onClick={() => onConvert(lead)}
                disabled={
                  lead.isConverted ||
                  lead.status === LeadStatus.CLOSED ||
                  (lead.status !== LeadStatus.NEW &&
                    lead.status !== LeadStatus.QUALIFIED &&
                    lead.status !== LeadStatus.POTENTIAL)
                }
                title={
                  lead.isConverted
                    ? t("Lead đã được chốt đơn", lang)
                    : lead.status === LeadStatus.CLOSED
                    ? t("Lead đã đóng", lang)
                    : t("Chốt đơn cho khách hàng này", lang)
                }
                className={styles.convertBtn}
              >
                {t("Chốt", lang)}
              </Button>

              {/* Reassign Button - Only for Admin/Manager */}
              {canReassign && onReassign && (
                <Button
                  size="small"
                  icon={<UserSwitchOutlined />}
                  onClick={() => onReassign(lead)}
                >
                  {t("Phân công", lang)}
                </Button>
              )}

              {/* View Detail Button */}
              {onViewDetail && (
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => onViewDetail(lead)}
                  title={t("Xem chi tiết khách hàng", lang)}
                >
                  {t("Chi tiết", lang)}
                </Button>
              )}

              {/* Edit Button */}
              {onEdit && (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(lead)}
                  title={t("Sửa thông tin khách hàng", lang)}
                >
                  {t("Sửa", lang)}
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [onUpdateStatus, onConvert, onLogCall, onReassign, onViewDetail, onEdit, canReassign, shippingFee, currency, exchangeRate]
  );

  // Row selection config
  const rowSelection = selectionType === "checkbox" && onSelectionChange
    ? {
        selectedRowKeys,
        onChange: (keys: React.Key[]) => {
          onSelectionChange(keys as string[]);
        },
        columnTitle: (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              display: "inline-block",
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            <span style={{ display: "block", whiteSpace: "nowrap" }}>{t("Phân", lang)}</span>
            <span style={{ display: "block", whiteSpace: "nowrap" }}>{t("công", lang)}</span>
          </span>
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
      scroll={{ x: 2600 }}
      rowSelection={rowSelection}
    />
  );
}

const SaleLeadTable = memo(SaleLeadTableInner);
export default SaleLeadTable;
