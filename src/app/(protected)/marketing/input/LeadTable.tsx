/**
 * Marketing Lead Table Component (Sprint 5.2, 8.5, 8.x)
 *
 * Uses the UI Kit DataTable contract, including scroll, sorting callbacks,
 * and row selection support for bulk push to Sale.
 * Sprint 8.5: Added row selection for "Đẩy sang Sale" functionality.
 * Sprint 8.x: Added Marketing/Sale employee columns for admin users.
 */

import { memo, useMemo, useState } from "react";
import { EyeOutlined, EditOutlined, DeleteOutlined, UserSwitchOutlined, SwapOutlined } from "@ant-design/icons";
import { ActionButton, DataTable, StatusBadge, DEFAULT_STATUS_MAPPING } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { TableProps, TooltipProps } from "antd";
import { Tooltip } from "antd";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/constants/leadStatus";
import { MARKETING_LEAD_ACTION_LABELS } from "@/constants/marketing";
import type { MarketingLead } from "@/types/marketing-lead";
import { LEAD_STATUS_BADGE_MAPPING } from "@/components/common/display/StatusBadge";
import { convertMNTtoVND, formatMNT, formatVND } from "@/lib/format";
import { useLanguageStore } from "@/store/language.store";
import { t } from "@/lib/i18n";
import styles from "./marketing-input.module.css";

export type MarketingLeadTableProps = {
  data: MarketingLead[];
  onView?: (lead: MarketingLead) => void;
  onEdit: (lead: MarketingLead) => void;
  onDelete: (lead: MarketingLead) => void;
  onAssign?: (lead: MarketingLead) => void;
  onConvert?: (lead: MarketingLead) => void;
  selectedRowKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  loading?: boolean;
  /** Show Marketing/Sale employee columns (for admin users) - Sprint 8.x */
  showEmployeeColumns?: boolean;
  /** Tùy chọn hiển thị riêng cột MKT phụ trách */
  showMarketingEmployeeColumn?: boolean;
  /** Tùy chọn hiển thị riêng cột Sale phụ trách (chỉ manager và admin) */
  showSaleEmployeeColumn?: boolean;
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
};

function MarketingLeadTableInner({
  data,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onConvert,
  selectedRowKeys = [],
  onSelectionChange,
  loading,
  showEmployeeColumns = false,
  showMarketingEmployeeColumn,
  showSaleEmployeeColumn,
  shippingFee = 0,
  exchangeRate = 0,
  currency: controlledCurrency,
  onCurrencyToggle,
}: MarketingLeadTableProps) {
  const shouldShowMarketing = showMarketingEmployeeColumn !== undefined ? showMarketingEmployeeColumn : showEmployeeColumns;
  const shouldShowSale = showSaleEmployeeColumn !== undefined ? showSaleEmployeeColumn : showEmployeeColumns;
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

  const noDelayTipProps: Pick<TooltipProps, "mouseEnterDelay" | "mouseLeaveDelay"> = {
    mouseEnterDelay: 0,
    mouseLeaveDelay: 0,
  };

  const renderMoneyTip = (
    mntAmount: number,
    tooltipText: string,
    onClick?: () => void,
  ) => {
    const display =
      currency === "VND" && exchangeRate > 0
        ? formatVND(convertMNTtoVND(mntAmount, exchangeRate))
        : formatMNT(mntAmount);
    const clickable = !!onClick;
    return (
      <Tooltip title={tooltipText} {...noDelayTipProps}>
        <span
          className={styles["mi-primary-text"]}
          role={clickable ? "button" : undefined}
          tabIndex={clickable ? 0 : -1}
          onClick={onClick}
          onKeyDown={
            clickable
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                  }
                }
              : undefined
          }
          style={clickable ? { cursor: "pointer" } : undefined}
        >
          {display}
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
          <span className={styles["mi-muted-text"]}>{(index ?? 0) + 1}</span>
        ),
      },
      { key: "leadCode", title: t("Mã", lang), dataIndex: "leadCode", width: 120 },
      {
        key: "createdAt",
        title: t("Thời gian", lang),
        dataIndex: "createdAt",
        width: 150,
        render: (value: unknown) => (value ? new Date(String(value)).toLocaleString("vi-VN") : "-"),
      },
      {
        key: "orderDate",
        title: t("TG đơn hàng", lang),
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLead;
          if (lead.orderDate) {
            return new Date(lead.orderDate).toLocaleString("vi-VN");
          }
          return <span className={styles["mi-muted-text"]}>-</span>;
        },
      },
      {
        key: "receivedDate",
        title: t("TG nhận đơn", lang),
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLead;
          if (lead.receivedDate) {
            return new Date(lead.receivedDate).toLocaleString("vi-VN");
          }
          return <span className={styles["mi-muted-text"]}>-</span>;
        },
      },
      {
        key: "customerName",
        title: t("Tên", lang),
        dataIndex: "customerName",
        width: 150,
        render: (value: unknown) => <span className={styles["mi-primary-text"]}>{String(value)}</span>,
      },
      {
        key: "phone",
        title: t("SĐT", lang),
        dataIndex: "phone",
        width: 110,
      },
      {
        key: "address",
        title: t("Địa chỉ", lang),
        dataIndex: "address",
        width: 130,
        render: (value: unknown) => value ? String(value) : <span className={styles["mi-muted-text"]}>-</span>,
      },
      {
        key: "product",
        title: t("Sản phẩm", lang),
        width: 200,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const product = (record as unknown as MarketingLead).product;
          return product ? (
            <span className={styles["mi-combo-text"]}>{product.name}</span>
          ) : (
            <span className={styles["mi-muted-text"]}>-</span>
          );
        },
      },
      {
        key: "combo",
        title: t("Combo SP", lang),
        width: 200,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const combo = (record as unknown as MarketingLead).combo;
          return combo ? (
            <span className={styles["mi-combo-text"]}>{combo.name}</span>
          ) : (
            <span className={styles["mi-muted-text"]}>-</span>
          );
        },
      },
      {
        key: "comboPrice",
        title: t("Giá combo", lang),
        width: 130,
        align: "right",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const sellingPrice = (record as unknown as MarketingLead).combo?.sellingPrice;
          if (typeof sellingPrice !== "number") {
            return <span className={styles["mi-muted-text"]}>-</span>;
          }
          const tip =
            currency === "VND"
              ? `${t("Click để đổi sang MNT", lang)} (1 MNT = ${exchangeRate} VND)`
              : t("Click để đổi sang VND", lang);
          return renderMoneyTip(sellingPrice, tip, () =>
            setCurrency((c) => (c === "MNT" ? "VND" : "MNT")),
          );
        },
      },
      {
        key: "revenue",
        title: t("Doanh thu", lang),
        width: 130,
        align: "right",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const sellingPrice = (record as unknown as MarketingLead).combo?.sellingPrice;
          if (typeof sellingPrice !== "number") {
            return <span className={styles["mi-muted-text"]}>-</span>;
          }
          const revenue = Math.max(sellingPrice - (shippingFee ?? 0), 0);
          const tip =
            currency === "VND"
              ? `${t("Click để đổi sang MNT", lang)} (1 MNT = ${exchangeRate} VND)`
              : t("Click để đổi sang VND", lang);
          return renderMoneyTip(revenue, tip, () =>
            setCurrency((c) => (c === "MNT" ? "VND" : "MNT")),
          );
        },
      },
      {
        key: "facebookPage",
        title: t("Trang FB", lang),
        width: 140,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const page = (record as unknown as MarketingLead).facebookPage;
          return page ? (
            <span className={styles["mi-combo-text"]}>{page.name}</span>
          ) : (
            <span className={styles["mi-muted-text"]}>-</span>
          );
        },
      },
      {
        key: "source",
        title: t("Nguồn", lang),
        dataIndex: "source",
        width: 100,
        render: (value: unknown) => t(LEAD_SOURCE_LABELS[value as LeadSource] ?? String(value), lang),
      },
      {
        key: "status",
        title: t("Trạng thái", lang),
        dataIndex: "status",
        width: 130,
        render: (value: unknown) => (
          <StatusBadge
            status={String(value)}
            showIcon
            mapping={LEAD_STATUS_BADGE_MAPPING}
          />
        ),
      },
      // Sprint 8.x: Cột "Tình trạng đơn hàng" — hiển thị Order status cho Lead đã chốt đơn.
      // Sử dụng DEFAULT_STATUS_MAPPING để hiển thị màu/icon của Order statuses.
      {
        key: "orderStatus",
        title: t("Tình trạng ĐH", lang),
        width: 140,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLead;
          if (!lead.isConverted || !lead.orderStatus) {
            return <span className={styles["mi-muted-text"]}>-</span>;
          }
          return (
            <StatusBadge
              status={lead.orderStatus}
              mapping={DEFAULT_STATUS_MAPPING}
              showIcon
            />
          );
        },
      },
      {
        key: "note",
        title: t("Ghi chú", lang),
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLead;
          if (lead.note) {
            return (
              <Tooltip title={lead.note} {...noDelayTipProps}>
                <span className={styles["mi-note-text"]}>
                  {lead.note.length > 20 ? `${lead.note.substring(0, 20)}...` : lead.note}
                </span>
              </Tooltip>
            );
          }
          return <span className={styles["mi-muted-text"]}>-</span>;
        },
      },
      ...(shouldShowMarketing ? [
        {
          key: "marketingEmployee",
          title: t("MKT phụ trách", lang),
          width: 150,
          render: (_value: unknown, record: Record<string, unknown>) => {
            const lead = record as unknown as MarketingLead;
            return lead.marketingEmployee ? (
              <span className={styles["mi-combo-text"]}>{lead.marketingEmployee.name}</span>
            ) : (
              <span className={styles["mi-muted-text"]}>-</span>
            );
          },
        },
      ] : []),
      ...(shouldShowSale ? [
        {
          key: "saleEmployee",
          title: t("Sale phụ trách", lang),
          width: 150,
          render: (_value: unknown, record: Record<string, unknown>) => {
            const lead = record as unknown as MarketingLead;
            return lead.saleEmployee ? (
              <span className={styles["mi-combo-text"]}>{lead.saleEmployee.name}</span>
            ) : (
              <span className={styles["mi-muted-text"]}>-</span>
            );
          },
        },
      ] : []),
      {
        key: "actions",
        title: t("Thao tác", lang),
        width: 200,
        align: "center",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLead;
          // Chỉ cho phép sửa và xóa khi đơn hàng còn ở trạng thái "Mới"
          const isNew = lead.status === LeadStatus.NEW;
          return (
            <div className={styles["mi-action-group"]}>
              <ActionButton type="ghost" size="small" icon={<EyeOutlined />} label={t(MARKETING_LEAD_ACTION_LABELS.view, lang)} onClick={() => onView?.(lead)} disabled={!onView} />
              {isNew && (
                <ActionButton type="ghost" size="small" icon={<EditOutlined />} label={t(MARKETING_LEAD_ACTION_LABELS.edit, lang)} onClick={() => onEdit(lead)} />
              )}
              {isNew && (
                <ActionButton type="danger" size="small" icon={<DeleteOutlined />} label={t(MARKETING_LEAD_ACTION_LABELS.delete, lang)} onClick={() => onDelete(lead)} />
              )}
            </div>
          );
        },
      },
    ],
    [onDelete, onEdit, onView, shouldShowMarketing, shouldShowSale, shippingFee, currency, exchangeRate, lang]
  );

  const rowSelection: TableProps<Record<string, unknown>>["rowSelection"] = onSelectionChange
    ? {
        selectedRowKeys,
        onChange: (keys) => {
          onSelectionChange(keys as string[]);
        },
        getCheckboxProps: (record) => {
          const lead = record as unknown as MarketingLead;
          return {
            disabled: !!lead.saleEmployee,
          };
        },
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
      scroll={{ x: 2100 }}
      rowSelection={rowSelection}
    />
  );
}

const MarketingLeadTable = memo(MarketingLeadTableInner);
export default MarketingLeadTable;
export { MarketingLeadTable as LeadTable };