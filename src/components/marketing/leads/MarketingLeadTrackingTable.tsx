/**
 * Marketing Lead Tracking Table Component (Sprint 8.5)
 *
 * Table for displaying leads for marketing tracking.
 * Marketing can only VIEW, cannot update status.
 */

import { memo, useMemo } from "react";
import { EyeOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { DataTable, StatusBadge } from "@/components/common";
import type { Column } from "@/components/common/table/DataTable";
import { LEAD_SOURCE_LABELS, LeadSource } from "@/constants/leadSource";
import type { MarketingLeadTracking } from "@/hooks/useMarketingLeadTracking";
import styles from "./marketing-tracking.module.css";

export interface MarketingLeadTrackingTableProps {
  data: MarketingLeadTracking[];
  onView?: (lead: MarketingLeadTracking) => void;
  loading?: boolean;
}

function MarketingLeadTrackingTableInner({
  data,
  onView,
  loading,
}: MarketingLeadTrackingTableProps) {
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
        key: "saleEmployee",
        title: "Sale phụ trách",
        width: 140,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          return lead.saleEmployeeId?.name || <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "sourceType",
        title: "Nguồn",
        width: 130,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          return LEAD_SOURCE_LABELS[lead.sourceType as LeadSource] ?? lead.sourceType;
        },
      },
      {
        key: "product",
        title: "Sản phẩm",
        width: 150,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          return lead.product?.name || "-";
        },
      },
      {
        key: "price",
        title: "Giá",
        width: 120,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          if (lead.unitPriceVND) {
            return (
              <span className={styles.priceText}>
                {lead.unitPriceVND.toLocaleString("vi-VN")}đ
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
        key: "isConverted",
        title: "Đơn",
        width: 100,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          if (lead.isConverted) {
            return (
              <span className={styles.convertedBadge}>
                ✓ Đã tạo
              </span>
            );
          }
          return <span className={styles.mutedText}>-</span>;
        },
      },
      {
        key: "createdAt",
        title: "Ngày tạo",
        dataIndex: "createdAt",
        width: 110,
        render: (value: unknown) =>
          value ? new Date(String(value)).toLocaleDateString("vi-VN") : "-",
      },
      {
        key: "actions",
        title: "Thao tác",
        width: 100,
        align: "center" as const,
        render: (_value: unknown, record: Record<string, unknown>) => {
          const lead = record as unknown as MarketingLeadTracking;
          return (
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => onView?.(lead)}
              disabled={!onView}
            >
              Chi tiết
            </Button>
          );
        },
      },
    ],
    [onView]
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

const MarketingLeadTrackingTable = memo(MarketingLeadTrackingTableInner);
export default MarketingLeadTrackingTable;
