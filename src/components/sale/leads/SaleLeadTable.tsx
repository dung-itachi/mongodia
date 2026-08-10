/**
 * Sale Leads Table Component (Sprint 8.5)
 *
 * Table for displaying leads assigned to sale.
 * Includes action buttons for updating lead status.
 */

import { memo, useMemo } from "react";
import { Button, Space } from "antd";
import { PhoneOutlined, SwapOutlined } from "@ant-design/icons";
import { DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import { LEAD_STATUS_LABELS, LeadStatus } from "@/constants/leadStatus";
import type { SaleLead } from "@/hooks/useSaleLeads";
import styles from "./sale-leads.module.css";

export interface SaleLeadTableProps {
  data: SaleLead[];
  onUpdateStatus: (lead: SaleLead, status: LeadStatus) => void;
  onConvert: (lead: SaleLead) => void;
  loading?: boolean;
}

function SaleLeadTableInner({
  data,
  onUpdateStatus,
  onConvert,
  loading,
}: SaleLeadTableProps) {
  const columns: Column[] = useMemo(
    () => [
      {
        key: "leadCode",
        title: "Mã",
        dataIndex: "leadCode",
        width: 130,
      },
      {
        key: "customerName",
        title: "Tên khách hàng",
        dataIndex: "customerName",
        width: 180,
        render: (value: unknown) => (
          <span className={styles.primaryText}>{String(value)}</span>
        ),
      },
      {
        key: "phone",
        title: "SĐT",
        dataIndex: "phone",
        width: 120,
        render: (value: unknown) => (
          <span className={styles.phoneText}>{String(value) || "-"}</span>
        ),
      },
      {
        key: "address",
        title: "Địa chỉ",
        dataIndex: "address",
        width: 200,
        render: (value: unknown) => String(value) || "-",
      },
      {
        key: "sourceType",
        title: "Nguồn",
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          return LEAD_SOURCE_LABELS[lead.sourceType as LeadSource] ?? lead.sourceType;
        },
      },
      {
        key: "product",
        title: "Sản phẩm",
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          return lead.product?.name || "-";
        },
      },
      {
        key: "facebookPage",
        title: "Trang FB",
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
        title: "Giá",
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
        title: "Trạng thái",
        dataIndex: "status",
        width: 140,
        render: (value: unknown) => (
          <StatusBadge status={String(value)} />
        ),
      },
      {
        key: "actions",
        title: "Thao tác",
        width: 320,
        align: "center" as const,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as SaleLead;
          return (
            <div className={styles.actionGroup}>
              {/* No Answer Button */}
              <Button
                size="small"
                danger={lead.status === LeadStatus.NO_ANSWER}
                type={lead.status === LeadStatus.NO_ANSWER ? "primary" : "default"}
                onClick={() => onUpdateStatus(lead, LeadStatus.NO_ANSWER)}
                disabled={lead.status === LeadStatus.CLOSED}
              >
                K nghe
              </Button>

              {/* Potential Button */}
              <Button
                size="small"
                type={lead.status === LeadStatus.POTENTIAL ? "primary" : "default"}
                className={lead.status === LeadStatus.POTENTIAL ? styles.potentialBtn : ""}
                onClick={() => onUpdateStatus(lead, LeadStatus.POTENTIAL)}
                disabled={lead.status === LeadStatus.CLOSED}
              >
                Tiềm năng
              </Button>

              {/* Qualified Button */}
              <Button
                size="small"
                type={lead.status === LeadStatus.QUALIFIED ? "primary" : "default"}
                onClick={() => onUpdateStatus(lead, LeadStatus.QUALIFIED)}
                disabled={lead.status === LeadStatus.CLOSED}
              >
                Đủ điều kiện
              </Button>

              {/* Lost Button */}
              <Button
                size="small"
                danger
                type={lead.status === LeadStatus.LOST ? "primary" : "default"}
                onClick={() => onUpdateStatus(lead, LeadStatus.LOST)}
                disabled={lead.status === LeadStatus.CLOSED}
              >
                Mất
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
                Chốt
              </Button>
            </div>
          );
        },
      },
    ],
    [onUpdateStatus, onConvert]
  );

  return (
    <DataTable
      columns={columns}
      data={data as unknown as Record<string, unknown>[]}
      loading={loading}
      pagination={false}
      rowKey="_id"
      size="small"
      scroll={{ x: 1500 }}
    />
  );
}

const SaleLeadTable = memo(SaleLeadTableInner);
export default SaleLeadTable;
