/**
 * Marketing Lead Table Component (Sprint 5.2 — Marketing Input)
 *
 * Uses the UI Kit DataTable contract, including scroll, sorting callbacks,
 * and row selection support for future bulk actions.
 */

import { memo, useMemo } from "react";
import { EyeOutlined, EditOutlined, DeleteOutlined, UserSwitchOutlined, SwapOutlined } from "@ant-design/icons";
import { ActionButton, DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/constants/leadStatus";
import { MARKETING_LEAD_ACTION_LABELS } from "@/constants/marketing";
import type { MarketingLead } from "@/types/marketing-lead";
import styles from "./marketing-input.module.css";

export type MarketingLeadTableProps = {
  data: MarketingLead[];
  onView?: (lead: MarketingLead) => void;
  onEdit: (lead: MarketingLead) => void;
  onDelete: (lead: MarketingLead) => void;
  onAssign?: (lead: MarketingLead) => void;
  onConvert?: (lead: MarketingLead) => void;
  loading?: boolean;
};

function MarketingLeadTableInner({
  data,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onConvert,
  loading,
}: MarketingLeadTableProps) {
  const columns: Column[] = useMemo(
    () => [
      { key: "leadCode", title: "Mã", dataIndex: "leadCode", width: 120 },
      {
        key: "customerName",
        title: "Tên",
        dataIndex: "customerName",
        width: 180,
        render: (value: unknown) => <span className={styles["mi-primary-text"]}>{String(value)}</span>,
      },
      { key: "phone", title: "SĐT", dataIndex: "phone", width: 120 },
      {
        key: "email",
        title: "Email",
        dataIndex: "email",
        width: 180,
        render: (value: unknown) => (value ? String(value) : <span className={styles["mi-muted-text"]}>-</span>),
      },
      {
        key: "source",
        title: "Nguồn",
        dataIndex: "source",
        width: 140,
        render: (value: unknown) => LEAD_SOURCE_LABELS[value as LeadSource] ?? String(value),
      },
      {
        key: "marketingEmployee",
        title: "Marketing",
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const employee = record.marketingEmployee as { name?: string } | null;
          return employee?.name ?? <span className={styles["mi-muted-text"]}>-</span>;
        },
      },
      {
        key: "saleEmployee",
        title: "Sale",
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const employee = record.saleEmployee as { name?: string } | null;
          return employee?.name ?? <span className={styles["mi-muted-text"]}>-</span>;
        },
      },
      {
        key: "status",
        title: "Trạng thái",
        dataIndex: "status",
        width: 120,
        render: (value: unknown) => (
          <StatusBadge status={LEAD_STATUS_LABELS[value as LeadStatus] ?? String(value)} />
        ),
      },
      {
        key: "createdAt",
        title: "Ngày tạo",
        dataIndex: "createdAt",
        width: 110,
        render: (value: unknown) => (value ? new Date(String(value)).toLocaleDateString("vi-VN") : "-"),
      },
      {
        key: "actions",
        title: "Thao tác",
        width: 370,
        align: "center",
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLead;
          return (
            <div className={styles["mi-action-group"]}>
              <ActionButton type="ghost" size="small" icon={<EyeOutlined />} label={MARKETING_LEAD_ACTION_LABELS.view} onClick={() => onView?.(lead)} disabled={!onView} />
              <ActionButton type="ghost" size="small" icon={<EditOutlined />} label={MARKETING_LEAD_ACTION_LABELS.edit} onClick={() => onEdit(lead)} />
              <ActionButton type="danger" size="small" icon={<DeleteOutlined />} label={MARKETING_LEAD_ACTION_LABELS.delete} onClick={() => onDelete(lead)} />
              <ActionButton type="ghost" size="small" icon={<UserSwitchOutlined />} label={MARKETING_LEAD_ACTION_LABELS.assign} onClick={() => onAssign?.(lead)} disabled={!onAssign} />
              <ActionButton type="ghost" size="small" icon={<SwapOutlined />} label={MARKETING_LEAD_ACTION_LABELS.convert} onClick={() => onConvert?.(lead)} disabled={!onConvert} />
            </div>
          );
        },
      },
    ],
    [onAssign, onConvert, onDelete, onEdit, onView]
  );

  return (
    <DataTable
      columns={columns}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      pagination={false}
      rowKey="_id"
      size="small"
      scroll={{ x: 1400 }}
    />
  );
}

const MarketingLeadTable = memo(MarketingLeadTableInner);
export default MarketingLeadTable;
