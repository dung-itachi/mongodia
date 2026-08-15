/**
 * Marketing Lead Table Component (Sprint 5.2, 8.5)
 *
 * Uses the UI Kit DataTable contract, including scroll, sorting callbacks,
 * and row selection support for bulk push to Sale.
 * Sprint 8.5: Added row selection for "Đẩy sang Sale" functionality.
 */

import { memo, useMemo } from "react";
import { EyeOutlined, EditOutlined, DeleteOutlined, UserSwitchOutlined, SwapOutlined } from "@ant-design/icons";
import { ActionButton, DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import type { TableProps } from "antd";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/constants/leadStatus";
import { MARKETING_LEAD_ACTION_LABELS } from "@/constants/marketing";
import type { MarketingLead } from "@/types/marketing-lead";
import { LEAD_STATUS_BADGE_MAPPING } from "@/components/common/display/StatusBadge";
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
}: MarketingLeadTableProps) {
  const columns: Column[] = useMemo(
    () => [
      { key: "leadCode", title: "Mã", dataIndex: "leadCode", width: 120 },
      {
        key: "createdAt",
        title: "Thời gian",
        dataIndex: "createdAt",
        width: 150,
        render: (value: unknown) => (value ? new Date(String(value)).toLocaleString("vi-VN") : "-"),
      },
      {
        key: "customerName",
        title: "Tên",
        dataIndex: "customerName",
        width: 150,
        render: (value: unknown) => <span className={styles["mi-primary-text"]}>{String(value)}</span>,
      },
      {
        key: "phone",
        title: "SĐT",
        dataIndex: "phone",
        width: 110,
      },
      {
        key: "address",
        title: "Địa chỉ",
        dataIndex: "address",
        width: 130,
        render: (value: unknown) => value ? String(value) : <span className={styles["mi-muted-text"]}>-</span>,
      },
      {
        key: "product",
        title: "Sản phẩm",
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
        title: "Combo SP",
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
        key: "facebookPage",
        title: "Trang FB",
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
        title: "Nguồn",
        dataIndex: "source",
        width: 100,
        render: (value: unknown) => LEAD_SOURCE_LABELS[value as LeadSource] ?? String(value),
      },
      {
        key: "status",
        title: "Trạng thái",
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
      {
        key: "actions",
        title: "Thao tác",
        width: 200,
        align: "center",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLead;
          return (
            <div className={styles["mi-action-group"]}>
              <ActionButton type="ghost" size="small" icon={<EyeOutlined />} label={MARKETING_LEAD_ACTION_LABELS.view} onClick={() => onView?.(lead)} disabled={!onView} />
              <ActionButton type="ghost" size="small" icon={<EditOutlined />} label={MARKETING_LEAD_ACTION_LABELS.edit} onClick={() => onEdit(lead)} />
              <ActionButton type="danger" size="small" icon={<DeleteOutlined />} label={MARKETING_LEAD_ACTION_LABELS.delete} onClick={() => onDelete(lead)} />
            </div>
          );
        },
      },
    ],
    [onDelete, onEdit, onView]
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
      scroll={{ x: 1500 }}
      rowSelection={rowSelection}
    />
  );
}

const MarketingLeadTable = memo(MarketingLeadTableInner);
export default MarketingLeadTable;
